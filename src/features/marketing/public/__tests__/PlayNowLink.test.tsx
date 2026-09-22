import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlayNowLink } from "../PlayNowLink";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";

const push = vi.fn();
const auth = vi.hoisted(() => ({ status: "anonymous" as "anonymous" | "authenticated" | "loading" }));
const principal = vi.hoisted(() => ({ ensureGuestPrincipal: vi.fn(async (): Promise<{ userId: string } | null> => ({ userId: "guest-1" })) }));
const redirect = vi.hoisted(() => ({ rememberPostAuthRedirect: vi.fn() }));
const route = vi.hoisted(() => ({ pathname: "/en/football-games/auction" }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => route.pathname }));
vi.mock("@/stores/auth.store", () => ({ useAuthStore: (selector: (s: { status: string }) => unknown) => selector({ status: auth.status }) }));
vi.mock("@/lib/realtime/realtime-principal", () => ({ ensureGuestPrincipal: principal.ensureGuestPrincipal }));
vi.mock("@/lib/auth/postAuthRedirect", () => ({ rememberPostAuthRedirect: redirect.rememberPostAuthRedirect }));
vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn() }));

const props = { modeId: "auction", locale: "en", guestHref: "/auction?source=practice_bot", memberHref: "/auction" };

describe("PlayNowLink", () => {
  beforeEach(() => { localStorage.clear(); route.pathname = "/en/football-games/auction"; push.mockClear(); principal.ensureGuestPrincipal.mockClear(); redirect.rememberPostAuthRedirect.mockClear(); auth.status = "anonymous"; });

  it.each(['en', 'ka', 'es', 'tr'] as const)('keeps %s after guest entry leaves the localized page', async (locale) => {
    localStorage.setItem('quizball_locale', JSON.stringify(locale === 'en' ? 'ka' : 'en'));
    route.pathname = `/${locale}/football-games/football-tic-tac-toe`;
    function Probe() { return <span data-testid="game-language">{useLocale().locale}</span>; }
    const view = () => <LocaleProvider><Probe /><PlayNowLink {...props} modeId="grid" locale={locale}
      guestHref="/tic-tac-toe?source=practice_bot&pack=european">Play now</PlayNowLink></LocaleProvider>;
    const {rerender} = render(view());
    fireEvent.click(screen.getByRole('button', {name: /Play now/}));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/tic-tac-toe?source=practice_bot&pack=european'));
    route.pathname = '/tic-tac-toe';
    rerender(view());
    await waitFor(() => expect(screen.getByTestId('game-language')).toHaveTextContent(locale));
    expect(JSON.parse(localStorage.getItem('quizball_locale')!)).toBe(locale);
  });

  it("guest: resolves a principal, then opens the practice bot table", async () => {
    render(<PlayNowLink {...props}>Play now</PlayNowLink>);
    fireEvent.click(screen.getByRole("button", { name: /Play now/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/auction?source=practice_bot"));
    expect(principal.ensureGuestPrincipal).toHaveBeenCalledWith("en");
  });

  it("guest refused (provisioning off / rate limit): goes to sign-in and remembers the page", async () => {
    principal.ensureGuestPrincipal.mockResolvedValueOnce(null);
    render(<PlayNowLink {...props}>Play now</PlayNowLink>);
    fireEvent.click(screen.getByRole("button", { name: /Play now/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/play?signin=1"));
    expect(redirect.rememberPostAuthRedirect).toHaveBeenCalledWith("/en/football-games/auction");
  });

  it("member: normal online flow, no guest principal", async () => {
    auth.status = "authenticated";
    render(<PlayNowLink {...props}>Play now</PlayNowLink>);
    fireEvent.click(screen.getByRole("button", { name: /Play now/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/auction"));
    expect(principal.ensureGuestPrincipal).not.toHaveBeenCalled();
  });

  it("auth still loading: the button waits instead of treating a returning member as a refused guest", () => {
    auth.status = "loading";
    render(<PlayNowLink {...props}>Play now</PlayNowLink>);
    const button = screen.getByRole("button", { name: /Play now/ });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(push).not.toHaveBeenCalled();
    expect(principal.ensureGuestPrincipal).not.toHaveBeenCalled();
  });
});
