import { describe, expect, it } from "vitest";
import {
  countdownMatch,
  fuzzyMatchesAnswer,
  normalizeAnswer,
} from "../answerMatching";

const answerGroups = [
  {
    display: "Ronaldo",
    acceptedAnswers: ["Ronaldo", "Cristiano Ronaldo"],
  },
  {
    display: "Ronaldinho",
    acceptedAnswers: ["Ronaldinho"],
  },
  {
    display: "Fabio Capello",
    acceptedAnswers: ["Fabio Capello"],
  },
];

describe("answerMatching", () => {
  it("normalizes case, accents, punctuation, and spacing", () => {
    expect(normalizeAnswer("  Fábio--Capello  ")).toBe("fabio capello");
  });

  it("rejects ambiguous countdown prefixes even after one matching answer is already found", () => {
    expect(countdownMatch("ron", answerGroups, [])).toBeNull();
    expect(countdownMatch("ron", answerGroups, ["Ronaldo"])).toBeNull();
  });

  it("accepts a countdown prefix once the text differentiates the answer globally", () => {
    expect(countdownMatch("ronaldi", answerGroups, ["Ronaldo"])).toBe("Ronaldinho");
  });

  it("accepts one-letter typos against tokens inside multi-word answers", () => {
    expect(countdownMatch("capelo", answerGroups, [])).toBe("Fabio Capello");
    expect(fuzzyMatchesAnswer("capelo", ["Fabio Capello"])).toBe(true);
  });

  it("accepts a short surname that is a whole word in the answer", () => {
    expect(fuzzyMatchesAnswer("ake", ["Nathan Ake"])).toBe(true);
    expect(fuzzyMatchesAnswer("Aké", ["Nathan Ake"])).toBe(true);
    expect(fuzzyMatchesAnswer("son", ["Heung-min Son"])).toBe(true);
  });

  it("does not fuzzy-match short inputs that are not whole words", () => {
    expect(fuzzyMatchesAnswer("joe", ["Jose Mourinho"])).toBe(false);
    expect(fuzzyMatchesAnswer("ake", ["Nathaniel"])).toBe(false);
  });

  it("accepts common club abbreviations in either direction", () => {
    const groups = [
      { display: "Manchester United", acceptedAnswers: ["Man United", "Man Utd"] },
      { display: "Manchester City", acceptedAnswers: ["Man City"] },
    ];

    expect(countdownMatch("Manchester United", groups, [])).toBe("Manchester United");
    expect(countdownMatch("Manchester Utd", groups, [])).toBe("Manchester United");
    expect(countdownMatch("Man United", groups, [])).toBe("Manchester United");
    expect(countdownMatch("Manchester", groups, [])).toBeNull();
  });

  it("rejects duplicated short aliases", () => {
    const groups = [
      { display: "Marco Silva", acceptedAnswers: ["Marco Silva", "mar"] },
      { display: "Marcelo Bielsa", acceptedAnswers: ["Marcelo Bielsa", "mar"] },
      { display: "Mario Gomez", acceptedAnswers: ["Mario Gomez", "mar"] },
    ];

    expect(countdownMatch("mar", groups, [])).toBeNull();
    expect(countdownMatch("mar", groups, ["Marco Silva", "Marcelo Bielsa"])).toBeNull();
  });
});
