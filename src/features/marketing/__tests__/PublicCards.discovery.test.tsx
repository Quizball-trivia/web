import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LOCALES } from "@/lib/i18n/locale";
import { HOME_COPY } from "@/lib/seo/home-copy";
import { cardHref, findPublicGameByModeId, relatedPublishedGames } from "@/lib/seo/public-games";
import { PublicCardGrid } from "../public/PublicCards";

vi.mock("@/features/demos/DemoModeArt", () => ({ DemoModeArt: () => <div /> }));
vi.mock("../public/DeferredCardArt", () => ({ DeferredCardArt: () => <div /> }));
vi.mock("../public/PublicLinks", () => ({
  GameCardLink: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

describe("public discovery cards", () => {
  it.each(LOCALES)("distinguishes daily games, sample rounds, quizzes and accounts in %s", (locale) => {
    const copy = HOME_COPY[locale].cards;
    for (const [modeId, label] of [
      ["minuto", copy.dailyGame], ["tenable", copy.dailyGame], ["buscaminas", copy.dailyGame],
      ["pistas", copy.dailyGame], ["nameChain", copy.dailyGame], ["darts501", copy.dailyGame],
      ["grid", copy.practice], ["careerPath", copy.quiz], ["friendly", copy.accountRequired],
    ]) {
      const game = findPublicGameByModeId(modeId)!;
      const view = render(<PublicCardGrid games={[game]} locale={locale} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByRole("link")).toHaveAttribute("href", cardHref(game, locale));
      if (label !== copy.practice) expect(screen.queryByText(copy.practice)).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it("keeps the Turkish career quiz on its established URL with a descriptive discovery name", () => {
    render(<PublicCardGrid games={[findPublicGameByModeId("careerPath")!]} locale="tr" />);
    expect(screen.getByRole("heading", { name: "Kariyerden Futbolcu Tahmin Etme" })).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/tr/futbol-bilgi-yarismasi/kariyerden-futbolcu-tahmin-etme");
    expect(HOME_COPY.tr.quizLinks.careerPath).toBe("Kariyerden Futbolcu Tahmin Etme");
  });

  it.each([
    ["minuto", ["pistas", "buscaminas", "grid"]],
    ["tenable", ["darts501", "conexiones", "pistas"]],
  ] as const)("%s recommends active games without deleting the older public route", (modeId, related) => {
    expect(relatedPublishedGames(findPublicGameByModeId(modeId)!).map((game) => game.modeId)).toEqual(related);
    expect(findPublicGameByModeId("ultimo")?.page).toBe(true);
  });
});
