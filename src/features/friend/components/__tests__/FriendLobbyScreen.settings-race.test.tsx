import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DuelGameId, LobbyGameMode, LobbyState, RoomGameId } from "@/lib/realtime/socket.types";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";

// The real room screen, settings screen and room logic. Only the socket is replaced: what the screen emits waits in
// `sent` until `deliver()` hands it to a model of the lobby server, whose answers reach the screen as they do in
// production (a new lobby state in the store, or an error).

const mocks = vi.hoisted(() => ({ socketEmit: vi.fn(), toastError: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/contexts/PlayerContext", () => ({ usePlayer: () => ({ player: { id: "host" } }) }));
vi.mock("@/stores/auth.store", () => ({
  useAuthStore: (selector?: (state: unknown) => unknown) => {
    const state = { status: "authenticated", user: { id: "host" } };
    return selector ? selector(state) : state;
  },
}));
vi.mock("@/stores/gameSession.store", () => ({
  useGameSessionStore: (selector?: (state: unknown) => unknown) => {
    const state = { startSession: vi.fn() };
    return selector ? selector(state) : state;
  },
}));
vi.mock("@/lib/realtime/useRealtimeConnection", () => ({ useRealtimeConnection: () => undefined }));
vi.mock("@/lib/realtime/socket-client", () => ({
  connectSocket: () => ({ emit: mocks.socketEmit }),
  getSocket: () => ({ emit: mocks.socketEmit, on: () => {}, off: () => {} }),
}));
vi.mock("@/lib/queries/categories.queries", () => ({ useCategoriesList: () => ({ data: { items: [] } }) }));
vi.mock("@/lib/queries/stats.queries", () => ({ useHeadToHead: () => ({ data: null }) }));
vi.mock("@/lib/analytics/game-events", () => ({
  trackFriendInviteSent: vi.fn(), trackFriendInviteRecovery: vi.fn(), trackFriendInviteLinkOpened: vi.fn(),
  trackFriendInviteJoinAttempted: vi.fn(), trackFriendInviteJoinFailed: vi.fn(), trackFriendInviteJoinSucceeded: vi.fn(),
  trackLobbyCreated: vi.fn(), trackLobbyJoined: vi.fn(), trackCategorySelected: vi.fn(),
}));
vi.mock("@/utils/clipboard", () => ({ copyToClipboard: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, info: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/config")>()),
  DUEL_GAMES_ENABLED: ["buscaminas", "pistas", "ultimo"],
  ROOM_GAMES_ENABLED: ["aproximado", "shared_player", "name_chain"],
}));
vi.mock("@/contexts/LocaleContext", () => {
  const t = (key: string) => key;
  return { useLocale: () => ({ t, locale: "en" }) };
});
vi.mock("@/lib/realtime/realtime-principal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/realtime/realtime-principal")>()),
  useEnsureGuestPrincipal: () => undefined,
}));
vi.mock("../LobbyHeader", () => ({ LobbyHeader: () => null }));
vi.mock("../AlreadyInLobbyModal", () => ({ AlreadyInLobbyModal: () => null }));

const { FriendLobbyScreen } = await import("../FriendLobbyScreen");

type Game = { gameMode: LobbyGameMode; duelGame: DuelGameId | null; roomGame: RoomGameId | null };
type Sent = { event: string; payload: Record<string, unknown> };

const SHARED_PLAYER: Game = { gameMode: "room_game", duelGame: null, roomGame: "shared_player" };
const NAME_CHAIN: Game = { gameMode: "room_game", duelGame: null, roomGame: "name_chain" };
const PISTAS: Game = { gameMode: "duel", duelGame: "pistas", roomGame: null };
const ULTIMO: Game = { gameMode: "duel", duelGame: "ultimo", roomGame: null };
const AUCTION: Game = { gameMode: "auction", duelGame: null, roomGame: null };
const seen = (game: Game) => ({ gameMode: game.gameMode, duelGame: game.duelGame, roomGame: game.roomGame });
/** A Ready as the screen sends it: with the game it was pressed on. */
const readyOn = (game: Game) => ({ event: "lobby:ready", payload: { ready: true, seen: seen(game) } });

/**
 * The lobby server as far as this race goes (backend lobby-commands.service): a settings change is refused once every
 * member is ready, an accepted change of game un-readies everybody, a change that changes nothing is answered with
 * silence, a Ready or a Start pressed on another game than the room's is refused (and the room's state sent again),
 * and a start plays the game the SERVER holds. `stateLost` models a state push that never arrives.
 */
async function openRoom(game: Game, ready: { host: boolean; guest: boolean }) {
  const server = { lobbyId: "lobby-1", game, isPublic: false, ready: { ...ready }, started: null as Game | null, stateLost: false };
  const sent: Sent[] = [];
  const state = (): LobbyState => ({
    lobbyId: server.lobbyId, mode: "friendly", status: "waiting", inviteCode: "ROOM01", displayName: "Room", isPublic: server.isPublic, hostUserId: "host",
    settings: { ...server.game, friendlyRandom: true, friendlyCategoryAId: null, friendlyCategoryBId: null },
    members: (["host", "guest"] as const).map((userId) => ({ userId, username: userId, avatarUrl: null, isReady: server.ready[userId], isHost: userId === "host", isGuest: false })),
  }) as LobbyState;
  const push = () => { if (!server.stateLost) useRealtimeMatchStore.getState().setLobby(state()); };
  const refuse = (code: string) => useRealtimeMatchStore.getState().setError({ code, message: code });
  const pressedOnAnotherGame = (payload: Record<string, unknown>) => {
    const pressedOn = payload.seen as Partial<Game> | undefined;
    return pressedOn !== undefined && !sameGame({ gameMode: pressedOn.gameMode!, duelGame: pressedOn.duelGame ?? null, roomGame: pressedOn.roomGame ?? null }, server.game);
  };
  const everyoneReady = () => server.ready.host && server.ready.guest;
  const sameGame = (a: Game, b: Game) => a.gameMode === b.gameMode && a.duelGame === b.duelGame && a.roomGame === b.roomGame;
  const handle = ({ event, payload }: Sent) => {
    if (event === "lobby:ready") {
      if (payload.ready === true && pressedOnAnotherGame(payload)) { refuse("LOBBY_SETTINGS_CHANGED"); push(); return; }
      server.ready.host = payload.ready === true;
      push();
    } else if (event === "lobby:start") {
      if (pressedOnAnotherGame(payload)) { refuse("LOBBY_SETTINGS_CHANGED"); push(); return; }
      if (everyoneReady()) server.started = server.game;
    } else if (event === "lobby:update_settings") {
      if (everyoneReady()) {
        refuse("LOBBY_READY_LOCKED");
        return;
      }
      const next: Game = {
        gameMode: payload.gameMode as LobbyGameMode,
        duelGame: payload.gameMode === "duel" ? (payload.duelGame as DuelGameId) : null,
        roomGame: payload.gameMode === "room_game" ? (payload.roomGame as RoomGameId) : null,
      };
      const isPublic = payload.isPublic === undefined ? server.isPublic : payload.isPublic === true;
      if (sameGame(next, server.game) && isPublic === server.isPublic) return;
      if (!sameGame(next, server.game)) server.ready = { host: false, guest: false };
      server.game = next;
      server.isPublic = isPublic;
      push();
    }
  };
  mocks.socketEmit.mockImplementation((event: string, payload: Record<string, unknown> = {}) => { sent.push({ event, payload }); });
  useRealtimeMatchStore.getState().setLobby(state());
  render(<FriendLobbyScreen roomCode="ROOM01" isHost />);
  const lobbyCommands = () => sent.filter(({ event }) => ["lobby:ready", "lobby:start", "lobby:update_settings"].includes(event));
  /** Lets React finish what an event started: microtasks, and the zero-delay timers the screens defer to. */
  const settle = async (ms = 0) => { await act(async () => { await Promise.resolve(); vi.advanceTimersByTime(ms); await Promise.resolve(); }); };
  // As in a browser, where the screen has long finished mounting before anybody can press anything.
  await settle();
  sent.length = 0;
  return {
    server,
    /** What the screen has emitted and the server has not seen yet. */
    waiting: lobbyCommands,
    /** Everything emitted so far reaches the server, in order. No timer runs: the screen is seen exactly as the answer left it. */
    deliver: async () => {
      await act(async () => {
        for (const command of sent.splice(0)) handle(command);
        await Promise.resolve();
      });
    },
    settle,
    /** An error the server sends for something else going on in the room. */
    serverRefuses: async (code: string) => { await act(async () => { refuse(code); await Promise.resolve(); }); },
    /** Something the server does on its own (the other player, another tab), pushed to this screen. */
    serverDoes: async (change: () => void) => { await act(async () => { change(); push(); await Promise.resolve(); }); },
    pressed: (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed"),
    click: (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name })),
    readyButton: () => screen.getByRole("button", { name: /friend\.(markReady|readyTapToUnready|savingSettings)/ }),
    startButton: () => screen.getByRole("button", { name: /^friend\.start/ }),
  };
}

describe("lobby: Ready and Start wait until the server holds the game the screen shows", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useRealtimeMatchStore.getState().reset();
  });
  afterEach(() => { vi.useRealTimers(); });

  it("change the game, press Ready at once, Start: the match is the game that was chosen", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    room.click("friend.duelTabPistas");
    room.click(/friend\.markReady/);
    // Only the game is on its way; the Ready waits behind it and says so.
    expect(room.waiting().map(({ event }) => event)).toEqual(["lobby:update_settings"]);
    expect(room.readyButton()).toHaveTextContent("friend.savingSettings");
    expect(room.readyButton()).toHaveAttribute("aria-busy", "true");

    await room.deliver();
    await room.settle();
    expect(room.server.game).toEqual(PISTAS);
    expect(room.waiting()).toEqual([readyOn(PISTAS)]);
    await room.deliver();
    // The change un-readied the other player: nobody is taken into a game they did not agree to.
    expect(room.server.ready).toEqual({ host: true, guest: false });
    expect(room.startButton()).toBeDisabled();

    await room.serverDoes(() => { room.server.ready.guest = true; });
    room.click(/^friend\.start/);
    await room.deliver();
    expect(room.server.started).toEqual(PISTAS);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("duel to room game, then into a member mode, each with an immediate Ready", async () => {
    const room = await openRoom({ gameMode: "duel", duelGame: "buscaminas", roomGame: null }, { host: false, guest: true });
    room.click("friend.roomTabNameChain");
    room.click(/friend\.markReady/);
    await room.deliver();
    await room.settle();
    await room.deliver();
    expect(room.server.game).toEqual(NAME_CHAIN);
    expect(room.server.ready.host).toBe(true);

    room.click(/friend\.readyTapToUnready/);
    await room.deliver();
    room.click("friend.auction");
    room.click(/friend\.markReady/);
    await room.deliver();
    await room.settle();
    await room.deliver();
    expect(room.server.game).toEqual(AUCTION);
    expect(room.server.ready.host).toBe(true);
  });

  it("rapid selections then Ready: the Ready goes out after the LAST choice is confirmed", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    room.click("friend.duelTabPistas");
    room.click("friend.duelTabUltimo");
    room.click(/friend\.markReady/);
    await room.deliver();
    await room.settle();
    // The first choice is confirmed, the second is on its way: still no Ready.
    expect(room.waiting().map(({ event }) => event)).toEqual(["lobby:update_settings"]);
    await room.deliver();
    await room.settle();
    expect(room.waiting()).toEqual([readyOn(ULTIMO)]);
    await room.deliver();
    expect(room.server.game).toEqual(ULTIMO);
    expect(room.server.ready.host).toBe(true);
  });

  it("a second tap on a game that is still queued does not lose it", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    room.click("friend.duelTabPistas");
    room.click("friend.duelTabUltimo");
    room.click("friend.duelTabUltimo");
    room.click(/friend\.markReady/);
    await room.deliver();
    await room.settle();
    await room.deliver();
    await room.settle();
    await room.deliver();
    expect(room.pressed("friend.duelTabUltimo")).toBe("true");
    expect(room.server.game).toEqual(ULTIMO);
    expect(room.server.ready.host).toBe(true);
  });

  it("there and back to the game already sent: no second send to wait for, the Ready follows its confirmation at once", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    room.click("friend.duelTabPistas");
    room.click("friend.duelTabUltimo");
    room.click("friend.duelTabPistas");
    room.click(/friend\.markReady/);
    expect(room.waiting().map(({ event }) => event)).toEqual(["lobby:update_settings"]);
    await room.deliver();
    await room.settle();
    expect(room.waiting()).toEqual([readyOn(PISTAS)]);
    await room.deliver();
    await room.settle(7_000);
    expect(room.server.game).toEqual(PISTAS);
    expect(room.server.ready.host).toBe(true);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("host already ready, the other player readies last while the change is on its way: no Start until screen and server agree", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: true, guest: false });
    room.click("friend.duelTabPistas");
    await room.serverDoes(() => { room.server.ready.guest = true; });
    // Everyone is ready on the server's game while this screen shows another one.
    expect(room.pressed("friend.duelTabPistas")).toBe("true");
    expect(room.startButton()).toBeDisabled();

    // The refusal arrives. Not a single timer has run yet: whenever Start is on offer, the screen must already be
    // back on the game it would start.
    await room.deliver();
    expect(room.server.game).toEqual(SHARED_PLAYER);
    expect(room.pressed("friend.duelTabPistas")).toBe("false");
    expect(room.pressed("friend.roomTabSharedPlayer")).toBe("true");
    expect(mocks.toastError).toHaveBeenCalledWith("friend.errorReadyLocked");
    await room.settle();
    expect(room.startButton()).toBeEnabled();
    room.click(/^friend\.start/);
    await room.deliver();
    expect(room.server.started).toEqual(SHARED_PLAYER);
  });

  it("the same race the other way round (the change lands first): the host is un-readied and nothing can start", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: true, guest: false });
    room.click("friend.duelTabPistas");
    await room.deliver();
    await room.serverDoes(() => { room.server.ready.guest = true; });
    await room.settle();
    expect(room.server.game).toEqual(PISTAS);
    expect(room.pressed("friend.duelTabPistas")).toBe("true");
    expect(room.readyButton()).toHaveTextContent("friend.markReady");
    expect(room.startButton()).toBeDisabled();
  });

  it("a refused change drops the Ready that was waiting for it", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    room.click("friend.duelTabPistas");
    room.click(/friend\.markReady/);
    // Another tab of the host readied first, and its state has not reached this screen: the server refuses the change.
    room.server.ready.host = true;
    await room.deliver();
    await room.settle();
    expect(room.server.game).toEqual(SHARED_PLAYER);
    expect(room.pressed("friend.roomTabSharedPlayer")).toBe("true");
    expect(room.waiting()).toEqual([]);
    expect(room.readyButton()).not.toHaveAttribute("aria-busy", "true");
  });

  it("a change the server never answers is given up visibly; applied late after all, the screen follows the server", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    room.click("friend.duelTabPistas");
    room.click(/friend\.markReady/);
    await room.settle(5_900);
    expect(room.readyButton()).toHaveTextContent("friend.savingSettings");
    expect(mocks.toastError).not.toHaveBeenCalled();
    await room.settle(200);
    expect(mocks.toastError).toHaveBeenCalledWith("friend.toastLobbyError");
    expect(room.pressed("friend.roomTabSharedPlayer")).toBe("true");
    expect(room.readyButton()).toHaveTextContent("friend.markReady");
    expect(room.waiting().map(({ event }) => event)).toEqual(["lobby:update_settings"]);

    // The connection comes back and the change is applied after all: no Ready was sent on it, and the screen shows it.
    await room.deliver();
    await room.settle();
    expect(room.server.game).toEqual(PISTAS);
    expect(room.server.ready.host).toBe(false);
    expect(room.pressed("friend.duelTabPistas")).toBe("true");
    expect(room.startButton()).toBeDisabled();
  });

  it("the held Ready is a 'ready', never a toggle: readied elsewhere meanwhile, nothing is sent", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    room.click("friend.duelTabPistas");
    room.click(/friend\.markReady/);
    // The confirmation reaches this screen together with a Ready from another tab of the host.
    await room.serverDoes(() => { room.server.game = PISTAS; room.server.ready = { host: true, guest: false }; });
    await room.settle();
    expect(room.waiting().filter(({ event }) => event === "lobby:ready")).toEqual([]);
    expect(room.readyButton()).toHaveTextContent("friend.readyTapToUnready");
  });

  it("a room that is replaced while a Ready is held does not get that Ready, even if it already holds the game", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    room.click("friend.duelTabPistas");
    room.click(/friend\.markReady/);
    await room.serverDoes(() => { room.server.lobbyId = "lobby-2"; room.server.game = PISTAS; room.server.ready = { host: false, guest: false }; });
    await room.settle(7_000);
    expect(room.waiting().filter(({ event }) => event === "lobby:ready")).toEqual([]);
    expect(room.readyButton()).toHaveTextContent("friend.markReady");
  });

  it("the screen's copy of the room is stale (a state push was lost): the server refuses the Ready and the Start pressed on the old game", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    room.click("friend.duelTabPistas");
    // The server applies the change, but its state push never reaches this screen.
    room.server.stateLost = true;
    await room.deliver();
    await room.settle(6_100);
    // Given up on: the screen is back on the game it last heard of, which the room has left.
    expect(room.pressed("friend.roomTabSharedPlayer")).toBe("true");
    expect(room.server.game).toEqual(PISTAS);
    room.server.stateLost = false;
    mocks.toastError.mockClear();

    room.click(/friend\.markReady/);
    expect(room.waiting()).toEqual([readyOn(SHARED_PLAYER)]);
    await room.deliver();
    await room.settle();
    // Refused, and the refusal brought the room's real state: not ready, on the game the server holds.
    expect(room.server.ready.host).toBe(false);
    expect(mocks.toastError).toHaveBeenCalledWith("friend.errorSettingsChanged");
    expect(room.pressed("friend.duelTabPistas")).toBe("true");
    expect(room.readyButton()).toHaveTextContent("friend.markReady");
  });

  it("a Start pressed on a game the room has left starts nothing", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: true, guest: true });
    // Another tab of the host un-readied, changed the game, and everyone readied again; none of it reached this screen.
    room.server.game = NAME_CHAIN;
    room.click(/^friend\.start/);
    await room.deliver();
    await room.settle();
    expect(room.server.started).toBeNull();
    expect(mocks.toastError).toHaveBeenCalledWith("friend.errorSettingsChanged");
    expect(room.pressed("friend.roomTabNameChain")).toBe("true");
  });

  it("back to the first game while the other is still on its way, and that one lands late: the last choice wins", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    room.click("friend.duelTabPistas");
    room.click("friend.roomTabSharedPlayer");
    room.click(/friend\.markReady/);
    // Pistas reaches the server, but its state only gets here after the queue has stopped waiting for it.
    room.server.stateLost = true;
    await room.deliver();
    await room.settle(3_100);
    room.server.stateLost = false;
    // The Ready went out for the game on screen; the room is on Pistas, so it is refused, and the state comes with it.
    expect(room.waiting()).toEqual([readyOn(SHARED_PLAYER)]);
    await room.deliver();
    await room.settle();
    expect(room.server.ready.host).toBe(false);
    // The choice still on screen is sent again.
    expect(room.waiting().map(({ event }) => event)).toEqual(["lobby:update_settings"]);
    await room.deliver();
    await room.settle();
    expect(room.server.game).toEqual(SHARED_PLAYER);
    expect(room.pressed("friend.roomTabSharedPlayer")).toBe("true");
    expect(room.readyButton()).toHaveTextContent("friend.markReady");
  });

  it("an error about something else in the room does not throw the chosen game away", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    room.click("friend.duelTabPistas");
    room.click("friend.duelTabUltimo");
    room.click(/friend\.markReady/);
    await room.serverRefuses("RATE_LIMITED");
    await room.deliver();
    await room.settle();
    await room.deliver();
    await room.settle();
    await room.deliver();
    expect(room.server.game).toEqual(ULTIMO);
    expect(room.server.ready.host).toBe(true);
  });

  it("the held Ready is for the game it was pressed on: another game chosen after it takes it back", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    room.click("friend.duelTabPistas");
    room.click(/friend\.markReady/);
    room.click("friend.duelTabUltimo");
    expect(room.readyButton()).toHaveTextContent("friend.markReady");
    await room.deliver();
    await room.settle();
    await room.deliver();
    await room.settle();
    expect(room.server.game).toEqual(ULTIMO);
    expect(room.waiting()).toEqual([]);
    expect(room.server.ready.host).toBe(false);
  });

  it("a Ready held for another setting does not follow the room onto a game changed from elsewhere", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    fireEvent.click(screen.getByText("friend.lobbyVisibilityPrivate").closest("button")!);
    room.click(/friend\.markReady/);
    expect(room.readyButton()).toHaveTextContent("friend.savingSettings");
    // Before the visibility change is confirmed, another tab of the host moves the room to Pistas.
    await room.serverDoes(() => { room.server.game = PISTAS; room.server.isPublic = true; room.server.ready = { host: false, guest: false }; });
    await room.settle(500);
    expect(room.waiting().filter(({ event }) => event === "lobby:ready")).toEqual([]);
    expect(room.readyButton()).toHaveTextContent("friend.markReady");
    expect(room.pressed("friend.duelTabPistas")).toBe("true");
  });

  it("pressing the waiting Ready again takes it back", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: true });
    room.click("friend.duelTabPistas");
    room.click(/friend\.markReady/);
    room.click(/friend\.savingSettings/);
    expect(room.readyButton()).toHaveTextContent("friend.markReady");
    await room.deliver();
    await room.settle();
    expect(room.server.game).toEqual(PISTAS);
    expect(room.waiting()).toEqual([]);
  });

  it("a visibility toggle taken back sends nothing and does not keep Ready waiting", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: false });
    const toggle = screen.getByText("friend.lobbyVisibilityPrivate").closest("button")!;
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    room.click(/friend\.markReady/);
    await room.settle(400);
    expect(room.waiting()).toEqual([readyOn(SHARED_PLAYER)]);
    await room.settle(7_000);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("with nothing unconfirmed, Ready and un-Ready go out at once", async () => {
    const room = await openRoom(SHARED_PLAYER, { host: false, guest: false });
    room.click(/friend\.markReady/);
    expect(room.waiting()).toEqual([readyOn(SHARED_PLAYER)]);
    await room.deliver();
    room.click(/friend\.readyTapToUnready/);
    expect(room.waiting()).toEqual([{ event: "lobby:ready", payload: { ready: false } }]);
  });
});
