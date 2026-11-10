// Public SEO acceptance crawl. See docs/SEO-ACCEPTANCE.md for staging and focused usage.
import {
  DISCOVERY_CLUSTERS, DISCOVERY_REDIRECTS, HUB_CLUSTER, SEED_CLUSTERS, absoluteAlternates, canonicalPath,
  crawlOptions, isPublicContentPath, publicContentLinks, publishedAlternatesValid,
  readSeoPage, readSitemapUrls, robotsMatch, sameAlternates,
} from "./lib/seo-acceptance.mjs";

const { base, canonicalOrigin, preview, discoveryOnly } = crawlOptions(process.argv.slice(2));
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};
const get = (path, headers = {}) => fetch(base + path, {
  redirect: "manual", headers: { "user-agent": "seo-check", ...headers }, signal: AbortSignal.timeout(30000),
});
const pages = new Map();
const readPage = async (path) => {
  if (!pages.has(path)) pages.set(path, (async () => {
    try {
      const response = await get(path);
      return readSeoPage(await response.text(), response.status, response.headers.get("x-robots-tag") ?? "");
    } catch (error) {
      check(`${path} fetch`, false, error.message);
      return readSeoPage("", 0);
    }
  })());
  return pages.get(path);
};
console.log(`Crawling ${base}; canonicals ${canonicalOrigin}; ${preview ? "preview requires noindex" : "production requires indexable pages"}; ${discoveryOnly ? "discovery focus" : "full public catalogue"}`);

const sitemapResponse = await get("/sitemap.xml");
check("sitemap 200", sitemapResponse.status === 200, String(sitemapResponse.status));
const urls = readSitemapUrls(await sitemapResponse.text());
const sitemapUrls = new Set(urls);
check("sitemap has entries", urls.length > 20, `${urls.length} urls`);
check("sitemap has no duplicate URLs", sitemapUrls.size === urls.length);
check("sitemap URLs use the canonical origin without query strings", urls.every((url) => canonicalPath(url, canonicalOrigin)));
check("sitemap excludes bare /", !sitemapUrls.has(canonicalOrigin + "/"));
check("sitemap excludes /play and /demos", !urls.some((url) => /\/(play|demos)(\/|$)/.test(url)));

// These released pages are required even if accidentally dropped from the sitemap.
const expectedAlternates = new Map();
for (const cluster of [HUB_CLUSTER, ...Object.values(DISCOVERY_CLUSTERS), ...Object.values(discoveryOnly ? {} : SEED_CLUSTERS)]) {
  for (const path of Object.values(cluster)) expectedAlternates.set(path, absoluteAlternates(cluster, canonicalOrigin));
}
// Other campaign pages are CMS-driven. Check only published editions, never infer all-eight publication.
const publishedPaths = discoveryOnly ? [] : urls.map((url) => canonicalPath(url, canonicalOrigin)).filter((path) => path && isPublicContentPath(path));
const paths = new Set([...expectedAlternates.keys(), ...publishedPaths]);
for (const path of paths) {
  const page = await readPage(path);
  check(`${path} 200 / canonical / one h1`, page.status === 200 && page.canonical === canonicalOrigin + path && page.h1s === 1, `${page.status} h1=${page.h1s} canonical=${page.canonical}`);
  check(`${path} ${preview ? "preview noindex" : "indexable"}`, robotsMatch(page, preview), page.robots);
  check(`${path} in sitemap`, sitemapUrls.has(canonicalOrigin + path));
  const expected = expectedAlternates.get(path);
  if (expected) check(`${path} exact eight locales + x-default`, !page.duplicateAlternates && sameAlternates(page.alternates, expected), JSON.stringify(page.alternates));
  let reciprocal = publishedAlternatesValid(page, path, canonicalOrigin, sitemapUrls);
  for (const [lang, url] of Object.entries(page.alternates)) {
    if (lang === "x-default") continue;
    const memberPath = canonicalPath(url, canonicalOrigin);
    if (!memberPath || !sitemapUrls.has(url)) { reciprocal = false; continue; }
    const member = await readPage(memberPath);
    if (member.status !== 200 || member.canonical !== url || member.duplicateAlternates || !sameAlternates(page.alternates, member.alternates)) reciprocal = false;
  }
  check(`${path} hreflang reciprocal`, reciprocal);
}

// Tracking URLs must resolve to the same clean canonical and language cluster, not create new SEO pages.
for (const cluster of Object.values(DISCOVERY_CLUSTERS)) {
  for (const path of Object.values(cluster)) {
    const page = await readPage(path + "?utm_source=seo-check&utm_campaign=discovery");
    check(`${path} tracking query keeps canonical + hreflang`, page.status === 200 && page.canonical === canonicalOrigin + path && !page.duplicateAlternates && sameAlternates(page.alternates, absoluteAlternates(cluster, canonicalOrigin)) && robotsMatch(page, preview));
  }
}

// The hub is the guest Play screen. Include campaign destinations and every localized folder.
for (const path of Object.values(HUB_CLUSTER)) {
  const { html, h1s } = await readPage(path);
  check(`${path} renders guest app shell with one h1`, /data-shell="app"/.test(html) && /data-chrome="guest"/.test(html) && !/data-chrome="member"/.test(html) && h1s === 1);
  check(`${path} has no /demos links`, !/href="\/demos\//.test(html));
  const discoveryPaths = new Set(Object.values(DISCOVERY_CLUSTERS).flatMap((cluster) => Object.values(cluster)));
  const links = publicContentLinks(html, canonicalOrigin).filter((link) => !discoveryOnly || discoveryPaths.has(link.split("?")[0]));
  const localTargets = Object.values(DISCOVERY_CLUSTERS).map((cluster) => Object.values(cluster).find((target) => target.startsWith(path + "/")));
  const linkedPaths = new Set(links.map((link) => link.split("?")[0]));
  check(`${path} links to all three localized discovery pages`, localTargets.every((target) => linkedPaths.has(target)));
  const dead = [];
  for (const link of links) if ((await readPage(link)).status !== 200) dead.push(link);
  check(`${path} hub links resolve`, dead.length === 0, dead.join(", "));
}

// Retired Minuto and Turkish game-folder aliases remain covered in focused runs too.
for (const [path, target] of DISCOVERY_REDIRECTS) {
  const query = "?utm_source=seo-check";
  const response = await get(path + query);
  const location = response.headers.get("location");
  check(`${path} → 308 ${target} with query preserved`, response.status === 308 && Boolean(location) && new URL(location, base).href === base + target + query, `${response.status} ${location}`);
}

if (!discoveryOnly) {
  const rootGe = await get("/", { "x-vercel-ip-country": "GE" });
  check("/ → /ka for Georgia", rootGe.status === 307 && (rootGe.headers.get("location") ?? "").endsWith("/ka"), `${rootGe.status} ${rootGe.headers.get("location")}`);
  const rootUs = await get("/", { "x-vercel-ip-country": "US" });
  check("/ → /en elsewhere, uncacheable", rootUs.status === 307 && (rootUs.headers.get("location") ?? "").endsWith("/en") && /no-store/.test(rootUs.headers.get("cache-control") ?? ""), `${rootUs.status} ${rootUs.headers.get("location")} ${rootUs.headers.get("cache-control")}`);
  for (const [path, target] of [
    ["/en/football-games", "/en"], ["/es/juegos-de-futbol", "/es"], ["/football-games/auction", "/en/football-games/auction"], ["/games", "/en"], ["/daily", "/en/football-games/daily-challenges"],
    ["/tr/futbol-oyunlari", "/tr"], ["/tr/football-games", "/tr"], ["/tr/football-games/auction", "/tr/futbol-oyunlari/auction"], ["/tr/football-games/daily-challenges", "/tr/futbol-oyunlari/gunluk-futbol-gorevleri"],
    ["/es/juegos-de-futbol/clasificatoria", "/es/juegos-de-futbol/quien-sabe-mas-de-futbol"], ["/es/juegos-de-futbol/francotirador-de-datos", "/es/juegos-de-futbol/aproximado-futbolero"],
  ]) {
    const res = await get(path);
    const location = res.headers.get("location");
    check(`${path} → 308 ${target}`, res.status === 308 && Boolean(location) && new URL(location, base).href === base + target, `${res.status} ${location}`);
  }
  for (const path of ["/en/games/auction", "/en/daily/money-drop", "/es/football-games/auction", "/en/football-games/football-timeline", "/en/football-games/nope", "/tr/juegos-de-futbol/subasta", "/tr/football-games/nope", "/es/futbol-oyunlari/auction", "/en/futbol-oyunlari/auction"]) {
    const res = await get(path);
    check(`${path} 404`, res.status === 404, String(res.status));
  }
  for (const path of ["/play", "/leaderboard"]) {
    const page = await readPage(path);
    check(`${path} noindex`, page.noindex, String(page.status));
  }
  const about = await readPage("/en/about");
  check("/en/about stays outside the app shell", about.status === 200 && !/data-shell="app"/.test(about.html));
}
const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
