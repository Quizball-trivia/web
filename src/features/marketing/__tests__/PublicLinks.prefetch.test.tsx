import type { AnchorHTMLAttributes } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ status: "anonymous", trackCard: vi.fn(), trackSignup: vi.fn(), remember: vi.fn() }));
vi.mock("next/link", () => ({ default: ({ prefetch, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => <a {...props} data-prefetch={String(prefetch)} /> }));
vi.mock("next/navigation", () => ({ usePathname: () => "/es/juegos-de-futbol/jugador-en-comun" }));
vi.mock("@/stores/auth.store", () => ({ useAuthStore: (selector: (s: { status: string }) => unknown) => selector(state) }));
vi.mock("@/lib/auth/postAuthRedirect", () => ({ rememberPostAuthRedirect: state.remember }));
vi.mock("@/lib/analytics/public-games.analytics", () => ({ trackGameCardClick: state.trackCard, trackGamesSignupClick: state.trackSignup }));

import { GameCardLink, SignInLink } from "../public/PublicLinks";

beforeEach(() => { state.status = "anonymous"; vi.clearAllMocks(); });

describe("public links", () => {
  it("does not preload other games, but preserves their URL and click tracking", () => {
    render(<GameCardLink href="/es/juegos-de-futbol/cadena-de-futbolistas" modeId="nameChain" group="daily" surface="public_home" destination="page">Next game</GameCardLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("data-prefetch", "false");
    expect(link).toHaveAttribute("href", "/es/juegos-de-futbol/cadena-de-futbolistas");
    fireEvent.click(link);
    expect(state.trackCard).toHaveBeenCalledWith({ modeId: "nameChain", group: "daily", surface: "public_home", destination: "page" });
  });

  it("preserves the guest signup return path and tracking without preloading the app", () => {
    render(<SignInLink placement="test" modeId="sharedPlayer" returnTo="/ortak-futbolcu">Join</SignInLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("data-prefetch", "false");
    fireEvent.click(link);
    expect(state.remember).toHaveBeenCalledWith("/ortak-futbolcu");
    expect(state.trackSignup).toHaveBeenCalledWith(expect.objectContaining({ modeId: "sharedPlayer", placement: "test" }));
  });

  it("keeps a member going straight to the game without guest signup tracking", () => {
    state.status = "authenticated";
    render(<SignInLink placement="test" returnTo="/ortak-futbolcu">Play</SignInLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/ortak-futbolcu");
    expect(link).toHaveAttribute("data-prefetch", "false");
    fireEvent.click(link);
    expect(state.trackSignup).not.toHaveBeenCalled();
  });
});
