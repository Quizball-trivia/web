import type { AnchorHTMLAttributes } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  status: "anonymous", trackCard: vi.fn(), trackSignup: vi.fn(), remember: vi.fn(),
  guestLobbies: false, roomGames: ["mentalista"] as string[],
}));
vi.mock("next/link", () => ({ default: ({ prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => <a {...props} data-prefetch={String(prefetch)} /> }));
vi.mock("next/navigation", () => ({ usePathname: () => "/es/juegos-de-futbol/jugador-en-comun" }));
vi.mock("@/stores/auth.store", () => ({ useAuthStore: (selector: (s: { status: string }) => unknown) => selector(state) }));
// The spy records the call and then runs the real helper, so the stored post-auth redirect is what production stores.
vi.mock("@/lib/auth/postAuthRedirect", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/postAuthRedirect")>();
  return { ...actual, rememberPostAuthRedirect: (path: string | null | undefined) => { state.remember(path); actual.rememberPostAuthRedirect(path); } };
});
vi.mock("@/lib/analytics/public-games.analytics", () => ({ trackGameCardClick: state.trackCard, trackGamesSignupClick: state.trackSignup }));
vi.mock("@/lib/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/config")>();
  return {
    ...actual,
    get GUEST_LOBBIES_ENABLED() { return state.guestLobbies; },
    get ROOM_GAMES_ENABLED() { return state.roomGames; },
  };
});

import { GameCardLink, RoomEntryLink, SignInLink } from "../public/PublicLinks";
import { normalizePostAuthRedirect } from "@/lib/auth/postAuthRedirect";
import { SEO_PAGE_LOCALES } from "@/lib/seo/game-pages";
import { findPublicGameByModeId, publicGamePath } from "@/lib/seo/public-games";
import { STORAGE_KEYS } from "@/utils/storage";

const fetchSpy = vi.fn();
const socketSpy = vi.fn();

beforeEach(() => {
  state.status = "anonymous";
  state.guestLobbies = false;
  state.roomGames = ["mentalista"];
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubGlobal("WebSocket", socketSpy);
});
afterEach(() => { vi.unstubAllGlobals(); });

const stored = (key: string) => {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
};

describe("public links", () => {
  it("does not preload other games, but preserves their URL and click tracking", () => {
    render(<GameCardLink href="/es/juegos-de-futbol/cadena-de-futbolistas" modeId="nameChain" group="daily" surface="public_home" destination="page">Next game</GameCardLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("data-prefetch", "false");
    expect(link).toHaveAttribute("href", "/es/juegos-de-futbol/cadena-de-futbolistas");
    fireEvent.click(link);
    expect(state.trackCard).toHaveBeenCalledWith({ modeId: "nameChain", group: "daily", surface: "public_home", destination: "page" });
  });

  it("preserves the guest signup return path and tracking without preloading the app", () => {
    render(<SignInLink placement="test" modeId="sharedPlayer" returnTo="/ortak-futbolcu">Join</SignInLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("data-prefetch", "false");
    fireEvent.click(link);
    expect(state.remember).toHaveBeenCalledWith("/ortak-futbolcu");
    expect(state.trackSignup).toHaveBeenCalledWith(expect.objectContaining({ modeId: "sharedPlayer", placement: "test" }));
  });

  it("keeps a member going straight to the game without guest signup tracking", () => {
    state.status = "authenticated";
    render(<SignInLink placement="test" returnTo="/ortak-futbolcu">Play</SignInLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/ortak-futbolcu");
    expect(link).toHaveAttribute("data-prefetch", "false");
    fireEvent.click(link);
    expect(state.trackSignup).not.toHaveBeenCalled();
  });
});

describe("RoomEntryLink (private friends' room from its public page)", () => {
  const ROOM = "/friend/room/new?room=mentalista";
  const mentalista = findPublicGameByModeId("mentalista")!;
  const pageOf = (locale: (typeof SEO_PAGE_LOCALES)[number]) => publicGamePath(mentalista, locale);
  const renderEntry = (locale: (typeof SEO_PAGE_LOCALES)[number] = "de") => render(
    <RoomEntryLink href={ROOM} locale={locale} returnTo={pageOf(locale)} modeId="mentalista" placement="test_room" signInLabel="Sign in">Create a room</RoomEntryLink>,
  );

  it("the catalogue opens the room creator from the Mentalista page", () => {
    expect(mentalista.guest).toBe("room");
    expect(mentalista.playPath).toBe(ROOM);
    expect(mentalista.demoSlug).toBeUndefined();
  });

  it("signed-out guest with guest rooms on: links straight to the room, saves the locale, no sign-in bookkeeping", () => {
    state.guestLobbies = true;
    renderEntry("pt");
    const link = screen.getByRole("link", { name: "Create a room" });
    expect(link).toHaveAttribute("href", ROOM);
    expect(link).toHaveAttribute("data-prefetch", "false");
    fireEvent.click(link);
    expect(stored(STORAGE_KEYS.LOCALE)).toBe("pt");
    expect(state.remember).not.toHaveBeenCalled();
    expect(state.trackSignup).not.toHaveBeenCalled();
    expect(stored(STORAGE_KEYS.POST_AUTH_REDIRECT)).toBeNull();
  });

  it("member with guest rooms off: links straight to the room and saves the locale", () => {
    state.status = "authenticated";
    renderEntry("fr");
    const link = screen.getByRole("link", { name: "Create a room" });
    expect(link).toHaveAttribute("href", ROOM);
    expect(link).toHaveAttribute("data-prefetch", "false");
    fireEvent.click(link);
    expect(stored(STORAGE_KEYS.LOCALE)).toBe("fr");
    expect(state.remember).not.toHaveBeenCalled();
  });

  it("signed-out guest with guest rooms off: signs in and returns to the localized public page, never the room URL", () => {
    renderEntry("de");
    expect(screen.queryByRole("link", { name: "Create a room" })).toBeNull();
    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link).toHaveAttribute("href", "/play?signin=1");
    expect(link).toHaveAttribute("data-prefetch", "false");
    fireEvent.click(link);
    expect(stored(STORAGE_KEYS.LOCALE)).toBe("de");
    expect(state.remember).toHaveBeenCalledWith(pageOf("de"));
    expect(state.remember).not.toHaveBeenCalledWith(ROOM);
    // The real helper stored the page: signing in brings the visitor back to it.
    expect(stored(STORAGE_KEYS.POST_AUTH_REDIRECT)).toBe(pageOf("de"));
    expect(state.trackSignup).toHaveBeenCalledWith(expect.objectContaining({ modeId: "mentalista", placement: "test_room", destination: "/play?signin=1" }));
  });

  it.each(SEO_PAGE_LOCALES)("the real post-auth redirect accepts the %s Mentalista page unchanged", (locale) => {
    expect(normalizePostAuthRedirect(pageOf(locale))).toBe(pageOf(locale));
  });

  it("the real post-auth redirect would not return to the room creator (why returnTo is the public page)", () => {
    expect(normalizePostAuthRedirect(ROOM)).not.toBe(ROOM);
  });

  it.each([
    ["signed-out, guest rooms off", "anonymous", false],
    ["signed-out, guest rooms on", "anonymous", true],
    ["member", "authenticated", false],
  ])("room game switched off (%s): no actionable creation or sign-in link", (_label, status, guestLobbies) => {
    state.status = status as string;
    state.guestLobbies = guestLobbies as boolean;
    state.roomGames = ["codenames"];
    const { container } = renderEntry();
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("link")).toBeNull();
  });

  describe("auth still loading with guest rooms off (a returning member is not a guest yet)", () => {
    const entry = (locale: (typeof SEO_PAGE_LOCALES)[number]) => (
      <RoomEntryLink href={ROOM} locale={locale} returnTo={pageOf(locale)} modeId="mentalista" placement="test_room" signInLabel="Sign in">Create a room</RoomEntryLink>
    );

    it("renders an inert placeholder: no link, no sign-in, nothing remembered", () => {
      state.status = "loading";
      const { container } = renderEntry("de");
      expect(screen.queryByRole("link")).toBeNull();
      const pending = container.querySelector('[data-room-entry="pending"]');
      expect(pending).not.toBeNull();
      expect(pending).toHaveAttribute("aria-disabled", "true");
      expect(pending).not.toHaveAttribute("href");
      fireEvent.click(pending!);
      expect(state.remember).not.toHaveBeenCalled();
      expect(state.trackSignup).not.toHaveBeenCalled();
      expect(stored(STORAGE_KEYS.POST_AUTH_REDIRECT)).toBeNull();
      expect(stored(STORAGE_KEYS.LOCALE)).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(socketSpy).not.toHaveBeenCalled();
    });

    it("loading → authenticated: gains the direct room link, without any sign-in or redirect side effects", () => {
      state.status = "loading";
      const view = render(entry("fr"));
      expect(screen.queryByRole("link")).toBeNull();
      state.status = "authenticated";
      view.rerender(entry("fr"));
      const link = screen.getByRole("link", { name: "Create a room" });
      expect(link).toHaveAttribute("href", ROOM);
      expect(link).toHaveAttribute("data-room-entry", "room");
      expect(link).toHaveAttribute("data-prefetch", "false");
      expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
      fireEvent.click(link);
      expect(stored(STORAGE_KEYS.LOCALE)).toBe("fr");
      expect(state.remember).not.toHaveBeenCalled();
      expect(state.trackSignup).not.toHaveBeenCalled();
      expect(stored(STORAGE_KEYS.POST_AUTH_REDIRECT)).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(socketSpy).not.toHaveBeenCalled();
    });

    it("loading → anonymous: becomes the sign-in link returning to the localized public page", () => {
      state.status = "loading";
      const view = render(entry("pt"));
      expect(screen.queryByRole("link")).toBeNull();
      state.status = "anonymous";
      view.rerender(entry("pt"));
      expect(screen.queryByRole("link", { name: "Create a room" })).toBeNull();
      const link = screen.getByRole("link", { name: "Sign in" });
      expect(link).toHaveAttribute("href", "/play?signin=1");
      expect(link).toHaveAttribute("data-room-entry", "sign-in");
      fireEvent.click(link);
      expect(stored(STORAGE_KEYS.LOCALE)).toBe("pt");
      expect(state.remember).toHaveBeenCalledWith(pageOf("pt"));
      expect(state.remember).not.toHaveBeenCalledWith(ROOM);
      expect(stored(STORAGE_KEYS.POST_AUTH_REDIRECT)).toBe(pageOf("pt"));
    });

    it("guest rooms on: loading still links straight to the room (unchanged)", () => {
      state.status = "loading";
      state.guestLobbies = true;
      renderEntry("es");
      expect(screen.getByRole("link", { name: "Create a room" })).toHaveAttribute("href", ROOM);
    });

    it.each([false, true])("room game switched off while loading (guest rooms %s): renders nothing", (guestLobbies) => {
      state.status = "loading";
      state.guestLobbies = guestLobbies;
      state.roomGames = ["codenames"];
      const { container } = renderEntry();
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole("link")).toBeNull();
    });
  });

  it("rejects any href that is not the room creator", () => {
    state.status = "authenticated";
    const { container } = render(
      <RoomEntryLink href="/friend/room/ABC123" locale="en" returnTo={pageOf("en")} modeId="mentalista" placement="test_room" signInLabel="Sign in">Create a room</RoomEntryLink>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["guest rooms on", "anonymous", true],
    ["member", "authenticated", false],
    ["guest rooms off", "anonymous", false],
  ])("repeated clicks and unmount/remount never create a room (%s): navigation only, no API or socket", (_label, status, guestLobbies) => {
    state.status = status as string;
    state.guestLobbies = guestLobbies as boolean;
    const first = renderEntry("es");
    for (let i = 0; i < 3; i += 1) fireEvent.click(screen.getByRole("link"));
    first.unmount();
    renderEntry("es");
    fireEvent.click(screen.getByRole("link"));
    fireEvent.click(screen.getByRole("link"));
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(socketSpy).not.toHaveBeenCalled();
    expect(stored(STORAGE_KEYS.LOCALE)).toBe("es");
  });
});
