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

  it.each([
    ["/tr/futbol-oyunlari/ortak-futbolcu-oyunu", "tr", /español/i, "/es/juegos-de-futbol/jugador-en-comun"],
    ["/en/football-games/football-name-chain", "en", /türkçe/i, "/tr/futbol-oyunlari/son-harfle-futbolcu"],
    ["/es/quiz-de-futbol/adivina-el-jugador", "es", /türkçe/i, "/en/football-quiz/guess-the-player"],
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
