import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/en/squad-spin", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn(), registerAccessType: vi.fn(), currentAccessType: () => "user", identifyUser: vi.fn(), resetUser: vi.fn() }));
const liveApi = vi.hoisted(() => ({
  start: vi.fn(), current: vi.fn(async () => null), latest: vi.fn(async () => null), answer: vi.fn(), continue: vi.fn(), cashout: vi.fn(),
  heartbeat: vi.fn(async () => undefined), stats: vi.fn(async () => ({ playing_now: 0, recent_wins: [], top_runs: [] })),
}));
vi.mock("@/lib/repositories/squadSpin.repo", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/repositories/squadSpin.repo")>()), squadSpinApi: liveApi }));

const { SquadSpinPractice } = await import("../SquadSpinPractice");
const { SquadSpinLive } = await import("../SquadSpinLive");
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;

describe("Squad Spin relaxed practice", () => {
  it("plays on practice coins with no answer clock and never calls the live API", async () => {
    render(<SquadSpinPractice onExit={vi.fn()} />, { wrapper });
    expect(screen.getByText("Relaxed practice · no timer")).toBeTruthy();
    expect(screen.queryByText("Relaxed practice")).toBeNull(); // no nested practice entry inside practice
    const stakeButton = screen.getByText(/Stake 100/i).closest("button") as HTMLButtonElement;
    await waitFor(() => expect(stakeButton.disabled).toBe(false)); // the resume check has settled
    await act(async () => { fireEvent.click(stakeButton); });
    await waitFor(() => expect(screen.getByText("No timer")).toBeTruthy());
    expect(screen.getByText(/Any point in his career/)).toBeTruthy();
    expect(screen.getByText("900")).toBeTruthy(); // practice bankroll 1,000 minus the stake
    for (const fn of Object.values(liveApi)) expect(fn).not.toHaveBeenCalled();
  });

  it("offers relaxed practice from the live start card", async () => {
    const onPractice = vi.fn();
    render(<SquadSpinLive onPractice={onPractice} />, { wrapper });
    fireEvent.click(await screen.findByText("Relaxed practice"));
    expect(onPractice).toHaveBeenCalledTimes(1);
    expect(liveApi.start).not.toHaveBeenCalled();
  });
});
