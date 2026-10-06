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

  it("drops an earlier day's rows on a failed refresh, keeps today's", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const old = vi.fn().mockResolvedValueOnce(board("2020-01-01")).mockRejectedValue(new Error("503"));
      const { unmount } = render(<StatSniperLeaderboard fetcher={old} pollMs={1000} />);
      expect(await screen.findByText("KAKA007")).toBeInTheDocument();
      await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
      expect(screen.queryByText("KAKA007")).toBeNull();
      unmount();

      const fresh = vi.fn().mockResolvedValueOnce(board(today)).mockRejectedValue(new Error("503"));
      render(<StatSniperLeaderboard fetcher={fresh} pollMs={1000} />);
      expect(await screen.findByText("KAKA007")).toBeInTheDocument();
      await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
      expect(screen.getByText("KAKA007")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
