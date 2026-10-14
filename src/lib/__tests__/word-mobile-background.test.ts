// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { wordMobileBackgroundEnabled } from "../../../scripts/lib/word-mobile-background";
import assets from "../word-mobile-background-assets.json";
import originalAssets from "../app-background-assets.json";

const on = { QB_EXPERIMENTAL_WORD_BACKGROUND: "1", VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "staging", QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "0", QB_EXPERIMENTAL_LOCALE_ASSET_SEED: "0" };
describe("guarded word mobile background", () => {
  it("marks only an eligible non-partner staging environment, independently of the first URL", () => {
    expect(wordMobileBackgroundEnabled(on, null)).toBe(true);
    expect(wordMobileBackgroundEnabled(on, "freecroco")).toBe(false);
    expect(wordMobileBackgroundEnabled({}, null)).toBe(false);
  });
  it.each(Object.keys(on))("fails closed for missing/malformed %s", key => {
    for (const value of [undefined, "", "true", `${on[key as keyof typeof on]} `, `${on[key as keyof typeof on]}\n`]) {
      expect(wordMobileBackgroundEnabled({ ...on, [key]: value }, null)).toBe(false);
    }
  });
  it.each([{ VERCEL_ENV: "production" }, { VERCEL_ENV: "development" }, { VERCEL_GIT_COMMIT_REF: "main" }, { VERCEL_GIT_COMMIT_REF: "feature/preview" }, { QB_EXPERIMENTAL_WORD_BACKGROUND: "0" }, { QB_EXPERIMENTAL_STARTUP_REQUEST_LIMIT: "1" }, { QB_EXPERIMENTAL_LOCALE_ASSET_SEED: "1" }])("never enables another configuration %j", changes => {
    expect(wordMobileBackgroundEnabled({ ...on, ...changes }, null)).toBe(false);
  });
  it("ships density-safe immutable same-source artwork with alpha and smaller bytes", async () => {
    const image = readFileSync(`public${assets.href}`);
    const source = readFileSync("public/assets/bg-pattern.webp");
    const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
    expect(assets.href).toContain(`.${hash(image).slice(0, 12)}.avif`);
    expect(assets.sourceSHA256).toBe(hash(source));
    expect(image.length).toBe(assets.bytes);
    expect(image.length).toBeLessThanOrEqual(readFileSync(`public${originalAssets.patternAvif}`).length - 7000);
    const original = await sharp(source).metadata(), candidate = await sharp(image).metadata();
    expect(candidate.width).toBe(1080);
    expect(candidate.height).toBe(1907);
    expect(candidate.hasAlpha).toBe(true);
    expect(candidate.width!).toBeGreaterThanOrEqual(540 * 2);
    expect(candidate.height!).toBeGreaterThanOrEqual(950 * 2);
    expect(Math.abs(candidate.width! / candidate.height! - original.width! / original.height!)).toBeLessThan(0.0001);
    const css = readFileSync("src/styles/word-mobile-background.css", "utf8");
    for (const value of ['body[data-qb-word-background="1"] .qb-word-mobile-background', "max-width: 540px", "max-height: 950px", "max-resolution: 2dppx", assets.href, "type('image/webp')"]) expect(css).toContain(value);
  });
});
