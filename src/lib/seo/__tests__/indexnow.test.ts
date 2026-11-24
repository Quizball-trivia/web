// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { INDEXNOW_ENDPOINT, INDEXNOW_KEY, INDEXNOW_MAX_URLS, buildPayloads, parseSitemap, submitChanges } from "../../../../scripts/lib/indexnow.mjs";

const xml = (entries: Array<[string, string?]>) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(([loc, lastmod]) => `<url>\n<loc>${loc}</loc>\n${lastmod ? `<lastmod>${lastmod}</lastmod>\n` : ""}<changefreq>weekly</changefreq>\n</url>`).join("\n")}
</urlset>`;

function fakeWeb(sitemap: string, { submitStatus = 202, keyBody = INDEXNOW_KEY } = {}) {
  const submissions: Array<{ urlList: string[]; keyLocation: string; host: string }> = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    if (url === INDEXNOW_ENDPOINT && init?.method === "POST") {
      submissions.push(JSON.parse(String(init.body)));
      return new Response("", { status: submitStatus });
    }
    if (url === "https://quizball.io/sitemap.xml") return new Response(sitemap);
    if (url === `https://quizball.io/${INDEXNOW_KEY}.txt`) return new Response(keyBody);
    return new Response("", { status: 404 });
  };
  return { fetchImpl, submissions };
}
const quiet = () => {};

describe("IndexNow", () => {
  it("serves the key from public/ at the root, as keyLocation says", () => {
    const file = path.resolve(__dirname, `../../../../public/${INDEXNOW_KEY}.txt`);
    expect(fs.readFileSync(file, "utf8").trim()).toBe(INDEXNOW_KEY);
    expect(buildPayloads(["https://quizball.io/ru"])[0]).toMatchObject({
      host: "quizball.io",
      key: INDEXNOW_KEY,
      keyLocation: `https://quizball.io/${INDEXNOW_KEY}.txt`,
    });
  });

  it("reads loc and lastmod, decoding XML entities", () => {
    expect([...parseSitemap(xml([["https://quizball.io/ru/futbolnaya-viktorina", "2026-11-20"], ["https://quizball.io/en?a=1&amp;b=2"]]))]).toEqual([
      ["https://quizball.io/ru/futbolnaya-viktorina", "2026-11-20"],
      ["https://quizball.io/en?a=1&b=2", ""],
    ]);
  });

  it("splits batches at the IndexNow limit", () => {
    const urls = Array.from({ length: INDEXNOW_MAX_URLS + 1 }, (_, i) => `https://quizball.io/p${i}`);
    expect(buildPayloads(urls).map((p) => p.urlList.length)).toEqual([INDEXNOW_MAX_URLS, 1]);
  });

  it("without history records a baseline and submits nothing", async () => {
    const web = fakeWeb(xml([["https://quizball.io/a"], ["https://quizball.io/b", "2026-11-20"]]));
    const run = await submitChanges({ previous: null, fetchImpl: web.fetchImpl, log: quiet });
    expect(web.submissions).toEqual([]);
    expect(run.state).toEqual({ "https://quizball.io/a": "", "https://quizball.io/b": "2026-11-20" });
  });

  it("submits only new URLs and moved lastmods, on quizball.io only", async () => {
    const web = fakeWeb(xml([
      ["https://quizball.io/a"],
      ["https://quizball.io/b", "2026-11-21"],
      ["https://quizball.io/c", "2026-11-21"],
      ["https://quizball.io/new"],
      ["https://preview.example/x"],
      ["http://quizball.io/insecure"],
    ]));
    const previous = { "https://quizball.io/a": "", "https://quizball.io/b": "2026-11-01", "https://quizball.io/c": "2026-11-21" };
    const run = await submitChanges({ previous, fetchImpl: web.fetchImpl, log: quiet });
    expect(web.submissions.map((s) => s.urlList)).toEqual([["https://quizball.io/b", "https://quizball.io/new"]]);
    expect(Object.keys(run.state!)).not.toContain("https://preview.example/x");
  });

  it("keeps history for pages missing from one response, so they are not resubmitted when they return", async () => {
    const previous = { "https://quizball.io/a": "", "https://quizball.io/fr/quiz": "2026-11-01" };
    const partial = await submitChanges({ previous, fetchImpl: fakeWeb(xml([["https://quizball.io/a"]])).fetchImpl, log: quiet });
    expect(partial.state).toEqual(previous);
    const recovered = fakeWeb(xml([["https://quizball.io/a"], ["https://quizball.io/fr/quiz", "2026-11-01"]]));
    await submitChanges({ previous: partial.state, fetchImpl: recovered.fetchImpl, log: quiet });
    expect(recovered.submissions).toEqual([]);
  });

  it("leaves state alone on a rejected submission, a missing key file, an empty sitemap and a dry run", async () => {
    const sitemap = xml([["https://quizball.io/new"]]);
    await expect(submitChanges({ previous: {}, fetchImpl: fakeWeb(sitemap, { submitStatus: 403 }).fetchImpl, log: quiet })).rejects.toThrow("IndexNow 403");
    const noKey = fakeWeb(sitemap, { keyBody: "<html>not found</html>" });
    await expect(submitChanges({ previous: {}, fetchImpl: noKey.fetchImpl, log: quiet })).rejects.toThrow("does not serve the key");
    expect(noKey.submissions).toEqual([]);
    await expect(submitChanges({ previous: {}, fetchImpl: fakeWeb(xml([])).fetchImpl, log: quiet })).rejects.toThrow("no URLs");
    const dry = fakeWeb(sitemap);
    expect((await submitChanges({ previous: {}, dryRun: true, fetchImpl: dry.fetchImpl, log: quiet })).state).toBeNull();
    expect(dry.submissions).toEqual([]);
  });

  it("--all backfills every URL regardless of history", async () => {
    const web = fakeWeb(xml([["https://quizball.io/a"], ["https://quizball.io/b"]]));
    await submitChanges({ previous: { "https://quizball.io/a": "", "https://quizball.io/b": "" }, all: true, fetchImpl: web.fetchImpl, log: quiet });
    expect(web.submissions[0].urlList).toEqual(["https://quizball.io/a", "https://quizball.io/b"]);
  });
});
