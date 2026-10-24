import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlayerStats } from "@/types/game";

const mocks = vi.hoisted(() => ({
  pathname: "/en/football-games/football-name-chain", search: "preview=public-test&ref=campaign",
  language: { load: vi.fn(), peek: vi.fn() }, contact: { load: vi.fn(), peek: vi.fn() }, social: { load: vi.fn(), peek: vi.fn() }, profile: { load: vi.fn(), peek: vi.fn() }, logout: { load: vi.fn(), peek: vi.fn() },
}));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useSearchParams: () => new URLSearchParams(mocks.search), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../app-shell/shellChromeLoader", () => ({ languageChrome: mocks.language, contactChrome: mocks.contact, socialChrome: mocks.social, profileChrome: mocks.profile, logoutChrome: mocks.logout }));
vi.mock("@/stores/auth.store", () => ({ useAuthStore: (select: (s: { user: null }) => unknown) => select({ user: null }) }));
vi.mock("@/lib/repositories/feedback.repo", () => ({ submitFeedback: vi.fn() }));
import { LanguageSwitcher, ContactModal, SocialLinks, AppShellLogoutDialog, AppShellProfileMenu } from "../app-shell/DeferredShellChrome";
import { LanguageSwitcher as OriginalLanguage } from "@/components/i18n/LanguageSwitcher";
import { PublicLanguageLink } from "@/components/i18n/PublicLanguageLink";
import { SocialLinks as OriginalSocial } from "@/components/shared/SocialLinks";
import { ContactModal as OriginalContact } from "@/components/shared/ContactModal";
import { AppShellLogoutDialog as OriginalLogout } from "../app-shell/AppShellLogoutDialog";

function pending<T>() { let resolve!: (v: T) => void; let reject!: (e: Error) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const language = { LanguageSwitcher: OriginalLanguage, PublicLanguageLink };

beforeEach(() => {
  vi.resetAllMocks(); mocks.pathname = "/en/football-games/football-name-chain";
  mocks.language.load.mockResolvedValue(language);
  mocks.contact.load.mockResolvedValue({ ContactModal: OriginalContact });
  mocks.social.load.mockResolvedValue({ SocialLinks: OriginalSocial });
  mocks.profile.load.mockResolvedValue({ AppShellProfileMenu: ({ playerStats }: { playerStats: PlayerStats }) => <button>Profile {playerStats.username}</button> });
  mocks.logout.load.mockResolvedValue({ AppShellLogoutDialog: OriginalLogout });
});
afterEach(() => { document.body.style.pointerEvents = ""; document.body.style.overflow = ""; });

describe("deferred shell, same existing widgets", () => {
  it("does not fetch unopened menus, retains flag presentation and contact asChild button semantics", () => {
    const view = render(<><LanguageSwitcher locale="en" className="custom" /><SocialLinks size="xs" /><ContactModal trigger={<button type="button" className="keep" title="Contact">Contact</button>} /><AppShellLogoutDialog open={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} /></>);
    expect(screen.getByRole("button", { name: /current language/i })).toHaveClass("size-10", "custom");
    expect(view.container.querySelector('[style*="gb.svg"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Contact" })).toHaveClass("keep");
    expect(screen.getByRole("button", { name: "Contact" })).toHaveAttribute("type", "button");
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute("target", "_blank");
    for (const loader of [mocks.language, mocks.contact, mocks.social, mocks.profile, mocks.logout]) expect(loader.load).not.toHaveBeenCalled();
  });

  it.each([["{ArrowDown}", /english/i], ["{ArrowUp}", /deutsch/i]] as const)("first %s opens the real menu with the correct focused item and Escape returns focus", async (key, firstItem) => {
    const user = userEvent.setup(); render(<LanguageSwitcher locale="en" />);
    const trigger = screen.getByRole("button", { name: /current language/i }); trigger.focus(); await user.keyboard(key);
    const item = await screen.findByRole("menuitem", { name: firstItem }); await waitFor(() => expect(item).toHaveFocus());
    await user.keyboard("{Escape}"); await waitFor(() => expect(screen.getByRole("button", { name: /current language/i })).toHaveFocus());
  });

  it("keeps translated destinations and all query parameters on first opening", async () => {
    const user = userEvent.setup(); render(<LanguageSwitcher locale="en" />);
    await user.click(screen.getByRole("button", { name: /current language/i }));
    expect(await screen.findByRole("menuitem", { name: /türkçe/i })).toHaveAttribute("href", "/tr/futbol-oyunlari/son-harfle-futbolcu?preview=public-test&ref=campaign");
  });

  it("does not repeat startup focus during roving or after reopening the same menu", async () => {
    const user = userEvent.setup(); render(<LanguageSwitcher locale="en" />);
    screen.getByRole("button", { name: /current language/i }).focus();
    await user.keyboard("{ArrowUp}");
    const german = await screen.findByRole("menuitem", { name: /deutsch/i });
    await waitFor(() => expect(german).toHaveFocus());
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: /português/i })).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("button", { name: /current language/i })).toHaveFocus());
    await user.keyboard("{ArrowDown}");
    await waitFor(() => expect(screen.getByRole("menuitem", { name: /english/i })).toHaveFocus());
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: /ქართული/i })).toHaveFocus();
  });

  it("leaves pointer-open menu focus and later keyboard navigation to Radix", async () => {
    const user = userEvent.setup(); render(<LanguageSwitcher locale="en" />);
    await user.click(screen.getByRole("button", { name: /current language/i }));
    await screen.findByRole("menu");
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: /deutsch/i })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: /english/i })).toHaveFocus();
  });

  it("does not let a late language import open after navigating away and back", async () => {
    const later = pending<typeof language>(); mocks.language.load.mockReturnValue(later.promise);
    const view = render(<LanguageSwitcher locale="en" />); const trigger = screen.getByRole("button"); trigger.focus(); fireEvent.click(trigger);
    mocks.pathname = "/es/juegos-de-futbol/cadena-de-futbolistas"; view.rerender(<LanguageSwitcher locale="es" />);
    mocks.pathname = "/en/football-games/football-name-chain"; view.rerender(<LanguageSwitcher locale="en" />);
    await act(async () => later.resolve(language)); expect(screen.queryByRole("menu")).toBeNull();
  });

  it("a contact button's prevented click does not open or fetch its dialog", () => {
    render(<ContactModal trigger={<button onClick={event => event.preventDefault()}>Contact</button>} />);
    fireEvent.click(screen.getByRole("button")); expect(mocks.contact.load).not.toHaveBeenCalled();
  });

  it("first contact click opens the original form without a second click; close restores the trigger", async () => {
    const user = userEvent.setup(); render(<ContactModal trigger={<button type="button">Contact</button>} />);
    await user.click(screen.getByRole("button", { name: "Contact" })); expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /your email/i })).toBeInTheDocument();
    await user.keyboard("{Escape}"); await waitFor(() => expect(screen.getByRole("button", { name: "Contact" })).toHaveFocus());
  });

  it("Facebook loads only its own original picker; Instagram remains a normal link", async () => {
    const user = userEvent.setup(); render(<SocialLinks size="xs" />); await user.click(screen.getByRole("button", { name: "Facebook" }));
    expect(await screen.findByRole("link", { name: /Facebook Page/i })).toBeInTheDocument();
    expect(mocks.contact.load).not.toHaveBeenCalled(); expect(mocks.language.load).not.toHaveBeenCalled(); expect(mocks.profile.load).not.toHaveBeenCalled();
    await user.keyboard("{Escape}"); await waitFor(() => expect(screen.getByRole("button", { name: "Facebook" })).toHaveFocus());
  });

  it("an activation import failure leaves its trigger usable for successful retry", async () => {
    mocks.contact.load.mockRejectedValueOnce(new Error("offline")); render(<ContactModal trigger={<button type="button">Contact</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Contact" })); expect(await screen.findByRole("alert")).toHaveTextContent("Service temporarily unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Contact" })); expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("restored member presentation starts loading immediately without a click, retaining RP space", async () => {
    const p = pending<{ AppShellProfileMenu: () => React.ReactNode }>(); mocks.profile.load.mockReturnValue(p.promise);
    render(<AppShellProfileMenu variant="mobile" playerStats={{ username: "Tester", rankPoints: 123 } as PlayerStats} onRequestLogout={vi.fn()} />);
    expect(mocks.profile.load).toHaveBeenCalledTimes(1); expect(screen.getByText("Tester")).toBeInTheDocument(); expect(screen.getByText("123")).toBeInTheDocument();
    await act(async () => p.resolve({ AppShellProfileMenu: () => <button>Real profile</button> })); expect(screen.getByRole("button", { name: "Real profile" })).toBeInTheDocument();
  });

  it("never confirms logout while loading, and Escape cancels a late dialog without stealing focus", async () => {
    const user = userEvent.setup(); const later = pending<{ AppShellLogoutDialog: typeof OriginalLogout }>(); mocks.logout.load.mockReturnValue(later.promise);
    const confirm = vi.fn(); const onChange = vi.fn();
    const view = render(<><button>Opener</button><AppShellLogoutDialog open={false} onOpenChange={onChange} onConfirm={confirm} /></>);
    const opener = screen.getByRole("button"); opener.focus(); view.rerender(<><button>Opener</button><AppShellLogoutDialog open onOpenChange={onChange} onConfirm={confirm} /></>);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument(); expect(confirm).not.toHaveBeenCalled();
    await user.keyboard("{Escape}"); expect(onChange).toHaveBeenCalledWith(false);
    view.rerender(<><button>Opener</button><AppShellLogoutDialog open={false} onOpenChange={onChange} onConfirm={confirm} /></>);
    await act(async () => later.resolve({ AppShellLogoutDialog: OriginalLogout })); expect(screen.queryByRole("alertdialog")).toBeNull(); expect(confirm).not.toHaveBeenCalled(); expect(opener).toHaveFocus();
  });

  it("a failed logout import can retry, but only the real confirmation executes logout", async () => {
    const confirm = vi.fn(); mocks.logout.load.mockRejectedValueOnce(new Error("offline")); const user = userEvent.setup();
    render(<AppShellLogoutDialog open onOpenChange={vi.fn()} onConfirm={confirm} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Service temporarily unavailable"); expect(confirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    const action = await screen.findByRole("button", { name: "Log out" }); expect(confirm).not.toHaveBeenCalled(); await user.click(action); expect(confirm).toHaveBeenCalledTimes(1);
  });
});
