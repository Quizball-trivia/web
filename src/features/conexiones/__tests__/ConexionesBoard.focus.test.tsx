import { act, render, screen } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConexionesGrid } from "../ConexionesBoard";
import type { CxBoard } from "../conexiones.logic";

// Invented players only.
const board: CxBoard = { id: "b", tiles: Array.from({ length: 16 }, (_, i) => ({ id: `t${i}`, name: `Invented Player${i}` })), groups: [] };
const order = board.tiles.map((t) => t.id);

function reducedMotionSetting(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() { return query.includes("reduce") && matches; }, media: query,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb), removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    addListener: (cb: () => void) => listeners.add(cb), removeListener: (cb: () => void) => listeners.delete(cb),
  }));
  return (next: boolean) => { matches = next; listeners.forEach((cb) => cb()); };
}

describe("conexiones grid", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("a miss shakes the picked tiles without taking keyboard focus away", () => {
    const view = (selected: string[], shakeKey?: number) => (
      <ConexionesGrid board={board} order={order} solved={[]} selected={selected} locale="en" disabled={false} shakeKey={shakeKey} bandTone={() => "tier"} onToggle={() => undefined} />
    );
    const { rerender } = render(view(["t0", "t1", "t2", "t3"]));
    act(() => rerender(view(["t0", "t1", "t2", "t3"], 1)));
    const tile = screen.getAllByRole("button")[0];
    tile.focus();
    expect(document.activeElement).toBe(tile);
    // The player unpicks the focused tile after the miss: the same button keeps focus.
    act(() => rerender(view(["t1", "t2", "t3"], undefined)));
    expect(document.activeElement).toBe(tile);
    expect(tile.getAttribute("aria-pressed")).toBe("false");
  });

  it("a group found is read out when it is added; the groups shown unfound at a board's end are not", () => {
    const band = (groupId: string, at: number, missed: boolean) => ({ groupId, tier: 1 as const, link: { en: `Invented link ${groupId}` }, note: null, members: order.slice(at, at + 4), by: missed ? null : 0, missed });
    const view = (solved: ReturnType<typeof band>[]) => (
      <ConexionesGrid board={board} order={order.slice(solved.length * 4)} solved={solved} selected={[]} locale="en" disabled={false} bandTone={() => "tier"} onToggle={() => undefined} />
    );
    const { rerender } = render(view([]));
    const region = document.querySelector("[data-cx-grid] > [aria-live='polite']");
    expect(region).not.toBeNull();
    act(() => rerender(view([band("g1", 0, false)])));
    expect(region?.querySelector("[data-cx-solved='g1']")).not.toBeNull();
    // The fourth mistake: the rest shown, outside the region.
    act(() => rerender(view([band("g1", 0, false), band("g2", 4, true), band("g3", 8, true), band("g4", 12, true)])));
    expect(document.querySelector("[data-cx-solved='g2']")).not.toBeNull();
    expect(document.querySelector("[data-cx-solved='g2']")?.closest("[aria-live]")).toBeNull();
    // Tiles are outside it too: a shuffle is not read out.
    act(() => rerender(view([])));
    expect(screen.getAllByRole("button")[0].closest("[aria-live]")).toBeNull();
  });

  // QA round 3 N8: the setting is read live, also inside the room shell, whose MotionConfig "user" is read once per element.
  it("a wrong try shakes again after reduced motion is switched off mid-game, and not while it is on", async () => {
    const set = reducedMotionSetting(true);
    const view = (shakeKey?: number) => (
      <MotionConfig reducedMotion="user">
        <ConexionesGrid board={board} order={order} solved={[]} selected={["t0", "t1", "t2", "t3"]} locale="en" disabled={false} shakeKey={shakeKey} bandTone={() => "tier"} onToggle={() => undefined} />
      </MotionConfig>
    );
    const { rerender } = render(view());
    const wrapper = () => screen.getAllByRole("button")[0].parentElement as HTMLElement;
    const moved = async () => {
      let most = 0;
      for (let i = 0; i < 12; i++) {
        await act(() => new Promise((r) => setTimeout(r, 16)));
        most = Math.max(most, Math.abs(parseFloat(/translateX\((-?[\d.]+)px\)/.exec(wrapper().style.transform)?.[1] ?? "0")));
      }
      return most;
    };
    act(() => rerender(view(1)));
    expect(await moved()).toBe(0);
    act(() => set(false));
    act(() => rerender(view(2)));
    expect(await moved()).toBeGreaterThan(0);
  });
});
