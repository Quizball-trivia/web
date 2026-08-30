import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "../LanguageSwitcher";

const navigation = vi.hoisted(() => ({ pathname: "/en/about" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    navigation.pathname = "/en/about";
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

  it("renders only the explicitly allowed locale options", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher locale="en" locales={["en", "es"]} />);

    await user.click(screen.getByRole("button", { name: /current language: english/i }));

    expect(screen.getByRole("menuitem", { name: /english/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /español/i })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /ქართული/i })).not.toBeInTheDocument();
  });
});
