import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ultimoBase } from "@/features/playground/fixtures/duel";
import { UltimoDuelBoard } from "../UltimoDuelBoard";
import { duelCopy } from "../duel.copy";
import type { UltimoDuelView } from "../duel.views";

const board = (patch: Partial<UltimoDuelView>, locale: "en" | "es" = "en") =>
  render(<UltimoDuelBoard view={{ ...ultimoBase, ...patch }} mySeat={0} names={["Me", "Rival"]} copy={duelCopy(locale)} finished={false} secondsLeft={10} busy={false} onAnswer={vi.fn()} />);

describe("UltimoDuelBoard", () => {
  it("credits a suggested category under its title, in the player's language", () => {
    board({ credit: "Rodrigo Flores" });
    expect(screen.getByText("Credits to Rodrigo Flores")).toBeTruthy();
  });

  it("shows the credit during the reveal too", () => {
    board({ phase: "reveal", credit: "Rodrigo Flores" }, "es");
    expect(screen.getByText("Créditos a Rodrigo Flores")).toBeTruthy();
  });

  it("shows no credit line for an uncredited category or an older server", () => {
    board({ credit: null });
    expect(screen.queryByText(/Credits to/)).toBeNull();
    board({});
    expect(screen.queryByText(/Credits to/)).toBeNull();
  });
});
