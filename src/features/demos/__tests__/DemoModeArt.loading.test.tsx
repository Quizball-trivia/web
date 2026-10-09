import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src, sizes, loading, fetchPriority }: { src: string; sizes?: string; loading?: string; fetchPriority?: string }) => <span data-testid="image" data-src={src} data-sizes={sizes} data-loading={loading} data-priority={fetchPriority} />,
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
    expect(screen.getByTestId("image")).toHaveAttribute("data-loading", "eager");
    expect(screen.getByTestId("image")).toHaveAttribute("data-priority", "high");
    expect(screen.getByTestId("image")).toHaveAttribute("data-sizes", "436px");
    expect(screen.queryByTestId("fifa-art")).not.toBeInTheDocument();
  });

  it("keeps the FIFA collection illustration and masked-card mapping", () => {
    render(<DemoModeArt slug="daily-fifaCards" />);
    expect(screen.getByTestId("fifa-art")).toHaveAttribute("data-slug", "mini-guess-fifa-card");
    expect(screen.getByTestId("fifa-art")).toHaveAttribute("data-glyph", "false");
  });
});
