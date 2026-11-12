/**
 * The REAL Mentalista room screens, drawn from the EXACT backend view (no transform, no invented field). The literals
 * below are the backend `MentalistaView` / `MentalistaResult` shape; a screen that read an invented field (`mine`,
 * `picks`, `chooser`) would read `undefined` here and the assertion would fail. Invented option names only.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MentalistaBoard, MentalistaResults } from "../MentalistaRoom";
import type { MentalistaResult, MentalistaView } from "../mentalista.server";
import { mentalistaCopy, type MentalistaCopy } from "../mentalista.copy";
import { mentalistaRoomCopy, type MentalistaRoomCopy } from "../mentalista.room.copy";
import { LOCALES } from "@/lib/i18n/locale";
import type { RoomStatePayload, RoomSeatPayload } from "@/lib/realtime/socket.types";

afterEach(cleanup);

const DEADLINE = "2026-11-09T12:00:30.000Z";
const NOW = Date.parse("2026-11-09T12:00:10.000Z"); // 20 s left

function view(over: Partial<MentalistaView> = {}): MentalistaView {
  return {
    phase: "choose",
    round: 0,
    totalRounds: 6,
    chooserSeat: 0,
    category: { id: "cat-a", prompt: "Which one?", options: [{ id: "o0", name: "Alpha" }, { id: "o1", name: "Bravo" }, { id: "o2", name: "Charlie" }] },
    iAmChooser: true,
    seats: [
      { seat: 0, status: "in", isChooser: true, committed: false, predicted: false, score: 0 },
      { seat: 1, status: "in", isChooser: false, committed: false, predicted: false, score: 0 },
      { seat: 2, status: "in", isChooser: false, committed: false, predicted: false, score: 0 },
    ],
    mySeat: 0,
    myChoice: null,
    myPrediction: null,
    reveal: null,
    results: [],
    standings: null,
    deadline: DEADLINE,
    ...over,
  };
}

const seatRow = (seat: number): RoomSeatPayload => ({
  seat, slot: seat, userId: `u${seat}`, username: `Player${seat}`, avatarUrl: null,
  avatarCustomization: null, isGuest: true, ready: true, connected: true, admitted: true, active: true,
});

function snapshot(): RoomStatePayload {
  return {
    matchId: "m1", lobbyId: "l1", game: "mentalista", stateVersion: 1, status: "active",
    phaseToken: 1, phaseDeadlineAt: DEADLINE, serverNow: "2026-11-09T12:00:10.000Z",
    me: { userId: "u0", admitted: true, active: true, seat: 0, slot: 0, ready: true },
    seats: [seatRow(0), seatRow(1), seatRow(2)], view: null, result: null,
  };
}

function room(over: Partial<Parameters<typeof MentalistaBoard>[0]["room"]> = {}) {
  return {
    send: vi.fn(), nowMs: () => NOW, inFlight: 0, retained: null, connected: true,
    resendRetained: vi.fn(), leave: vi.fn(), isSlotPending: () => false, ...over,
  };
}

const board = (v: MentalistaView, r = room()) =>
  render(<MentalistaBoard view={v} snapshot={snapshot()} room={r} locale="en" error={null} />);

describe("mentalista board — choose phase", () => {
  it("the chooser picks an option and locks exactly { type:'choose', round, option }", () => {
    const r = room();
    board(view(), r);
    expect(screen.getByText("Pick one — secretly")).toBeTruthy();
    fireEvent.click(screen.getByText("Alpha"));
    fireEvent.click(screen.getByRole("button", { name: "Lock it in" }));
    expect(r.send).toHaveBeenCalledWith({ type: "choose", round: 0, option: 0 });
  });

  it("every role sees the same public options during choose; only the chooser can interact", () => {
    // A predictor during the choose phase sees Alpha/Bravo/Charlie, all disabled.
    board(view({ iAmChooser: false, mySeat: 1, seats: view().seats }));
    const opts = screen.getAllByRole("button").filter((b) => b.getAttribute("data-mv-option") !== null);
    expect(opts.map((b) => b.textContent)).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(opts.every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it("a committed chooser is locked; an offline chooser is told so instead of a live lock", () => {
    board(view({ myChoice: 1 }));
    expect(screen.getByText(/Locked in/)).toBeTruthy();
    cleanup();
    board(view(), room({ connected: false }));
    expect(screen.getByRole("button", { name: /No connection/i })).toBeTruthy();
  });
});

describe("mentalista board — predict phase", () => {
  const predicting = (over: Partial<MentalistaView> = {}) =>
    view({ phase: "predict", iAmChooser: false, chooserSeat: 0, mySeat: 1, ...over });

  it("a predictor locks exactly { type:'predict', round, option } for option 0", () => {
    const r = room();
    board(predicting(), r);
    fireEvent.click(screen.getByText("Alpha"));
    fireEvent.click(screen.getByRole("button", { name: "Lock it in" }));
    expect(r.send).toHaveBeenCalledWith({ type: "predict", round: 0, option: 0 });
  });

  it("the chooser still sees their own committed choice while being read, with no lock control", () => {
    board(view({ phase: "predict", iAmChooser: true, chooserSeat: 0, mySeat: 0, myChoice: 2 }));
    const charlie = screen.getByText("Charlie").closest("button");
    expect(charlie?.getAttribute("data-mv-mine")).toBe("true");
    // The chooser is not the actor this phase: no lock button is offered to them.
    expect(screen.queryByRole("button", { name: /Lock it in|Pick an option/ })).toBeNull();
  });
});

describe("mentalista board — reveal", () => {
  const reveal = (over: Partial<MentalistaResult> = {}): MentalistaResult => ({
    round: 0, chooser: 0, target: 1, voided: false,
    entries: [{ seat: 1, prediction: 1, matched: true, points: 2 }, { seat: 2, prediction: 0, matched: false, points: 0 }],
    ...over,
  });

  it("shows the chooser's actual target and each seat's real prediction + points", () => {
    const seats = view().seats.map((s) => ({ ...s, score: s.seat === 1 ? 2 : 0 }));
    board(view({ phase: "reveal", iAmChooser: false, mySeat: 1, seats, reveal: reveal(), results: [reveal()] }));
    // The committed target is option 1 (Bravo); the server's reveal, not a client guess, marks it.
    expect(document.querySelector('[data-mv-option="1"]')?.getAttribute("data-mv-target")).toBe("true");
    expect(document.querySelector('[data-mv-option="0"]')?.getAttribute("data-mv-target")).toBeNull();
    expect(screen.getByText("Read it!")).toBeTruthy();
    expect(screen.getAllByText("+2").length).toBeGreaterThan(0);
  });

  it("a voided round says no pick was made and scores nobody", () => {
    board(view({ phase: "reveal", iAmChooser: false, mySeat: 1, reveal: reveal({ target: null, voided: true, entries: [{ seat: 1, prediction: 2, matched: false, points: 0 }, { seat: 2, prediction: null, matched: false, points: 0 }] }) }));
    expect(screen.getByText(/No pick was made/)).toBeTruthy();
    expect(document.querySelector('[data-mv-target]')).toBeNull();
    expect(screen.queryByText("Read it!")).toBeNull();
  });
});

describe("mentalista board — reveal rows layout", () => {
  const revealData = (): MentalistaResult => ({
    round: 0, chooser: 0, target: 1, voided: false,
    entries: [
      { seat: 1, prediction: 0, matched: false, points: 0 },
      { seat: 2, prediction: 1, matched: true, points: 2 },
    ],
  });

  it("long name and long prediction appear in full DOM, prediction on its own <p> without truncate", () => {
    const longName = "გიორგიმიხეილძეტექნოლოგიურიუნივერსიტეტისგრძელიგვარი";
    const longPred = "ანდრეაბარსელონელიძალიანგრძელივარიანტირომელიც";

    const customSnap = (): RoomStatePayload => ({
      ...snapshot(),
      seats: [seatRow(0), { ...seatRow(1), username: longName }, seatRow(2)],
    });

    // viewer is seat2; longName is seat1; seat2 matched (points 2), seat1 missed (points 0)
    const v = view({
      phase: "reveal", iAmChooser: false, mySeat: 2,
      seats: view().seats.map((s) => ({ ...s, score: s.seat === 2 ? 2 : 0 })),
      reveal: revealData(), results: [revealData()],
      category: {
        id: "cat-a", prompt: "Which one?",
        options: [
          { id: "o0", name: longPred },
          { id: "o1", name: "Bravo" },
          { id: "o2", name: "Charlie" },
        ],
      },
    });

    render(<MentalistaBoard view={v} snapshot={customSnap()} room={room()} locale="en" error={null} />);

    // Name in full DOM (seat1 is not "You" because mySeat=2)
    const nameEl = screen.getAllByText(longName).find((el) => Boolean(el.closest("li")?.querySelector("[data-room-score-source]")));
    expect(nameEl).toBeTruthy();
    expect(nameEl!.className).not.toMatch(/truncate/);
    expect(nameEl!.className).toMatch(/break-words/);

    // Prediction on its own <p> element within the reveal row for seat1, not truncated
    const revealRow = nameEl!.closest("li");
    expect(revealRow).toBeTruthy();
    const predP = revealRow!.querySelector("p");
    expect(predP).toBeTruthy();
    expect(predP!.textContent).toBe(longPred);
    expect(predP!.className).not.toMatch(/truncate/);
    expect(predP!.className).toMatch(/break-words/);
  });
});

describe("mentalista board — authoritative lock supersedes stale local selection", () => {
  it("after a rerender with myPrediction set, only the authoritative option is aria-pressed", () => {
    // Non-chooser taps Alpha (selected=0 locally), then rerender arrives with myPrediction=1 (Bravo locked server-side).
    const r = room();
    const { rerender } = board(view({ phase: "predict", iAmChooser: false, mySeat: 1, myPrediction: null }), r);
    fireEvent.click(screen.getByText("Alpha"));
    // Before rerender: Alpha is pressed via local prediction selection
    const alphaBefore = screen.getByText("Alpha").closest("button");
    expect(alphaBefore?.getAttribute("aria-pressed")).toBe("true");

    // Server confirms Bravo (myPrediction=1); rerender delivers new view
    rerender(<MentalistaBoard view={view({ phase: "predict", iAmChooser: false, mySeat: 1, myPrediction: 1 })} snapshot={snapshot()} room={r} locale="en" error={null} />);
    const buttons = screen.getAllByRole("button").filter((b) => b.getAttribute("data-mv-option") !== null);
    const pressed = buttons.filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed.length).toBe(1);
    expect(pressed[0].getAttribute("data-mv-option")).toBe("1");
  });
});

describe("mentalista board — disconnected notice", () => {
  it("non-acting viewer sees the disconnected notice when room.connected is false", () => {
    board(view({ iAmChooser: false, mySeat: 1 }), room({ connected: false }));
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("Connection lost");
  });

  it("connected viewer does not see the disconnected notice", () => {
    board(view({ iAmChooser: false, mySeat: 1 }), room({ connected: true }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("mentalista board — countdown", () => {
  afterEach(() => vi.useRealTimers());

  it("future deadline: options immediately active on first render without waiting for interval tick", () => {
    vi.useFakeTimers();
    const FUTURE = new Date(NOW + 20_000).toISOString();
    const r = room({ nowMs: () => NOW });
    board(view({ phase: "choose", iAmChooser: true, deadline: FUTURE }), r);
    const opts = screen.getAllByRole("button").filter((b) => b.getAttribute("data-mv-option") !== null);
    expect(opts.length).toBeGreaterThan(0);
    expect(opts.every((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
  });

  it("advances across deadline: options disabled and confirm button shows waiting", () => {
    vi.useFakeTimers();
    let currentNow = NOW;
    const FUTURE = new Date(NOW + 300).toISOString();
    const r = room({ nowMs: () => currentNow });
    board(view({ phase: "choose", iAmChooser: true, deadline: FUTURE }), r);

    const opts = () => screen.getAllByRole("button").filter((b) => b.getAttribute("data-mv-option") !== null);
    expect(opts().every((b) => !(b as HTMLButtonElement).disabled)).toBe(true);

    currentNow = NOW + 1_000;
    act(() => vi.advanceTimersByTime(400));

    expect(opts().every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getByRole("button", { name: "Waiting for the others…" })).toBeTruthy();
  });

  it("stale click after clock moves past deadline before interval fires does not send", () => {
    vi.useFakeTimers();
    let currentNow = NOW;
    const FUTURE = new Date(NOW + 500).toISOString();
    const r = room({ nowMs: () => currentNow });
    board(view({ phase: "choose", iAmChooser: true, deadline: FUTURE }), r);

    fireEvent.click(screen.getByText("Alpha"));
    // Move server clock past deadline without advancing fake timers (interval has not ticked)
    currentNow = NOW + 1_000;
    // The render is stale: button is still labeled "Lock it in" and visually enabled
    fireEvent.click(screen.getByRole("button", { name: "Lock it in" }));
    expect(r.send).not.toHaveBeenCalled();
  });

  it("already expired deadline: options immediately disabled and button shows waiting", () => {
    vi.useFakeTimers();
    const PAST = new Date(NOW - 5_000).toISOString();
    board(view({ phase: "choose", iAmChooser: true, deadline: PAST }), room({ nowMs: () => NOW }));
    const opts = screen.getAllByRole("button").filter((b) => b.getAttribute("data-mv-option") !== null);
    expect(opts.every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getByRole("button", { name: "Waiting for the others…" })).toBeTruthy();
  });

  it("already expired predict phase: options immediately disabled and button shows waiting", () => {
    vi.useFakeTimers();
    const PAST = new Date(NOW - 5_000).toISOString();
    board(
      view({ phase: "predict", iAmChooser: false, chooserSeat: 0, mySeat: 1, deadline: PAST }),
      room({ nowMs: () => NOW }),
    );
    const opts = screen.getAllByRole("button").filter((b) => b.getAttribute("data-mv-option") !== null);
    expect(opts.every((b) => (b as HTMLButtonElement).disabled)).toBe(true);
    expect(screen.getByRole("button", { name: "Waiting for the others…" })).toBeTruthy();
  });
});

describe("mentalista results", () => {
  it("reads roundWins straight from the server standings (no client scoring)", () => {
    const v = view({
      phase: "over", iAmChooser: false, standings: [
        { seat: 1, points: 4, roundWins: 2, place: 1 },
        { seat: 0, points: 0, roundWins: 0, place: 2 },
        { seat: 2, points: 0, roundWins: 0, place: 2 },
      ],
    });
    render(<MentalistaResults view={v} snapshot={snapshot()} locale="en" onRoom={() => {}} onExit={() => {}} />);
    // mySeat 0 finished second; the table is the server's, places and all.
    expect(screen.getByText(/You finished/)).toBeTruthy();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Localization: every supported UI locale has complete, non-English Mentalista copy. UI strings only — this says nothing
// about which languages the game's category content exists in. Invented names only.
// ---------------------------------------------------------------------------------------------------------------------

const INVENTED = "Zorblax Quennimore";
const UNKNOWN_LOCALES = ["xx", "", "zz-ZZ"];

/** A key/kind signature of a copy object: nested plain objects are flattened, tuples are recorded with their length. */
function shapeOf(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = `${prefix}${k}`;
    if (Array.isArray(v)) return [`${key}:array${v.length}`];
    if (v !== null && typeof v === "object") return shapeOf(v, `${key}.`);
    return [`${key}:${typeof v}`];
  }).sort();
}

/** Every string leaf of a copy object (nested objects and tuples included). */
function stringLeaves(obj: object): string[] {
  return Object.values(obj).flatMap((v) =>
    typeof v === "string" ? [v] : v !== null && typeof v === "object" ? stringLeaves(v) : [],
  );
}

function evalRoom(t: MentalistaRoomCopy) {
  return {
    round: t.round(2, 6),
    waitChoose: t.waitChoose(INVENTED),
    youPredict: t.youPredict(INVENTED),
    lockedOf: t.lockedOf(2, 5),
    pickWas: t.pickWas(INVENTED),
    readsDetail0: t.readsDetail(0),
    readsDetail1: t.readsDetail(1),
    readsDetail3: t.readsDetail(3),
  };
}

function evalProto(t: MentalistaCopy) {
  return {
    waitChoose: t.waitChoose(INVENTED),
    youPredict: t.youPredict(INVENTED),
    pickWas: t.pickWas(INVENTED),
    plusTwo: t.plusTwo(2),
    round: t.round(2, 6),
    youPlace1: t.youPlace(1),
    youPlace2: t.youPlace(2),
    youPlace3: t.youPlace(3),
    youPlace4: t.youPlace(4),
  };
}

describe("mentalista copy — eight-locale parity", () => {
  it("covers exactly the eight supported locales", () => {
    expect([...LOCALES].sort()).toEqual(["de", "en", "es", "fr", "ka", "pt", "ru", "tr"]);
  });

  it.each([...LOCALES])("room copy for %s has the same keys and kinds as English, with no empty strings", (locale) => {
    const t = mentalistaRoomCopy(locale);
    expect(shapeOf(t)).toEqual(shapeOf(mentalistaRoomCopy("en")));
    for (const s of stringLeaves(t)) expect(s.trim().length).toBeGreaterThan(0);
  });

  it.each([...LOCALES])("prototype copy for %s has the same keys and kinds as English, with no empty strings", (locale) => {
    const t = mentalistaCopy(locale);
    expect(shapeOf(t)).toEqual(shapeOf(mentalistaCopy("en")));
    expect(Object.keys(t.invalid).sort()).toEqual(["empty", "out_of_category", "too_long"]);
    for (const s of stringLeaves(t)) expect(s.trim().length).toBeGreaterThan(0);
  });

  it.each([...LOCALES])("room copy function fields for %s evaluate cleanly with invented names", (locale) => {
    const out = evalRoom(mentalistaRoomCopy(locale));
    for (const s of Object.values(out)) {
      expect(typeof s).toBe("string");
      expect(s.trim().length).toBeGreaterThan(0);
      expect(s).not.toMatch(/undefined|NaN|\[object/);
    }
    expect(out.waitChoose).toContain(INVENTED);
    expect(out.youPredict).toContain(INVENTED);
    expect(out.pickWas).toContain(INVENTED);
    expect(out.round).toContain("2");
    expect(out.round).toContain("6");
    expect(out.lockedOf).toContain("2/5");
    expect(out.readsDetail3).toContain("3");
  });

  it.each([...LOCALES])("prototype copy function fields for %s evaluate cleanly with invented names", (locale) => {
    const out = evalProto(mentalistaCopy(locale));
    for (const s of Object.values(out)) {
      expect(typeof s).toBe("string");
      expect(s.trim().length).toBeGreaterThan(0);
      expect(s).not.toMatch(/undefined|NaN|\[object/);
    }
    expect(out.waitChoose).toContain(INVENTED);
    expect(out.youPredict).toContain(INVENTED);
    expect(out.pickWas).toContain(INVENTED);
    expect(out.plusTwo).toBe("+2");
    expect(out.youPlace2).toContain("2");
  });
});

describe("mentalista copy — no supported locale falls back to English", () => {
  const nonEnglish = LOCALES.filter((l) => l !== "en");

  it.each(nonEnglish)("room copy for %s is its own table, not English", (locale) => {
    const en = mentalistaRoomCopy("en");
    const t = mentalistaRoomCopy(locale);
    expect(t).not.toBe(en);
    for (const k of ["youChoose", "youChooseHint", "beingRead", "lock", "pickFirst", "waiting", "voided", "nextRound", "lastRound", "disconnectedNotice"] as const) {
      expect(t[k], `${locale}.${k}`).not.toBe(en[k]);
    }
    const ev = evalRoom(t);
    const evEn = evalRoom(en);
    for (const k of ["round", "waitChoose", "youPredict", "lockedOf", "pickWas", "readsDetail3"] as const) {
      expect(ev[k], `${locale}.${k}()`).not.toBe(evEn[k]);
    }
  });

  it.each(nonEnglish)("prototype copy for %s is its own table, not English", (locale) => {
    const en = mentalistaCopy("en");
    const t = mentalistaCopy(locale);
    expect(t).not.toBe(en);
    for (const k of ["exit", "rules", "youChoose", "youPredictHint", "beingRead", "noPick", "voidTimeout", "voidDropped", "youWon", "offline"] as const) {
      expect(t[k], `${locale}.${k}`).not.toBe(en[k]);
    }
    expect(t.invalid.empty).not.toBe(en.invalid.empty);
    expect(t.invalid.out_of_category).not.toBe(en.invalid.out_of_category);
    const ev = evalProto(t);
    const evEn = evalProto(en);
    for (const k of ["waitChoose", "youPredict", "pickWas", "round", "youPlace2"] as const) {
      expect(ev[k], `${locale}.${k}()`).not.toBe(evEn[k]);
    }
  });

  it("the room rules still describe the unchanged game in every locale (3–6 players, 2 points)", () => {
    for (const locale of LOCALES) {
      const rules = mentalistaCopy(locale).rules;
      expect(rules, locale).toMatch(/3/);
      expect(rules, locale).toMatch(/6/);
      expect(rules, locale).toMatch(/2/);
    }
  });

  it.each(UNKNOWN_LOCALES)("an unknown locale %j falls back to English", (locale) => {
    expect(mentalistaRoomCopy(locale)).toBe(mentalistaRoomCopy("en"));
    expect(mentalistaCopy(locale)).toBe(mentalistaCopy("en"));
  });
});

describe("mentalista board — localized rendering", () => {
  const boardIn = (locale: string, v: MentalistaView, r = room()) =>
    render(<MentalistaBoard view={v} snapshot={snapshot()} room={r} locale={locale} error={null} />);

  it.each([...LOCALES])("the chooser's choose screen renders in %s", (locale) => {
    const t = mentalistaRoomCopy(locale);
    boardIn(locale, view());
    expect(screen.getByText(t.youChoose)).toBeTruthy();
    expect(screen.getByText(t.youChooseHint)).toBeTruthy();
    expect(screen.getByText(t.round(1, 6))).toBeTruthy();
    expect(screen.getByRole("button", { name: t.pickFirst })).toBeTruthy();
  });

  it("pt: the chooser picks and locks with Portuguese controls, sending the same command", () => {
    const r = room();
    boardIn("pt", view(), r);
    expect(screen.getByText("Escolha um — em segredo")).toBeTruthy();
    expect(screen.getByText("Rodada 1 de 6")).toBeTruthy();
    fireEvent.click(screen.getByText("Alpha"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(r.send).toHaveBeenCalledWith({ type: "choose", round: 0, option: 0 });
    expect(screen.queryByText("Pick one — secretly")).toBeNull();
  });

  it("de: a predictor is asked about the chooser in German", () => {
    boardIn("de", view({ phase: "predict", iAmChooser: false, chooserSeat: 0, mySeat: 1 }));
    expect(screen.getByText("Runde 1 von 6")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Wähl eine Option" })).toBeTruthy();
    expect(screen.getByText(mentalistaRoomCopy("de").youPredictHint)).toBeTruthy();
    expect(screen.queryByText(/Who did/)).toBeNull();
  });

  it("ru: a matched reveal is labeled in Russian", () => {
    const rev: MentalistaResult = {
      round: 0, chooser: 0, target: 1, voided: false,
      entries: [{ seat: 1, prediction: 1, matched: true, points: 2 }, { seat: 2, prediction: 0, matched: false, points: 0 }],
    };
    const seats = view().seats.map((s) => ({ ...s, score: s.seat === 1 ? 2 : 0 }));
    boardIn("ru", view({ phase: "reveal", iAmChooser: false, mySeat: 1, seats, reveal: rev, results: [rev] }));
    expect(screen.getByText("В точку!")).toBeTruthy();
    expect(screen.getByText("Скоро следующий раунд…")).toBeTruthy();
    expect(screen.queryByText("Read it!")).toBeNull();
  });

  it("fr: a voided round says so in French", () => {
    const rev: MentalistaResult = {
      round: 0, chooser: 0, target: null, voided: true,
      entries: [{ seat: 1, prediction: 2, matched: false, points: 0 }, { seat: 2, prediction: null, matched: false, points: 0 }],
    };
    boardIn("fr", view({ phase: "reveal", iAmChooser: false, mySeat: 1, reveal: rev }));
    expect(screen.getByText("Aucun choix n’a été fait — pas de points cette manche.")).toBeTruthy();
    expect(screen.queryByText(/No pick was made/)).toBeNull();
  });

  describe("void reveal heading", () => {
    const voidRev: MentalistaResult = {
      round: 0, chooser: 0, target: null, voided: true,
      entries: [
        { seat: 0, prediction: null, matched: false, points: 0 },
        { seat: 1, prediction: 2, matched: false, points: 0 },
        { seat: 2, prediction: null, matched: false, points: 0 },
      ],
    };
    const normalRev: MentalistaResult = {
      round: 0, chooser: 0, target: 1, voided: false,
      entries: [
        { seat: 0, prediction: null, matched: false, points: 0 },
        { seat: 1, prediction: 1, matched: true, points: 2 },
        { seat: 2, prediction: 0, matched: false, points: 0 },
      ],
    };

    it.each([...LOCALES])("%s: a voided reveal shows the void text once, as the live heading, and scores nobody", (locale) => {
      const t = mentalistaRoomCopy(locale);
      boardIn(locale, view({ phase: "reveal", iAmChooser: false, mySeat: 1, reveal: voidRev, results: [voidRev] }));
      const voided = screen.getAllByText(t.voided);
      expect(voided).toHaveLength(1);
      expect(voided[0].getAttribute("aria-live")).toBe("polite");
      expect(screen.queryByText(t.pickWas("Player0"))).toBeNull();
      expect(document.querySelector("[data-mv-target]")).toBeNull();
      expect(screen.queryByText(t.readIt)).toBeNull();
      const scores = [...document.querySelectorAll("[data-room-score-source]")];
      expect(scores.length).toBeGreaterThan(0);
      expect(scores.every((el) => el.textContent === "0")).toBe(true);
    });

    it.each([...LOCALES])("%s: a normal reveal keeps the chooser heading and no void text", (locale) => {
      const t = mentalistaRoomCopy(locale);
      const seats = view().seats.map((s) => ({ ...s, score: s.seat === 1 ? 2 : 0 }));
      boardIn(locale, view({ phase: "reveal", iAmChooser: false, mySeat: 1, seats, reveal: normalRev, results: [normalRev] }));
      expect(screen.getByText(t.pickWas("Player0")).getAttribute("aria-live")).toBe("polite");
      expect(screen.queryByText(t.voided)).toBeNull();
    });
  });

  it("an unknown locale renders the English board", () => {
    boardIn("xx", view());
    expect(screen.getByText("Pick one — secretly")).toBeTruthy();
    expect(screen.getByText("Round 1 of 6")).toBeTruthy();
  });
});
