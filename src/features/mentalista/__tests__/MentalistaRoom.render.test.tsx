/**
 * The REAL Mentalista room screens, drawn from the EXACT backend view (no transform, no invented field). The literals
 * below are the backend `MentalistaView` / `MentalistaResult` shape; a screen that read an invented field (`mine`,
 * `picks`, `chooser`) would read `undefined` here and the assertion would fail. Invented option names only.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MentalistaBoard, MentalistaResults } from "../MentalistaRoom";
import type { MentalistaResult, MentalistaView } from "../mentalista.server";
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
