import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { retryableModule } from "../app-shell/shellChromeLoader";
import { useShellPopupIntent } from "../app-shell/useShellPopupIntent";

function promise<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const pending = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { pending, resolve, reject }; }
function Fixture({ loader, name = "menu" }: { loader: { load: () => Promise<string> }; name?: string }) {
  const state = useShellPopupIntent(loader);
  return <>
    <button aria-busy={state.pending} onClick={event => state.activate(event.currentTarget)}>{name}</button>
    {state.ready && <div role="menu">{state.ready.module}</div>}
    {state.failed && <div role="alert">failed</div>}
  </>;
}

describe("retryable shell module imports", () => {
  it("deduplicates pending work, caches only success, and retries a failure", async () => {
    const first = promise<string>(); const load = vi.fn().mockImplementationOnce(() => first.pending).mockResolvedValueOnce("ready");
    const loader = retryableModule(load);
    const a = loader.load(); const b = loader.load();
    expect(a).toBe(b); expect(load).toHaveBeenCalledTimes(1);
    first.reject(new Error("offline")); await expect(a).rejects.toThrow("offline"); await expect(b).rejects.toThrow("offline");
    expect(loader.peek()).toBeUndefined(); expect(await loader.load()).toBe("ready"); expect(await loader.load()).toBe("ready"); expect(load).toHaveBeenCalledTimes(2);
  });
});

describe("first-intent shell popup delivery", () => {
  it("opens on the first click after a delayed import, without synthetic clicking", async () => {
    const load = promise<string>(); render(<Fixture loader={{ load: () => load.pending }} />);
    const trigger = screen.getByRole("button"); trigger.focus(); fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-busy", "true"); expect(screen.queryByRole("menu")).toBeNull();
    await act(async () => load.resolve("opened")); expect(screen.getByRole("menu")).toHaveTextContent("opened");
  });

  it.each(["Escape", "outside pointer", "outside focus", "popstate"])("a late import cannot reopen after %s", async reason => {
    const load = promise<string>(); render(<><Fixture loader={{ load: () => load.pending }} /><button>other</button></>);
    const trigger = screen.getByRole("button", { name: "menu" }); trigger.focus(); fireEvent.click(trigger);
    if (reason === "Escape") fireEvent.keyDown(document, { key: "Escape" });
    if (reason === "outside pointer") fireEvent.pointerDown(screen.getByRole("button", { name: "other" }));
    if (reason === "outside focus") act(() => screen.getByRole("button", { name: "other" }).focus());
    if (reason === "popstate") fireEvent.popState(window);
    await act(async () => load.resolve("too late")); expect(screen.queryByRole("menu")).toBeNull(); expect(trigger).toHaveAttribute("aria-busy", "false");
    if (reason === "Escape") expect(trigger).toHaveFocus();
  });

  it("repeated activation while pending is idempotent and opens exactly once", async () => {
    const request = promise<string>(); const load = vi.fn(() => request.pending);
    render(<Fixture loader={{ load }} />); const trigger = screen.getByRole("button"); trigger.focus();
    fireEvent.click(trigger); fireEvent.click(trigger); fireEvent.click(trigger);
    expect(load).toHaveBeenCalledTimes(1); expect(trigger).toHaveAttribute("aria-busy", "true");
    await act(async () => request.resolve("opened once")); expect(screen.getAllByRole("menu")).toHaveLength(1);
  });

  it("ignores resolution after unmount/navigation and can start a fresh route intent", async () => {
    const load = promise<string>(); const loader = retryableModule(() => load.pending);
    const view = render(<Fixture key="route-a" loader={loader} />); fireEvent.click(screen.getByRole("button"));
    view.rerender(<Fixture key="route-b" loader={loader} />); view.rerender(<Fixture key="route-a-again" loader={loader} />);
    await act(async () => load.resolve("cached")); expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button")); await waitFor(() => expect(screen.getByRole("menu")).toHaveTextContent("cached"));
  });

  it("intent B supersedes A without a late popup stealing focus", async () => {
    const a = promise<string>(); const b = promise<string>(); render(<><Fixture name="A" loader={{ load: () => a.pending }} /><Fixture name="B" loader={{ load: () => b.pending }} /></>);
    const first = screen.getByRole("button", { name: "A" }); first.focus(); fireEvent.click(first);
    const second = screen.getByRole("button", { name: "B" }); act(() => second.focus()); fireEvent.click(second);
    await act(async () => { a.resolve("A"); b.resolve("B"); });
    expect(screen.getAllByRole("menu")).toHaveLength(1); expect(screen.getByRole("menu")).toHaveTextContent("B"); expect(second).toHaveFocus();
  });

  it("leaves the failed trigger usable and accepts a later successful retry", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce("retry opened");
    render(<Fixture loader={retryableModule(load)} />); const trigger = screen.getByRole("button"); trigger.focus(); fireEvent.click(trigger);
    expect(await screen.findByRole("alert")).toHaveTextContent("failed"); expect(trigger).toHaveFocus();
    fireEvent.click(trigger); expect(await screen.findByRole("menu")).toHaveTextContent("retry opened"); expect(load).toHaveBeenCalledTimes(2);
  });
});
