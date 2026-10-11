import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { preload } = vi.hoisted(() => ({ preload: vi.fn() }));
vi.mock("react-dom", async (importOriginal) => ({ ...await importOriginal<typeof import("react-dom")>(), preload }));
import { WordGameHeroImage } from "../WordGameHeroImage";
import heroes from "../word-hero-assets.json";

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
    expect(preload).toHaveBeenLastCalledWith(heroes[slug].avif[750], expect.objectContaining({
      as: "image", type: "image/avif", fetchPriority: "high",
      imageSrcSet: source?.getAttribute("srcset"), imageSizes: image?.getAttribute("sizes"),
    }));
  });

  it("ships every referenced format/width under its actual content hash", () => {
    for (const variants of Object.values(heroes)) {
      for (const format of ["avif", "webp"] as const) {
        expect(Object.keys(variants[format]).map(Number)).toEqual([384, 640, 750, 1080, 1200, 1600]);
        for (const url of Object.values(variants[format])) {
          const bytes = readFileSync(path.join(process.cwd(), "public", url));
          const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
          expect(url).toContain(`.${digest}.${format}`);
        }
      }
    }
  });
});
