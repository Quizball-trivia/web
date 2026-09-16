import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PlayNowLink } from "../PlayNowLink";

const push = vi.fn();
const auth = vi.hoisted(() => ({ status: "anonymous" as "anonymous" | "authenticated" | "loading" }));
const principal = vi.hoisted(() => ({ ensureGuestPrincipal: vi.fn(async (): Promise<{ userId: string } | null> => ({ userId: "guest-1" })) }));
const redirect = vi.hoisted(() => ({ rememberPostAuthRedirect: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), usePathname: () => "/en/football-games/auction" }));
vi.mock("@/stores/auth.store", () => ({ useAuthStore: (selector: (s: { status: string }) => unknown) => selector({ status: auth.status }) }));
vi.mock("@/lib/realtime/realtime-principal", () => ({ ensureGuestPrincipal: principal.ensureGuestPrincipal }));
vi.mock("@/lib/auth/postAuthRedirect", () => ({ rememberPostAuthRedirect: redirect.rememberPostAuthRedirect }));
vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn() }));

const props = { modeId: "auction", locale: "en", guestHref: "/auction?source=practice_bot", memberHref: "/auction" };

describe("PlayNowLink", () => {
  beforeEach(() => { push.mockClear(); principal.ensureGuestPrincipal.mockClear(); redirect.rememberPostAuthRedirect.mockClear(); auth.status = "anonymous"; });

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
