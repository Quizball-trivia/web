import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Link from "next/link";
import { DeferredCardArt } from "../public/DeferredCardArt";

vi.mock("@/features/demos/DemoModeArt", () => { throw new Error("test artwork chunk unavailable"); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("contains a rejected artwork import without breaking the card text or link", async () => {
  let notify!: IntersectionObserverCallback;
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) { notify = callback; }
    observe = vi.fn();
    disconnect = vi.fn();
  });
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const clicked = vi.fn();
  const view = render(<Link href="/en/football-games/football-clues" prefetch={false} onClick={(event) => { event.preventDefault(); clicked(); }}>
    <DeferredCardArt slug="pistas" sizes="200px" />Football Clues
  </Link>);
  act(() => notify([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver));
  await waitFor(() => expect(warning).toHaveBeenCalledWith("Related-game artwork could not load.", expect.any(Error)));
  expect(view.container.querySelector(".size-full")).toBeInTheDocument();
  const link = screen.getByRole("link", { name: "Football Clues" });
  link.focus();
  expect(link).toHaveFocus();
  act(() => link.click());
  expect(clicked).toHaveBeenCalledOnce();
});
