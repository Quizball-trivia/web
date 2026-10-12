import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import { DeferredCardArt } from "../public/DeferredCardArt";

const loading = vi.hoisted(() => ({ calls: vi.fn(), wait: null as Promise<void> | null }));
vi.mock("next/dynamic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/dynamic")>();
  return {
    default: <P,>(loader: () => Promise<ComponentType<P>>, options: { ssr?: boolean }) => actual.default(() => {
      loading.calls();
      return (loading.wait ?? Promise.resolve()).then(loader);
    }, options),
  };
});

vi.mock("@/features/demos/DemoModeArt", () => ({
  DemoModeArt: (props: Record<string, unknown>) => <div data-testid="art" data-props={JSON.stringify(props)} />,
}));

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); loading.wait = null; });

describe("DeferredCardArt", () => {
  it("does not load code until intersection, and uses the latest props while the chunk is pending", async () => {
    let finish!: () => void;
    loading.wait = new Promise<void>((resolve) => { finish = resolve; });
    let notify!: IntersectionObserverCallback;
    let options: IntersectionObserverInit | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback, init?: IntersectionObserverInit) { notify = callback; options = init; }
      observe = observe;
      disconnect = disconnect;
    });
    const view = render(<DeferredCardArt slug="pistas" sizes="200px" className="size-full" />);
    expect(view.container.firstChild).toHaveClass("size-full");
    expect(options).toEqual({ rootMargin: "200px" });
    expect(observe).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("art")).not.toBeInTheDocument();
    expect(loading.calls).not.toHaveBeenCalled();
    view.rerender(<DeferredCardArt slug="name-chain" sizes="300px" className="size-full" />);
    act(() => notify([{ isIntersecting: false }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(screen.queryByTestId("art")).not.toBeInTheDocument();
    expect(loading.calls).not.toHaveBeenCalled();
    act(() => notify([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(loading.calls).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("art")).not.toBeInTheDocument();
    view.rerender(<DeferredCardArt slug="shared-player" sizes="400px" className="size-full" />);
    await act(async () => { finish(); });
    expect(JSON.parse((await screen.findByTestId("art")).dataset.props!)).toEqual({ slug: "shared-player", sizes: "400px", className: "size-full" });
    expect(disconnect).toHaveBeenCalledOnce();
    act(() => notify([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(loading.calls).toHaveBeenCalledOnce();
    view.unmount();
    // Includes the deliberately repeated notification after disconnect.
    expect(disconnect).toHaveBeenCalledTimes(3);
  });

  it("updates visible artwork when the related game changes", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const view = render(<DeferredCardArt slug="pistas" sizes="200px" />);
    await screen.findByTestId("art");
    view.rerender(<DeferredCardArt slug="name-chain" sizes="300px" />);
    expect(JSON.parse(screen.getByTestId("art").dataset.props!)).toEqual({ slug: "name-chain", sizes: "300px" });
  });

  it("still loads artwork when IntersectionObserver is unavailable", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<DeferredCardArt slug="pistas" sizes="200px" />);
    await waitFor(() => expect(screen.getByTestId("art")).toBeInTheDocument());
  });

  it("cancels the no-observer fallback when unmounted before the timer", () => {
    vi.useFakeTimers();
    vi.stubGlobal("IntersectionObserver", undefined);
    const pendingTimers = vi.getTimerCount();
    const view = render(<DeferredCardArt slug="pistas" sizes="200px" />);
    expect(vi.getTimerCount()).toBe(pendingTimers + 1);
    view.unmount();
    // Inspect the pending timer itself: a cached dynamic loader cannot prove cleanup.
    expect(vi.getTimerCount()).toBe(pendingTimers);
    act(() => { vi.runAllTimers(); });
    expect(vi.getTimerCount()).toBe(pendingTimers);
  });
});
