import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src, sizes, loading, preload, fetchPriority, quality }: { src: string; sizes?: string; loading?: string; preload?: boolean; fetchPriority?: string; quality?: number }) => <span data-testid="image" data-src={src} data-sizes={sizes} data-loading={loading} data-preload={String(Boolean(preload))} data-fetchpriority={fetchPriority} data-quality={quality} />,
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/features/fifa-universe/FifaModeArtLazy", () => ({ FifaModeArtLazy: ({ slug, glyph }: { slug: string; glyph: boolean }) => <span data-testid="fifa-art" data-slug={slug} data-glyph={String(glyph)} /> }));
import { DemoModeArt } from "../DemoModeArt";

describe("DemoModeArt loading", () => {
  it.each(["shared-player", "name-chain"])("prioritises only explicitly marked %s artwork", (slug) => {
    const view = render(<DemoModeArt slug={slug} />);
    expect(screen.getByTestId("image")).toHaveAttribute("data-loading", "lazy");
    expect(screen.getByTestId("image")).not.toHaveAttribute("data-priority");
    view.rerender(<DemoModeArt slug={slug} priority sizes="436px" />);
    const image = view.container.querySelector("picture img");
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
    expect(image).toHaveAttribute("sizes", "436px");
    expect(image?.getAttribute("src")).toMatch(/\/assets\/demos\/word-heroes\/.+\.webp$/);
    expect(screen.queryByTestId("fifa-art")).not.toBeInTheDocument();
  });

  it("retains next/image for priority artwork outside the two word games", () => {
    render(<DemoModeArt slug="buscaminas" priority sizes="436px" />);
    expect(screen.getByTestId("image")).toHaveAttribute("data-preload", "true");
    expect(screen.getByTestId("image")).toHaveAttribute("data-quality", "60");
  });

  it("keeps the FIFA collection illustration and masked-card mapping", () => {
    render(<DemoModeArt slug="daily-fifaCards" />);
    expect(screen.getByTestId("fifa-art")).toHaveAttribute("data-slug", "mini-guess-fifa-card");
    expect(screen.getByTestId("fifa-art")).toHaveAttribute("data-glyph", "false");
  });
});
