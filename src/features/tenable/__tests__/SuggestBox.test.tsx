import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SuggestBox } from "../SuggestBox";
import { toSoloState } from "../tenable.adapt";
import type { TenableServerRun } from "../tenable.api";

// Invented names only: the repository is public.
const NAMES = [{ eid: "p1", label: "Milo Vantar", qualifier: "ARG · 1990" }, { eid: "p2", label: "Milo Varden", qualifier: null }];
const box = (lookup = vi.fn(async (_k: string, _r: string, q: string) => NAMES.filter((n) => n.label.toLowerCase().startsWith(q.toLowerCase()))), onSubmit = vi.fn()) => {
  render(<SuggestBox kind="player" release="rel" placeholder="Who is on the list?" say="Send" lookup={lookup} onSubmit={onSubmit} />);
  return { input: screen.getByRole("combobox"), lookup, onSubmit };
};
const type = async (input: HTMLElement, text: string) => { fireEvent.change(input, { target: { value: text } }); await waitFor(() => undefined); };

describe("SuggestBox", () => {
  it("a picked suggestion is sent with its id; pointer-down alone picks nothing", async () => {
    const { input, onSubmit } = box();
    await type(input, "Milo");
    const option = await screen.findByRole("option", { name: /Milo Vantar/ });
    fireEvent.pointerDown(option);
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(option);
    expect(onSubmit).toHaveBeenCalledWith("Milo Vantar", "p1");
  });

  it("editing the text drops the highlighted pick at once: Enter sends what is typed", async () => {
    const slow = vi.fn((_k: string, _r: string, q: string) => (q === "Milo" ? Promise.resolve(NAMES) : new Promise<never>(() => undefined)));
    const { input, onSubmit } = box(slow);
    await type(input, "Milo");
    await screen.findAllByRole("option");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant");
    await type(input, "Dago Ravin");
    expect(screen.queryByRole("option")).toBeNull();
    fireEvent.submit(input.closest("form")!);
    expect(onSubmit).toHaveBeenCalledWith("Dago Ravin", null);
  });

  it("a new list (another kind or release) with the same text drops the old options and highlight", async () => {
    const onSubmit = vi.fn();
    const lookup = vi.fn((_k: string, release: string) => (release === "rel" ? Promise.resolve(NAMES) : new Promise<never>(() => undefined)));
    const props = { placeholder: "Who is on the list?", say: "Send", lookup, onSubmit };
    const { rerender } = render(<SuggestBox kind="player" release="rel" {...props} />);
    const input = screen.getByRole("combobox");
    await type(input, "Milo");
    await screen.findAllByRole("option");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    rerender(<SuggestBox kind="manager" release="rel-2" {...props} />);
    expect(screen.queryByRole("option")).toBeNull();
    expect(input).not.toHaveAttribute("aria-activedescendant");
    fireEvent.submit(input.closest("form")!);
    expect(onSubmit).toHaveBeenCalledWith("Milo", null);
  });

  it("Enter that confirms an input-method composition sends nothing", async () => {
    const { input, onSubmit } = box();
    await type(input, "Milo");
    // The browser's own Enter (implicit form submission) is cancelled; a normal Enter is not.
    expect(fireEvent.keyDown(input, { key: "Enter", keyCode: 229 })).toBe(false);
    expect(fireEvent.keyDown(input, { key: "Enter" })).toBe(true);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Escape closes the suggestions without reaching the game's own Escape", async () => {
    const outer = vi.fn();
    document.addEventListener("keydown", outer);
    const { input } = box();
    await type(input, "Milo");
    await screen.findAllByRole("option");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("option")).toBeNull();
    expect(outer).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(outer).toHaveBeenCalledTimes(1);
    document.removeEventListener("keydown", outer);
  });

  it("a failed lookup is not kept: the same text asks again", async () => {
    let calls = 0;
    const flaky = vi.fn(async (...args: [string, string, string]) => { void args; calls += 1; if (calls === 1) throw new Error("suggest 429"); return NAMES; });
    const { input } = box(flaky);
    await type(input, "Mil");
    await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
    expect(screen.queryByRole("option")).toBeNull();
    await type(input, "Mi");
    await type(input, "Mil");
    expect(await screen.findAllByRole("option")).toHaveLength(2);
    expect(flaky.mock.calls.filter((c) => c[2] === "Mil").length).toBe(2);
  });

  it("long labels are sent cut to the answer cap (the id decides)", async () => {
    const long = [{ eid: "p9", label: `Milo ${"x".repeat(80)}`, qualifier: null }];
    const { input, onSubmit } = box(vi.fn(async () => long));
    await type(input, "Milo xx");
    fireEvent.click(await screen.findByRole("option"));
    expect(onSubmit.mock.calls[0][0]).toHaveLength(60);
    expect(onSubmit.mock.calls[0][1]).toBe("p9");
  });
});

describe("toSoloState", () => {
  it("keeps the server's score when a corrected day sends no slots", () => {
    const run = {
      day: "2026-10-14", open: false, deadline: null, serverNow: "", done: true, score: 6, ranked: false,
      list: { title: { es: "L", en: "L", ka: "L", tr: "L" }, note: null, asOf: null, kind: "player", release: "r" },
      slots: [], lives: 1, maxLives: 3, misses: [], last: null, end: "lives", disclosed: true,
    } as unknown as TenableServerRun;
    expect(toSoloState(run, "en").score).toBe(6);
  });
});
