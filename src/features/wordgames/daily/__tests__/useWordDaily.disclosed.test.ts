import { describe, expect, it } from "vitest";
import { replacesShown } from "../useWordDaily";
import type { WordRun, WordRunStateBase } from "../wordDaily.api";

type State = WordRunStateBase & { disclosed?: boolean };
const at = (version: number, disclosed?: boolean, id = "r1"): WordRun<State> => ({
  run: { id, version },
  state: { day: "2026-11-01", open: false, deadline: null, serverNow: "2026-11-02T03:00:00.000Z", done: true, score: 1, ranked: true, disclosed },
});

describe("replacesShown", () => {
  it("a newer version or another run replaces; an older one never does", () => {
    expect(replacesShown(null, at(1))).toBe(true);
    expect(replacesShown(at(2), at(3))).toBe(true);
    expect(replacesShown(at(3), at(2))).toBe(false);
    expect(replacesShown(at(3, true), at(1, false, "r2"))).toBe(true);
  });

  it("a same-version reply never takes back the answers the day's close disclosed", () => {
    // The last guess, answered before the close, arrives after the midnight read of the same version.
    expect(replacesShown(at(5, true), at(5, false))).toBe(false);
    expect(replacesShown(at(5, false), at(5, true))).toBe(true);
    expect(replacesShown(at(5), at(5))).toBe(true);
  });
});
