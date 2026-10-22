import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { BoardPicker } from "../BoardPicker";
import type { BoardKind } from "../codenames.view";

/** Each board in its own tree, like the Codenames screen (the daily and the Words intro). */
function Screen() {
  const [board, setBoard] = useState<BoardKind>("pictures");
  return board === "pictures"
    ? <section key="daily"><BoardPicker locale="en" value={board} onChange={setBoard} /></section>
    : <main key="words"><BoardPicker locale="en" value={board} onChange={setBoard} /></main>;
}

describe("BoardPicker", () => {
  it("moves with the arrow keys and keeps the focus when the screen around it is replaced", () => {
    render(<Screen />);
    const pictures = screen.getByRole("radio", { name: /pictures/i });
    expect(pictures).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: /words/i })).toHaveAttribute("tabindex", "-1");
    pictures.focus();
    fireEvent.keyDown(pictures, { key: "ArrowRight" });
    const words = screen.getByRole("radio", { name: /words/i });
    expect(words).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(words);
    fireEvent.keyDown(words, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: /pictures/i }));
  });

  it("is read-only without onChange (a member sees the host's choice)", () => {
    render(<BoardPicker locale="en" value="words" />);
    expect(screen.getByRole("radio", { name: /words/i })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: /words/i })).toHaveAttribute("aria-checked", "true");
  });
});
