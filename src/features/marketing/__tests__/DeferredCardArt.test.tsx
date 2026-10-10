import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeferredCardArt } from "../public/DeferredCardArt";

vi.mock("@/features/demos/DemoModeArt", () => ({
  DemoModeArt: (props: Record<string, unknown>) => <div data-testid="art" data-props={JSON.stringify(props)} />,
}));

afterEach(() => vi.unstubAllGlobals());

describe("DeferredCardArt", () => {
  it("retains a full-size slot but requests artwork only near the viewport", () => {
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
    act(() => notify([{ isIntersecting: false }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(screen.queryByTestId("art")).not.toBeInTheDocument();
    act(() => notify([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
    expect(JSON.parse(screen.getByTestId("art").dataset.props!)).toEqual({ slug: "pistas", sizes: "200px", className: "size-full" });
    expect(disconnect).toHaveBeenCalledOnce();
    view.unmount();
    expect(disconnect).toHaveBeenCalledTimes(2);
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
});
