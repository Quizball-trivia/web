import { describe, expect, it } from "vitest";
import { toSoloState, type DatoFalsoDailyState } from "../datoFalso.daily";
import { toRoomView, type DatoFalsoServerView } from "../datoFalso.server";

// Invented players and clubs only (the repository is public).
const L = (en: string) => ({ en, es: `${en} (es)`, tr: en, ru: en, ka: en });
const card = { id: "c1", category: "clubs" as const, player: { name: L("Invented Player"), portrait: null }, options: [0, 1, 2, 3, 4].map((i) => ({ label: L(`Club ${i}`), art: { kind: "shirt" as const, number: i } })) };
const base: DatoFalsoDailyState = {
  day: "2031-01-01", open: true, deadline: "2031-01-01T12:00:30.000Z", serverNow: "2031-01-01T12:00:00.000Z", done: false, score: 0, ranked: true,
  card: 0, totalCards: 10, cardMs: 30_000, current: card, removed: [1, 3], doubled: true, jokers: { cut: true, double: true },
  settled: null, results: [], rights: 0, disclosed: false,
};

describe("daily adapter", () => {
  it("an open card: options by position in the reader's language, removed and doubled carried, no reveal", () => {
    const s = toSoloState(base, "es")!;
    expect(s.card.options.map((o) => o.id)).toEqual(["0", "1", "2", "3", "4"]);
    expect(s.card.subject.name).toBe("Invented Player (es)");
    expect(s.card.options[2].art).toEqual({ kind: "shirt", number: "2" });
    expect(s).toMatchObject({ removed: ["1", "3"], doubled: true, reveal: null, jokersUsed: ["cut", "double"] });
  });

  it("a settled card carries the fake, the explanation, the pick and its points; marks keep both jokers", () => {
    const r = { pick: 2, cut: true, dbl: true, right: false, pts: -1, card, fake: 4, explain: L("Never Club 4.") };
    const s = toSoloState({ ...base, open: false, current: null, settled: { ...r, reason: "pick" }, results: [r] }, "en")!;
    expect(s.reveal).toEqual({ fake: "4", explain: "Never Club 4.", pick: "2", points: -1 });
    expect(s.marks).toEqual([{ right: false, points: -1, cut: true, double: true, timedOut: false }]);
  });

  it("a finished run whose day was corrected since still builds its result (no card needed)", () => {
    const results = Array.from({ length: 10 }, () => ({ pick: 0, cut: false, dbl: false, right: true, pts: 1, card: null, fake: null, explain: null }));
    const s = toSoloState({ ...base, open: false, done: true, current: null, settled: { ...results[9], reason: "pick" }, results, score: 10 }, "en");
    expect(s).not.toBeNull();
    expect(s).toMatchObject({ status: "done", score: 10 });
    expect(s!.marks).toHaveLength(10);
  });
});

describe("room adapter", () => {
  it("maps the server view: positions as ids, my cut and pick, other seats' jokers only as the server reports them", () => {
    const v: DatoFalsoServerView = {
      phase: "card", card: 3, totalCards: 10, current: { ...card, player: { name: "Invented Player", portrait: null }, options: card.options.map((o) => ({ label: o.label.en, art: o.art })) },
      seats: [
        { seat: 0, status: "in", answered: true, idle: false, score: 2, jokers: { cut: true, double: false } },
        { seat: 1, status: "away", answered: false, idle: false, score: 1, jokers: { cut: false, double: false } },
      ],
      mySeat: 0, mine: { pick: 4, removed: [0, 2], doubled: false, jokers: { cut: true, double: false } },
      reveal: null, results: [], standings: null, deadline: "2031-01-01T12:00:20.000Z",
    };
    const r = toRoomView(v);
    expect(r).toMatchObject({ index: 3, format: "duel", myPick: "4", removed: ["0", "2"], reveal: null, final: false });
    expect(r.seats[1]).toMatchObject({ status: "away", jokersUsed: [] });
  });
});
