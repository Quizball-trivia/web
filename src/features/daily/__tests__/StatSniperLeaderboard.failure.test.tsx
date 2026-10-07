import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatSniperLeaderboard } from "../StatSniperLeaderboard";

vi.mock("@/contexts/PlayerContext", () => ({ usePlayer: () => ({ player: null }) }));
vi.mock("@/components/AvatarDisplay", () => ({ AvatarDisplay: () => null }));

const today = new Date().toISOString().slice(0, 10);
const board = (day: string) => ({ challengeDay: day, entries: [{ userId: "public-1", rank: 1, username: "KAKA007", score: 91, country: "GE" }], me: null });

describe("StatSniperLeaderboard when loading fails", () => {
  it("says the board is unavailable instead of an empty frame", async () => {
    render(<StatSniperLeaderboard fetcher={() => Promise.reject(new Error("503"))} />);
    expect(await screen.findByRole("status")).toHaveTextContent(/available|disponible|მიუწვდომელია|kullanılamıyor/i);
  });

  it("keeps recent rows through a failed refresh, drops them once unconfirmed for 5 minutes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const fetcher = vi.fn().mockResolvedValueOnce(board(today)).mockRejectedValue(new Error("503"));
      render(<StatSniperLeaderboard fetcher={fetcher} pollMs={60_000} />);
      expect(await screen.findByText("KAKA007")).toBeInTheDocument();
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      expect(screen.getByText("KAKA007")).toBeInTheDocument(); // one failure, still recent
      await act(async () => { await vi.advanceTimersByTimeAsync(5 * 60_000); });
      expect(screen.queryByText("KAKA007")).toBeNull();
      expect(screen.getByRole("status")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
