// Deliberately explicit acceptance fixtures. Tests compare these with the app's route manifests.
export const LOCALES = ["en", "ka", "es", "tr", "ru", "pt", "de", "fr"];
export const HREFLANG = Object.fromEntries(LOCALES.map((locale) => [locale, locale === "pt" ? "pt-BR" : locale]));
export const GAME_FOLDERS = ["football-games", "football-games", "juegos-de-futbol", "futbol-oyunlari", "futbolnye-igry", "jogos-de-futebol", "fussballspiele", "jeux-de-foot"];
export const CAMPAIGN_FOLDERS = ["football-quiz", "football-quiz", "quiz-de-futbol", "futbol-bilgi-yarismasi", "futbolnaya-viktorina", "quiz-de-futebol", "fussball-quiz", "quiz-foot"];
const cluster = (folders, slugs) => Object.fromEntries(LOCALES.map((locale, index) => [
  HREFLANG[locale], `/${locale}/${folders[index]}/${slugs[index]}`,
]));

export const DISCOVERY_CLUSTERS = {
  "career-path": cluster(CAMPAIGN_FOLDERS, ["career-path", "career-path", "trayectoria-del-jugador", "kariyerden-futbolcu-tahmin-etme", "ugaday-futbolista-po-karere", "adivinhe-o-jogador-pela-carreira", "karrierestationen-erraten", "devine-le-joueur-avec-les-clubs"]),
  "guess-the-goal-minute": cluster(GAME_FOLDERS, ["guess-the-goal-minute", "guess-the-goal-minute", "adivina-el-minuto-exacto-del-gol", "gol-dakikasi-tahmin-oyunu", "na-kakoy-minute-gol", "em-que-minuto-foi-o-gol", "in-welcher-minute-fiel-das-tor", "a-quelle-minute"]),
  "football-tenable": cluster(GAME_FOLDERS, ["football-tenable", "football-tenable", "adivina-el-top-10", "futbol-top-10", "ugaday-top-10", "acerte-o-top-10", "top-10-erraten", "quiz-top-10-foot"]),
};
export const DISCOVERY_REDIRECTS = [
  ["/es/juegos-de-futbol/en-que-minuto-futbolero", DISCOVERY_CLUSTERS["guess-the-goal-minute"].es],
  ["/tr/football-games/guess-the-goal-minute", DISCOVERY_CLUSTERS["guess-the-goal-minute"].tr],
  ["/tr/football-games/football-tenable", DISCOVERY_CLUSTERS["football-tenable"].tr],
];
export const HUB_CLUSTER = Object.fromEntries(LOCALES.map((locale) => [HREFLANG[locale], `/${locale}`]));
export const SEED_CLUSTERS = {
  auction: cluster(GAME_FOLDERS, ["auction", "auction", "subasta", "auction", "futbolnyy-auktsion", "leilao-de-jogadores", "fussball-auktion", "encheres-foot"]),
  ranked: cluster(GAME_FOLDERS, ["ranked", "ranked", "quien-sabe-mas-de-futbol", "ranked", "viktorina-s-sopernikom", "quem-sabe-mais-de-futebol", "fussball-quiz-duell", "quiz-foot-1v1"]),
  "football-tic-tac-toe": cluster(GAME_FOLDERS, ["football-tic-tac-toe", "football-tic-tac-toe", "tiki-taka-toe", "futbol-xox", "futbolnye-krestiki-noliki", "jogo-da-velha-de-futebol", "fussball-tic-tac-toe", "morpion-foot"]),
  daily: cluster(GAME_FOLDERS, ["daily-challenges", "daily-challenges", "retos-diarios", "gunluk-futbol-gorevleri", "ezhednevnye-golovolomki", "jogos-diarios", "taegliche-raetsel", "jeux-quotidiens"]),
};

export function crawlOptions(args = []) {
  const usage = "Usage: node scripts/seo-check.mjs [origin] [--discovery-only] [--canonical-origin=<origin>]";
  const parseOrigin = (value) => {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/" || url.search || url.hash || url.username || url.password) throw new Error(usage);
    return url;
  };
  const origins = args.filter((arg) => !arg.startsWith("--"));
  const overrides = args.filter((arg) => arg.startsWith("--canonical-origin="));
  const unknown = args.filter((arg) => arg.startsWith("--") && arg !== "--discovery-only" && !arg.startsWith("--canonical-origin="));
  if (origins.length > 1 || overrides.length > 1 || unknown.length) throw new Error(usage);
  const base = parseOrigin(origins[0] ?? "http://localhost:3000");
  const canonicalOrigin = parseOrigin(overrides[0]?.slice("--canonical-origin=".length) ?? "https://quizball.io").origin;
  if (["quizball.io", "www.quizball.io"].includes(base.hostname) && canonicalOrigin !== "https://quizball.io") {
    throw new Error("Production must use https://quizball.io canonicals");
  }
  // Never use a blanket 'ignore noindex' flag. Known non-production hosts must be protected;
  // production (and unknown hosts) must be indexable. A different expected canonical origin is explicit.
  const preview = ["staging.quizball.io", "localhost", "127.0.0.1", "[::1]"].includes(base.hostname) || base.hostname.endsWith(".vercel.app");
  return { base: base.origin, canonicalOrigin, preview, discoveryOnly: args.includes("--discovery-only") };
}

const decode = (value) => value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(([tag]) => Object.fromEntries(
  [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(([, key, double, single]) => [key.toLowerCase(), decode(double ?? single)]),
));

export function readSeoPage(html, status, robotsHeader = "") {
  const links = tags(html, "link");
  const canonicals = links.filter((link) => link.rel?.toLowerCase() === "canonical").map((link) => link.href);
  const alternates = links.filter((link) => link.rel?.toLowerCase() === "alternate" && link.hreflang);
  const robots = [robotsHeader, ...tags(html, "meta").filter((meta) => /^(robots|googlebot)$/i.test(meta.name ?? "")).map((meta) => meta.content ?? "")].join(", ");
  return {
    status, html, canonical: canonicals.length === 1 ? canonicals[0] : null,
    h1s: (html.match(/<h1[\s>]/gi) ?? []).length,
    alternates: Object.fromEntries(alternates.map((link) => [link.hreflang, link.href])),
    duplicateAlternates: new Set(alternates.map((link) => link.hreflang)).size !== alternates.length,
    noindex: /\b(noindex|none)\b/i.test(robots), robots,
  };
}

export const readSitemapUrls = (xml) => [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(([, value]) => decode(value));
export const sameAlternates = (left, right) => Object.keys(left).length === Object.keys(right).length && Object.entries(left).every(([lang, url]) => right[lang] === url);
export const absoluteAlternates = (paths, origin) => Object.fromEntries(Object.entries({ ...paths, "x-default": paths.en }).map(([lang, path]) => [lang, origin + path]));
export const robotsMatch = (page, preview) => preview ? page.noindex : !page.noindex;

// Return only an exact canonical URL on our origin, never an off-site crawl target or query alias.
export function canonicalPath(url, origin) {
  try {
    const parsed = new URL(url);
    return parsed.origin === origin && !parsed.search && !parsed.hash && url === origin + parsed.pathname ? parsed.pathname : null;
  } catch { return null; }
}

export function isPublicContentPath(path) {
  const [, locale, folder, slug, ...rest] = path.split("/");
  const index = LOCALES.indexOf(locale);
  return index >= 0 && rest.length === 0 && /^[a-z0-9-]+$/.test(slug ?? "") && [GAME_FOLDERS[index], CAMPAIGN_FOLDERS[index]].includes(folder);
}

export function publishedAlternatesValid(page, path, origin, sitemapUrls) {
  const members = Object.entries(page.alternates).filter(([lang]) => lang !== "x-default");
  const locale = path.split("/")[1];
  return !page.duplicateAlternates && members.length > 0
    && page.alternates[HREFLANG[locale]] === origin + path
    && Boolean(page.alternates.en) && page.alternates["x-default"] === page.alternates.en
    && members.every(([lang, url]) => {
      const memberPath = canonicalPath(url, origin);
      const memberLocale = memberPath?.split("/")[1];
      return memberPath && HREFLANG[memberLocale] === lang && sitemapUrls.has(url);
    });
}

export function publicContentLinks(html, origin) {
  return [...new Set(tags(html, "a").flatMap(({ href }) => {
    try {
      const url = new URL(href, origin);
      return url.origin === origin && isPublicContentPath(url.pathname) ? [url.pathname + url.search] : [];
    } catch { return []; }
  }))];
}
