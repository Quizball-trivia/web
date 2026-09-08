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

const pages = ["/en", "/ka", "/es", "/en/football-games/auction", "/es/juegos-de-futbol/subasta", "/ka/football-games/football-tic-tac-toe", "/en/football-games/daily-challenges", "/es/juegos-de-futbol/retos-diarios"];
for (const path of pages) {
  const res = await get(path);
  const html = await res.text();
  const robots = res.headers.get("x-robots-tag") ?? "";
  const metaRobots = attr(html, /<meta name="robots" content="([^"]+)"/i) ?? "";
  const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/i);
  const h1 = /<h1[\s>]/i.test(html);
  const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/gi)].map((m) => [m[1], m[2]]);
  const self = alternates.find(([, href]) => href.endsWith(path));
  check(`${path} 200`, res.status === 200, String(res.status));
  check(`${path} indexable`, !/noindex/i.test(robots + metaRobots), robots || metaRobots || "no robots directive");
  check(`${path} canonical`, Boolean(canonical && canonical.endsWith(path)), canonical ?? "missing");
  check(`${path} h1 in HTML`, h1);
  check(`${path} hreflang self + x-default`, Boolean(self) && alternates.some(([l]) => l === "x-default"), alternates.map(([l, h]) => `${l}:${h.replace(/^https?:\/\/[^/]+/, "")}`).join(" "));
  check(`${path} in sitemap`, urls.some((u) => u.endsWith(path)));
}
for (const [path, status, target] of [["/", 307, null], ["/en/football-games", 308, "/en"], ["/es/juegos-de-futbol", 308, "/es"], ["/football-games/auction", 308, "/en/football-games/auction"], ["/games", 308, "/en"], ["/daily", 308, "/en/football-games/daily-challenges"]]) {
  const res = await get(path);
  const loc = (res.headers.get("location") ?? "").replace(/^https?:\/\/[^/]+/, "");
  check(`${path} → ${status}${target ? " " + target : ""}`, res.status === status && (!target || loc === target), `${res.status} ${loc}`);
}
for (const path of ["/en/games/auction", "/en/daily/money-drop", "/es/football-games/auction", "/en/football-games/missing-xi", "/en/football-games/nope"]) {
  const res = await get(path);
  check(`${path} 404`, res.status === 404, String(res.status));
}
const play = await get("/play");
check("/play noindex", /noindex/i.test((play.headers.get("x-robots-tag") ?? "") + (await play.text())), String(play.status));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
