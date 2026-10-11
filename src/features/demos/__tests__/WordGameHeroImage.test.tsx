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

// Existing artwork must not silently change when adding responsive widths.
const originalWidths = [384, 640, 750, 1080, 1200, 1600];
const originalHashes = {
  "name-chain": {
    avif: ["9339e142254b", "7110d7a1a033", "ea05d04742c1", "06deb4a0637c", "dbff2ef13526", "23636a6b2117"],
    webp: ["bc3dde1cc729", "4a9fffa3624a", "9a6b001a3ead", "a01e9197a299", "b5a105fb7212", "2a0092e28e71"],
  },
  "shared-player": {
    avif: ["120244a57476", "304aaea0a20c", "78e01c0c444a", "ff9673ca0c86", "efef84404afb", "123e1d8587f1"],
    webp: ["040120326c6b", "a2202bda6440", "214066c9e28d", "d30f22b344c4", "49b6c3c16201", "66110a0c7530"],
  },
};

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
        expect(Object.keys(variants[format]).map(Number)).toEqual([384, 640, 672, 720, 750, 1080, 1200, 1600]);
        for (const url of Object.values(variants[format])) {
          const bytes = readFileSync(path.join(process.cwd(), "public", url));
          const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
          expect(url).toContain(`.${digest}.${format}`);
        }
      }
    }
  });

  it.each(["name-chain", "shared-player"] as const)("preserves %s's original bytes and sufficient 16:9 intermediate widths", async (slug) => {
    for (const format of ["avif", "webp"] as const) {
      for (const [index, width] of originalWidths.entries()) {
        const url = (heroes[slug][format] as Record<number, string>)[width];
        expect(url).toContain(`.${originalHashes[slug][format][index]}.${format}`);
      }
      for (const width of [672, 720] as const) {
        const bytes = readFileSync(path.join(process.cwd(), "public", heroes[slug][format][width]));
        const metadata = await sharp(bytes).metadata();
        expect(metadata.width).toBe(width);
        expect(metadata.height).toBe(width * 9 / 16);
        expect(metadata.format).toBe(format === "avif" ? "heif" : "webp");
      }
    }
  });
});
