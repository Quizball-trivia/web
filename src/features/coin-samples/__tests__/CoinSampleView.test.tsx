import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/en/football-games/x", useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn(), registerAccessType: vi.fn(), currentAccessType: () => "guest", identifyUser: vi.fn(), resetUser: vi.fn() }));
vi.mock("@/features/mini-games/lib/crowdAudio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/mini-games/lib/crowdAudio")>();
  const silenced = Object.fromEntries(Object.entries(actual).map(([k, v]) => [k, typeof v === "function" && k.startsWith("play") ? vi.fn() : v]));
  return { ...actual, ...silenced };
});

// The Free Kicks pitch measures itself (react-use-measure); jsdom has no ResizeObserver.
class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

const { CoinSampleView } = await import("../CoinSampleView");

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;

describe("CoinSampleView", () => {
  const fetchSpy = vi.fn();
  beforeEach(() => { vi.stubGlobal("fetch", fetchSpy); });
  afterEach(() => { fetchSpy.mockReset(); });

  it.each(["trivia_mines", "squad_spin", "free_kicks", "road_to_goal"] as const)("%s renders the real screen with practice coins and makes no request", async (game) => {
    const onEvent = vi.fn();
    render(<CoinSampleView game={game} modeId={game} backHref="/back" playPath="/play" onExit={vi.fn()} onEvent={onEvent} onLeaveToRealGame={vi.fn()} />, { wrapper });
    await waitFor(() => expect(document.body.textContent).toMatch(/1,000|1 000|1\.000|1000/));
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onEvent).not.toHaveBeenCalled();
  });
});
