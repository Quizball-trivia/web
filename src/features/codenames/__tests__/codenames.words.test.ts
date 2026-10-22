import { describe, expect, it } from "vitest";
import { dealWords, dealWordsSolo, newRoomSim, reboard, type DeckWord } from "../codenames.sim";
import { cardsLeft, clueOnBoard } from "../codenames.view";

const deck: DeckWord[] = Array.from({ length: 40 }, (_, i) => ({ w: `WORD${String.fromCharCode(65 + (i % 26))}${i}`, clues: ["Alpha", "Beta"] }));

describe("word boards", () => {
  it("deals 25 words keyed 9 / 8 / 7 / 1", () => {
    const board = dealWords(42, deck);
    const count = (k: string) => board.cards.filter((c) => c.key === k).length;
    expect(board.kind).toBe("words");
    expect(board.cards).toHaveLength(25);
    expect(new Set(board.cards.map((c) => c.id)).size).toBe(25);
    expect([count("t0"), count("t1"), count("neutral"), count("owngoal")]).toEqual([9, 8, 7, 1]);
    expect(board.cards.every((c) => c.word && board.clues[c.id])).toBe(true);
  });

  it("counts 9 for the starting team and 8 for the other", () => {
    const cards = dealWords(1, deck).cards.map((c) => ({ id: c.id, key: null, revealed: null, picks: [] }));
    expect([cardsLeft({ cards, starting: 0, board: "words" }, 0), cardsLeft({ cards, starting: 0, board: "words" }, 1)]).toEqual([9, 8]);
    expect([cardsLeft({ cards, starting: 0 }, 0), cardsLeft({ cards, starting: 0 }, 1)]).toEqual([8, 7]);
  });

  it("refuses a clue that is a board word, part of one, or contains one", () => {
    const board = ["STONES", "BAR", "CROSS", "PIQUÉ"];
    expect(clueOnBoard("B A R", board)).toBe("BAR");
    expect(clueOnBoard("Cross-bar", board)).not.toBeNull();
    expect(clueOnBoard("stones", board)).toBe("STONES");
    expect(clueOnBoard("Stone", board)).toBe("STONES");
    expect(clueOnBoard("Crossbar", board)).toBe("BAR");
    expect(clueOnBoard("Pique", board)).toBe("PIQUÉ");
    expect(clueOnBoard("Red Cross", board)).toBe("CROSS");
    expect(clueOnBoard("Arsenal", board)).toBeNull();
    expect(clueOnBoard("Ba", board)).toBeNull();
  });

  it("deals a solo word board whose clues each cover only the player's words, never the Own Goal", () => {
    const themed: DeckWord[] = Array.from({ length: 60 }, (_, i) => ({ w: `W${i}`, clues: [`Theme${i % 7}`, `Pair${i % 13}`, `Odd${i % 5}`], f: `ball ${i}`, o: `thing ${i}` }));
    for (const seed of [1, 7, 99, 2026]) {
      const s = dealWordsSolo(seed, themed, "2026-10-22");
      expect(s.cards).toHaveLength(25);
      expect(s.cards.filter((c) => c.kind === "mine")).toHaveLength(9);
      expect(s.clues.length).toBeGreaterThan(0);
      expect(s.clues.length).toBeLessThanOrEqual(4);
      expect(s.guessesLeft).toBe(s.clues[0].count + 1);
      const kind = new Map(s.cards.map((c) => [c.id, c.kind]));
      const covered = s.clues.flatMap((c) => c.cards!.map((m) => m.id));
      expect(new Set(covered).size).toBe(covered.length);
      expect(covered.every((id) => kind.get(id) === "mine")).toBe(true);
      expect(s.clues.every((c) => c.count === c.cards!.length)).toBe(true);
      const ownGoal = s.cards.find((c) => c.kind === "owngoal")!.id;
      const cluesOf = new Map(themed.map((d) => [`w-${d.w.toLowerCase()}`, d.clues]));
      expect(s.clues.some((c) => cluesOf.get(ownGoal)?.includes(c.word))).toBe(false);
      expect(s.clues[0].cards![0].why).toMatch(/^ball \d+ · thing \d+$/);
    }
  });

  it("switches a room's board on the teams screen and keeps everyone's side", () => {
    const players = Array.from({ length: 4 }, (_, i) => ({ name: `P${i}`, avatar: {} as never }));
    const pictures = newRoomSim(players, false, 0);
    const words = reboard(pictures, dealWords(5, deck));
    expect(words.view.board).toBe("words");
    expect(words.view.cards).toHaveLength(25);
    expect(words.view.players).toEqual(pictures.view.players);
    expect(reboard(words).view.cards).toHaveLength(20);
    const started = { ...words, view: { ...words.view, phase: "clue" as const } };
    expect(reboard(started, undefined)).toBe(started);
  });
});
