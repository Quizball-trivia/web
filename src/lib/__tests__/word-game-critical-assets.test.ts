import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import fontAssets from "../word-game-font-assets.json";
import { isWordGameLandingPath, wordGameFontPreloads } from "../word-game-critical-assets";

describe("word-game font discovery", () => {
  it.each([
    "/en/football-games/football-name-chain", "/en/football-games/played-for-both-clubs",
    "/es/juegos-de-futbol/cadena-de-futbolistas", "/es/juegos-de-futbol/jugador-en-comun",
    "/ka/football-games/football-name-chain",
    "/en/football-games/football-horserace", "/es/juegos-de-futbol/carrera-de-caballos-futbolera", "/ka/football-games/football-horserace",
    "/en/football-games/football-codenames", "/es/juegos-de-futbol/codenames-futbolero", "/ka/football-games/football-codenames",
  ])("preloads only the four Latin weights used above the fold on %s", (url) => {
    const urls = wordGameFontPreloads(url);
    expect(urls).toHaveLength(4);
    expect(new Set(urls).size).toBe(4);
    expect(urls.every((value) => value.includes("poppins-latin-"))).toBe(true);
  });

  it.each(["/ka/football-games/played-for-both-clubs", "/ka/football-games/played-for-both-clubs/"])("keeps %s in the word shell while letting CSS discover required fonts", (url) => {
    expect(isWordGameLandingPath(url)).toBe(true);
    expect(wordGameFontPreloads(url)).toEqual([]);
  });

  it.each(["/tr/futbol-oyunlari/son-harfle-futbolcu", "/tr/futbol-oyunlari/ortak-futbolcu-oyunu/", "/tr/futbol-oyunlari/futbol-at-yarisi", "/tr/futbol-oyunlari/futbol-codenames"])("also discovers Turkish glyphs early on %s", (url) => {
    const urls = wordGameFontPreloads(url);
    expect(urls).toHaveLength(8);
    expect(urls.filter((value) => value.includes("latin-ext"))).toHaveLength(4);
  });

  it.each(["/en", "/play", "/store", "/en/football-games/buscaminas", "/en/football-games/football-name-chain-extra"])("does not preload speculative fonts on %s", (url) => {
    expect(wordGameFontPreloads(url)).toEqual([]);
  });

  it("preserves all original Poppins weights/subsets, CSS rules and license", () => {
    const css = readFileSync(path.join(process.cwd(), "src/styles/poppins.css"), "utf8");
    expect(Object.keys(fontAssets)).toHaveLength(18);
    for (const weight of [400, 500, 600, 700, 800, 900]) {
      const original = readFileSync(path.join(process.cwd(), `node_modules/@fontsource/poppins/${weight}.css`), "utf8");
      const normalize = (value: string) => value.replace(/url\([^)]+\)/g, "url(ASSET)").trim();
      expect(normalize(css)).toContain(normalize(original));
    }
    for (const url of Object.values(fontAssets)) {
      const bytes = readFileSync(path.join(process.cwd(), "public", url));
      expect(url).toContain(`.${createHash("sha256").update(bytes).digest("hex").slice(0, 12)}.woff2`);
    }
    expect(readFileSync(path.join(process.cwd(), "public/assets/fonts/poppins/LICENSE.txt"), "utf8")).toContain("SIL OPEN FONT LICENSE");
  });
});
