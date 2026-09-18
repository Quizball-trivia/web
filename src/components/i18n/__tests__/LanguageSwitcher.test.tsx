import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InPlaceLanguageSwitcher, LanguageSwitcher } from "../LanguageSwitcher";
import { storage, STORAGE_KEYS } from "@/utils/storage";

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

    expect(screen.getByRole("menuitem", { name: /english/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("menuitem", { name: /español/i })).toHaveAttribute(
      "href",
      "/es/about",
    );
    expect(screen.getByRole("menuitem", { name: /ქართული/i })).toHaveAttribute(
      "href",
      "/ka/about",
    );
  });

  it("persists the chosen language as the explicit app locale", async () => {
    const user = userEvent.setup();
    storage.set(STORAGE_KEYS.LOCALE, "ka");
    render(<LanguageSwitcher locale="ka" />);

    await user.click(screen.getByRole("button", { name: /current language/i }));
    await user.click(screen.getByRole("menuitem", { name: /english/i }));

    expect(storage.get<string | null>(STORAGE_KEYS.LOCALE, null)).toBe("en");
  });

  it("renders only the explicitly allowed locale options", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher locale="en" locales={["en", "es"]} />);

    await user.click(screen.getByRole("button", { name: /current language: english/i }));

    expect(screen.getByRole("menuitem", { name: /english/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /español/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /ქართული/i })).not.toBeInTheDocument();
  });

  it("preserves query parameters when changing locale", async () => {
    const user = userEvent.setup();
    navigation.search = "ref=campaign&signup=1";
    render(<LanguageSwitcher locale="en" />);

    await user.click(screen.getByRole("button", { name: /current language: english/i }));

    expect(screen.getByRole("menuitem", { name: /español/i })).toHaveAttribute(
      "href",
      "/es/about?ref=campaign&signup=1",
    );
  });
});

describe("LanguageSwitcher trigger", () => {
  it("shows only the flag and keeps the accessible name", () => {
    render(<InPlaceLanguageSwitcher locale="en" onSelect={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: /Choose language\. Current language: English/ });
    expect(trigger.textContent?.trim()).toBe("");
    expect(trigger.className).toContain("rounded-full");
  });

  it("names the current language the way its speakers do", () => {
    render(<InPlaceLanguageSwitcher locale="ka" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: /ქართული/ })).toHaveAttribute("title", "ქართული");
  });
});

describe("LanguageSwitcher in-place mode", () => {
  it("offers buttons that call onSelect and persist the choice instead of navigating", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<InPlaceLanguageSwitcher locale="en" onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: /current language: english/i }));
    const item = screen.getByRole("menuitem", { name: /ქართული/i });
    expect(item.tagName).toBe("BUTTON");
    expect(item).not.toHaveAttribute("href");
    await user.click(item);
    expect(onSelect).toHaveBeenCalledWith("ka");
    // Persisting is the caller's job (LocaleProvider stores the locale it actually ends up in), so a failed save cannot leave a stale choice behind.
    expect(storage.get(STORAGE_KEYS.LOCALE, null)).toBeNull();
  });
});
