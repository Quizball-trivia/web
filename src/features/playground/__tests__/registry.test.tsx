import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { GAMES } from "../registry";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/dev/games/preview" }));

// jsdom has no layout: the Pistas board scrolls its newest line into view.
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(cleanup);

// Every screen of every game renders from its fixture in every language, and no fixture carries a real answer list:
// a screen that breaks (or a component whose props change) fails here, not in the owner's browser.
describe("games playground registry", () => {
  const cases = GAMES.flatMap((game) => Object.entries(game.scenarios).flatMap(([mode, list]) => (list ?? []).map((s) => ({ game: game.id, mode, s }))));

  it("has scenarios for every game", () => {
    expect(cases.length).toBeGreaterThan(40);
    expect(new Set(cases.map((c) => `${c.game}/${c.mode}/${c.s.id}`)).size).toBe(cases.length);
  });

  it.each(cases.map((c) => [`${c.game} · ${c.mode} · ${c.s.id}`, c] as const))("renders %s in every language", (_, c) => {
    for (const locale of ["es", "en", "ka", "tr"] as const) {
      const log = vi.fn();
      const { unmount } = render(<>{c.s.render(c.s.data as never, { locale, log })}</>);
      unmount();
    }
  });
});
