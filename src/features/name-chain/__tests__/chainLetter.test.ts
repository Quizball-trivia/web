import { describe, expect, it } from "vitest";
import { chainLetterIndex, chainLetters } from "../chainLetter";

describe("chainLetterIndex", () => {
  it("picks the last letter of a Latin name, past punctuation", () => {
    expect(chainLetterIndex("Haaland")).toBe(6);
    expect(chainLetterIndex("N'Golo Kanté.")).toBe(11);
  });
  it("skips a closing й, ь, ъ or ы in a Russian name", () => {
    expect(chainLetterIndex("Пуйоль")).toBe(4);
    expect(chainLetterIndex("Белый")).toBe(2);
    expect(chainLetterIndex("Холанд")).toBe(5);
  });
});

describe("chainLetters", () => {
  it("reads a decomposed й as the server does (one letter, skipped at the end)", () => {
    const decomposed = "Цой";
    expect(chainLetters(decomposed)).toEqual({ letters: ["Ц", "о", "й"], at: 1 });
  });
});
