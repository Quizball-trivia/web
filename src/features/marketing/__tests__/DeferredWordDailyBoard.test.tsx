import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ declarations: 0 }));
vi.mock("next/dynamic", () => ({
  default: () => {
    const name = state.declarations++ === 0 ? "sharedPlayer" : "nameChain";
    return ({ locale }: { locale: string }) => <div data-testid="loaded-board">{name}:{locale}</div>;
  },
}));

import { DeferredWordDailyBoard } from "../public/DeferredWordDailyBoard";

afterEach(() => vi.unstubAllGlobals());

describe("DeferredWordDailyBoard", () => {
  it.each(["sharedPlayer", "nameChain"] as const)("loads %s only when its board enters the viewport", (modeId) => {
    let notify!: IntersectionObserverCallback;
    const observe = vi.fn();
    const disconnect = vi.fn();
    const observer = { observe, disconnect };
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) { notify = callback; }
      observe = observe;
      disconnect = disconnect;
    });
    const view = render(<DeferredWordDailyBoard modeId={modeId} locale="tr" className="mt-6" />);
    expect(observe).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("loaded-board")).not.toBeInTheDocument();
    act(() => notify([{ isIntersecting: false }] as IntersectionObserverEntry[], observer as unknown as IntersectionObserver));
    expect(screen.queryByTestId("loaded-board")).not.toBeInTheDocument();
    act(() => notify([{ isIntersecting: true }] as IntersectionObserverEntry[], observer as unknown as IntersectionObserver));
    expect(screen.getByTestId("loaded-board")).toHaveTextContent(`${modeId}:tr`);
    expect(disconnect).toHaveBeenCalled();
    view.rerender(<DeferredWordDailyBoard modeId={modeId} locale="es" />);
    expect(screen.getByTestId("loaded-board")).toHaveTextContent(`${modeId}:es`);
    view.unmount();
    expect(disconnect).toHaveBeenCalledTimes(2);
  });

  it("still loads a board when IntersectionObserver is unavailable", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<DeferredWordDailyBoard modeId="nameChain" locale="ka" />);
    await waitFor(() => expect(screen.getByTestId("loaded-board")).toHaveTextContent("nameChain:ka"));
  });
});
