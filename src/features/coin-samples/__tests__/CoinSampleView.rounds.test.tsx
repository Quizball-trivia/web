import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { TriviaMinesSampleClient } from "../engines/triviaMines";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/en/x", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn(), registerAccessType: vi.fn(), currentAccessType: () => "guest", identifyUser: vi.fn(), resetUser: vi.fn() }));
// The live screen is replaced by a stub that drives the injected engine directly.
vi.mock("@/features/trivia-mines/TriviaMinesLive", () => ({
  TriviaMinesLive: ({ client, sample }: { client: TriviaMinesSampleClient; sample: { coins: number } }) => {
    const play = async (stake: number) => {
      let s = await client.start(stake, "n");
      for (let tile = 0; tile < 25 && s.status === "active"; tile += 1) {
        const r = await client.pick(s.round_id, tile, s.state_version).catch(() => null);
        if (r) s = r.state;
      }
    };
    return (
      <div>
        <span data-testid="screen">screen {sample.coins}</span>
        <button onClick={() => void client.start(500, "n")}>stake500</button>
        <button onClick={() => void play(500)}>lose500</button>
      </div>
    );
  },
}));

const { CoinSampleView } = await import("../CoinSampleView");
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;

describe("CoinSampleView rounds", () => {
  it("keeps an open round on screen even when the balance drops below the minimum, and re-emits start after replay", async () => {
    const onEvent = vi.fn();
    render(<CoinSampleView game="trivia_mines" modeId="m" title="ტრივია-მაღაროები" backHref="/b" playPath="/p" onExit={vi.fn()} onEvent={onEvent} onLeaveToRealGame={vi.fn()} />, { wrapper });
    await act(async () => { fireEvent.click(screen.getByText("lose500")); });
    await waitFor(() => expect(screen.getByText(/Play again/i)).toBeTruthy());
    expect(screen.getByText("ტრივია-მაღაროები")).toBeTruthy(); // the page's own title, not the app catalogue
    expect(onEvent.mock.calls.map((c) => c[0])).toEqual(["start", "complete"]);
    expect(onEvent.mock.calls[1][1]).toMatchObject({ outcome: "lost", stake: 500, payout: 0, balance: 500 });

    await act(async () => { fireEvent.click(screen.getByText(/Play again/i)); });
    expect(screen.getByTestId("screen").textContent).toBe("screen 500");
    await act(async () => { fireEvent.click(screen.getByText("stake500")); });
    // Balance is 0 with a round open: the game stays mounted; the out-of-coins card must not replace it.
    expect(screen.getByTestId("screen").textContent).toBe("screen 0");
    expect(screen.queryByText(/Play again/i)).toBeNull();
    expect(onEvent.mock.calls.map((c) => c[0])).toEqual(["start", "complete", "replay", "start"]);
  });
});
