import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/AvatarDisplay", () => ({ AvatarDisplay: () => <span /> }));

import { AproximadoBoard } from "../AproximadoRoom";
import type { AproximadoRoomView } from "../aproximado.views";

const view = (phase: AproximadoRoomView["phase"]): AproximadoRoomView => ({
  phase, round: 0, totalRounds: 10, scoring: "closest", mySeat: 0, myGuess: phase === "guess" ? 40 : null, reveal: null, results: [], standings: null,
  question: { id: "q", kind: "goals", prompt: "¿Cuántos?", unit: "goles", precision: 0 },
  seats: [0, 1].map((seat) => ({ seat, name: `P${seat}`, avatar: {}, status: "in" as const, answered: seat === 0, idle: false, score: 0 })),
});

describe("leave confirmation", () => {
  it("opens on the X with focus on 'Keep playing', and gives focus back to the X on Escape and on 'Keep playing'", async () => {
    const onLeave = vi.fn();
    render(<AproximadoBoard view={view("guess")} locale="en" secondsLeft={10} busy={false} onGuess={vi.fn()} onLeave={onLeave} />);
    const x = screen.getByRole("button", { name: "Leave the match" });
    fireEvent.click(x);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.activeElement?.textContent).toBe("Keep playing");
    await act(async () => { fireEvent.keyDown(document.activeElement!, { key: "Escape" }); });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(x));
    fireEvent.click(x);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Keep playing" })); });
    await waitFor(() => expect(document.activeElement).toBe(x));
    expect(onLeave).not.toHaveBeenCalled();
    fireEvent.click(x);
    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("review 2026-10-06 W10: Tab and Shift+Tab keep focus inside the open dialog (it cycles between its two buttons)", async () => {
    const user = userEvent.setup();
    render(<AproximadoBoard view={view("guess")} locale="en" secondsLeft={10} busy={false} onGuess={vi.fn()} onLeave={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Leave the match" }));
    const dialog = screen.getByRole("dialog");
    const seen = new Set<string>();
    for (let i = 0; i < 4; i += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
      seen.add(document.activeElement?.textContent ?? "");
    }
    for (let i = 0; i < 3; i += 1) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    expect(seen).toEqual(new Set(["Keep playing", "Leave"]));
  });
});

