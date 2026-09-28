import { describe, expect, it } from "vitest";
import { actionOf } from "../buscaminas.analytics";

describe("actionOf", () => {
  it("labels a tap as a tap, whatever the card id looks like", () => {
    // Card ids are Transfermarkt player ids: short numbers.
    for (const cardId of ["38253", "2989", "315858", "1234567890"]) expect(actionOf(cardId)).toBe("tap");
  });

  it("keeps the named moves", () => {
    for (const move of ["start", "bank", "next"]) expect(actionOf(move)).toBe(move);
  });
});
