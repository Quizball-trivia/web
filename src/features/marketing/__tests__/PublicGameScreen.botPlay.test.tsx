import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { findPublicGameByModeId, publicGamePath } from "@/lib/seo/public-games";
import { SEO_PAGE_LOCALES } from "@/lib/seo/game-pages";
import { GAME_PAGE_DETAILS } from "@/lib/seo/game-page-details";
import { HOME_COPY } from "@/lib/seo/home-copy";
import { PublicGameScreen } from "../PublicGameScreen";
import { PublicCardGrid } from "../public/PublicCards";

// Room switches for the Mentalista tests; null = the build's own value, so every other test is unchanged.
const flags = vi.hoisted(() => ({ guestLobbies: null as boolean | null, roomGames: null as string[] | null }));
vi.mock("@/lib/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/config")>();
  return {
    ...actual,
    get GUEST_LOBBIES_ENABLED() { return flags.guestLobbies ?? actual.GUEST_LOBBIES_ENABLED; },
    get ROOM_GAMES_ENABLED() { return flags.roomGames ?? actual.ROOM_GAMES_ENABLED; },
  };
});
afterEach(() => { flags.guestLobbies = null; flags.roomGames = null; });

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/en/football-games/football-tic-tac-toe",
}));
vi.mock("@/stores/auth.store", () => ({ useAuthStore: (selector: (s: { status: string }) => unknown) => selector({ status: "anonymous" }) }));
vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/realtime/realtime-principal", () => ({ ensureGuestPrincipal: vi.fn(async () => null) }));
vi.mock("@/features/demos/DemoModeArt", () => ({ DemoModeArt: ({ priority, sizes }: { priority?: boolean; sizes?: string }) => <div data-testid="art" data-priority={String(Boolean(priority))} data-sizes={sizes} /> }));
vi.mock("../public/DeferredWordDailyBoard", () => ({ DeferredWordDailyBoard: ({ modeId, locale }: { modeId: string; locale: string }) => <div data-testid="word-board">{modeId}:{locale}</div> }));
vi.mock("../public/PublicTopTen", () => ({ PublicTopTen: ({ board }: { board: string }) => <div data-testid="top-ten">{board}</div> }));
vi.mock("../public/PublicPageBoard", () => ({ PublicPageBoard: ({ modeId }: { modeId: string }) => <div data-testid="top-ten">{modeId}</div> }));
vi.mock("../public/PublicGameEmbed", () => ({
  PublicGameEmbed: ({ copy, variant }: { copy: { start: string }; variant?: string }) => <button type="button" data-variant={variant ?? "card"}>{copy.start}</button>,
}));

const grid = findPublicGameByModeId("grid")!;
const auction = findPublicGameByModeId("auction")!;
const ranked = findPublicGameByModeId("ranked")!;

describe("PublicGameScreen — Tic Tac Toe / Auction bot-play layout", () => {
  it.each([grid, auction])("$slug: Play now in the hero, Play training in the bottom card, Play ranked above the Top 10", (game) => {
    render(<PublicGameScreen game={game} locale="en" />);
    expect(screen.getByRole("button", { name: /Play now/ })).toBeInTheDocument();
    expect(screen.getByText("Quick match")).toBeInTheDocument();
    // The scripted training launcher moved into the bottom card (inline, no double chrome).
    const training = screen.getByRole("button", { name: "Play training" });
    expect(training.getAttribute("data-variant")).toBe("inline");
    expect(screen.getByRole("heading", { name: "Play training" })).toBeInTheDocument();
    // Sign-up CTA sits in column 2, before the board.
    const ranked = screen.getByRole("link", { name: "Play ranked" });
    expect(ranked.getAttribute("href")).toBe("/play?signin=1");
    const board = screen.getByTestId("top-ten");
    expect(ranked.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The old "Play online" account card is gone on these two pages.
    expect(screen.queryByRole("heading", { name: "Play online" })).toBeNull();
  });

  it("ranked page keeps its layout: no Play now, training launcher in the hero, Play online card", () => {
    render(<PublicGameScreen game={ranked} locale="en" />);
    expect(screen.queryByRole("button", { name: /Play now/ })).toBeNull();
    expect(screen.queryByRole("link", { name: "Play ranked" })).toBeNull();
    expect(screen.getByRole("button", { name: "Play training" }).getAttribute("data-variant")).toBe("card");
    expect(screen.getByRole("heading", { name: "Play online" })).toBeInTheDocument();
  });
});

describe("PublicGameScreen — word-game loading contract", () => {
  it.each(["en", "es", "ka", "tr"] as const)("prioritises one hero and defers every word-game board in %s", (locale) => {
    for (const modeId of ["sharedPlayer", "nameChain", "footballRace", "codenames", "datoFalso", "conexiones", "darts501", "draft"]) {
      const game = findPublicGameByModeId(modeId)!;
      const view = render(<PublicGameScreen game={game} locale={locale} />);
      const heroes = screen.getAllByTestId("art").filter((art) => art.dataset.priority === "true");
      expect(heroes).toHaveLength(1);
      expect(heroes[0]).toHaveAttribute("data-sizes", expect.stringContaining("436px"));
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.getByTestId("word-board")).toHaveTextContent(`${modeId}:${locale}`);
      view.unmount();
    }
  });
});

describe("PublicGameScreen — Mentalista private-room page", () => {
  const mentalista = findPublicGameByModeId("mentalista")!;
  const ROOM = "/friend/room/new?room=mentalista";
  /** h2s a room page may have: How to play, Rules and details (when written), Related games. No account/ranked card. */
  const expectedH2s = (locale: (typeof SEO_PAGE_LOCALES)[number]) => 2 + ((GAME_PAGE_DETAILS[mentalista.slug]?.[locale]?.length ?? 0) > 0 ? 1 : 0);

  it.each(SEO_PAGE_LOCALES)("%s: room badge, conditional account notice and a real Create-a-room link (guest rooms on)", (locale) => {
    flags.guestLobbies = true;
    flags.roomGames = ["mentalista"];
    const copy = mentalista.copy[locale];
    expect(copy.roomBadge, `roomBadge ${locale}`).toBeTruthy();
    expect(copy.roomAccountNotice, `roomAccountNotice ${locale}`).toBeTruthy();
    expect(copy.cta, `cta ${locale}`).toBeTruthy();
    render(<PublicGameScreen game={mentalista} locale={locale} />);
    const hero = screen.getByRole("region", { name: copy.cta });
    const cta = within(hero).getByRole("link", { name: copy.cta });
    expect(cta).toHaveAttribute("href", ROOM);
    expect(cta).toHaveAttribute("data-room-entry", "room");
    // Contrast: black on brand-green (7.87:1, 5.42:1 on hover); white was 2.67:1.
    expect(cta).toHaveClass("text-black");
    expect(cta).not.toHaveClass("text-white");
    // The hero column (h1, intro, label, CTA); related cards further down keep their own badges.
    const heroColumn = screen.getByRole("heading", { level: 1 }).parentElement!;
    expect(within(heroColumn).getByText(copy.roomBadge!)).toBeInTheDocument();
    expect(within(hero).getByText(copy.roomAccountNotice!)).toBeInTheDocument();
    // No practice round, no fake demo, no ranked/XP/coins account card, no leaderboard.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByTestId("top-ten")).toBeNull();
    expect(screen.queryByTestId("word-board")).toBeNull();
    expect(within(heroColumn).queryByText(HOME_COPY[locale].cards.accountRequired)).toBeNull();
    expect(within(heroColumn).queryByText(HOME_COPY[locale].cards.practice)).toBeNull();
    expect(screen.queryAllByRole("link").filter((link) => link.getAttribute("href") === "/play?signin=1")).toHaveLength(0);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(expectedH2s(locale));
  });

  it.each(SEO_PAGE_LOCALES)("%s: signed out with guest rooms off, the hero signs in (returning to this page) and keeps the notice", (locale) => {
    flags.guestLobbies = false;
    flags.roomGames = ["mentalista"];
    const copy = mentalista.copy[locale];
    render(<PublicGameScreen game={mentalista} locale={locale} />);
    const hero = screen.getByRole("region", { name: copy.cta });
    const signIn = within(hero).getByRole("link", { name: HOME_COPY[locale].nav.signIn });
    expect(signIn).toHaveAttribute("href", "/play?signin=1");
    expect(signIn).toHaveAttribute("data-room-entry", "sign-in");
    expect(within(hero).queryByRole("link", { name: copy.cta })).toBeNull();
    expect(within(hero).getByText(copy.roomAccountNotice!)).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(expectedH2s(locale));
    expect(publicGamePath(mentalista, locale).startsWith(`/${locale}/`)).toBe(true);
  });

  it("room game switched off: no creation link and no sign-in substitute in the hero", () => {
    flags.guestLobbies = true;
    flags.roomGames = [];
    const copy = mentalista.copy.en;
    render(<PublicGameScreen game={mentalista} locale="en" />);
    const hero = screen.getByRole("region", { name: copy.cta });
    expect(within(hero).queryByRole("link")).toBeNull();
    expect(screen.queryAllByRole("link").filter((link) => link.getAttribute("href") === ROOM)).toHaveLength(0);
    expect(screen.queryByRole("heading", { name: "Play online" })).toBeNull();
  });

  it.each(SEO_PAGE_LOCALES)("%s: the catalogue card shows the room badge and the room CTA, not Practice/Account required", (locale) => {
    const copy = mentalista.copy[locale];
    render(<PublicCardGrid games={[mentalista]} locale={locale} />);
    const card = screen.getByRole("link");
    expect(card).toHaveAttribute("href", publicGamePath(mentalista, locale));
    expect(within(card).getByText(copy.roomBadge!)).toBeInTheDocument();
    expect(within(card).getByText(copy.cta)).toBeInTheDocument();
    expect(within(card).queryByText(HOME_COPY[locale].cards.accountRequired)).toBeNull();
    expect(within(card).queryByText(HOME_COPY[locale].cards.practice)).toBeNull();
  });
});
