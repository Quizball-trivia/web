import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { findPublicGameByModeId } from "@/lib/seo/public-games";
import { PublicGameScreen } from "../PublicGameScreen";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/en/football-games/football-tic-tac-toe",
}));
vi.mock("@/stores/auth.store", () => ({ useAuthStore: (selector: (s: { status: string }) => unknown) => selector({ status: "anonymous" }) }));
vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/realtime/realtime-principal", () => ({ ensureGuestPrincipal: vi.fn(async () => null) }));
vi.mock("@/features/demos/DemoModeArt", () => ({ DemoModeArt: () => <div data-testid="art" /> }));
vi.mock("../public/PublicTopTen", () => ({ PublicTopTen: ({ board }: { board: string }) => <div data-testid="top-ten">{board}</div> }));
vi.mock("../public/PublicGameEmbed", () => ({
  PublicGameEmbed: ({ copy, variant }: { copy: { start: string }; variant?: string }) => <button type="button" data-variant={variant ?? "card"}>{copy.start}</button>,
}));

const grid = findPublicGameByModeId("grid")!;
const auction = findPublicGameByModeId("auction")!;
const ranked = findPublicGameByModeId("ranked")!;

describe("PublicGameScreen — Tic Tac Toe / Auction bot-play layout", () => {
  it.each([grid, auction])("$slug: Play now in the hero, Play training in the bottom card, Play ranked above the Top 10", (game) => {
    render(<PublicGameScreen game={game} locale="en" />);
    expect(screen.getByRole("button", { name: /Play now/ })).toBeInTheDocument();
    expect(screen.getByText("Quick match")).toBeInTheDocument();
    // The scripted training launcher moved into the bottom card (inline, no double chrome).
    const training = screen.getByRole("button", { name: "Play training" });
    expect(training.getAttribute("data-variant")).toBe("inline");
    expect(screen.getByRole("heading", { name: "Play training" })).toBeInTheDocument();
    // Sign-up CTA sits in column 2, before the board.
    const ranked = screen.getByRole("link", { name: "Play ranked" });
    expect(ranked.getAttribute("href")).toBe("/play?signin=1");
    const board = screen.getByTestId("top-ten");
    expect(ranked.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The old "Play online" account card is gone on these two pages.
    expect(screen.queryByRole("heading", { name: "Play online" })).toBeNull();
  });

  it("ranked page keeps its layout: no Play now, training launcher in the hero, Play online card", () => {
    render(<PublicGameScreen game={ranked} locale="en" />);
    expect(screen.queryByRole("button", { name: /Play now/ })).toBeNull();
    expect(screen.queryByRole("link", { name: "Play ranked" })).toBeNull();
    expect(screen.getByRole("button", { name: "Play training" }).getAttribute("data-variant")).toBe("card");
    expect(screen.getByRole("heading", { name: "Play online" })).toBeInTheDocument();
  });
});
