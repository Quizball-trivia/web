import { describe, expect, it } from "vitest";
import { seoTitle } from "../title";

describe("seoTitle", () => {
  it("keeps the template for titles without the brand", () => { expect(seoTitle("Free Kicks — Football Trivia Shootout for Coins")).toBe("Free Kicks — Football Trivia Shootout for Coins"); });
  it("opts out of the template when the copy already names the brand", () => {
    expect(seoTitle("Football Auction Game | QuizBall")).toEqual({ absolute: "Football Auction Game | QuizBall" });
    expect(seoTitle("Football Games and Multiplayer Online Trivia — QuizBall")).toEqual({ absolute: "Football Games and Multiplayer Online Trivia — QuizBall" });
  });
});
