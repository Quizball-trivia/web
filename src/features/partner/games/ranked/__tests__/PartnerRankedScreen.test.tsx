import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { MatchResultSummary } from "@/features/game/results/results.types";
import type { GameStageRouterPartnerMode } from "@/features/game/GameStageRouter";

const locale = vi.hoisted(() => ({ value: "en" }));
const routerResult = vi.hoisted(() => ({ value: null as null | Parameters<GameStageRouterPartnerMode["renderResult"]>[0] }));

vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ locale: locale.value, t: (key: string) => key }) }));
vi.mock("@/features/game/GameStageRouter", () => ({
  GameStageRouter: ({ partner }: { partner: GameStageRouterPartnerMode }) => (
    <>{routerResult.value ? partner.renderResult(routerResult.value) : null}</>
  ),
}));
vi.mock("@/features/game/GameConnectionIndicator", () => ({ GameConnectionIndicator: () => null }));
vi.mock("@/contexts/PlayerContext", () => ({
  PlayerProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  usePlayer: () => ({ player: { username: "fc_player" }, setPlayer: vi.fn() }),
}));
vi.mock("@/components/AvatarDisplay", () => ({ AvatarDisplay: () => <div data-testid="avatar" /> }));
vi.mock("@/lib/analytics/game-events", () => ({ markRankedQueueIntent: vi.fn() }));
vi.mock("@/lib/realtime/socket-client", () => ({
  getSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn(), connected: false }),
  setRealtimeTokenSource: vi.fn(),
}));
vi.mock("@/lib/realtime/realtime-principal", () => ({
  usePartnerRealtimeStore: { getState: () => ({ setUserId: vi.fn() }) },
}));
vi.mock("../../../PartnerSessionProvider", () => ({
  usePartnerSession: () => ({ state: { status: "ready", player: { displayName: "fc_player" } } }),
}));

import { PartnerRankedScreen } from "../PartnerRankedScreen";

const summary: MatchResultSummary = {
  selfUserId: "u-self",
  playerUsername: "fc_player",
  playerAvatar: "avatar-1",
  opponentUsername: "fc_rival",
  opponentAvatar: "avatar-2",
  playerScore: 3,
  opponentScore: 1,
  playerCorrect: 8,
  opponentCorrect: 5,
  totalQuestions: 12,
  playerQuestionResults: Array.from({ length: 12 }, (_, i) => (i < 8 ? "correct" : "wrong")),
  opponentQuestionResults: Array.from({ length: 12 }, (_, i) => (i < 5 ? "correct" : "wrong")),
  finalWinnerId: "u-self",
  isDraw: false,
  winnerDecisionMethod: "goals",
};

type ResultState = { state: string; score: number | null; refunded?: boolean; outcome?: string | null };

function renderRanked(results: ResultState[]) {
  const onFinished = vi.fn();
  const onExit = vi.fn();
  let call = 0;
  const api = {
    post: vi.fn().mockResolvedValue({ accessToken: "t", expiresAt: new Date(Date.now() + 300_000).toISOString(), userId: "u-self" }),
    get: vi.fn().mockImplementation((path: string) => {
      if (path === "state") return Promise.resolve({ userId: "u-self", activePlay: null });
      const next = results[Math.min(call++, results.length - 1)]!;
      return Promise.resolve({
        playId: "play-1", matchId: "m-1", terminalCause: null, refunded: false, outcome: "win", ...next,
      });
    }),
  };
  render(<PartnerRankedScreen gameId="ranked" api={api} onFinished={onFinished} onExit={onExit} />);
  return { api, onFinished, onExit };
}

// In steps: React commits (and starts the next effect's timer or frame) between them.
async function advance(ms: number) {
  for (let left = ms; left >= 0; left -= 100) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(Math.min(100, left));
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance", "Date"],
  });
  routerResult.value = { matchId: "m-1", final: null, summary, cancelled: false };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  locale.value = "en";
});

describe("Partner ranked result", () => {
  it("shows the Quizball match result and counts the Freecroco points up, with no RP, XP or coins", async () => {
    const { onFinished } = renderRanked([{ state: "playing", score: null }, { state: "settled", score: 150 }]);
    await advance(0);

    expect(screen.getByText("Victory")).toBeTruthy();
    expect(screen.getAllByText("fc_player").length).toBeGreaterThan(0);
    expect(screen.getAllByText("fc_rival").length).toBeGreaterThan(0);
    expect(screen.getByTestId("partner-ranked-settling")).toBeTruthy();
    expect(screen.queryByTestId("partner-result-points")).toBeNull();

    await advance(1_500);
    expect(onFinished).toHaveBeenCalledWith({ playId: "play-1", score: 150 }, { ownResultScreen: true });
    const points = screen.getByTestId("partner-result-points");
    expect(points.dataset.points).toBe("150");
    expect(points.dataset.counting).toBe("true");
    expect(points.textContent).toBe("+0");

    await advance(2_500);
    expect(points.textContent).toBe("+150");
    expect(points.dataset.counting).toBe("false");
    expect(screen.getByText("points earned")).toBeTruthy();

    fireEvent.click(screen.getByText("results.matchStats"));
    expect(screen.getByText("results.accuracy")).toBeTruthy();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\bRP\b|results\.(xp|noXpEarned|levelAndXpToNext|newRank|playAgain|mainMenu|coins)|tiers\./);
  });

  it("goes back to the games through the kit's exit", async () => {
    const { onExit } = renderRanked([{ state: "settled", score: 60 }]);
    await advance(0);
    fireEvent.click(screen.getByRole("link", { name: "Back to games" }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("speaks Georgian on a loss", async () => {
    locale.value = "ka";
    routerResult.value = {
      matchId: "m-1", final: null, cancelled: false,
      summary: { ...summary, playerScore: 0, opponentScore: 2, finalWinnerId: "u-opp" },
    };
    renderRanked([{ state: "settled", score: 50, outcome: "loss" }]);
    await advance(3_000);
    expect(screen.getByText("მარცხი")).toBeTruthy();
    expect(screen.getByText("მოპოვებული ქულა")).toBeTruthy();
    expect(screen.getByRole("link", { name: "თამაშებზე დაბრუნება" })).toBeTruthy();
    expect(screen.getByTestId("partner-result-points").textContent).toBe("+50");
  });

  it("explains a cancelled match instead of showing points", async () => {
    routerResult.value = { matchId: "m-1", final: null, summary: null, cancelled: true };
    const { onFinished } = renderRanked([{ state: "cancelled", score: null, refunded: true }]);
    await advance(0);
    expect(screen.getByTestId("partner-ranked-cancelled").textContent).toContain("Your play was returned.");
    expect(screen.queryByTestId("partner-result-points")).toBeNull();
    expect(onFinished).not.toHaveBeenCalled();
  });
});
