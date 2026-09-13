// Acceptance crawl for the public games pages. Usage: node scripts/seo-check.mjs http://localhost:3003
// Checks status, canonical, hreflang reciprocity, robots, H1 presence in raw HTML, redirects, sitemap membership.
const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); };
const get = (path, redirect = "manual") => fetch(base + path, { redirect, headers: { "user-agent": "seo-check" } });
const attr = (html, re) => (html.match(re) ?? [])[1] ?? null;

const sitemap = await (await get("/sitemap.xml", "follow")).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
check("sitemap has entries", urls.length > 20, `${urls.length} urls`);
check("sitemap excludes bare /", !urls.some((u) => /^https?:\/\/[^/]+\/?$/.test(u)));
check("sitemap excludes /play and /demos", !urls.some((u) => /\/(play|demos)(\/|$)/.test(u)));

// Expected hreflang clusters: every member must list exactly these, and each member must exist (reciprocity).
const clusters = [
  { en: "/en", ka: "/ka", es: "/es", tr: "/tr" },
  { en: "/en/football-games/auction", ka: "/ka/football-games/auction", es: "/es/juegos-de-futbol/subasta" },
  { en: "/en/football-games/ranked", ka: "/ka/football-games/ranked", es: "/es/juegos-de-futbol/clasificatoria", tr: "/tr/football-games/ranked" },
  { en: "/en/football-games/football-tic-tac-toe", ka: "/ka/football-games/football-tic-tac-toe", es: "/es/juegos-de-futbol/tiki-taka-toe" },
  { en: "/en/football-games/daily-challenges", ka: "/ka/football-games/daily-challenges", es: "/es/juegos-de-futbol/retos-diarios", tr: "/tr/football-games/daily-challenges" },
];
const expectedAlternates = new Map();
for (const cluster of clusters) for (const path of Object.values(cluster)) expectedAlternates.set(path, { ...cluster, "x-default": cluster.en });
const pages = [...expectedAlternates.keys()];
for (const path of pages) {
  const res = await get(path);
  const html = await res.text();
  const robots = res.headers.get("x-robots-tag") ?? "";
  const metaRobots = attr(html, /<meta name="robots" content="([^"]+)"/i) ?? "";
  const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/i);
  const h1 = /<h1[\s>]/i.test(html);
  const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/gi)].map((m) => [m[1], m[2]]);
  const expected = expectedAlternates.get(path);
  const got = Object.fromEntries(alternates.map(([l, h]) => [l, h.replace(/^https?:\/\/[^/]+/, "")]));
  const exact = Object.keys(expected).length === Object.keys(got).length && Object.entries(expected).every(([l, h]) => got[l] === h);
  check(`${path} 200`, res.status === 200, String(res.status));
  check(`${path} indexable`, !/noindex/i.test(robots + metaRobots), robots || metaRobots || "no robots directive");
  check(`${path} canonical`, Boolean(canonical && canonical.endsWith(path)), canonical ?? "missing");
  check(`${path} h1 in HTML`, h1);
  check(`${path} hreflang exact + reciprocal`, exact, JSON.stringify(got));
  check(`${path} in sitemap`, urls.some((u) => u.endsWith(path)));
}
const rootGe = await fetch(base + "/", { redirect: "manual", headers: { "x-vercel-ip-country": "GE" } });
check("/ → /ka for Georgia", rootGe.status === 307 && (rootGe.headers.get("location") ?? "").endsWith("/ka"), `${rootGe.status} ${rootGe.headers.get("location")}`);
const rootUs = await fetch(base + "/", { redirect: "manual", headers: { "x-vercel-ip-country": "US" } });
check("/ → /en elsewhere, uncacheable", rootUs.status === 307 && (rootUs.headers.get("location") ?? "").endsWith("/en") && /no-store/.test(rootUs.headers.get("cache-control") ?? ""), `${rootUs.status} ${rootUs.headers.get("location")} ${rootUs.headers.get("cache-control")}`);
for (const [path, status, target] of [["/en/football-games", 308, "/en"], ["/es/juegos-de-futbol", 308, "/es"], ["/football-games/auction", 308, "/en/football-games/auction"], ["/games", 308, "/en"], ["/daily", 308, "/en/football-games/daily-challenges"]]) {
  const res = await get(path);
  const loc = (res.headers.get("location") ?? "").replace(/^https?:\/\/[^/]+/, "");
  check(`${path} → ${status}${target ? " " + target : ""}`, res.status === status && (!target || loc === target), `${res.status} ${loc}`);
}
for (const path of ["/en/games/auction", "/en/daily/money-drop", "/es/football-games/auction", "/en/football-games/football-timeline", "/en/football-games/nope", "/tr/football-games/auction", "/tr/juegos-de-futbol/subasta"]) {
  const res = await get(path);
  check(`${path} 404`, res.status === 404, String(res.status));
}
// Every published game page from the sitemap: self-canonical, indexable, one H1, and an exact reciprocal hreflang cluster.
const gamePaths = urls.map((u) => u.replace(/^https?:\/\/[^/]+/, "")).filter((p) => /^\/(en|ka|es|tr)\/(football-games|juegos-de-futbol)\//.test(p) && !pages.includes(p));
const alternatesOf = new Map();
const readAlternates = async (path) => {
  if (alternatesOf.has(path)) return alternatesOf.get(path);
  const res = await get(path);
  const html = await res.text();
  const got = Object.fromEntries([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/gi)].map((m) => [m[1], m[2].replace(/^https?:\/\/[^/]+/, "")]));
  const entry = { status: res.status, got, canonical: attr(html, /<link rel="canonical" href="([^"]+)"/i), h1s: (html.match(/<h1[\s>]/gi) ?? []).length, noindex: /noindex/i.test((res.headers.get("x-robots-tag") ?? "") + (attr(html, /<meta name="robots" content="([^"]+)"/i) ?? "")) };
  alternatesOf.set(path, entry);
  return entry;
};
for (const path of gamePaths) {
  const page = await readAlternates(path);
  check(`${path} 200 / indexable / canonical / one h1`, page.status === 200 && !page.noindex && Boolean(page.canonical?.endsWith(path)) && page.h1s === 1, `${page.status} h1=${page.h1s} canonical=${page.canonical}`);
  const members = Object.entries(page.got).filter(([l]) => l !== "x-default");
  let reciprocal = members.length > 0 && page.got["x-default"] === page.got.en;
  for (const [, memberPath] of members) {
    const other = await readAlternates(memberPath);
    const same = Object.keys(page.got).length === Object.keys(other.got).length && Object.entries(page.got).every(([l, h]) => other.got[l] === h);
    if (other.status !== 200 || !same) reciprocal = false;
  }
  check(`${path} hreflang cluster reciprocal`, reciprocal, JSON.stringify(page.got));
}
const play = await get("/play");
check("/play noindex", /noindex/i.test((play.headers.get("x-robots-tag") ?? "") + (await play.text())), String(play.status));
const board = await get("/leaderboard");
check("/leaderboard noindex", /noindex/i.test((board.headers.get("x-robots-tag") ?? "") + (await board.text())), String(board.status));
// The hub is the Play screen: app shell present, exactly one H1, and no /demos links (not served on production).
for (const path of ["/en", "/ka", "/es", "/tr"]) {
  const html = await (await get(path)).text();
  check(`${path} renders the app shell`, /data-shell="app"/.test(html));
  check(`${path} has exactly one h1`, (html.match(/<h1[\s>]/gi) ?? []).length === 1, String((html.match(/<h1[\s>]/gi) ?? []).length));
  check(`${path} has no /demos links`, !/href="\/demos\//.test(html));
  check(`${path} server HTML is the guest variant`, /data-chrome="guest"/.test(html) && !/data-chrome="member"/.test(html));
  // Every locale-folder link on the hub must resolve (a locale without that page links to the English one).
  const localLinks = [...new Set([...html.matchAll(/href="(\/(?:en|ka|es|tr)\/(?:football-games|juegos-de-futbol)\/[a-z-]+)"/g)].map((m) => m[1]))];
  const dead = [];
  for (const link of localLinks) { if ((await get(link)).status !== 200) dead.push(link); }
  check(`${path} hub links resolve`, dead.length === 0, dead.join(", "));
}
const about = await (await get("/en/about")).text();
check("/en/about stays outside the app shell", !/data-shell="app"/.test(about));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
