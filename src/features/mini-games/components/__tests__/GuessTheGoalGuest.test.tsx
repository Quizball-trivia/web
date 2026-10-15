import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ status: "loading" as "loading" | "anonymous" | "authenticated" | "banned" }));
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: (select: (state: { status: string }) => unknown) => select({ status: auth.status }),
}));
vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn() }));
vi.mock("../../lib/i18n", () => ({ useMiniT: () => (key: string) => key }));
vi.mock("@/lib/repositories/guessTheGoal.repo", () => ({ guessTheGoalGuestApi: () => ({ guest: true }) }));
const screenProps = vi.hoisted(() => ({ last: null as null | { deps: { api: unknown; guest?: { signInHref: string } } } }));
vi.mock("../GuessTheGoalLive", () => ({
  GuessTheGoalScreen: (props: { deps: { api: unknown; guest?: { signInHref: string } } }) => {
    screenProps.last = props;
    return <div data-testid="ggt-screen" />;
  },
}));

import { GuessTheGoalGuest } from "../GuessTheGoalGuest";

describe("GuessTheGoalGuest", () => {
  beforeEach(() => { screenProps.last = null; });

  it("waits for auth before mounting the game, so a member is never started as a guest", () => {
    auth.status = "loading";
    const onMember = vi.fn();
    render(<GuessTheGoalGuest locale="en" onExit={vi.fn()} onMember={onMember} />);
    expect(screen.queryByTestId("ggt-screen")).toBeNull();
    expect(onMember).not.toHaveBeenCalled();
  });

  it("can still be left while auth is unresolved (the screen's own back control is not mounted yet)", () => {
    auth.status = "loading";
    const onExit = vi.fn();
    render(<GuessTheGoalGuest locale="en" onExit={onExit} onMember={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("hands a signed-in visitor to the app and never mounts the guest screen", () => {
    auth.status = "authenticated";
    const onMember = vi.fn();
    render(<GuessTheGoalGuest locale="en" onExit={vi.fn()} onMember={onMember} />);
    expect(onMember).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("ggt-screen")).toBeNull();
  });

  it("mounts the guest game for a signed-out visitor with the guest API and a sign-in link", () => {
    auth.status = "anonymous";
    render(<GuessTheGoalGuest locale="es" onExit={vi.fn()} onMember={vi.fn()} />);
    expect(screen.getByTestId("ggt-screen")).toBeTruthy();
    expect(screenProps.last?.deps.api).toEqual({ guest: true });
    expect(screenProps.last?.deps.guest?.signInHref).toBeTruthy();
  });
});
