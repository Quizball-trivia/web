export const SITE = "https://quizball.io";
export const INDEXNOW_KEY = "d8b0fffa7fb514b337c01657a215a072";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_MAX_URLS = 10_000;
const HEADERS = { "User-Agent": "quizball-indexnow" };

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (text) => text.trim().replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ENTITIES[name]);

/** @returns {Map<string, string>} url → lastmod ("" when the sitemap gives none) */
export function parseSitemap(xml) {
  const entries = new Map();
  for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block.match(/<loc>([\s\S]*?)<\/loc>/);
    if (!loc) continue;
    const lastmod = block.match(/<lastmod>([\s\S]*?)<\/lastmod>/);
    entries.set(decode(loc[1]), lastmod ? decode(lastmod[1]) : "");
  }
  return entries;
}

const onHost = (url, host) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.host === host;
  } catch {
    return false;
  }
};

/** URLs that are new since the last submission or whose lastmod moved. */
export function changedUrls(current, previous) {
  return [...current].filter(([url, lastmod]) => previous[url] !== lastmod).map(([url]) => url);
}

/** IndexNow caps a batch at 10,000 URLs, all on the key's host. */
export function buildPayloads(urls) {
  const { host } = new URL(SITE);
  const payloads = [];
  for (let i = 0; i < urls.length; i += INDEXNOW_MAX_URLS) {
    payloads.push({ host, key: INDEXNOW_KEY, keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`, urlList: urls.slice(i, i + INDEXNOW_MAX_URLS) });
  }
  return payloads;
}

async function fetchText(fetchImpl, url) {
  const res = await fetchImpl(url, { headers: HEADERS, redirect: "follow" });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.text();
}

/**
 * One submission run. `previous` null = no history: record a baseline without submitting, so a lost
 * state never turns into a backfill of the whole site; `all` is the deliberate backfill.
 * @param {{
 *   previous: Record<string, string> | null,
 *   all?: boolean,
 *   dryRun?: boolean,
 *   fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>,
 *   log?: (message: string) => void,
 * }} options
 * @returns {Promise<{ urls: string[], state: Record<string, string> | null }>} state null = leave the stored state alone
 */
export async function submitChanges({ previous, all = false, dryRun = false, fetchImpl = fetch, log = console.log }) {
  const { host } = new URL(SITE);
  const current = new Map([...parseSitemap(await fetchText(fetchImpl, `${SITE}/sitemap.xml`))].filter(([url]) => onHost(url, host)));
  if (current.size === 0) throw new Error("sitemap has no URLs; refusing to submit or overwrite state");

  // Merged, not replaced: a page missing from one sitemap response (a catalog briefly down) is not new when it returns.
  const state = { ...previous, ...Object.fromEntries(current) };
  const urls = all ? [...current.keys()] : previous ? changedUrls(current, previous) : [];
  log(`sitemap ${current.size} URLs · ${all ? "full backfill" : previous ? "new or changed" : "no history, baseline only"}: ${urls.length}`);
  if (dryRun) {
    for (const url of urls.slice(0, 50)) log(`  ${url}`);
    return { urls, state: null };
  }
  if (urls.length === 0) return { urls, state };

  // A missing key file makes IndexNow answer 403 for the whole batch; fail before submitting.
  const served = (await fetchText(fetchImpl, `${SITE}/${INDEXNOW_KEY}.txt`)).trim();
  if (served !== INDEXNOW_KEY) throw new Error(`${SITE}/${INDEXNOW_KEY}.txt does not serve the key`);

  for (const payload of buildPayloads(urls)) {
    const res = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (res.status !== 200 && res.status !== 202) {
      throw new Error(`IndexNow ${res.status}: ${(await res.text()).slice(0, 500)}`);
    }
    log(`IndexNow accepted ${payload.urlList.length} URLs (${res.status})`);
  }
  return { urls, state };
}
