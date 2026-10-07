import { StrictMode, useEffect } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MeGamesResponse, PartnerGameTile, RedeemResponse } from "../api/partnerApi.types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/partner/freecroco",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import { PartnerProviders } from "../PartnerProviders";
import { LAUNCH_DEADLINE_MS, PartnerSessionProvider, usePartnerSession } from "../PartnerSessionProvider";
import {
  createPartnerApiClient,
  PARTNER_REQUEST_TIMEOUT_MS,
  PartnerTimeoutError,
  type PartnerTransport,
  type PartnerTransportResponse,
} from "../api/partnerApiClient";
import { PartnerShell } from "../components/PartnerShell";
import { PartnerHome } from "../components/PartnerHome";

type ReplyBody = { status: number; body: unknown; headers?: Record<string, string> };
type Reply = ReplyBody | Promise<ReplyBody>;
type Routes = Partial<Record<"redeem" | "refresh" | "games", (init: RequestInit) => Reply>>;

const tile = (gameId: PartnerGameTile["gameId"], overrides: Partial<PartnerGameTile> = {}): PartnerGameTile => ({
  gameId,
  playsLimit: 1,
  playsUsed: 0,
  playsLeft: 1,
  maxScore: 400,
  available: true,
  inProgress: false,
  lastResult: null,
  ...overrides,
});

const SESSION: RedeemResponse = {
  accessToken: "acc-1",
  accessTokenExpiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  player: { id: "p-1", displayName: "nik****om", language: "en" },
  partner: { slug: "freecroco", name: "Freecroco" },
};

const GAMES: MeGamesResponse = {
  partnerDay: "2026-10-05",
  resetsAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
  games: [
    tile("ranked", { playsLimit: 10, playsUsed: 3, playsLeft: 7, maxScore: 500 }),
    tile("quiz-board", { available: false, maxScore: 1800 }),
    tile("true-false", { playsUsed: 1, playsLeft: 0 }),
    tile("countdown", { playsLimit: 2, playsLeft: 2, maxScore: null }),
    tile("pick-em", { playsLimit: 0, playsLeft: 0 }),
    tile("guess-the-goal", { maxScore: 140 }),
  ],
};

const error = (status: number, code: string, extra: Record<string, unknown> = {}) => ({
  status,
  body: { error: { code, message: code, ...extra } },
});

let fetchMock: ReturnType<typeof vi.fn>;
let parentPostMessage: ReturnType<typeof vi.fn>;

function stubApi(routes: Routes) {
  fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    const path = new URL(url).pathname;
    const key = path.endsWith("/sessions/redeem") ? "redeem" : path.endsWith("/sessions/refresh") ? "refresh" : path.endsWith("/me/games") ? "games" : null;
    const handler = key ? routes[key] : undefined;
    if (!handler) return new Response(JSON.stringify(error(404, "not_found").body), { status: 404 });
    // A handler that throws behaves like a network failure.
    const reply = await handler(init);
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "Content-Type": "application/json", ...reply.headers },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
}

function renderShell() {
  return render(
    <PartnerProviders>
      <PartnerShell>
        <PartnerHome />
      </PartnerShell>
    </PartnerProviders>,
  );
}

function postedMessages() {
  return parentPostMessage.mock.calls.map(([message, origin]) => ({ message, origin }));
}

beforeEach(() => {
  // next-themes and sonner read matchMedia, which jsdom does not implement.
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
  window.localStorage.clear();
  // Before redeem the locale comes from browser inference (Georgian on a Tbilisi machine); pin it for the assertions.
  window.localStorage.setItem("quizball_locale", JSON.stringify("en"));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  window.history.replaceState({}, "", "/partner/freecroco?token=launch-1&utm_source=fc");
  parentPostMessage = vi.fn();
  vi.spyOn(window, "parent", "get").mockReturnValue({ postMessage: parentPostMessage } as unknown as Window);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

type ProbeHandle = { api?: ReturnType<typeof usePartnerSession>["api"] };

/** Provider alone with an injected transport; exposes the session status and a retained API handle. */
function renderWithTransport(transport: PartnerTransport, handle: ProbeHandle = {}) {
  function Probe() {
    const { state, api } = usePartnerSession();
    useEffect(() => {
      handle.api = api;
    }, [api]);
    return (
      <>
        <p data-testid="status">{state.status}</p>
        <button type="button" onClick={() => void api.getMyGames().catch(() => {})}>
          load games
        </button>
      </>
    );
  }
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PartnerSessionProvider transport={transport}>
        <Probe />
      </PartnerSessionProvider>
    </QueryClientProvider>,
  );
}

const never = <T,>() => new Promise<T>(() => {});

describe("partner session", () => {
  it("strips the launch token from the URL at once and renders nothing playable until redeem confirms the player", async () => {
    let finishRedeem!: (reply: { status: number; body: unknown }) => void;
    stubApi({
      redeem: () => new Promise((resolve) => (finishRedeem = resolve)),
      games: () => ({ status: 200, body: GAMES }),
    });

    renderShell();

    expect(window.location.search).toBe("?utm_source=fc");
    expect(window.location.href).not.toContain("launch-1");
    expect(await screen.findByText("Signing you in…")).toBeInTheDocument();
    expect(screen.queryByTestId("partner-ranked-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("partner-game-card")).not.toBeInTheDocument();

    await act(async () => finishRedeem({ status: 200, body: SESSION }));

    expect(await screen.findByTestId("partner-ranked-card")).toBeInTheDocument();
    const [redeemUrl, redeemInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(redeemUrl).toMatch(/\/partner\/v1\/sessions\/redeem$/);
    expect(JSON.parse(redeemInit.body as string)).toEqual({ token: "launch-1" });
    expect(redeemInit.credentials).toBe("omit");

    const gamesInit = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/me/games"))![1] as RequestInit;
    expect((gamesInit.headers as Record<string, string>).Authorization).toBe("Bearer acc-1");
    expect(gamesInit.credentials).toBe("omit");

    // The access token lives in memory only.
    expect(JSON.stringify({ ...window.localStorage })).not.toContain("acc-1");
    expect(JSON.stringify({ ...window.sessionStorage })).not.toContain("acc-1");
    expect(document.cookie).not.toContain("acc-1");

    expect(postedMessages()).toEqual([
      { message: { source: "quizball", version: 1, type: "quizball:ready" }, origin: "https://freecroco.com" },
    ]);
  });

  it("opens in the player's language from redeem", async () => {
    stubApi({
      redeem: () => ({ status: 200, body: { ...SESSION, player: { ...SESSION.player, language: "ka" } } }),
      games: () => ({ status: 200, body: GAMES }),
    });
    renderShell();
    expect(await screen.findByText("რეიტინგული მატჩი")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ENG" }));
    expect(await screen.findByText("Ranked match")).toBeInTheDocument();
  });

  it.each([
    ["expired", { reason: "expired" }, "expired"],
    ["replaced", { reason: "replaced" }, "replaced"],
    // No or unknown reason: never guess "expired" (Freecroco auto-relaunches on it; two tabs could loop).
    ["missing", {}, "replaced"],
    ["unknown", { reason: "something_new" }, "replaced"],
  ])("shows the relaunch screen for a session ended with reason %s and posts %s", async (_label, extra, posted) => {
    stubApi({
      redeem: () => ({ status: 200, body: SESSION }),
      games: () => error(401, "session_ended", extra),
    });
    renderShell();

    expect(await screen.findByText("Open again from Freecroco")).toBeInTheDocument();
    expect(screen.queryByTestId("partner-ranked-card")).not.toBeInTheDocument();
    expect(postedMessages()).toEqual([
      {
        message: { source: "quizball", version: 1, type: "quizball:relaunch_required", reason: posted },
        origin: "https://freecroco.com",
      },
    ]);
  });

  it.each([
    ["401 reason blocked", () => error(401, "session_ended", { reason: "blocked" })],
    ["403 player_blocked", () => error(403, "player_blocked")],
  ])("shows the blocked screen when the session is blocked (%s)", async (_label, games) => {
    vi.stubEnv("NEXT_PUBLIC_PARTNER_PARENT_ORIGINS", "https://test.freecroco.dev");
    stubApi({ redeem: () => ({ status: 200, body: SESSION }), games });
    renderShell();

    expect(await screen.findByText("Account unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Open again from Freecroco")).not.toBeInTheDocument();
    expect(postedMessages()).toEqual([
      {
        message: { source: "quizball", version: 1, type: "quizball:relaunch_required", reason: "blocked" },
        origin: "https://test.freecroco.dev",
      },
    ]);
  });

  it("treats a load without a token as a reload", async () => {
    window.history.replaceState({}, "", "/partner/freecroco");
    stubApi({});
    renderShell();

    expect(await screen.findByText("Open again from Freecroco")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(postedMessages()).toEqual([
      {
        message: { source: "quizball", version: 1, type: "quizball:relaunch_required", reason: "reloaded" },
        origin: "https://freecroco.com",
      },
    ]);
  });

  it("reports a used launch token as launch_failed", async () => {
    stubApi({ redeem: () => error(400, "token_used") });
    renderShell();

    expect(await screen.findByText("Open again from Freecroco")).toBeInTheDocument();
    expect(postedMessages()).toEqual([
      { message: { source: "quizball", version: 1, type: "quizball:launch_failed", reason: "token_used" }, origin: "https://freecroco.com" },
    ]);
  });

  it("shows a blocked player a blocked message without a reopen hint", async () => {
    stubApi({ redeem: () => error(403, "player_blocked") });
    renderShell();

    expect(await screen.findByText("Account unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Open again from Freecroco")).not.toBeInTheDocument();
    expect(postedMessages()).toEqual([
      { message: { source: "quizball", version: 1, type: "quizball:launch_failed", reason: "player_blocked" }, origin: "https://freecroco.com" },
    ]);
  });

  it("retries a transient redeem failure on its own (network error, then 503) and signs in", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let attempts = 0;
      stubApi({
        redeem: () => {
          attempts += 1;
          if (attempts === 1) throw new TypeError("Failed to fetch");
          if (attempts === 2) return error(503, "maintenance");
          return { status: 200, body: SESSION };
        },
        games: () => ({ status: 200, body: GAMES }),
      });
      renderShell();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      expect(await screen.findByTestId("partner-ranked-card")).toBeInTheDocument();
      expect(attempts).toBe(3);
      expect(postedMessages().map(({ message }) => message.type)).toEqual(["quizball:ready"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("honours Retry-After between redeem attempts", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let attempts = 0;
      stubApi({
        redeem: () => (++attempts === 1 ? { ...error(429, "rate_limited"), headers: { "Retry-After": "4" } } : { status: 200, body: SESSION }),
        games: () => ({ status: 200, body: GAMES }),
      });
      renderShell();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000);
      });
      expect(attempts).toBe(1);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_500);
      });
      expect(attempts).toBe(2);
      expect(await screen.findByTestId("partner-ranked-card")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("gives up after three transient failures with launch_failed/error", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let attempts = 0;
      stubApi({
        redeem: () => {
          attempts += 1;
          return error(502, "internal_error");
        },
      });
      renderShell();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(attempts).toBe(3);
      expect(screen.getByText("Open again from Freecroco")).toBeInTheDocument();
      expect(screen.getByText("We couldn't sign you in. Go back to Freecroco and open Quizball again.")).toBeInTheDocument();
      expect(postedMessages()).toEqual([
        { message: { source: "quizball", version: 1, type: "quizball:launch_failed", reason: "error" }, origin: "https://freecroco.com" },
      ]);
      // The token is gone with the session: nothing retries later.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(attempts).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reports token_used when a retry follows a redeem whose response was lost", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let attempts = 0;
      stubApi({
        redeem: () => {
          attempts += 1;
          if (attempts === 1) throw new TypeError("Failed to fetch");
          return error(400, "token_used");
        },
      });
      renderShell();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
      });
      expect(postedMessages()).toEqual([
        { message: { source: "quizball", version: 1, type: "quizball:launch_failed", reason: "token_used" }, origin: "https://freecroco.com" },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("refreshes the access token before it expires and uses the new one", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const refreshAuth: string[] = [];
      stubApi({
        redeem: () => ({ status: 200, body: { ...SESSION, accessTokenExpiresAt: new Date(Date.now() + 90_000).toISOString() } }),
        refresh: (init) => {
          refreshAuth.push((init.headers as Record<string, string>).Authorization);
          return { status: 200, body: { ...SESSION, accessToken: "acc-2" } };
        },
        games: () => ({ status: 200, body: GAMES }),
      });
      renderShell();
      await screen.findByTestId("partner-ranked-card");
      expect(refreshAuth).toEqual([]);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(31_000);
      });
      expect(refreshAuth).toEqual(["Bearer acc-1"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ends the session when the refresh is refused", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      stubApi({
        redeem: () => ({ status: 200, body: { ...SESSION, accessTokenExpiresAt: new Date(Date.now() + 70_000).toISOString() } }),
        refresh: () => error(401, "session_ended", { reason: "blocked" }),
        games: () => ({ status: 200, body: GAMES }),
      });
      renderShell();
      await screen.findByTestId("partner-ranked-card");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(11_000);
      });
      expect(screen.getByText("Account unavailable")).toBeInTheDocument();
      expect(postedMessages().at(-1)?.message).toEqual({
        source: "quizball",
        version: 1,
        type: "quizball:relaunch_required",
        reason: "blocked",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("shares one refresh between the timer and the visibility check", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let refreshes = 0;
      let finishRefresh!: (reply: ReplyBody) => void;
      stubApi({
        redeem: () => ({ status: 200, body: { ...SESSION, accessTokenExpiresAt: new Date(Date.now() + 65_000).toISOString() } }),
        refresh: () => {
          refreshes += 1;
          return new Promise<ReplyBody>((resolve) => (finishRefresh = resolve));
        },
        games: () => ({ status: 200, body: GAMES }),
      });
      renderShell();
      await screen.findByTestId("partner-ranked-card");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(6_000);
      });
      expect(refreshes).toBe(1);
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(refreshes).toBe(1);

      await act(async () => finishRefresh({ status: 200, body: { ...SESSION, accessToken: "acc-2" } }));
      // The next one is scheduled from the new expiry, not doubled up.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(refreshes).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not revive a session that ended while a refresh was in flight", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const calls: Array<{ path: string; auth?: string }> = [];
      let finishRefresh!: (reply: PartnerTransportResponse) => void;
      const transport: PartnerTransport = async (path, request) => {
        calls.push({ path, auth: request.headers.Authorization });
        if (path.endsWith("/redeem")) {
          return { status: 200, body: { ...SESSION, accessTokenExpiresAt: new Date(Date.now() + 65_000).toISOString() } };
        }
        if (path.endsWith("/refresh")) return new Promise((resolve) => (finishRefresh = resolve));
        return error(401, "session_ended", { reason: "replaced" });
      };

      function Probe() {
        const { state, api } = usePartnerSession();
        return (
          <>
            <p data-testid="status">{state.status}</p>
            <button type="button" onClick={() => void api.getMyGames().catch(() => {})}>
              load games
            </button>
          </>
        );
      }

      render(
        <QueryClientProvider client={new QueryClient()}>
          <PartnerSessionProvider transport={transport}>
            <Probe />
          </PartnerSessionProvider>
        </QueryClientProvider>,
      );
      await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(6_000);
      });
      expect(calls.filter((call) => call.path.endsWith("/refresh"))).toHaveLength(1);

      // Another launch replaces this session while the refresh is still pending.
      fireEvent.click(screen.getByRole("button", { name: "load games" }));
      await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("relaunch"));

      await act(async () => finishRefresh({ status: 200, body: { ...SESSION, accessToken: "acc-2" } }));
      fireEvent.click(screen.getByRole("button", { name: "load games" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(120_000);
      });

      expect(screen.getByTestId("status")).toHaveTextContent("relaunch");
      expect(calls.some((call) => call.auth === "Bearer acc-2")).toBe(false);
      expect(calls.filter((call) => call.path.endsWith("/refresh"))).toHaveLength(1);
      expect(postedMessages().map(({ message }) => message.type)).toEqual(["quizball:relaunch_required"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("erases the token on a real unmount: late answers post nothing and a retained API handle sends no bearer", async () => {
    const calls: Array<{ path: string; auth?: string }> = [];
    let finishGames!: (reply: PartnerTransportResponse) => void;
    const transport: PartnerTransport = async (path, request) => {
      calls.push({ path, auth: request.headers.Authorization });
      if (path.endsWith("/redeem")) return { status: 200, body: SESSION };
      return new Promise((resolve) => (finishGames = resolve));
    };
    const handle: ProbeHandle = {};
    const view = renderWithTransport(transport, handle);
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));

    fireEvent.click(screen.getByRole("button", { name: "load games" }));
    expect(calls.at(-1)?.auth).toBe("Bearer acc-1");
    view.unmount();
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => finishGames(error(401, "session_ended", { reason: "expired" })));
    await expect(handle.api!.getMyGames()).rejects.toMatchObject({ status: 401 });

    expect(calls.filter((call) => call.auth === "Bearer acc-1")).toHaveLength(1);
    expect(postedMessages()).toEqual([]);
  });

  it("survives Strict Mode's effect replay", async () => {
    stubApi({ redeem: () => ({ status: 200, body: SESSION }), games: () => ({ status: 200, body: GAMES }) });
    render(
      <StrictMode>
        <PartnerProviders>
          <PartnerShell>
            <PartnerHome />
          </PartnerShell>
        </PartnerProviders>
      </StrictMode>,
    );
    expect(await screen.findByTestId("partner-ranked-card")).toBeInTheDocument();
    const redeems = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/sessions/redeem"));
    expect(redeems).toHaveLength(1);
    const gamesInit = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/me/games"))![1] as RequestInit;
    expect((gamesInit.headers as Record<string, string>).Authorization).toBe("Bearer acc-1");
  });

  it("ends the session as expired at expiry even while a refresh is still hanging", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const refreshes: number[] = [];
      const transport: PartnerTransport = async (path) => {
        if (path.endsWith("/redeem")) {
          return { status: 200, body: { ...SESSION, accessTokenExpiresAt: new Date(Date.now() + 65_000).toISOString() } };
        }
        refreshes.push(Date.now());
        return never();
      };
      renderWithTransport(transport);
      await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("ready"));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(screen.getByTestId("status")).toHaveTextContent("ready");
      expect(refreshes.length).toBeGreaterThanOrEqual(1);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(6_000);
      });
      expect(screen.getByTestId("status")).toHaveTextContent("relaunch");
      expect(postedMessages()).toEqual([
        { message: { source: "quizball", version: 1, type: "quizball:relaunch_required", reason: "expired" }, origin: "https://freecroco.com" },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("times out a request that never answers", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const client = createPartnerApiClient({ transport: () => never(), getAccessToken: () => "t", onSessionEnded: vi.fn() });
      const pending = client.getMyGames();
      const assertion = expect(pending).rejects.toBeInstanceOf(PartnerTimeoutError);
      await vi.advanceTimersByTimeAsync(PARTNER_REQUEST_TIMEOUT_MS + 1);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails the launch with reason error when redeem requests hang past the launch deadline", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let attempts = 0;
      renderWithTransport(async () => {
        attempts += 1;
        return never();
      });

      await act(async () => {
        await vi.advanceTimersByTimeAsync(LAUNCH_DEADLINE_MS - 1_000);
      });
      expect(screen.getByTestId("status")).toHaveTextContent("redeeming");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
      });
      expect(screen.getByTestId("status")).toHaveTextContent("launch_failed");
      expect(attempts).toBeGreaterThanOrEqual(2);
      expect(postedMessages()).toEqual([
        { message: { source: "quizball", version: 1, type: "quizball:launch_failed", reason: "error" }, origin: "https://freecroco.com" },
      ]);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(postedMessages()).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("drops a redeem success that arrives after the launch deadline, even if the deadline timer is late", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    try {
      let finishRedeem!: (reply: PartnerTransportResponse) => void;
      renderWithTransport(async (path) => {
        if (path.endsWith("/redeem")) return new Promise((resolve) => (finishRedeem = resolve));
        return { status: 200, body: GAMES };
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(finishRedeem).toBeTypeOf("function");

      // The clock passes the deadline but no timer has run yet (a throttled background tab).
      vi.setSystemTime(Date.now() + LAUNCH_DEADLINE_MS + 1_000);
      await act(async () => finishRedeem({ status: 200, body: SESSION }));

      expect(screen.getByTestId("status")).toHaveTextContent("launch_failed");
      expect(postedMessages()).toEqual([
        { message: { source: "quizball", version: 1, type: "quizball:launch_failed", reason: "error" }, origin: "https://freecroco.com" },
      ]);
      fireEvent.click(screen.getByRole("button", { name: "load games" }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(60_000);
      });
      expect(postedMessages()).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not start another redeem attempt once the deadline has passed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    try {
      let attempts = 0;
      renderWithTransport(async () => {
        attempts += 1;
        // The first attempt takes almost the whole launch window, then fails transiently.
        vi.setSystemTime(Date.now() + LAUNCH_DEADLINE_MS - 500);
        return error(503, "maintenance");
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      expect(attempts).toBe(1);
      expect(screen.getByTestId("status")).toHaveTextContent("launch_failed");
    } finally {
      vi.useRealTimers();
    }
  });

  it("waits for the refresh Retry-After, also for visibility-triggered refreshes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    try {
      const start = Date.now();
      const refreshAt: number[] = [];
      renderWithTransport(async (path) => {
        if (path.endsWith("/redeem")) {
          return { status: 200, body: { ...SESSION, accessTokenExpiresAt: new Date(start + 200_000).toISOString() } };
        }
        refreshAt.push(Math.round((Date.now() - start) / 1000));
        if (refreshAt.length === 1) return { ...error(429, "rate_limited"), retryAfterMs: 30_000 };
        return { status: 200, body: { ...SESSION, accessToken: "acc-2", accessTokenExpiresAt: new Date(start + 900_000).toISOString() } };
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByTestId("status")).toHaveTextContent("ready");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(141_000);
      });
      expect(refreshAt).toEqual([140]);

      // Inside the cooldown: the visibility check must not jump the queue.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(9_000);
        document.dispatchEvent(new Event("visibilitychange"));
        await vi.advanceTimersByTimeAsync(10_000);
      });
      expect(refreshAt).toEqual([140]);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(12_000);
      });
      expect(refreshAt).toEqual([140, 170]);
      expect(screen.getByTestId("status")).toHaveTextContent("ready");
    } finally {
      vi.useRealTimers();
    }
  });

  it("lets the expiry watchdog end the session when the refresh Retry-After outlasts the token", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    try {
      let refreshes = 0;
      renderWithTransport(async (path) => {
        if (path.endsWith("/redeem")) {
          return { status: 200, body: { ...SESSION, accessTokenExpiresAt: new Date(Date.now() + 65_000).toISOString() } };
        }
        refreshes += 1;
        return { ...error(429, "rate_limited"), retryAfterMs: 60_000 };
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
        document.dispatchEvent(new Event("visibilitychange"));
        await vi.advanceTimersByTimeAsync(40_000);
      });
      expect(refreshes).toBe(1);
      expect(screen.getByTestId("status")).toHaveTextContent("relaunch");
      expect(postedMessages()).toEqual([
        { message: { source: "quizball", version: 1, type: "quizball:relaunch_required", reason: "expired" }, origin: "https://freecroco.com" },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not retry early when Retry-After is longer than the launch deadline allows", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let attempts = 0;
      stubApi({
        redeem: () => {
          attempts += 1;
          return { ...error(503, "maintenance"), headers: { "Retry-After": "60" } };
        },
      });
      renderShell();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(attempts).toBe(1);
      expect(postedMessages()).toEqual([
        { message: { source: "quizball", version: 1, type: "quizball:launch_failed", reason: "error" }, origin: "https://freecroco.com" },
      ]);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(120_000);
      });
      expect(attempts).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("posts quizball:close from the back button", async () => {
    stubApi({ redeem: () => ({ status: 200, body: SESSION }), games: () => ({ status: 200, body: GAMES }) });
    renderShell();
    await screen.findByTestId("partner-ranked-card");

    fireEvent.click(screen.getByRole("button", { name: "Back to Freecroco" }));
    expect(postedMessages().at(-1)).toEqual({
      message: { source: "quizball", version: 1, type: "quizball:close" },
      origin: "https://freecroco.com",
    });
  });

  it("does not post anything when the page is not framed", async () => {
    vi.spyOn(window, "parent", "get").mockReturnValue(window);
    const ownPostMessage = vi.spyOn(window, "postMessage");
    window.history.replaceState({}, "", "/partner/freecroco");
    stubApi({});
    renderShell();

    expect(await screen.findByText("Open again from Freecroco")).toBeInTheDocument();
    expect(ownPostMessage).not.toHaveBeenCalled();
  });
});

describe("partner home", () => {
  it("shows ranked first, then the other games in the API order with their plays-left badges", async () => {
    stubApi({ redeem: () => ({ status: 200, body: SESSION }), games: () => ({ status: 200, body: GAMES }) });
    renderShell();

    const ranked = await screen.findByTestId("partner-ranked-card");
    expect(within(ranked).getByTestId("partner-ranked-plays")).toHaveTextContent("7 / 10");
    expect(within(ranked).getByRole("link", { name: /Play/ })).toHaveAttribute("href", "/partner/freecroco/play/ranked");
    expect(within(ranked).getByText(/^Resets in \d+h \d+m$/)).toBeInTheDocument();

    const cards = screen.getAllByTestId("partner-game-card");
    // pick-em is set to 0 plays today, so it is off for the day.
    expect(cards.map((card) => card.dataset.gameId)).toEqual(["quiz-board", "true-false", "countdown", "guess-the-goal"]);
    expect(cards.map((card) => card.dataset.state)).toEqual(["coming_soon", "done", "playable", "playable"]);

    const [quizBoard, trueFalse, countdown, guessTheGoal] = cards;
    expect(quizBoard.tagName).toBe("DIV");
    expect(within(quizBoard).getByText("Coming soon")).toBeInTheDocument();
    expect(trueFalse.tagName).toBe("DIV");
    expect(within(trueFalse).getByText("Come back tomorrow")).toBeInTheDocument();
    expect(countdown).toHaveAttribute("href", "/partner/freecroco/play/countdown");
    expect(within(countdown).getByText("2 plays left")).toBeInTheDocument();
    expect(within(countdown).queryByText(/Up to/)).not.toBeInTheDocument();
    expect(within(guessTheGoal).getByText("1 play left")).toBeInTheDocument();
    expect(within(guessTheGoal).getByText("Up to 140 pts")).toBeInTheDocument();
  });

  it("shows ranked as done when today's plays are used up", async () => {
    stubApi({
      redeem: () => ({ status: 200, body: SESSION }),
      games: () => ({ status: 200, body: { ...GAMES, games: [tile("ranked", { playsLimit: 10, playsUsed: 10, playsLeft: 0 })] } }),
    });
    renderShell();

    const ranked = await screen.findByTestId("partner-ranked-card");
    expect(ranked.dataset.state).toBe("done");
    expect(within(ranked).getByTestId("partner-ranked-plays")).toHaveTextContent("0 / 10");
    expect(within(ranked).queryByRole("link")).not.toBeInTheDocument();
    expect(within(ranked).getByText("Come back tomorrow")).toBeInTheDocument();
  });
});
