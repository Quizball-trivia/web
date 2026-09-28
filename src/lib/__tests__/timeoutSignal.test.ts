import { afterEach, describe, expect, it, vi } from "vitest";
import { timeoutSignal } from "../timeoutSignal";

const native = AbortSignal.timeout;

afterEach(() => {
  AbortSignal.timeout = native;
  vi.useRealTimers();
});

describe("timeoutSignal", () => {
  it("uses AbortSignal.timeout where the browser has it", () => {
    const spy = vi.fn((ms: number) => native.call(AbortSignal, ms));
    AbortSignal.timeout = spy;
    timeoutSignal(1_000);
    expect(spy).toHaveBeenCalledWith(1_000);
  });

  it("still times out on browsers without it (Safari 15)", () => {
    vi.useFakeTimers();
    // @ts-expect-error simulating a browser that predates AbortSignal.timeout
    delete AbortSignal.timeout;
    const signal = timeoutSignal(5_000);
    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(4_999);
    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(signal.aborted).toBe(true);
    expect((signal.reason as DOMException).name).toBe("TimeoutError");
  });
});
