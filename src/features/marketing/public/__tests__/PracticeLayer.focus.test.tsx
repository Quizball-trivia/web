import { fireEvent, render, screen } from "@testing-library/react";
import { createPortal } from "react-dom";
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

  it("leaves Escape and Tab to a dialog the game opened on top of it (a collection portaled to the body)", () => {
    const onExit = vi.fn();
    const { rerender } = render(<PracticeLayer title="t" exitLabel="Exit" onExit={onExit} exitButton={false}><p>game</p></PracticeLayer>);
    rerender(
      <PracticeLayer title="t" exitLabel="Exit" onExit={onExit} exitButton={false}>
        <p>game</p>
        {createPortal(<div role="dialog" aria-modal="true" aria-label="Collection" tabIndex={-1}>cards</div>, document.body)}
      </PracticeLayer>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onExit).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("dialog", { name: "Collection" }));
  });

  it("still exits on Escape when nothing is open on top", () => {
    const onExit = vi.fn();
    render(<PracticeLayer title="t" exitLabel="Exit" onExit={onExit} exitButton={false}><p>game</p></PracticeLayer>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
