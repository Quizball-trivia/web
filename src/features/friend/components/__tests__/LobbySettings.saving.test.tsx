import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CategorySummary } from "@/lib/domain";
import type { DuelGameId, LobbyGameMode, LobbyState, RoomGameId } from "@/lib/realtime/socket.types";

vi.mock("@/lib/config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/config")>()),
  DUEL_GAMES_ENABLED: ["buscaminas", "pistas", "ultimo"],
  ROOM_GAMES_ENABLED: ["aproximado", "shared_player", "name_chain"],
}));
vi.mock("@/contexts/LocaleContext", () => ({ useLocale: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/analytics/game-events", () => ({ trackCategorySelected: vi.fn() }));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));

const { LobbySettings } = await import("../LobbySettings");

type Settings = Partial<LobbyState["settings"]> & { duelGame?: DuelGameId; roomGame?: RoomGameId };
function makeLobby(gameMode: LobbyGameMode, settings: Settings = {}, lobbyId = "lobby-1"): LobbyState {
  return {
    lobbyId, mode: "friendly", status: "waiting", inviteCode: "ROOM01", displayName: "Room", isPublic: false, hostUserId: "user-1",
    settings: { gameMode, duelGame: null, roomGame: null, friendlyRandom: true, friendlyCategoryAId: null, friendlyCategoryBId: null, ...settings },
    members: ["user-1", "user-2"].map((userId, index) => ({ userId, username: `Player ${index + 1}`, avatarUrl: null, isReady: false, isHost: index === 0, isGuest: false })),
  } as LobbyState;
}
const CATEGORIES = [{ id: "cat-1", name: "First" }, { id: "cat-2", name: "Second" }] as CategorySummary[];

/** The settings screen with a controllable server: `server(lobby)` is the next lobby:state, `refuse()` a settings error. */
function mount(initial: LobbyState) {
  const onUpdateSettings = vi.fn();
  const saving: boolean[] = [];
  const shown: Array<string | null> = [];
  let lobby = initial;
  let errorVersion = 0;
  const ui = () => (
    <LobbySettings isHost lobby={lobby} categories={CATEGORIES} onUpdateSettings={onUpdateSettings} settingsErrorVersion={errorVersion}
      onSavingChange={(value) => saving.push(value)} onGameShown={(game) => shown.push(game && `${game.lobbyId}/${game.choiceKey}`)} />
  );
  const view = render(ui());
  return {
    onUpdateSettings, saving, shown, unmount: view.unmount,
    server: (next: LobbyState) => { lobby = next; view.rerender(ui()); },
    refuse: () => { errorVersion += 1; view.rerender(ui()); },
    pressed: (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed"),
    click: (name: string) => fireEvent.click(screen.getByRole("button", { name })),
  };
}

describe("LobbySettings: what it tells the lobby about unconfirmed changes", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
  afterEach(() => { vi.useRealTimers(); });

  it("sends a game change at once, names the game shown at the click, and is busy until the server's state carries it", () => {
    const s = mount(makeLobby("room_game", { roomGame: "shared_player" }));
    expect(s.shown).toEqual(["lobby-1/room_game:shared_player"]);
    s.click("friend.duelTabPistas");
    // No debounce for the game: it is on its way before a Ready could be.
    expect(s.onUpdateSettings).toHaveBeenCalledTimes(1);
    expect(s.onUpdateSettings).toHaveBeenCalledWith({ gameMode: "duel", duelGame: "pistas", roomGame: null });
    expect(s.saving).toEqual([true]);
    expect(s.shown.at(-1)).toBe("lobby-1/duel:pistas");
    // An unrelated state push (somebody readied) does not end it.
    act(() => s.server({ ...makeLobby("room_game", { roomGame: "shared_player" }), displayName: "Room!" }));
    expect(s.saving).toEqual([true]);
    act(() => s.server(makeLobby("duel", { duelGame: "pistas" })));
    expect(s.saving).toEqual([true, false]);
    expect(s.pressed("friend.duelTabPistas")).toBe("true");
  });

  it("rapid selections: the second waits for the first, and it stays busy until the last is confirmed", () => {
    const s = mount(makeLobby("room_game", { roomGame: "shared_player" }));
    s.click("friend.duelTabPistas");
    s.click("friend.duelTabUltimo");
    expect(s.onUpdateSettings).toHaveBeenCalledTimes(1);
    act(() => s.server(makeLobby("duel", { duelGame: "pistas" })));
    expect(s.onUpdateSettings).toHaveBeenCalledTimes(2);
    expect(s.onUpdateSettings).toHaveBeenLastCalledWith({ gameMode: "duel", duelGame: "ultimo", roomGame: null });
    expect(s.saving).toEqual([true]);
    act(() => s.server(makeLobby("duel", { duelGame: "ultimo" })));
    expect(s.saving).toEqual([true, false]);
    expect(s.pressed("friend.duelTabUltimo")).toBe("true");
  });

  it("a second tap on the queued game keeps it queued", () => {
    const s = mount(makeLobby("room_game", { roomGame: "shared_player" }));
    s.click("friend.duelTabPistas");
    s.click("friend.duelTabUltimo");
    s.click("friend.duelTabUltimo");
    act(() => s.server(makeLobby("duel", { duelGame: "pistas" })));
    expect(s.onUpdateSettings).toHaveBeenLastCalledWith({ gameMode: "duel", duelGame: "ultimo", roomGame: null });
    expect(s.shown.at(-1)).toBe("lobby-1/duel:ultimo");
  });

  it("back to the game already sent: the queued other game is dropped and nothing more is sent", () => {
    const s = mount(makeLobby("room_game", { roomGame: "shared_player" }));
    s.click("friend.duelTabPistas");
    s.click("friend.duelTabUltimo");
    s.click("friend.duelTabPistas");
    act(() => s.server(makeLobby("duel", { duelGame: "pistas" })));
    expect(s.onUpdateSettings).toHaveBeenCalledTimes(1);
    expect(s.saving).toEqual([true, false]);
    expect(s.pressed("friend.duelTabPistas")).toBe("true");
  });

  it("a refused change shows the server's game again in the very render that brings the refusal", () => {
    const s = mount(makeLobby("room_game", { roomGame: "shared_player" }));
    s.click("friend.duelTabPistas");
    s.click("friend.duelTabUltimo");
    act(() => s.refuse());
    // No timer has run.
    expect(s.pressed("friend.roomTabSharedPlayer")).toBe("true");
    expect(s.pressed("friend.duelTabPistas")).toBe("false");
    expect(s.shown.at(-1)).toBe("lobby-1/room_game:shared_player");
    expect(s.saving).toEqual([true, false]);
    // The queued second choice went with it.
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(s.onUpdateSettings).toHaveBeenCalledTimes(1);
  });

  it("a change never echoed frees the queue after 3 s; giving it up is the lobby's call (it sees the game still shown)", () => {
    const s = mount(makeLobby("room_game", { roomGame: "shared_player" }));
    s.click("friend.duelTabPistas");
    act(() => { vi.advanceTimersByTime(3_100); });
    expect(s.saving).toEqual([true, false]);
    expect(s.shown.at(-1)).toBe("lobby-1/duel:pistas");
    expect(s.pressed("friend.duelTabPistas")).toBe("true");
  });

  it("a change the server already holds is not sent and not waited for", () => {
    const s = mount(makeLobby("room_game", { roomGame: "shared_player" }));
    const visibility = screen.getByText("friend.lobbyVisibilityPrivate").closest("button")!;
    fireEvent.click(visibility);
    fireEvent.click(visibility);
    expect(s.saving).toEqual([true]);
    act(() => { vi.advanceTimersByTime(400); });
    expect(s.onUpdateSettings).not.toHaveBeenCalled();
    expect(s.saving).toEqual([true, false]);
    s.click("friend.roomTabSharedPlayer");
    expect(s.onUpdateSettings).not.toHaveBeenCalled();
    expect(s.saving).toEqual([true, false]);
  });

  it("a game without quiz categories confirms a change that carried categories (the server clears them)", () => {
    const s = mount(makeLobby("friendly_possession"));
    fireEvent.click(screen.getByText("friend.categoriesTitle").parentElement!.querySelector("button")!);
    s.click("friend.auction");
    expect(s.onUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({ gameMode: "auction", friendlyRandom: false, friendlyCategoryAId: "cat-1" }));
    s.click("friend.duelTabPistas");
    // Stored the server's way: auction, random, no categories.
    act(() => s.server(makeLobby("auction")));
    expect(s.onUpdateSettings).toHaveBeenLastCalledWith({ gameMode: "duel", duelGame: "pistas", roomGame: null });
    act(() => s.server(makeLobby("duel", { duelGame: "pistas" })));
    expect(s.saving).toEqual([true, false]);
  });

  it("a third player turning the chosen quiz into a party quiz confirms the choice instead of failing it", () => {
    const s = mount(makeLobby("ranked_sim"));
    s.click("friend.classic");
    expect(s.onUpdateSettings).toHaveBeenCalledTimes(1);
    const party = makeLobby("friendly_party_quiz");
    party.members.push({ ...party.members[1], userId: "user-3", username: "Player 3" });
    act(() => s.server(party));
    act(() => { vi.advanceTimersByTime(10); });
    expect(s.saving).toEqual([true, false]);
    expect(s.shown.at(-1)).toBe("lobby-1/friendly_party_quiz");
    expect(s.onUpdateSettings).toHaveBeenCalledTimes(1);
  });

  it("another room neither confirms nor receives what was queued for this one", () => {
    const s = mount(makeLobby("room_game", { roomGame: "shared_player" }));
    s.click("friend.duelTabPistas");
    s.click("friend.duelTabUltimo");
    // The other room happens to hold the game that was sent.
    act(() => s.server(makeLobby("duel", { duelGame: "pistas" }, "lobby-2")));
    expect(s.onUpdateSettings).toHaveBeenCalledTimes(1);
    expect(s.saving).toEqual([true, false]);
    expect(s.shown.at(-1)).toBe("lobby-2/duel:pistas");
    expect(s.pressed("friend.duelTabPistas")).toBe("true");
    expect(s.pressed("friend.duelTabUltimo")).toBe("false");
  });

  it("going away while busy says so", () => {
    const s = mount(makeLobby("room_game", { roomGame: "shared_player" }));
    s.click("friend.duelTabPistas");
    s.unmount();
    expect(s.saving).toEqual([true, false]);
    expect(s.shown.at(-1)).toBeNull();
  });
});
