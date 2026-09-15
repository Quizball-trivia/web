import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PracticeLayer } from "../PracticeLayer";

describe("PracticeLayer focus", () => {
  it("focuses the exit control when it is drawn", () => {
    render(<PracticeLayer title="t" exitLabel="Exit" onExit={vi.fn()}><p>game</p></PracticeLayer>);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Exit/ }));
  });

  it("focuses the dialog itself when the engine draws its own exit (keyboard users are not left behind the modal)", () => {
    render(<PracticeLayer title="t" exitLabel="Exit" onExit={vi.fn()} exitButton={false}><p>game</p></PracticeLayer>);
    expect(screen.queryByRole("button", { name: /Exit/ })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });
});
