import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PartnerGameTile } from "../api/partnerApi.types";
import { PartnerGameCard, partnerTileState } from "../components/PartnerGameCard";

const tile = (overrides: Partial<PartnerGameTile> = {}): PartnerGameTile => ({
  gameId: "true-false",
  playsLimit: 1,
  playsUsed: 1,
  playsLeft: 0,
  maxScore: 200,
  available: true,
  inProgress: false,
  ...overrides,
});

describe("partner game card", () => {
  it("a play left midway stays reachable even with no plays left", () => {
    expect(partnerTileState(tile({ inProgress: true }))).toBe("playable");
    expect(partnerTileState(tile())).toBe("done");
    expect(partnerTileState(tile({ available: false, inProgress: true }))).toBe("coming_soon");
    // Ranked resumes through its own card; the flag does not turn a spent ranked tile playable.
    expect(partnerTileState(tile({ gameId: "ranked", inProgress: true }))).toBe("done");
  });

  it("shows Continue and links into the game", () => {
    render(<PartnerGameCard tile={tile({ inProgress: true })} locale="en" index={0} />);
    const card = screen.getByTestId("partner-game-card");
    expect(card.tagName).toBe("A");
    expect(card.getAttribute("data-state")).toBe("playable");
    expect(card).toHaveTextContent("Continue");
  });

  it("in Georgian says გაგრძელება; a finished day is still Done for today without a link", () => {
    const { unmount } = render(<PartnerGameCard tile={tile({ inProgress: true })} locale="ka" index={0} />);
    expect(screen.getByTestId("partner-game-card")).toHaveTextContent("გაგრძელება");
    unmount();
    render(<PartnerGameCard tile={tile()} locale="en" index={0} />);
    const done = screen.getByTestId("partner-game-card");
    expect(done.tagName).toBe("DIV");
    expect(done).toHaveTextContent("Done for today");
  });
});
