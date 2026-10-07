import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TriviaMinesPartner } from "../TriviaMinesPartner";
import type { PartnerTriviaMinesWireState } from "../partnerTriviaMinesClient";

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: "en", t: (key: string) => key }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const wire = (over: Partial<PartnerTriviaMinesWireState>): PartnerTriviaMinesWireState => ({
  run_id: "run-1", play_id: "play-1", status: "active", phase: "picking", state_version: 3, start_points: 100,
  max_points: 1000, points: 100, next_points: 115, mult_bp: 10000, opened: [], flagged: [], bust_tile: null,
  scouts_left: 3, board_size: 25, defender_count: 4, question: null, score: null, settlement_reason: null,
  reveal: null, server_now: new Date().toISOString(), ...over,
});

function renderWith(current: PartnerTriviaMinesWireState) {
  const onFinished = vi.fn();
  const onExit = vi.fn();
  const api = { get: vi.fn().mockResolvedValue(current), post: vi.fn().mockResolvedValue(undefined) };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TriviaMinesPartner gameId="trivia-mines" api={api} onFinished={onFinished} onExit={onExit} />
    </QueryClientProvider>,
  );
  return { onFinished, onExit, api };
}

describe("Trivia Mines partner screen", () => {
  it("a returned play shows 'Play returned' (no points, no result sent) and offers play again or exit", async () => {
    const { onFinished, onExit } = renderWith(
      wire({ status: "cancelled", phase: "settled", points: 0, settlement_reason: "left_unused", reveal: { defenders: [1, 2, 3, 4] } }),
    );
    const panel = await screen.findByTestId("trivia-mines-play-returned");
    expect(panel.textContent).toContain("Play returned");
    expect(panel.textContent).not.toMatch(/\d/);
    expect(screen.queryByTestId("trivia-mines-finish")).toBeNull();
    expect(screen.queryByText("triviaMines.refunded")).toBeNull();
    expect(screen.queryByText("triviaMines.tackled")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to games" }));
    expect(onExit).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(await screen.findByTestId("trivia-mines-start-points")).toBeTruthy();
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("a scored run reports its play and score to the host", async () => {
    const { onFinished } = renderWith(
      wire({ status: "cashed", phase: "settled", score: 138, points: 138, opened: [0, 1], reveal: { defenders: [5, 6, 7, 8] } }),
    );
    fireEvent.click(await screen.findByTestId("trivia-mines-finish"));
    expect(onFinished).toHaveBeenCalledWith({ playId: "play-1", score: 138 });
  });

  it("a play cancelled by a block leaves for the home without a result", async () => {
    const { onFinished, onExit } = renderWith(
      wire({ status: "cancelled", phase: "settled", settlement_reason: "play_cancelled", reveal: { defenders: [1, 2, 3, 4] } }),
    );
    await waitFor(() => expect(onExit).toHaveBeenCalled());
    expect(onFinished).not.toHaveBeenCalled();
  });
});
