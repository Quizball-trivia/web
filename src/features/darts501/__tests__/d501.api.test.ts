import { describe, expect, it, vi } from "vitest";
import { DailyGameApiError } from "@/lib/repositories/dailyGameApi";
import { isTransientFailure, withRetry } from "../d501.api";

const noWait = async () => undefined;

describe("isTransientFailure", () => {
  it("asks again after no answer, a 5xx or an unreadable session; never after the server's own 4xx answer", () => {
    expect(isTransientFailure(new TypeError("Failed to fetch"))).toBe(true);
    expect(isTransientFailure(Object.assign(new Error("timeout"), { name: "TimeoutError" }))).toBe(true);
    expect(isTransientFailure(new DailyGameApiError("darts501_content_unavailable", 503))).toBe(true);
    expect(isTransientFailure(new DailyGameApiError("Request failed (502)", 502))).toBe(true);
    expect(isTransientFailure(new DailyGameApiError("session_unavailable", 0))).toBe(true);
    expect(isTransientFailure(new DailyGameApiError("Day not available", 404))).toBe(false);
    expect(isTransientFailure(new DailyGameApiError("guest_session_required", 401))).toBe(false);
    expect(isTransientFailure(new DailyGameApiError("RATE_LIMIT_EXCEEDED", 429))).toBe(false);
  });
});

describe("withRetry", () => {
  it("opens the game after a timed-out first try (the production failure) without showing an error", async () => {
    const read = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("signal timed out"), { name: "TimeoutError" }))
      .mockRejectedValueOnce(new DailyGameApiError("darts501_content_unavailable", 503))
      .mockResolvedValueOnce({ days: { "2026-10-30": 7 } });
    const waits: number[] = [];
    await expect(withRetry(read, [600, 1_500], async (ms) => { waits.push(ms); })).resolves.toEqual({ days: { "2026-10-30": 7 } });
    expect(read).toHaveBeenCalledTimes(3);
    expect(waits).toEqual([600, 1_500]);
  });

  it("gives up after the last retry with the last error (the screen then offers Try again and Exit)", async () => {
    const error = new DailyGameApiError("Request failed (504)", 504);
    const read = vi.fn().mockRejectedValue(error);
    await expect(withRetry(read, [1, 1], noWait)).rejects.toBe(error);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("does not repeat a 4xx", async () => {
    const read = vi.fn().mockRejectedValue(new DailyGameApiError("Day not available", 404));
    await expect(withRetry(read, [1, 1], noWait)).rejects.toMatchObject({ status: 404 });
    expect(read).toHaveBeenCalledTimes(1);
  });
});
