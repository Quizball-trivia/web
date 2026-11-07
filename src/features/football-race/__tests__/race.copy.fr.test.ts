import { describe, expect, it } from "vitest";
import { raceCopy } from "../race.copy";

describe("French race lines with a country inserted", () => {
  const c = raceCopy("fr");

  it.each(["Maroc", "Pays-Bas", "Écosse"])("need no agreement with %s", (nation) => {
    for (const line of [c.movedBy(nation, true), c.movedBy(nation, false), c.tie(nation), c.helps(nation), c.backfired(nation), c.soloLost(nation)]) {
      expect(line).toContain(nation);
      expect(line).not.toMatch(/avancent|avance\b|arrivée la première/);
    }
  });
});
