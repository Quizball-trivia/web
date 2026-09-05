import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RoadToGoalState } from "@/lib/repositories/roadToGoal.repo";

const mocks = vi.hoisted(() => ({
  current: vi.fn(),
  get: vi.fn(),
  prepare: vi.fn(),
  start: vi.fn(),
  answer: vi.fn(),
  continue: vi.fn(),
  cashout: vi.fn(),
  proof: vi.fn(),
  heartbeat: vi.fn(),
  refetchWallet: vi.fn(),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="road-scene" />,
}));
vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, {
    get: () => ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  }),
}));
vi.mock("../MiniGameShell", () => ({
  MiniGameShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
  StatPill: () => null,
}));
vi.mock("../../lib/i18n", () => ({ useMiniLocale: () => "en" }));
vi.mock("@/lib/queries/store.queries", () => ({
  useStoreWallet: () => ({
    data: { coins: 1_000, tickets: 0 },
    isError: false,
    refetch: mocks.refetchWallet,
  }),
}));
vi.mock("@/lib/repositories/roadToGoal.repo", () => ({
  RoadToGoalApiError: class RoadToGoalApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
  roadToGoalApi: mocks,
}));
vi.mock("@/lib/features/roadToGoalProof", () => ({
  verifyRoadToGoalCommitmentEnvelope: vi.fn().mockResolvedValue(true),
  verifyRoadToGoalProof: vi.fn().mockResolvedValue(true),
}));

import { RoadToGoal } from "../RoadToGoal";

const terminalState = {
  round_id: "round-1",
  status: "lost",
  phase: "terminal",
  state_version: 6,
  stake_coins: 25,
  cleared_zones: 2,
  payout_coins: null,
  auto_cashout_zone: null,
  current_multiplier_bp: 10_800,
  next_multiplier_bp: 11_500,
  current_return_coins: 27,
  next_return_coins: 28.75,
  question: null,
} as unknown as RoadToGoalState;

describe("RoadToGoal live recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.current.mockResolvedValue(null);
    mocks.get.mockResolvedValue(terminalState);
    mocks.prepare.mockResolvedValue({ commitment_id: "commitment-1" });
    mocks.proof.mockResolvedValue({ commit_hash: "commit", server_seed: "seed", zones: [] });
    mocks.refetchWallet.mockResolvedValue(undefined);
  });

  it("renders a reconciled tackled state without requiring a current question", async () => {
    mocks.current.mockResolvedValue(terminalState);

    render(<RoadToGoal live />);

    expect(await screen.findByText("Tackled!")).toBeInTheDocument();
    expect(screen.queryByText(/Correct answer:/)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.proof).toHaveBeenCalledWith("round-1");
      expect(mocks.refetchWallet).toHaveBeenCalled();
    });
  });

  it("describes a final-zone loss as a keeper save", async () => {
    mocks.current.mockResolvedValue({ ...terminalState, cleared_zones: 10 });
    render(<RoadToGoal live />);
    expect(await screen.findByText("Saved!")).toBeInTheDocument();
    expect(screen.getByText("The keeper saved your final shot. Your stake is gone.")).toBeInTheDocument();
    expect(screen.queryByText("Tackled!")).not.toBeInTheDocument();
  });

  it("reuses the same start nonce after an ambiguous failure", async () => {
    mocks.start.mockRejectedValue(new TypeError("network unavailable"));
    mocks.get.mockResolvedValue(null);

    render(<RoadToGoal live />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Kick off for 25" })).not.toBeDisabled();
    });
    const kickOff = screen.getByRole("button", { name: "Kick off for 25" });
    fireEvent.click(kickOff);
    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Kick off for 25" })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "Kick off for 25" }));
    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(2));

    expect(mocks.prepare.mock.calls[1][0].requestNonce)
      .toBe(mocks.prepare.mock.calls[0][0].requestNonce);
    expect(mocks.start.mock.calls[1][0].clientNonce)
      .toBe(mocks.start.mock.calls[0][0].clientNonce);
  });

  it("recovers a terminal round after reload when current has no active round", async () => {
    window.localStorage.setItem("quizball:road-to-goal:last-round", "round-1");

    render(<RoadToGoal live newRunsEnabled={false} />);

    expect(await screen.findByText("Tackled!")).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith("round-1");
    expect(screen.queryByRole("button", { name: "Kick off for 25" })).not.toBeInTheDocument();
  });
});
