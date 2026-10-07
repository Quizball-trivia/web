import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isFullGameDemo } from "@/lib/seo/public-games";
import { OWN_EXIT_ENGINES } from "../public/PracticeLayer";

const guestFetch = vi.fn();
const push = vi.fn();
const onMember = vi.fn();
const trackPlayNowClick = vi.fn();
let authStatus = "anonymous";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/es/juegos-de-futbol/aproximado-futbolero",
}));
vi.mock("@/stores/auth.store", () => ({ useAuthStore: (selector: (s: { status: string }) => unknown) => selector({ status: authStatus }) }));
vi.mock("@/lib/guest/guestSession", () => ({ guestFetch: (...args: unknown[]) => guestFetch(...args) }));
vi.mock("@/lib/posthog", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/analytics/public-games.analytics", async (orig) => ({ ...(await orig<object>()), trackPlayNowClick: (...args: unknown[]) => trackPlayNowClick(...args) }));
vi.mock("@/features/aproximado/PlayRoomWithFriendsButton", () => ({ PlayRoomWithFriendsButton: () => <button type="button">friends</button> }));
vi.mock("@/features/daily/StatSniperLeaderboard", () => ({ StatSniperLeaderboard: ({ fetcher }: { fetcher?: unknown }) => <div data-testid="board" data-public={fetcher ? "yes" : "no"} /> }));
vi.mock("@/features/demos/DemoDailyChallenge", () => ({
  DemoDailyChallenge: ({ session, boardSlot, onRemoteComplete, resultCta, onEvent, confirmQuit }: { session: { questions: unknown[] }; boardSlot: React.ReactNode; onRemoteComplete: (score: number) => Promise<unknown>; resultCta: { label?: string }; onEvent: (e: "replay") => void; confirmQuit?: boolean }) => (
    <div data-confirm-quit={String(confirmQuit)}>
      <button type="button" onClick={() => onEvent("replay")}>replay</button>
      <p data-testid="questions">{session.questions.length}</p>
      {boardSlot}
      <p data-testid="result-cta">{resultCta.label}</p>
      <button type="button" onClick={() => void onRemoteComplete(73)}>finish</button>
    </div>
  ),
}));

const session = { challengeType: "statSniper", title: "Aproximado", secondsPerQuestion: 20, questions: [{ id: "q1" }, { id: "q2" }] };

async function renderPlay() {
  const { StatSniperPublicPlay } = await import("../public/StatSniperPublicPlay");
  const ui = () => (
    <StatSniperPublicPlay locale="es" modeId="statSniper" pagePath="/es/juegos-de-futbol/aproximado-futbolero" playPath="/daily/challenges/stat-sniper" onExit={vi.fn()} onEvent={vi.fn()} onLeaveToRealGame={vi.fn()} onMember={onMember} />
  );
  const view = render(ui());
  return { ...view, rerenderPlay: () => view.rerender(ui()) };
}

describe("Aproximado on its public page", () => {
  beforeEach(() => { guestFetch.mockReset(); push.mockReset(); onMember.mockReset(); trackPlayNowClick.mockReset(); authStatus = "anonymous"; });

  it("is a full game that draws its own exit, not a practice round", () => {
    expect(isFullGameDemo("daily-statSniper")).toBe(true);
    expect(OWN_EXIT_ENGINES.has("daily-statSniper")).toBe(true);
  });

  it("a guest plays today's real set from the guest API and sees a sign-up card where the leaderboard was", async () => {
    guestFetch.mockResolvedValueOnce(session);
    await renderPlay();
    expect(await screen.findByTestId("questions")).toHaveTextContent("2");
    expect(guestFetch).toHaveBeenCalledWith("/api/v1/guest/daily-challenges/statSniper/session?locale=es", { method: "POST", locale: "es" });
    // The real board (public endpoint) where the leaderboard sits, plus the way onto it.
    expect(screen.getByTestId("board")).toHaveAttribute("data-public", "yes");
    expect(screen.getByRole("link", { name: "Crear cuenta" }).getAttribute("href")).toBe("/play?signin=1");
    expect(screen.getByTestId("result-cta")).toHaveTextContent("Creá tu cuenta y entrá al ranking");
    expect(document.body.textContent).not.toMatch(/BOBBIGOL|TIKI_TAKA/);

    guestFetch.mockResolvedValueOnce({ status: "completed" });
    fireEvent.click(screen.getByRole("button", { name: "finish" }));
    expect(guestFetch).toHaveBeenLastCalledWith("/api/v1/guest/daily-challenges/statSniper/complete", { method: "POST", body: { score: 73 }, locale: "es" });
    // The back arrow leaves directly: the quit dialog would open beneath the page's game layer.
    expect(screen.getByTestId("questions").parentElement).toHaveAttribute("data-confirm-quit", "false");
  });

  it("a failed save is retried once", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    guestFetch.mockResolvedValueOnce(session);
    await renderPlay();
    await screen.findByTestId("questions");
    guestFetch.mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce({ status: "completed" });
    fireEvent.click(screen.getByRole("button", { name: "finish" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    expect(guestFetch.mock.calls.filter(([path]) => String(path).endsWith("/complete"))).toHaveLength(2);
    vi.useRealTimers();
  });

  it("Play again reloads the day's set instead of replaying the loaded one", async () => {
    guestFetch.mockResolvedValueOnce(session).mockResolvedValueOnce({ ...session, questions: [{ id: "n1" }, { id: "n2" }, { id: "n3" }] });
    await renderPlay();
    await screen.findByTestId("questions");
    fireEvent.click(screen.getByRole("button", { name: "replay" }));
    await waitFor(() => expect(screen.getByTestId("questions")).toHaveTextContent("3"));
    expect(guestFetch.mock.calls.filter(([path]) => String(path).includes("/session"))).toHaveLength(2);
  });

  it("waits for auth: nothing loads while it resolves, and a signed-in player goes to the member daily", async () => {
    authStatus = "loading";
    const { rerenderPlay } = await renderPlay();
    expect(guestFetch).not.toHaveBeenCalled();
    authStatus = "authenticated";
    rerenderPlay();
    expect(onMember).toHaveBeenCalledTimes(1);
    expect(guestFetch).not.toHaveBeenCalled();
  });

  it("a failed load offers a retry instead of a dead screen", async () => {
    guestFetch.mockRejectedValueOnce(new Error("503"));
    await renderPlay();
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar el juego de hoy.");
    guestFetch.mockResolvedValueOnce(session);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Reintentar" })); });
    await waitFor(() => expect(screen.getByTestId("questions")).toHaveTextContent("2"));
  });

  it("a member pressing Play goes to the real daily in the app", async () => {
    authStatus = "authenticated";
    const { PublicGameEmbed } = await import("../public/PublicGameEmbed");
    render(
      <PublicGameEmbed modeId="statSniper" demoSlug="daily-statSniper" locale="es" pagePath="/es/juegos-de-futbol/aproximado-futbolero" playPath="/daily/challenges/stat-sniper" engineEmitsEvents practiceLocalised
        copy={{ start: "Jugar ahora", note: "", exit: "Salir", english: "", title: "Aproximado futbolero" }} />,
    );
    window.history.replaceState(null, "", "/es/juegos-de-futbol/aproximado-futbolero?jugar=1&dia=2026-10-05");
    fireEvent.click(screen.getByRole("button", { name: "Jugar ahora" }));
    expect(push).toHaveBeenCalledWith("/daily/challenges/stat-sniper");
    expect(window.location.search).toBe("");
    expect(trackPlayNowClick).toHaveBeenCalledWith({ modeId: "statSniper", access: "member", destination: "/daily/challenges/stat-sniper" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
