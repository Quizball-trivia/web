import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatSniperGame } from "../StatSniperGame";

vi.mock("@/lib/sounds/gameSounds", () => ({ playSfx: vi.fn() }));
vi.mock("@/features/aproximado/PlayRoomWithFriendsButton", () => ({ PlayRoomWithFriendsButton: () => null }));

const session = {
  challengeType: "statSniper", title: "Aproximado", description: "", questionCount: 1, secondsPerQuestion: 30,
  questions: [{ id: "q1", difficulty: "easy", kind: "height", prompt: "Estatura?", unit: "cm", value: 184, min: 160, max: 205, step: 1 }],
} as never;

describe("StatSniperGame back arrow", () => {
  it("asks before quitting by default", () => {
    const onBack = vi.fn();
    render(<StatSniperGame session={session} demo practice onBack={onBack} onComplete={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: /back|atrás|volver/i })[0]);
    expect(onBack).not.toHaveBeenCalled();
  });

  it("leaves at once with confirmQuit={false}", () => {
    const onBack = vi.fn();
    render(<StatSniperGame session={session} demo practice confirmQuit={false} onBack={onBack} onComplete={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: /back|atrás|volver/i })[0]);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
