import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AvatarPicker } from "../components/AvatarPicker";

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "en", setLocale: vi.fn(), t: (key: string) => key }) }));
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => false }));
vi.mock("@/components/AvatarPreview", () => ({ AvatarPreview: () => null }));
// eslint-disable-next-line @next/next/no-img-element -- test stub for next/image
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: unknown; alt?: string }) => <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} /> }));
vi.mock("@/lib/queries/store.queries", () => ({
  useStoreProducts: () => ({ data: undefined }),
  useStoreInventory: () => ({ data: undefined }),
}));

/** The jersey tab's tiles in screen order, as the part ids they select. */
function jerseyTiles(ownedPartIds: string[]): string[] {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AvatarPicker open onOpenChange={vi.fn()} onSelect={vi.fn()} localPreview={{ ownedPartIds, onPurchase: vi.fn() }} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /jersey/i }));
  return screen.getAllByRole("img").map((img) => img.getAttribute("src") ?? "");
}

describe("AvatarPicker: Weekend League reward jerseys", () => {
  it("lists an owned reward jersey first, marked as a Weekend League item", () => {
    const tiles = jerseyTiles(["jersey_wl_retro_away"]);

    expect(tiles[0]).toContain("/rewards/wl-retro-playmaker/away");
    expect(tiles.filter((src) => src.includes("/rewards/"))).toHaveLength(1);
    expect(screen.getAllByText("wlRewards.eyebrow")).toHaveLength(1);
  });

  it("shows no reward jersey and no mark to a player who has not earned one", () => {
    const tiles = jerseyTiles([]);

    expect(tiles.length).toBeGreaterThan(10);
    expect(tiles.some((src) => src.includes("/rewards/"))).toBe(false);
    expect(screen.queryByText("wlRewards.eyebrow")).toBeNull();
  });
});
