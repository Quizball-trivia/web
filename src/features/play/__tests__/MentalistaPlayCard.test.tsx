import type { AnchorHTMLAttributes, ImgHTMLAttributes } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  status: "anonymous",
  roomGames: ["mentalista"] as string[],
  push: vi.fn(),
  openAuthPrompt: vi.fn(),
  startFriendRoom: vi.fn(),
}));

vi.mock("next/link", () => ({
  // Like next/link, a click never triggers a document navigation (jsdom cannot navigate); the provided onClick still runs.
  default: ({ prefetch, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => (
    <a {...props} data-prefetch={String(prefetch)} onClick={(e) => { onClick?.(e); e.preventDefault(); }} />
  ),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }), usePathname: () => "/play" }));
vi.mock("@/lib/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/config")>();
  return { ...actual, get ROOM_GAMES_ENABLED() { return state.roomGames; } };
});
// The rest of the Play screen is stubbed: the card must not depend on it, and importing it must not reach the network.
vi.mock("@/stores/auth.store", () => ({ useAuthStore: (selector: (s: { status: string }) => unknown) => selector(state) }));
vi.mock("@/stores/authPrompt.store", () => ({ useAuthPromptStore: (selector: (s: { open: () => void }) => unknown) => selector({ open: state.openAuthPrompt }) }));
vi.mock("@/lib/auth/useIsGuest", () => ({ useIsGuest: () => state.status !== "authenticated" }));
vi.mock("@/features/friend/hooks/useDirectFriendRoom", () => ({ useDirectFriendRoom: () => ({ startFriendRoom: state.startFriendRoom }) }));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ t: (key: string) => key, locale: "en" }) }));
vi.mock("@/hooks/useTierLabel", () => ({ useTierLabel: () => (tier: string) => tier }));
vi.mock("@/lib/queries/objectives.queries", () => ({ useObjectives: () => ({ data: undefined, isLoading: false }) }));
vi.mock("@/lib/hooks/useObjectivesEnabled", () => ({ useObjectivesEnabled: () => false }));
vi.mock("@/lib/hooks/useActiveEventMode", () => ({ useActiveEventMode: () => ({ isEventMode: false }) }));
vi.mock("@/lib/analytics/game-events", () => ({ trackWlBannerClicked: vi.fn(), trackWlBannerViewed: vi.fn() }));
vi.mock("@/lib/features/playModes", () => ({ isAuctionCardEnabled: true, isTicTacToeEnabled: true }));
vi.mock("@/lib/football-grid/assets", () => ({ footballGridAssetUrl: (path: string) => path }));
vi.mock("@/features/codenames/codenames.board", () => ({ setRoomPreset: vi.fn(), writeBoard: vi.fn() }));
vi.mock("@/components/layout/SiteFooter", () => ({ SiteFooter: () => null }));
vi.mock("@/components/shared/ModeConfirmModal", () => ({ ModeConfirmModal: () => null }));
vi.mock("@/components/shared/FriendPlayModal", () => ({ FriendPlayModal: () => null }));
vi.mock("@/components/shared/HomeRecentMatches", () => ({ HomeRecentMatches: () => null }));
vi.mock("@/features/training/components/TrainingOfferModal", () => ({ TrainingOfferModal: () => null }));
vi.mock("@/features/auction/components/AuctionModeModal", () => ({ AuctionModeModal: () => null }));
vi.mock("@/features/play/RankedModeModal", () => ({ RankedModeModal: () => null }));
vi.mock("@/features/football-grid/components/FootballGridModeModal", () => ({ FootballGridModeModal: () => null }));
vi.mock("@/features/codenames/CodenamesModeModal", () => ({ CodenamesModeModal: () => null }));
vi.mock("@/features/play/AllGamesGrid", () => ({ AllGamesGrid: () => null }));
vi.mock("@/features/play/PlayAnnouncements", () => ({ PlayAnnouncements: () => null }));
vi.mock("@/features/marketing/public/PracticeLayer", () => ({ PracticeDemo: () => null }));
vi.mock("@/features/weekend-league/components/WeekendLeagueProgressExperimentRail", () => ({ WeekendLeagueProgressExperimentRail: () => null }));
vi.mock("@/features/campaigns/trabzonspor/TrabzonsporQuizCard", () => ({ TrabzonsporQuizCard: () => null }));
vi.mock("../WinRateStat", () => ({ WinRateStat: () => null }));

import { MentalistaPlayCard } from "../ModeSelectionScreen";
import { SEO_PAGE_LOCALES } from "@/lib/seo/game-pages";
import { findPublicGameByModeId, publicGamePath, publicPagePathFor } from "@/lib/seo/public-games";

const BRAND_ICON = "/assets/brand/quizball-icon-512.png";
const mentalista = findPublicGameByModeId("mentalista")!;
const fetchSpy = vi.fn();
const socketSpy = vi.fn();

beforeEach(() => {
  state.status = "anonymous";
  state.roomGames = ["mentalista"];
  vi.clearAllMocks();
  vi.stubGlobal("fetch", fetchSpy);
  vi.stubGlobal("WebSocket", socketSpy);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("MentalistaPlayCard (Play screen entry to the Mentalista public page)", () => {
  it("the registry describes a private room with a public page and no daily, demo or practice version", () => {
    expect(mentalista.guest).toBe("room");
    expect(mentalista.page).toBe(true);
    expect(mentalista.demoSlug).toBeUndefined();
    expect(mentalista.destination).toEqual({ kind: "page" });
  });

  it.each(SEO_PAGE_LOCALES)("%s: links to the registry's localized public page with the registry title, room badge and brand icon", (locale) => {
    const copy = mentalista.copy[locale];
    expect(copy.roomBadge).toBeTruthy();
    const { container } = render(<MentalistaPlayCard locale={locale} />);

    const link = screen.getByRole("link");
    const href = publicPagePathFor(mentalista, locale);
    expect(link).toHaveAttribute("href", href);
    // Either this locale's page, or the English one where this locale has no page body.
    expect([publicGamePath(mentalista, locale), publicGamePath(mentalista, "en")]).toContain(href);
    expect(link).toHaveAttribute("data-prefetch", "false");

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(copy.title);
    expect(link).toHaveTextContent(copy.roomBadge!);
    expect(link).toHaveTextContent(copy.cta);

    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
    images.forEach((img) => expect(img).toHaveAttribute("src", BRAND_ICON));
  });

  it.each(SEO_PAGE_LOCALES)("%s: never targets room creation, a demo or a daily", (locale) => {
    render(<MentalistaPlayCard locale={locale} />);
    const href = screen.getByRole("link").getAttribute("href")!;
    expect(href).not.toContain("/friend/room");
    expect(href).not.toContain("room=");
    expect(href).not.toMatch(/demo|daily/i);
    expect(href).not.toBe(mentalista.playPath);
  });

  it.each(["loading", "anonymous", "authenticated"])("auth %s: the same public page, no auth race", (status) => {
    state.status = status;
    render(<MentalistaPlayCard locale="es" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", publicPagePathFor(mentalista, "es"));
  });

  it("rendering, remounting and clicking only navigate: no router push, sign-in prompt, room creation, API or socket", () => {
    const first = render(<MentalistaPlayCard locale="de" />);
    fireEvent.click(screen.getByRole("link"));
    first.unmount();
    render(<MentalistaPlayCard locale="de" />);
    fireEvent.click(screen.getByRole("link"));
    expect(state.push).not.toHaveBeenCalled();
    expect(state.openAuthPrompt).not.toHaveBeenCalled();
    expect(state.startFriendRoom).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(socketSpy).not.toHaveBeenCalled();
  });

  it.each(SEO_PAGE_LOCALES)("%s: hidden when the room game is switched off (NEXT_PUBLIC_ROOM_GAMES_DISABLED)", (locale) => {
    state.roomGames = ["codenames", "draft"];
    const { container } = render(<MentalistaPlayCard locale={locale} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("the Play screen places it in the main swipe row, after the existing room cards' Codenames card", () => {
    // Repo-relative (vitest runs from the repo root); `import.meta.url` is not a file: URL under jsdom.
    const source = readFileSync(resolve(process.cwd(), "src/features/play/ModeSelectionScreen.tsx"), "utf8");
    const row = source.slice(source.indexOf("<CardScroller>"), source.indexOf("</CardScroller>"));
    expect(row).toContain("<MentalistaPlayCard locale={locale} />");
    expect(row.indexOf("onClick={openCodenamesCard}")).toBeLessThan(row.indexOf("<MentalistaPlayCard"));
    expect(row).toContain("onClick={openGridCard}");
    expect(row).toContain("onClick={openAuctionCard}");
  });
});
