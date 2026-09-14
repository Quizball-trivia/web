import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePracticeBankroll } from "../practiceBankroll";

describe("usePracticeBankroll", () => {
  it("validates every debit against the balance at call time, not the last render", () => {
    const { result } = renderHook(() => usePracticeBankroll(1_000));
    let outcomes: boolean[] = [];
    act(() => { outcomes = [result.current.debit(400), result.current.debit(400), result.current.debit(400)]; });
    expect(outcomes).toEqual([true, true, false]);
    expect(result.current.coins).toBe(200);
    expect(result.current.peek()).toBe(200);
  });

  it("keeps fractional payouts (Road to Goal settles in hundredths) and resets", () => {
    const { result } = renderHook(() => usePracticeBankroll(1_000));
    act(() => { result.current.debit(10); result.current.credit(10.3); });
    expect(result.current.coins).toBe(1_000.3);
    act(() => { result.current.reset(); });
    expect(result.current.coins).toBe(1_000);
  });

  it("rejects nonsense amounts", () => {
    const { result } = renderHook(() => usePracticeBankroll(50));
    let ok = true;
    act(() => { ok = result.current.debit(Number.NaN); result.current.credit(-5); });
    expect(ok).toBe(false);
    expect(result.current.coins).toBe(50);
  });
});
