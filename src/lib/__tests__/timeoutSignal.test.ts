import { afterEach, describe, expect, it, vi } from "vitest";
import { anySignal, timeoutSignal } from "../timeoutSignal";

const native = AbortSignal.timeout;
const nativeAny = AbortSignal.any;

afterEach(() => {
  AbortSignal.timeout = native;
  AbortSignal.any = nativeAny;
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

describe("anySignal", () => {
  it("aborts when either signal aborts, also without AbortSignal.any (Safari < 17.4)", () => {
    // @ts-expect-error simulating a browser that predates AbortSignal.any
    delete AbortSignal.any;
    const a = new AbortController();
    const b = new AbortController();
    const both = anySignal([a.signal, b.signal]);
    expect(both.aborted).toBe(false);
    b.abort("stop");
    expect(both.aborted).toBe(true);
    expect(anySignal([AbortSignal.abort("already"), new AbortController().signal]).aborted).toBe(true);
  });

  it("carries a request deadline from timeoutSignal on browsers with neither API", () => {
    vi.useFakeTimers();
    // @ts-expect-error simulating a browser that predates both
    delete AbortSignal.any;
    // @ts-expect-error simulating a browser that predates both
    delete AbortSignal.timeout;
    const signal = anySignal([new AbortController().signal, timeoutSignal(8_000)]);
    vi.advanceTimersByTime(7_999);
    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(signal.aborted).toBe(true);
  });
});
