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
  { en: "/en", ka: "/ka", es: "/es" },
  { en: "/en/football-games/auction", ka: "/ka/football-games/auction", es: "/es/juegos-de-futbol/subasta" },
  { en: "/en/football-games/football-tic-tac-toe", ka: "/ka/football-games/football-tic-tac-toe", es: "/es/juegos-de-futbol/tiki-taka-toe" },
  { en: "/en/football-games/daily-challenges", ka: "/ka/football-games/daily-challenges", es: "/es/juegos-de-futbol/retos-diarios" },
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
for (const path of ["/en/games/auction", "/en/daily/money-drop", "/es/football-games/auction", "/en/football-games/football-timeline", "/en/football-games/nope"]) {
  const res = await get(path);
  check(`${path} 404`, res.status === 404, String(res.status));
}
const play = await get("/play");
check("/play noindex", /noindex/i.test((play.headers.get("x-robots-tag") ?? "") + (await play.text())), String(play.status));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
