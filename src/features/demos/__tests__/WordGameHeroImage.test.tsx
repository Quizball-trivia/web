import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { preload } = vi.hoisted(() => ({ preload: vi.fn() }));
vi.mock("react-dom", async (importOriginal) => ({ ...await importOriginal<typeof import("react-dom")>(), preload }));
import { WordGameHeroImage } from "../WordGameHeroImage";
import heroes from "../word-hero-assets.json";
import previous from "./fixtures/word-hero-assets-q40.json";

const widths = [384, 640, 672, 720, 750, 1080, 1200, 1600] as const;
// Explicit active q35 snapshot, independent of the runtime manifest.
const nameChainAvifHashes = ["021c8198bf1b", "31affa3c09f1", "8990d2165f35", "7c43d9140d1b", "3b16e17fb2da", "a20cbe4b3191", "29347c27e649", "4ac9126ffa2d"];
const bytesAt = (url: string) => readFileSync(path.join(process.cwd(), "public", url));

describe("pre-encoded word-game heroes", () => {
  it.each(["name-chain", "shared-player"] as const)("preloads the exact responsive AVIF selected by %s's picture", (slug) => {
    const view = render(<WordGameHeroImage slug={slug} sizes="(min-width: 768px) 436px, calc(100vw - 32px)" />);
    const source = view.container.querySelector("source");
    const image = view.container.querySelector("img");
    expect(source).toHaveAttribute("type", "image/avif");
    expect(image).toHaveAttribute("width", "1600");
    expect(image).toHaveAttribute("height", "900");
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("alt", "");
    expect(image?.getAttribute("srcset")).toContain(".webp 750w");
    expect(source?.getAttribute("srcset")).toContain(".avif 672w");
    expect(source?.getAttribute("srcset")).toContain(".avif 720w");
    expect(preload).toHaveBeenLastCalledWith(heroes[slug].avif[750], expect.objectContaining({
      as: "image", type: "image/avif", fetchPriority: "high",
      imageSrcSet: source?.getAttribute("srcset"), imageSizes: image?.getAttribute("sizes"),
    }));
  });

  it("ships every referenced format/width under its actual content hash", () => {
    for (const variants of Object.values(heroes)) {
      for (const format of ["avif", "webp"] as const) {
        expect(Object.keys(variants[format]).map(Number)).toEqual(widths);
        for (const url of Object.values(variants[format])) {
          const bytes = readFileSync(path.join(process.cwd(), "public", url));
          const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
          expect(url).toContain(`.${digest}.${format}`);
        }
      }
    }
  });

  it("retains every previous immutable asset, unchanged WebP/shared-player URLs and original source art", () => {
    for (const variants of Object.values(previous)) {
      for (const format of ["avif", "webp"] as const) {
        for (const url of Object.values(variants[format])) {
          const digest = createHash("sha256").update(bytesAt(url)).digest("hex").slice(0, 12);
          expect(url).toContain(`.${digest}.${format}`);
        }
      }
    }
    expect(heroes["name-chain"].webp).toEqual(previous["name-chain"].webp);
    expect(heroes["shared-player"]).toEqual(previous["shared-player"]);
    expect(createHash("sha256").update(bytesAt("/assets/demos/game-modes/son-harfle.webp")).digest("hex")).toBe("e0ffed700d3ea40f49f8bc11d0c28202d84feaf07934739d54994af666f3067f");
    expect(createHash("sha256").update(bytesAt("/assets/demos/game-modes/ortak-futbolcu.webp")).digest("hex")).toBe("39363f0b5195f2ca008d32d5e314e0a9362af3d66933b6e6443607873947f963");
  });

  it("pins all active Name Chain AVIFs and saves at least ten percent in total, without growing any width", () => {
    let oldTotal = 0;
    let newTotal = 0;
    for (const [index, width] of widths.entries()) {
      expect(heroes["name-chain"].avif[width]).toBe(`/assets/demos/word-heroes/son-harfle-${width}.${nameChainAvifHashes[index]}.avif`);
      const oldBytes = bytesAt(previous["name-chain"].avif[width]).length;
      const newBytes = bytesAt(heroes["name-chain"].avif[width]).length;
      expect(newBytes).toBeLessThan(oldBytes);
      oldTotal += oldBytes;
      newTotal += newBytes;
    }
    expect(newTotal).toBeLessThanOrEqual(oldTotal * 0.9);
  });

  it.each(["name-chain", "shared-player"] as const)("preserves %s's format and 16:9 geometry at every active width", async (slug) => {
    for (const format of ["avif", "webp"] as const) {
      for (const width of widths) {
        const bytes = bytesAt(heroes[slug][format][width]);
        const metadata = await sharp(bytes).metadata();
        expect(metadata.width).toBe(width);
        expect(metadata.height).toBe(Math.round(width * 9 / 16));
        expect(metadata.format).toBe(format === "avif" ? "heif" : "webp");
      }
    }
  });
});
