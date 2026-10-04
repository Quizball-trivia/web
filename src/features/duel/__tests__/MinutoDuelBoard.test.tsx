import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/components/AvatarDisplay", () => ({ AvatarDisplay: () => <span data-testid="avatar" /> }));

import { MinutoDuelBoard } from "../MinutoDuelBoard";
import { duelCopy } from "../duel.copy";
import type { MinutoDuelView } from "../duel.views";

const name = (s: string) => ({ es: s, en: s, ka: s, tr: s });
const goal = {
  id: "g20220101-0000000000", tier: "easy", comp: "FIWC", year: 2022, date: "2022-12-18", stage: "final", group: null, leg: null,
  home: { kind: "nation", flag: "ar", name: name("Team A") }, away: { kind: "nation", flag: "fr", name: name("Team B") },
  score: [3, 3], aet: true, pens: [4, 2], side: "home", scorer: { name: name("Scorer"), photo: null }, penalty: false, scoreAfter: [3, 2], image: null,
} as MinutoDuelView["goal"];

const view = (patch: Partial<MinutoDuelView>): MinutoDuelView => ({
  phase: "guess", round: 0, totalRounds: 10, goal, me: { answered: false, guess: null }, rival: { answered: false },
  answered: [false, false], settled: null, results: [], scores: [0, 0], idle: [0, 0], ...patch,
});

const board = (v: MinutoDuelView, mySeat: 0 | 1 = 0) =>
  render(<MinutoDuelBoard view={v} mySeat={mySeat} names={mySeat === 0 ? ["Me", "Rival"] : ["Rival", "Me"]} avatars={[{}, {}]} copy={duelCopy("en")} locale="en" finished={false} busy={false} onGuess={vi.fn()} />);

describe("MinutoDuelBoard", () => {

  it("before the reveal the rival is only 'answered', in words for screen readers, never a minute", () => {
    board(view({ me: { answered: true, guess: 61 }, rival: { answered: true }, answered: [true, true] }));
    expect(screen.getByLabelText("Rival: Answered")).toBeTruthy();
    expect(screen.getByLabelText("You: 61'")).toBeTruthy();
    expect(screen.getByText("61'")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/\b7[0-9]'/);
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("the reveal shows both minutes, the points and the real minute", () => {
    board(view({ phase: "reveal", settled: { guesses: [108, 100], answer: { base: 108, added: 0 }, points: [3, 0] }, scores: [3, 0] }));
    expect(screen.getByLabelText("Rival: 100'")).toBeTruthy();
    expect(screen.getByText("Exact minute! +3")).toBeTruthy();
    expect(screen.getByText("It was 108'")).toBeTruthy();
  });

  it("seat 2 reads its own minute and points from its own side of the reveal", () => {
    board(view({ phase: "reveal", settled: { guesses: [55, 70], answer: { base: 70, added: 0 }, points: [0, 3] }, scores: [0, 3] }), 1);
    expect(screen.getByLabelText("You: 70'")).toBeTruthy();
    expect(screen.getByLabelText("Rival: 55'")).toBeTruthy();
    expect(screen.getByText("Exact minute! +3")).toBeTruthy();
  });

  it("seat 2 mid-round: the rival's earlier minutes (last reveal, past results) never show as this round's answer", () => {
    const last = { guesses: [77, 64] as [number, number], answer: { base: 77, added: 0 }, points: [3, 0] as [number, number] };
    board(view({ round: 1, me: { answered: false, guess: null }, rival: { answered: true }, answered: [true, false], settled: last, results: [last], scores: [3, 0] }), 1);
    expect(screen.getByLabelText("Rival: Answered")).toBeTruthy();
    expect(screen.getByLabelText("You: Thinking…")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/77'|64'/);
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("a seat that has not answered gets the input; one that answered waits for the rival", () => {
    const { unmount } = board(view({}));
    expect(screen.getByRole("textbox")).toBeTruthy();
    unmount();
    board(view({ me: { answered: true, guess: 30 } }));
    expect(screen.getByRole("status").textContent).toMatch(/waiting for Rival/);
  });

  it("one layout for every screen: each box, header and the input render once, and the totals are read out per player", () => {
    board(view({ rival: { answered: true }, answered: [false, true], scores: [4, 6] }));
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.getAllByRole("group")).toHaveLength(2);
    expect(screen.getAllByTestId("avatar")).toHaveLength(2);
    expect(screen.getByText(/You: 4 points/)).toBeTruthy();
    expect(screen.getByText(/Rival: 6 points/)).toBeTruthy();
    expect(screen.getByRole("group", { name: "Rival: Answered" })).toBeTruthy();
  });

  it("a pause (a seat dropped) disables the input but keeps it, with what was typed, until play resumes", () => {
    const props = { view: view({}), mySeat: 0 as const, names: ["Me", "Rival"] as [string, string], avatars: [{}, {}] as [object, object], copy: duelCopy("en"), locale: "en" as const, finished: false, busy: false, onGuess: vi.fn() };
    const { rerender } = render(<MinutoDuelBoard {...props} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "90+3" } });
    rerender(<MinutoDuelBoard {...props} paused />);
    expect(screen.getByRole("textbox")).toBe(input);
    expect(input.disabled).toBe(true);
    fireEvent.submit(input.closest("form")!);
    expect(props.onGuess).not.toHaveBeenCalled();
    rerender(<MinutoDuelBoard {...props} />);
    expect(input.disabled).toBe(false);
    expect(input.value).toBe("90+3");
  });

  it("the answer bar is in the flow (never pinned over the picture on a short screen)", () => {
    board(view({}));
    expect(screen.getByRole("textbox").closest("form")!.parentElement!.className).not.toMatch(/(^|\s)(sticky|fixed)(\s|$)/);
  });

  it("a half-typed minute survives the rival answering (and any resize: nothing remounts)", () => {
    const onGuess = vi.fn();
    const props = { mySeat: 0 as const, names: ["Me", "Rival"] as [string, string], avatars: [{}, {}] as [object, object], copy: duelCopy("en"), locale: "en" as const, finished: false, busy: false, onGuess };
    const { rerender } = render(<MinutoDuelBoard view={view({})} {...props} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "90+3" } });
    rerender(<MinutoDuelBoard view={view({ rival: { answered: true }, answered: [false, true] })} {...props} />);
    expect(screen.getByRole("textbox")).toBe(input);
    expect((input as HTMLInputElement).value).toBe("90+3");
  });
});
