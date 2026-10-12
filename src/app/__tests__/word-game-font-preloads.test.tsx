import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ pathname: null as string | null, preload: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("react-dom", async (importOriginal) => ({ ...await importOriginal<typeof import("react-dom")>(), preload: state.preload }));
import { WordGameFontPreloads } from "../word-game-font-preloads";

describe("route-aware font hints", () => {
  beforeEach(() => { state.pathname = null; state.preload.mockClear(); });

  it("uses the server pathname when the router pathname is unavailable", () => {
    render(<WordGameFontPreloads initialPathname="/en/football-games/football-name-chain" />);
    expect(state.preload).toHaveBeenCalledTimes(4);
    expect(state.preload).toHaveBeenCalledWith(expect.stringContaining("poppins-latin-900"), { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  });

  it("discovers Turkish glyphs after a client-side language change, despite the persisted root layout", () => {
    state.pathname = "/en/football-games/football-name-chain";
    const view = render(<WordGameFontPreloads initialPathname={state.pathname} />);
    state.preload.mockClear();
    state.pathname = "/tr/futbol-oyunlari/son-harfle-futbolcu";
    view.rerender(<WordGameFontPreloads initialPathname="/en/football-games/football-name-chain" />);
    expect(state.preload).toHaveBeenCalledTimes(8);
    expect(state.preload).toHaveBeenCalledWith(expect.stringContaining("poppins-latin-ext-900"), expect.objectContaining({ as: "font" }));
  });

  it("does not carry word-game hints into a different app route", () => {
    state.pathname = "/store";
    render(<WordGameFontPreloads initialPathname="/tr/futbol-oyunlari/son-harfle-futbolcu" />);
    expect(state.preload).not.toHaveBeenCalled();
  });
});
