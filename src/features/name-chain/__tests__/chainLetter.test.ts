import { describe, expect, it } from "vitest";
import { chainLetterIndex } from "../chainLetter";

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
