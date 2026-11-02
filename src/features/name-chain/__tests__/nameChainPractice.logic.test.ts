import { describe, expect, it } from "vitest";
import { applyPractice, bestOf, emptyPractice, namedIn, practiceRequest, PRACTICE_USED_MAX, type PracticeStepResponse } from "../nameChainPractice.logic";

const link = (pid: string, given = false) => ({ pid, name: pid.toUpperCase(), game: pid.toUpperCase(), given });
const res = (over: Partial<PracticeStepResponse>): PracticeStepResponse => ({ alphabet: "latin", result: null, links: [], letter: "", last: null, could: [], exhausted: false, ...over });

describe("name chain relaxed practice", () => {
  it("starts a chain, then sends the chain's tail and every used name with each answer", () => {
    expect(practiceRequest(emptyPractice(), "en", { op: "start" })).toEqual({ op: "start", locale: "en", used: [] });
    // No chain yet: nothing to answer or end.
    expect(practiceRequest(emptyPractice(), "en", { op: "answer", answer: "x" })).toBeNull();
    const s = applyPractice(emptyPractice(), "start", res({ links: [link("bako", true)], letter: "O" }));
    expect(s).toMatchObject({ letter: "O", used: ["bako"], ended: null });
    expect(practiceRequest(s, "es", { op: "answer", answer: "Orlen" })).toEqual({ op: "answer", locale: "es", used: ["bako"], tail: "bako", answer: "Orlen" });
  });

  it("a refused answer keeps the letter and the chain: try again for as long as you like", () => {
    const s = applyPractice(emptyPractice(), "start", res({ links: [link("bako", true)], letter: "O" }));
    const wrong = applyPractice(s, "answer", res({ result: "letter", letter: "O", last: { kind: "letter", text: "Kato", name: "Kato", starts: ["K"] } }));
    expect(wrong).toMatchObject({ letter: "O", links: s.links, attempt: 1, ended: null, last: { kind: "letter" } });
    const ok = applyPractice(wrong, "answer", res({ result: "ok", links: [link("orlen")], letter: "N", last: { kind: "ok", text: "orlen", name: "Orlen", starts: [] } }));
    expect(ok).toMatchObject({ letter: "N", used: ["bako", "orlen"], attempt: 2 });
    expect(namedIn(ok)).toBe(1);
  });

  it("ending the chain keeps the names that would have answered, and counts the chain", () => {
    let s = applyPractice(emptyPractice(), "start", res({ links: [link("bako", true)], letter: "O" }));
    s = applyPractice(s, "answer", res({ result: "ok", links: [link("orlen")], letter: "N" }));
    s = applyPractice(s, "pass", res({ could: ["Nurak", "Nesto"] }));
    expect(s.ended).toEqual({ could: ["Nurak", "Nesto"], named: 1 });
    expect(s.results).toEqual([1]);
    expect(practiceRequest(s, "en", { op: "pass" })).toBeNull();
    // A new chain keeps the session's used names, so nobody comes back too soon.
    expect(practiceRequest(s, "en", { op: "start" })).toMatchObject({ used: ["bako", "orlen"] });
    const next = applyPractice(s, "start", res({ links: [link("lumar", true)], letter: "R" }));
    expect(next).toMatchObject({ ended: null, results: [1], used: ["bako", "orlen", "lumar"], last: null });
    expect(bestOf(next)).toBe(1);
  });

  it("a supplied fresh name joins the chain without counting as the player's", () => {
    const s = applyPractice(emptyPractice(), "start", res({ links: [link("bako", true)], letter: "O" }));
    const out = applyPractice(s, "answer", res({ result: "ok", links: [link("orlen"), link("lumar", true)], letter: "R" }));
    expect(out.links.map((l) => l.pid)).toEqual(["bako", "orlen", "lumar"]);
    expect(namedIn(out)).toBe(1);
  });

  it("ends when the release has nobody left to start from", () => {
    const s = applyPractice(emptyPractice(), "start", res({ exhausted: true }));
    expect(s).toMatchObject({ links: [], ended: { could: [], named: 0 } });
  });

  it("never sends more used names than the server takes", () => {
    const many = Array.from({ length: PRACTICE_USED_MAX + 50 }, (_, i) => `p${i}`);
    const s = { ...emptyPractice(), used: many, links: [link(`p${many.length - 1}`)] };
    const body = practiceRequest(s, "en", { op: "answer", answer: "x" });
    expect(body?.used).toHaveLength(PRACTICE_USED_MAX);
    expect(body?.used.at(-1)).toBe(`p${many.length - 1}`);
  });
});
