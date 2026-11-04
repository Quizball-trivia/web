import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => "/en/free-kicks", useSearchParams: () => new URLSearchParams() }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn(), registerAccessType: vi.fn(), currentAccessType: () => "user", identifyUser: vi.fn(), resetUser: vi.fn() }));
vi.mock("../../lib/crowdAudio", () => ({ getSoundLevels: () => ({ sfx: 0, crowd: 0 }), playCash: vi.fn(), playKick: vi.fn(), setCrowdLevel: vi.fn(), setCrowdMood: vi.fn(), setSfxLevel: vi.fn(), startCrowd: vi.fn(), stopCrowd: vi.fn() }));
const wallet = vi.hoisted(() => ({ value: { data: { coins: 1000 } as { coins: number } | undefined, isError: false, refetch: vi.fn() } }));
vi.mock("@/lib/queries/store.queries", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/queries/store.queries")>()), useStoreWallet: () => wallet.value }));
const api = vi.hoisted(() => ({ start: vi.fn(), current: vi.fn(async () => null), latest: vi.fn(async () => null), stats: vi.fn(async () => null), heartbeat: vi.fn(async () => undefined) }));
vi.mock("@/lib/repositories/freeKicks.repo", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/repositories/freeKicks.repo")>()), freeKicksApi: api }));

const { FinalThird } = await import("../FinalThird");
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
const practiceButton = async () => (await screen.findByText("Free practice run")).closest("button") as HTMLButtonElement;

afterEach(() => { cleanup(); wallet.value = { data: { coins: 1000 }, isError: false, refetch: vi.fn() }; });

describe("Free Kicks practice entry on the live bet screen", () => {
  it("stays available when the wallet is too low to stake or cannot be read", async () => {
    wallet.value = { data: { coins: 2 }, isError: false, refetch: vi.fn() };
    const onPractice = vi.fn();
    render(<FinalThird live onPractice={onPractice} />, { wrapper });
    const first = await practiceButton();
    await waitFor(() => expect(first.disabled).toBe(false));
    fireEvent.click(first);
    expect(onPractice).toHaveBeenCalledTimes(1);
    cleanup();
    wallet.value = { data: undefined, isError: true, refetch: vi.fn() };
    render(<FinalThird live onPractice={onPractice} />, { wrapper });
    const second = await practiceButton();
    await waitFor(() => expect(second.disabled).toBe(false));
  });

  it("is locked until a staked round that may be live has finished resuming", async () => {
    let answer: (round: null) => void = () => {};
    api.current.mockImplementationOnce(() => new Promise<null>((resolve) => { answer = resolve; }));
    const onPractice = vi.fn();
    render(<FinalThird live onPractice={onPractice} />, { wrapper });
    const practice = await practiceButton();
    expect(practice.disabled).toBe(true);
    fireEvent.click(practice);
    expect(onPractice).not.toHaveBeenCalled();
    await act(async () => { answer(null); });
    await waitFor(() => expect(practice.disabled).toBe(false));
  });

  it("is locked while a paid start is waiting on the server", async () => {
    api.start.mockImplementationOnce(() => new Promise(() => {}));
    const onPractice = vi.fn();
    render(<FinalThird live onPractice={onPractice} />, { wrapper });
    const practice = await practiceButton();
    const stake = (await screen.findByText(/& attack/i)).closest("button") as HTMLButtonElement;
    await waitFor(() => expect(stake.disabled).toBe(false));
    await act(async () => { fireEvent.click(stake); });
    expect(api.start).toHaveBeenCalledTimes(1);
    expect(practice.disabled).toBe(true);
    fireEvent.click(practice);
    expect(onPractice).not.toHaveBeenCalled();
  });
});
