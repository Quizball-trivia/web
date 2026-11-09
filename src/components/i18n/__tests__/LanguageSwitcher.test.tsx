import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "../LanguageSwitcher";

const navigation = vi.hoisted(() => ({ pathname: "/en/about", search: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    navigation.pathname = "/en/about";
    navigation.search = "";
  });

  it("keeps inactive languages inside a compact menu", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher locale="en" />);

    expect(screen.getByRole("button", { name: /current language: english/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /español/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /current language: english/i }));

    expect(await screen.findByRole("menuitem", { name: /english/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(await screen.findByRole("menuitem", { name: /español/i })).toHaveAttribute(
      "href",
      "/es/about",
    );
    expect(await screen.findByRole("menuitem", { name: /ქართული/i })).toHaveAttribute(
      "href",
      "/ka/about",
    );
  });

  it("renders only the explicitly allowed locale options", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher locale="en" locales={["en", "es"]} />);

    await user.click(screen.getByRole("button", { name: /current language: english/i }));

    expect(await screen.findByRole("menuitem", { name: /english/i })).toBeInTheDocument();
    expect(await screen.findByRole("menuitem", { name: /español/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /ქართული/i })).not.toBeInTheDocument();
  });

  it("preserves query parameters when changing locale", async () => {
    const user = userEvent.setup();
    navigation.search = "ref=campaign&signup=1";
    render(<LanguageSwitcher locale="en" />);

    await user.click(screen.getByRole("button", { name: /current language: english/i }));

    expect(await screen.findByRole("menuitem", { name: /español/i })).toHaveAttribute(
      "href",
      "/es/about?ref=campaign&signup=1",
    );
  });

  it("keeps the real language anchors available to keyboard roving focus", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher locale="en" />);
    const trigger = screen.getByRole("button", { name: /current language: english/i });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    const english = await screen.findByRole("menuitem", { name: /english/i });
    const georgian = await screen.findByRole("menuitem", { name: /ქართული/i });
    english.focus();
    await user.keyboard("{ArrowDown}");
    expect(georgian).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("picking a language drops a pending signup language and saves the choice", async () => {
    localStorage.setItem("quizball_signup_locale", JSON.stringify({ locale: "fr", at: Date.now() }));
    navigation.pathname = "/fr/jeux-de-foot/morpion-foot";
    navigation.search = "";
    const user = userEvent.setup();
    render(<LanguageSwitcher locale="fr" />);
    await user.click(screen.getByRole("button", { name: /current language|langue/i }));
    await user.click(await screen.findByRole("menuitem", { name: /ქართული/i }));
    expect(localStorage.getItem("quizball_signup_locale")).toBeNull();
    expect(localStorage.getItem("quizball_locale")).toBe(JSON.stringify("ka"));
  });

  it.each([
    ["/tr/futbol-oyunlari/ortak-futbolcu-oyunu", "tr", /español/i, "/es/juegos-de-futbol/jugador-en-comun"],
    ["/en/football-games/football-name-chain", "en", /türkçe/i, "/tr/futbol-oyunlari/son-harfle-futbolcu"],
    ["/es/quiz-de-futbol/adivina-el-jugador", "es", /türkçe/i, "/tr/futbol-bilgi-yarismasi/futbolcu-bilmece"],
    ["/en/football-quiz/career-path", "en", /русский/i, "/ru/futbolnaya-viktorina/ugaday-futbolista-po-karere"],
    ["/ru/futbolnaya-viktorina/viktorina-arsenal", "ru", /english/i, "/en/football-quiz/arsenal"],
    ["/ru/futbolnaya-viktorina/viktorina-sbornaya-ispanii", "ru", /español/i, "/es/quiz-de-futbol/seleccion-espanola"],
    ["/ru/futbolnaya-viktorina/ugaday-futbolista", "ru", /türkçe/i, "/tr/futbol-bilgi-yarismasi/futbolcu-bilmece"],
    ["/en/football-quiz/career-path", "en", /português/i, "/pt/quiz-de-futebol/adivinhe-o-jogador-pela-carreira"],
    ["/pt/quiz-de-futebol/quiz-do-arsenal", "pt", /english/i, "/en/football-quiz/arsenal"],
    ["/pt/quiz-de-futebol/quiz-da-selecao-espanhola", "pt", /русский/i, "/ru/futbolnaya-viktorina/viktorina-sbornaya-ispanii"],
    ["/pt/quiz-de-futebol/adivinhe-o-jogador", "pt", /türkçe/i, "/tr/futbol-bilgi-yarismasi/futbolcu-bilmece"],
    ["/en/football-quiz/career-path", "en", /deutsch/i, "/de/fussball-quiz/karrierestationen-erraten"],
    ["/de/fussball-quiz/arsenal-quiz", "de", /english/i, "/en/football-quiz/arsenal"],
    ["/de/fussball-quiz/spanien-quiz", "de", /русский/i, "/ru/futbolnaya-viktorina/viktorina-sbornaya-ispanii"],
    ["/de/fussball-quiz/fc-barcelona-quiz", "de", /português/i, "/pt/quiz-de-futebol/quiz-do-barcelona"],
    ["/de/fussball-quiz/fussballer-erraten", "de", /türkçe/i, "/tr/futbol-bilgi-yarismasi/futbolcu-bilmece"],
    ["/tr/futbol-bilgi-yarismasi/arsenal-testi", "tr", /english/i, "/en/football-quiz/arsenal"],
    ["/tr/futbol-bilgi-yarismasi/ispanya-milli-takimi-testi", "tr", /deutsch/i, "/de/fussball-quiz/spanien-quiz"],
    ["/ka/football-quiz/arsenal", "ka", /türkçe/i, "/tr/futbol-bilgi-yarismasi/arsenal-testi"],
    ["/en/football-quiz/career-path", "en", /français/i, "/fr/quiz-foot/devine-le-joueur-avec-les-clubs"],
    ["/fr/quiz-foot/quiz-arsenal", "fr", /english/i, "/en/football-quiz/arsenal"],
    ["/fr/quiz-foot/quiz-espagne-foot", "fr", /deutsch/i, "/de/fussball-quiz/spanien-quiz"],
    ["/en/football-games/football-name-chain", "en", /français/i, "/fr/jeux-de-foot/jeu-de-la-derniere-lettre"],
    ["/fr/jeux-de-foot/jeu-de-la-derniere-lettre", "fr", /español/i, "/es/juegos-de-futbol/cadena-de-futbolistas"],
  ] as const)("keeps localized destinations after deferred loading on %s", async (pathname, locale, language, destination) => {
    navigation.pathname = pathname;
    navigation.search = "preview=public-test&ref=campaign";
    const user = userEvent.setup();
    render(<LanguageSwitcher locale={locale} />);

    await user.click(screen.getByRole("button", { name: /current language/i }));

    expect(await screen.findByRole("menuitem", { name: language })).toHaveAttribute(
      "href",
      `${destination}?preview=public-test&ref=campaign`,
    );
  });
});
