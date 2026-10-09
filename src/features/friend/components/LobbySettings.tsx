/* eslint-disable @next/next/no-img-element -- Category images are runtime CMS URLs. */

import { useRealtimePrincipal } from "@/lib/realtime/realtime-principal";
import { useAuthPromptStore } from "@/stores/authPrompt.store";
import { optimizedRemoteImageProps } from "@/lib/images/remoteImage";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Check, Crosshair, Eye, EyeOff, Gavel, Grid3X3, Lock, Search, Shuffle, Swords, Trophy } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { CategorySummary } from "@/lib/domain";
import type { DuelGameId, LobbyGameMode, LobbySeenGame, LobbySettings as LobbySettingsState, LobbyState, RoomGameId } from "@/lib/realtime/socket.types";
import { DUEL_GAMES_ENABLED, ROOM_GAMES_ENABLED } from "@/lib/config";
import { DUEL_GAME_LABEL_KEYS, LOBBY_MODES, type LobbyModeChoice, modeChoiceKey, ROOM_GAME_LABEL_KEYS, ROOM_GAMES, settingsChoiceKey } from "@/lib/lobby/lobbyModes";
import { RoomGameOptions } from "./RoomGameOptions";
import { logger } from "@/utils/logger";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";
import { trackCategorySelected } from "@/lib/analytics/game-events";
import { AUCTION_PURPLE } from "@/features/auction/constants/auction.constants";

interface LobbySettingsProps {
  isHost: boolean;
  lobby: LobbyState | null;
  categories: CategorySummary[];
  onUpdateSettings: (settings: Partial<LobbySettingsState> & { isPublic?: boolean }) => void;
  /** The host's choices for the room game (which clubs, how hard); null = the game's defaults. */
  onRoomOptions?: (options: Record<string, unknown> | null) => void;
  settingsErrorVersion?: number;
  /** True while a change of this screen is queued or sent and not echoed by the server yet. */
  onSavingChange?: (saving: boolean) => void;
  /**
   * The game this screen shows as selected (null once the screen is gone), told at the click and whenever it changes.
   * While it is not the game the server holds, nobody should ready or start from this screen: the room would play
   * the other one.
   */
  onGameShown?: (shown: { lobbyId: string | null; choiceKey: string; game: LobbySeenGame } | null) => void;
}

type SettingsPatch = Partial<LobbySettingsState> & { isPublic?: boolean };

type ModeTab = { choice: LobbyModeChoice; labelKey: MessageKey };

const BASE_MODE_TABS: ReadonlyArray<ModeTab> = [
  { choice: { gameMode: 'friendly_possession', duelGame: null }, labelKey: 'friend.classic' },
  { choice: { gameMode: 'friendly_party_quiz', duelGame: null }, labelKey: 'friend.partyQuiz' },
  { choice: { gameMode: 'football_grid', duelGame: null }, labelKey: 'friend.footballGrid' },
  { choice: { gameMode: 'ranked_sim', duelGame: null }, labelKey: 'friend.rankedSim' },
  { choice: { gameMode: 'auction', duelGame: null }, labelKey: 'friend.auction' },
];

const DUEL_TAB_LABEL_KEYS: Record<DuelGameId, MessageKey> = {
  buscaminas: 'friend.duelTabBuscaminas',
  pistas: 'friend.duelTabPistas',
  ultimo: 'friend.duelTabUltimo',
  minuto: 'friend.duelTabMinuto',
};

/** The existing modes plus one tab per enabled duel game and room game (and the room's own game, if it has one). */
function modeTabs(currentDuelGame: DuelGameId | null, currentRoomGame: RoomGameId | null): ModeTab[] {
  const duelGames = currentDuelGame && !DUEL_GAMES_ENABLED.includes(currentDuelGame)
    ? [...DUEL_GAMES_ENABLED, currentDuelGame]
    : DUEL_GAMES_ENABLED;
  const roomGames = currentRoomGame && !ROOM_GAMES_ENABLED.includes(currentRoomGame)
    ? [...ROOM_GAMES_ENABLED, currentRoomGame]
    : ROOM_GAMES_ENABLED;
  return [
    ...BASE_MODE_TABS,
    ...duelGames.map((duelGame): ModeTab => ({ choice: { gameMode: 'duel', duelGame }, labelKey: DUEL_TAB_LABEL_KEYS[duelGame] })),
    ...roomGames.map((roomGame): ModeTab => ({ choice: { gameMode: 'room_game', duelGame: null, roomGame }, labelKey: ROOM_GAME_LABEL_KEYS[roomGame].tab })),
  ];
}

const MODE_DESCRIPTION_KEYS: Record<LobbyGameMode, MessageKey> = {
  friendly_possession: 'friend.classicDescription',
  friendly_party_quiz: 'friend.partyQuizDescription',
  football_grid: 'friend.footballGridDescription',
  ranked_sim: 'friend.rankedSimDescription',
  auction: 'friend.auctionDescription',
  duel: 'friend.duelDescription',
  room_game: 'friend.roomGameDescription',
};

/** Duel games whose rules differ from "most points wins" carry their own description. */
const DUEL_DESCRIPTION_KEYS: Partial<Record<DuelGameId, MessageKey>> = {
  ultimo: 'friend.duelDescriptionUltimo',
};

/** What the server holds, as far as a settings patch is compared with it. */
interface ServerSettingsView {
  isPublic: boolean;
  choiceKey: string;
  /** More than two members made the room a party quiz: that is what a quiz choice becomes there. */
  promotedToParty: boolean;
  needsCategories: boolean;
  isRandom: boolean;
  categoryAId: string | null;
  categoryBId: string | null;
}

/**
 * Whether the server's settings already carry this patch. Compared the way the server stores them: a game without
 * quiz categories, or random categories, makes the category fields moot (the server clears them).
 */
function patchApplied(patch: SettingsPatch, server: ServerSettingsView): boolean {
  if (patch.isPublic !== undefined && patch.isPublic !== server.isPublic) return false;
  if (patch.gameMode !== undefined
    && modeChoiceKey({ gameMode: patch.gameMode, duelGame: patch.duelGame ?? null, roomGame: patch.roomGame ?? null }) !== server.choiceKey
    && !(server.promotedToParty && LOBBY_MODES[patch.gameMode].promotesToPartyQuiz)) return false;
  if (!server.needsCategories) return true;
  if (patch.friendlyRandom !== undefined && patch.friendlyRandom !== server.isRandom) return false;
  if (server.isRandom) return true;
  if (patch.friendlyCategoryAId !== undefined && patch.friendlyCategoryAId !== server.categoryAId) return false;
  if (patch.friendlyCategoryBId !== undefined && patch.friendlyCategoryBId !== server.categoryBId) {
    // A second half equal to the first is stored as "none".
    const sameAsFirst = patch.friendlyCategoryBId === (patch.friendlyCategoryAId ?? server.categoryAId);
    if (!(sameAsFirst && server.categoryBId === null)) return false;
  }
  return true;
}

export function LobbySettings({
  isHost,
  lobby,
  categories,
  onUpdateSettings,
  onRoomOptions,
  settingsErrorVersion = 0,
  onSavingChange,
  onGameShown,
}: LobbySettingsProps) {
  const { t } = useLocale();
  const settings = lobby?.settings;
  const serverMode = settings?.gameMode ?? 'friendly_possession';
  const serverDuelGame = serverMode === 'duel' ? settings?.duelGame ?? null : null;
  const serverRoomGame = serverMode === 'room_game' ? settings?.roomGame ?? ROOM_GAMES[0] : null;
  const serverChoiceKey = settingsChoiceKey(settings);
  const memberCount = lobby?.members.length ?? 0;
  // Only party quiz seats more than 3, so past that the tabs disappear
  // entirely; at exactly 3 the tabs stay and per-tab capacity gating below
  // decides what's switchable (party ⇄ auction both seat 3+).
  // With room games on, a full room can still pick between party quiz and a 2–6 room game (capacity gating below).
  const isPartyLocked = memberCount > 3 && ROOM_GAMES_ENABLED.length === 0 && serverMode !== 'room_game';
  // A room holding a guest may only play the guest-allowed modes (the server enforces the same rule).
  const hasGuest = Boolean(lobby?.members.some((member) => member.isGuest));
  const openAuthPrompt = useAuthPromptStore((state) => state.open);
  const principal = useRealtimePrincipal();
  const serverIsPublic = lobby?.isPublic ?? false;
  const serverIsRandom = settings?.friendlyRandom ?? true;

  // --- Optimistic local state for instant toggle feedback ---
  const [optimisticMode, setOptimisticMode] = useState<LobbyModeChoice | null>(null);
  const [optimisticPublic, setOptimisticPublic] = useState<boolean | null>(null);
  const [optimisticRandom, setOptimisticRandom] = useState<boolean | null>(null);

  // Single coalesced debounce: all setting changes merge into one emit
  const pendingChangesRef = useRef<SettingsPatch>({});
  const inFlightChangesRef = useRef<SettingsPatch | null>(null);
  const flushPendingChangesRef = useRef<() => void>(() => {});
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSavingChangeRef = useRef(onSavingChange);
  const onGameShownRef = useRef(onGameShown);
  useEffect(() => {
    onSavingChangeRef.current = onSavingChange;
    onGameShownRef.current = onGameShown;
  });
  const savingRef = useRef(false);
  const syncSavingRef = useRef<() => void>(() => {});
  const syncSaving = useCallback(() => {
    const saving = Object.keys(pendingChangesRef.current).length > 0 || inFlightChangesRef.current !== null;
    if (saving === savingRef.current) return;
    savingRef.current = saving;
    onSavingChangeRef.current?.(saving);
  }, []);
  useEffect(() => {
    syncSavingRef.current = syncSaving;
  }, [syncSaving]);

  const mode = optimisticMode?.gameMode ?? serverMode;
  const duelGame = optimisticMode ? optimisticMode.duelGame : serverDuelGame;
  const roomGame = optimisticMode ? (optimisticMode.gameMode === 'room_game' ? optimisticMode.roomGame ?? ROOM_GAMES[0] : null) : serverRoomGame;
  const currentChoiceKey = modeChoiceKey({ gameMode: mode, duelGame, roomGame });
  const lobbyId = lobby?.lobbyId ?? null;
  // Before the paint, so the lobby never offers Ready or Start for a game other than the one this screen shows.
  useLayoutEffect(() => {
    onGameShownRef.current?.({ lobbyId, choiceKey: currentChoiceKey, game: { gameMode: mode, duelGame, roomGame } });
    // The key names the three fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChoiceKey, lobbyId]);
  const isFriendlyMode = mode === 'friendly_possession' || mode === 'friendly_party_quiz';
  const isAuctionMode = mode === 'auction';
  const isFootballGridMode = mode === 'football_grid';
  const isPublic = optimisticPublic ?? serverIsPublic;
  const isRandom = optimisticRandom ?? serverIsRandom;
  // Classic supports an optional second-half pick; party quiz stays
  // single-category (one shared pool for the whole lobby).
  const supportsSecondHalf = mode === 'friendly_possession';

  // --- Category state ---
  const serverSelectedCategoryId = settings?.friendlyCategoryAId ?? null;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(serverSelectedCategoryId);
  // Optional second-half preset (Classic only). null = decided by the halftime ban.
  const serverSelectedCategoryBId = settings?.friendlyCategoryBId ?? null;
  const [selectedCategoryBId, setSelectedCategoryBId] = useState<string | null>(serverSelectedCategoryBId);
  const [categorySearch, setCategorySearch] = useState("");
  const lastSentCategoryIdRef = useRef<string | null>(null);
  const handledErrorVersionRef = useRef(0);
  const resentChoiceRef = useRef<LobbyModeChoice | null>(null);
  const [displayedLobbyId, setDisplayedLobbyId] = useState(lobbyId);
  if (lobbyId !== displayedLobbyId) {
    // Another room: nothing chosen in the previous one is shown for it.
    setDisplayedLobbyId(lobbyId);
    setOptimisticMode(null);
    setOptimisticPublic(null);
    setOptimisticRandom(null);
    setSelectedCategoryId(serverSelectedCategoryId);
    setSelectedCategoryBId(serverSelectedCategoryBId);
  }
  const [rolledBackVersion, setRolledBackVersion] = useState(settingsErrorVersion);
  if (settingsErrorVersion !== rolledBackVersion) {
    // A refused or abandoned change: this same render shows the server's settings again, so the lobby is never
    // one frame ahead of the screen (it offers Start as soon as the two agree).
    setRolledBackVersion(settingsErrorVersion);
    setOptimisticMode(null);
    setOptimisticPublic(null);
    setOptimisticRandom(null);
    if (!serverIsRandom && isFriendlyMode) {
      setSelectedCategoryId(serverSelectedCategoryId);
      setSelectedCategoryBId(serverSelectedCategoryBId);
    }
  }
  const serverView: ServerSettingsView = {
    isPublic: serverIsPublic,
    choiceKey: serverChoiceKey,
    promotedToParty: serverMode === 'friendly_party_quiz' && memberCount > 2,
    needsCategories: LOBBY_MODES[serverMode].needsCategories,
    isRandom: serverIsRandom,
    categoryAId: serverSelectedCategoryId,
    categoryBId: serverSelectedCategoryBId,
  };
  const serverViewRef = useRef(serverView);
  useEffect(() => {
    serverViewRef.current = serverView;
  });
  const canEdit = Boolean(isHost && lobby?.status === "waiting" && !lobby?.members.every((m) => m.isReady));
  const lastLobbyIdRef = useRef<string | null>(null);

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((cat) => cat.name.toLowerCase().includes(query));
  }, [categories, categorySearch]);

  const clearInFlightTimeout = useCallback(() => {
    if (!inFlightTimeoutRef.current) return;
    clearTimeout(inFlightTimeoutRef.current);
    inFlightTimeoutRef.current = null;
  }, []);

  const hasCategoryTransitionInProgress = useCallback(() => {
    const pending = pendingChangesRef.current;
    const inFlight = inFlightChangesRef.current;
    return Boolean(
      pending.friendlyCategoryAId !== undefined ||
      inFlight?.friendlyCategoryAId !== undefined
    );
  }, []);

  const clearFlushTimer = useCallback(() => {
    if (!flushTimerRef.current) return;
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
  }, []);

  const clearPendingKeys = useCallback(
    (keys: Array<keyof SettingsPatch>) => {
      for (const key of keys) {
        delete pendingChangesRef.current[key];
      }

      if (Object.keys(pendingChangesRef.current).length === 0) {
        clearFlushTimer();
      }
      syncSaving();
    },
    [clearFlushTimer, syncSaving]
  );

  const flushPendingChanges = useCallback(() => {
    clearFlushTimer();
    if (inFlightChangesRef.current) {
      return;
    }

    const pending = { ...pendingChangesRef.current };
    pendingChangesRef.current = {};

    // The server answers a change it already holds with silence: waiting for that echo would be waiting for nothing.
    if (Object.keys(pending).length === 0 || patchApplied(pending, serverViewRef.current)) {
      syncSaving();
      return;
    }

    onUpdateSettings(pending);
    inFlightChangesRef.current = pending;
    logger.info("Lobby settings queued update sent", {
      lobbyId: lobby?.lobbyId ?? null,
      changes: pending,
    });

    clearInFlightTimeout();
    inFlightTimeoutRef.current = setTimeout(() => {
      if (!inFlightChangesRef.current) return;
      logger.warn("Lobby settings ack timeout, releasing in-flight lock", {
        lobbyId: lobby?.lobbyId ?? null,
        changes: inFlightChangesRef.current,
      });
      inFlightChangesRef.current = null;
      if (Object.keys(pendingChangesRef.current).length > 0) {
        flushPendingChangesRef.current();
      }
      syncSavingRef.current();
    }, 3000);
  }, [clearFlushTimer, clearInFlightTimeout, lobby?.lobbyId, onUpdateSettings, syncSaving]);

  useEffect(() => {
    flushPendingChangesRef.current = flushPendingChanges;
  }, [flushPendingChanges]);

  // --- Coalesced flush: merge pending changes into a single emit ---
  const queueChange = useCallback(
    (changes: SettingsPatch, immediate = false) => {
      if (Object.keys(changes).length === 0) {
        return;
      }

      Object.assign(pendingChangesRef.current, changes);
      if (!inFlightChangesRef.current) {
        clearFlushTimer();
        // Which game is played goes out at once, with everything queued: Ready and Start wait for its confirmation.
        if (immediate) flushPendingChanges();
        else flushTimerRef.current = setTimeout(() => {
          flushPendingChanges();
        }, 350);
      }
      syncSaving();
    },
    [clearFlushTimer, flushPendingChanges, syncSaving]
  );

  // Another room: its queue starts empty (its display was reset while rendering, above). Declared ahead of the
  // acknowledgement below: another room's settings must never confirm (or receive) what was queued for this one.
  useEffect(() => {
    if (lastLobbyIdRef.current === lobbyId) return;
    lastLobbyIdRef.current = lobbyId;

    clearFlushTimer();
    clearInFlightTimeout();
    pendingChangesRef.current = {};
    inFlightChangesRef.current = null;
    lastSentCategoryIdRef.current = null;
    syncSaving();
  }, [clearFlushTimer, clearInFlightTimeout, lobbyId, syncSaving]);

  // The queue's half of a rollback (the display's half is done while rendering, above).
  useEffect(() => {
    if (!settingsErrorVersion) return;
    if (settingsErrorVersion === handledErrorVersionRef.current) return;
    handledErrorVersionRef.current = settingsErrorVersion;

    clearFlushTimer();
    clearInFlightTimeout();
    pendingChangesRef.current = {};
    inFlightChangesRef.current = null;
    lastSentCategoryIdRef.current = null;
    syncSaving();
  }, [clearFlushTimer, clearInFlightTimeout, settingsErrorVersion, syncSaving]);

  useEffect(() => {
    const inFlight = inFlightChangesRef.current;
    if (!inFlight) return;
    if (!patchApplied(inFlight, serverViewRef.current)) return;

    logger.info("Lobby settings update acknowledged", {
      lobbyId: lobby?.lobbyId ?? null,
      changes: inFlight,
    });
    inFlightChangesRef.current = null;
    clearInFlightTimeout();
    if (Object.keys(pendingChangesRef.current).length > 0) {
      flushPendingChanges();
    }
    syncSaving();
  }, [
    clearInFlightTimeout,
    flushPendingChanges,
    syncSaving,
    lobby,
    serverChoiceKey,
    serverIsPublic,
    serverIsRandom,
    settings?.friendlyCategoryAId,
    settings?.friendlyCategoryBId,
  ]);

  // --- Sync optimistic state when server confirms (after the acknowledgement above, which clears what these read) ---
  useEffect(() => {
    if (optimisticMode === null) return;
    const hasPendingMode =
      pendingChangesRef.current.gameMode !== undefined ||
      inFlightChangesRef.current?.gameMode !== undefined;
    if (hasPendingMode) {
      return;
    }

    // Nothing is on its way and the server holds another game: an earlier request landed late, after the queue had
    // given up on it. The choice still on screen is the latest one, so it is sent once more (once: a choice the
    // server keeps turning into something else is dropped, and the screen shows what the server holds).
    const optimisticKey = modeChoiceKey(optimisticMode);
    const turnedIntoParty = serverMode === 'friendly_party_quiz' && memberCount > 2 && LOBBY_MODES[optimisticMode.gameMode].promotesToPartyQuiz;
    if (optimisticKey !== serverChoiceKey && !turnedIntoParty && canEdit && resentChoiceRef.current !== optimisticMode) {
      resentChoiceRef.current = optimisticMode;
      queueChange({
        gameMode: optimisticMode.gameMode, duelGame: optimisticMode.duelGame,
        roomGame: optimisticMode.gameMode === 'room_game' ? optimisticMode.roomGame ?? ROOM_GAMES[0] : null,
      }, true);
      return;
    }

    const timer = setTimeout(() => setOptimisticMode(null), 0);
    return () => clearTimeout(timer);
    // Re-run by a new choice or a new server game only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optimisticMode, serverChoiceKey]);

  useEffect(() => {
    if (optimisticPublic === null) return;
    const hasPendingPublic =
      pendingChangesRef.current.isPublic !== undefined ||
      inFlightChangesRef.current?.isPublic !== undefined;
    if (hasPendingPublic) {
      return;
    }

    const timer = setTimeout(() => setOptimisticPublic(null), 0);
    return () => clearTimeout(timer);
  }, [optimisticPublic, serverIsPublic]);

  useEffect(() => {
    if (optimisticRandom === null) return;
    const hasPendingRandom =
      pendingChangesRef.current.friendlyRandom !== undefined ||
      inFlightChangesRef.current?.friendlyRandom !== undefined;
    if (hasPendingRandom) {
      return;
    }

    const timer = setTimeout(() => setOptimisticRandom(null), 0);
    return () => clearTimeout(timer);
  }, [optimisticRandom, serverIsRandom]);

  // Sync server category → local (only when server confirms random is off)
  useEffect(() => {
    if (serverIsRandom || !isFriendlyMode) {
      // Don't clear selectedCategoryId — it's hidden behind {!isRandom && ...}
      // and preserving it prevents a 1-frame gray flash when toggling random back off.
      lastSentCategoryIdRef.current = null;
      return;
    }
    if (hasCategoryTransitionInProgress()) {
      return;
    }
    const syncTimer = setTimeout(() => {
      setSelectedCategoryId((prev) => {
        if (prev === serverSelectedCategoryId) return prev;
        return serverSelectedCategoryId;
      });
      setSelectedCategoryBId((prev) => {
        if (prev === serverSelectedCategoryBId) return prev;
        return serverSelectedCategoryBId;
      });
    }, 0);
    lastSentCategoryIdRef.current = serverSelectedCategoryId;
    return () => clearTimeout(syncTimer);
  }, [hasCategoryTransitionInProgress, isFriendlyMode, serverIsRandom, serverSelectedCategoryId, serverSelectedCategoryBId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearFlushTimer();
      clearInFlightTimeout();
      if (savingRef.current) onSavingChangeRef.current?.(false);
      onGameShownRef.current?.(null);
    };
  }, [clearFlushTimer, clearInFlightTimeout]);

  // --- Handlers ---
  const handleModeChange = (choice: LobbyModeChoice) => {
    if (!canEdit) return;
    const keyOf = (patch: SettingsPatch | null) => patch?.gameMode !== undefined
      ? modeChoiceKey({ gameMode: patch.gameMode, duelGame: patch.duelGame ?? null, roomGame: patch.roomGame ?? null })
      : null;
    const queuedKey = keyOf(pendingChangesRef.current);
    // What the room is on once everything already sent has landed.
    const sentKey = keyOf(inFlightChangesRef.current) ?? serverChoiceKey;
    const choiceKey = modeChoiceKey(choice);
    setOptimisticMode(choice);
    // At the click, not a render later: a Ready pressed right behind it must already be held.
    onGameShownRef.current?.({
      lobbyId, choiceKey,
      game: { gameMode: choice.gameMode, duelGame: choice.duelGame, roomGame: choice.gameMode === 'room_game' ? choice.roomGame ?? ROOM_GAMES[0] : null },
    });
    if (choiceKey === queuedKey) return;
    if (choiceKey === sentKey) {
      // Back on the game already sent or held: only a queued change to another game has to go.
      clearPendingKeys(["gameMode", "duelGame", "roomGame"]);
      if (choiceKey === serverChoiceKey) setOptimisticMode(null);
      return;
    }
    queueChange({ gameMode: choice.gameMode, duelGame: choice.duelGame, roomGame: choice.gameMode === 'room_game' ? choice.roomGame ?? ROOM_GAMES[0] : null }, true);
  };

  const toggleCategory = (catId: string) => {
    if (!canEdit || isRandom) return;

    let nextA: string | null;
    let nextB: string | null;

    if (!supportsSecondHalf) {
      nextA = selectedCategoryId === catId ? null : catId;
      nextB = null;
    } else if (selectedCategoryId === catId) {
      // Deselecting the 1st half promotes the 2nd half up, so the remaining
      // pick never becomes an orphaned "2nd half with no 1st half".
      nextA = selectedCategoryBId;
      nextB = null;
    } else if (selectedCategoryBId === catId) {
      nextA = selectedCategoryId;
      nextB = null;
    } else if (!selectedCategoryId) {
      nextA = catId;
      nextB = selectedCategoryBId;
    } else if (!selectedCategoryBId) {
      nextA = selectedCategoryId;
      nextB = catId;
    } else {
      // Both slots taken — a third tap replaces the 2nd half.
      nextA = selectedCategoryId;
      nextB = catId;
    }

    setSelectedCategoryId(nextA);
    setSelectedCategoryBId(nextB);

    // Analytics: emit for the card the user just turned ON (not deselects).
    const turnedOn = nextA === catId || nextB === catId;
    if (turnedOn) {
      const picked = categories.find((c) => c.id === catId);
      try { trackCategorySelected(catId, picked?.name ?? catId); } catch { /* best-effort */ }
    }

    // Emit category update only from explicit user interactions.
    const pending = pendingChangesRef.current;
    const inFlight = inFlightChangesRef.current;
    const targetCategoryAId =
      pending.friendlyCategoryAId ??
      inFlight?.friendlyCategoryAId ??
      (settings?.friendlyCategoryAId ?? null);
    const targetCategoryBId =
      pending.friendlyCategoryBId ??
      inFlight?.friendlyCategoryBId ??
      (settings?.friendlyCategoryBId ?? null);

    if (nextA !== targetCategoryAId || nextB !== targetCategoryBId) {
      lastSentCategoryIdRef.current = nextA;
      queueChange({
        friendlyCategoryAId: nextA,
        friendlyCategoryBId: nextB,
      });
    }
  };

  const handleVisibilityClick = () => {
    if (!canEdit) return;
    const nextPublic = !isPublic;
    const targetPublic =
      pendingChangesRef.current.isPublic ??
      inFlightChangesRef.current?.isPublic ??
      serverIsPublic;
    setOptimisticPublic(nextPublic);
    if (nextPublic !== targetPublic) {
      queueChange({ isPublic: nextPublic });
    } else {
      // Net no-op: clear any pending visibility change
      clearPendingKeys(["isPublic"]);
      if (nextPublic === serverIsPublic) {
        setOptimisticPublic(null);
      }
    }
  };

  const handleRandomToggle = () => {
    if (!canEdit) return;
    const nextRandom = !isRandom;
    const targetRandom =
      pendingChangesRef.current.friendlyRandom ??
      inFlightChangesRef.current?.friendlyRandom ??
      serverIsRandom;
    setOptimisticRandom(nextRandom);

    if (nextRandom === targetRandom) {
      // Net no-op: clear any pending random change
      clearPendingKeys(["friendlyRandom", "friendlyCategoryAId"]);
      if (nextRandom === serverIsRandom) {
        setOptimisticRandom(null);
      }
      return;
    }

    if (nextRandom) {
      queueChange({ friendlyRandom: true });
    } else {
      // Turning random off — include category
      let cat = selectedCategoryId;
      if (!cat) {
        const fallback = categories[0]?.id ?? null;
        if (!fallback) {
          toast.error(t("friend.notEnoughCategoriesToDisableRandom"));
          setOptimisticRandom(null); // revert
          return;
        }
        cat = fallback;
        setSelectedCategoryId(fallback);
        toast.info(t("friend.randomDisabledDefault"));
      }
      // Carry a previously chosen second half only if it survives as a distinct
      // pick; otherwise halftime decides it as before.
      const catB = supportsSecondHalf && selectedCategoryBId && selectedCategoryBId !== cat
        ? selectedCategoryBId
        : null;
      setSelectedCategoryBId(catB);
      queueChange({
        friendlyRandom: false,
        friendlyCategoryAId: cat,
        friendlyCategoryBId: catB,
      });
    }
  };

  // --- Render ---
  return (
    <div className="rounded-[20px]">
      <div className="px-3 pb-1 flex items-center justify-between">
        <h2
          className="uppercase text-white"
          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: '0.04em' }}
        >
          {t("friend.gameSetup")}
        </h2>
        {!isHost && (
          <span
            className="flex items-center gap-1.5 text-brand-slate uppercase"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 10, letterSpacing: '0.08em' }}
          >
            <Lock className="size-3" /> {t("friend.hostOnly")}
          </span>
        )}
      </div>

      <div className="rounded-[20px] px-3 py-5 space-y-4">
        {/* Mode Selector */}
        <div className="space-y-4">
          <span
            className="text-brand-slate uppercase"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: '0.08em' }}
          >
            {t("friend.matchMode")}
          </span>
          {isPartyLocked ? (
            <div className="rounded-[14px] bg-surface-deep p-1.5">
              <div className="flex items-center justify-between rounded-[10px] bg-brand-blue px-4 py-3 text-white">
                <div>
                  <div
                    className="uppercase"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 14, letterSpacing: '0.04em' }}
                  >
                    {t("friend.partyQuiz")}
                  </div>
                  <div
                    className="text-white/70"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: 10 }}
                  >
                    {t("friend.partyLockedHint")}
                  </div>
                </div>
                <span
                  className="rounded-full bg-white/15 px-2.5 py-1 uppercase text-white"
                  style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 10, letterSpacing: '0.06em' }}
                >
                  {memberCount}/6
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 bg-surface-deep rounded-[14px] p-1 gap-1">
              {modeTabs(serverDuelGame, serverRoomGame).map(({ choice, labelKey }) => {
                const key = modeChoiceKey(choice);
                const overCapacity = memberCount > LOBBY_MODES[choice.gameMode].playable;
                const guestLocked = hasGuest && !LOBBY_MODES[choice.gameMode].guestAllowed;
                const selected = currentChoiceKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (guestLocked) {
                        if (principal.kind === 'guest') openAuthPrompt();
                        else toast.error(t("friend.errorModeRequiresAccount"));
                        return;
                      }
                      handleModeChange(choice);
                    }}
                    // A guest may always tap a locked mode: the tap opens sign-up, never a settings change.
                    disabled={guestLocked && principal.kind === 'guest' ? overCapacity : !canEdit || overCapacity}
                    aria-pressed={selected}
                    data-guest-locked={guestLocked || undefined}
                    title={overCapacity ? t("friend.errorModeCapacity") : guestLocked ? t("friend.errorModeRequiresAccount") : undefined}
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: '0.04em' }}
                    className={cn(
                      "py-2.5 rounded-[10px] uppercase transition-colors",
                      selected
                        ? "bg-brand-blue text-white"
                        : overCapacity
                          ? "text-white/25 cursor-not-allowed"
                          : guestLocked
                            ? "text-white/30"
                            : "text-white/55 hover:text-white"
                    )}
                  >
                    {guestLocked && <Lock className="mr-1 inline size-3 align-[-1px]" aria-hidden="true" />}
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>
          )}
          <p
            className="text-white/75"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: 12, lineHeight: 1.4 }}
          >
            {isPartyLocked
              ? t("friend.partyDescription")
              : t((mode === 'duel' && duelGame && DUEL_DESCRIPTION_KEYS[duelGame]) || (mode === 'room_game' && roomGame && ROOM_GAME_LABEL_KEYS[roomGame].description) || MODE_DESCRIPTION_KEYS[mode])}
          </p>
        </div>

        {/* Lobby Visibility */}
        <div className="space-y-4">
          <span
            className="text-brand-slate uppercase"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: '0.08em' }}
          >
            {t("friend.lobbyVisibility")}
          </span>
          <button
            onClick={handleVisibilityClick}
            disabled={!canEdit}
            className={cn(
              "w-full flex items-center justify-between p-3.5 rounded-[14px] border-2 border-brand-green bg-transparent transition-colors",
              !canEdit && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "size-9 rounded-[10px] flex items-center justify-center",
                isPublic ? "bg-brand-green" : "bg-surface-card-tint"
              )}>
                {isPublic ? <Eye className="size-4 text-white" /> : <EyeOff className="size-4 text-brand-slate" />}
              </div>
              <div className="text-left">
                <div
                  className="text-white"
                  style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 14, letterSpacing: '0.02em' }}
                >
                  {isPublic ? t('friend.lobbyVisibilityPublic') : t('friend.lobbyVisibilityPrivate')}
                </div>
                <div
                  className="leading-snug text-white/70"
                  style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: 11 }}
                >
                  {isPublic
                    ? t('friend.lobbyVisibilityPublicHint')
                    : t('friend.lobbyVisibilityPrivateHint')}
                </div>
              </div>
            </div>
            <div className={cn(
              "w-10 h-6 rounded-full transition-colors relative",
              isPublic ? "bg-brand-green" : "bg-surface-card-tint"
            )}>
              <div className={cn(
                "absolute top-0.5 size-5 rounded-full bg-white transition-all shadow-sm",
                isPublic ? "left-[18px]" : "left-0.5"
              )} />
            </div>
          </button>
        </div>

        {/* Categories (Friendly Only) */}
        {isFriendlyMode && (
          <div className="space-y-4">
            <span
              className="text-brand-slate uppercase"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: '0.08em' }}
            >
              {t("friend.categoriesTitle")}
            </span>
            <button
              onClick={handleRandomToggle}
              disabled={!canEdit}
              className={cn(
                "w-full flex items-center justify-between p-3.5 rounded-[14px] border-2 border-brand-yellow bg-transparent transition-colors",
                !canEdit && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "size-9 rounded-[10px] flex items-center justify-center",
                  isRandom ? "bg-brand-yellow" : "bg-surface-card-tint"
                )}>
                  <Shuffle className={cn("size-4", isRandom ? "text-surface-page" : "text-brand-slate")} />
                </div>
                <div className="text-left">
                  <div
                    className="text-white"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 14, letterSpacing: '0.02em' }}
                  >
                    {t("friend.randomCategories")}
                  </div>
                  <div
                    className="leading-snug text-white/70"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: 11 }}
                  >
                    {isRandom ? t("friend.randomCategoriesOn") : t("friend.randomCategoriesOff")}
                  </div>
                </div>
              </div>
              <div className={cn(
                "w-10 h-6 rounded-full transition-colors relative",
                isRandom ? "bg-brand-yellow" : "bg-surface-card-tint"
              )}>
                <div className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white transition-all shadow-sm",
                  isRandom ? "left-[18px]" : "left-0.5"
                )} />
              </div>
            </button>

            {!isRandom && (
              <>
                <p
                  className="leading-snug text-white/70"
                  style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: 11 }}
                >
                  {mode === 'friendly_party_quiz'
                    ? t("friend.pickCategoryParty")
                    : t("friend.pickCategoryClassic")}
                </p>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/45" />
                  <input
                    type="text"
                    placeholder={t("friend.searchCategoryPlaceholder")}
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="h-11 w-full rounded-[14px] border-2 border-brand-blue bg-transparent pl-10 pr-3 text-sm uppercase text-white outline-none placeholder:text-white/40 placeholder:tracking-[0.06em] focus:outline-none"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0.04em' }}
                  />
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-[#243B44] scrollbar-track-transparent">
                  {filteredCategories.length === 0 ? (
                    <p
                      className="py-6 text-center text-brand-slate uppercase"
                      style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 12, letterSpacing: '0.08em' }}
                    >
                      {t("friend.noCategoryMatchesSearch", { query: categorySearch })}
                    </p>
                  ) : filteredCategories.map(cat => {
                    const isFirstHalf = selectedCategoryId === cat.id;
                    const isSecondHalf = supportsSecondHalf && selectedCategoryBId === cat.id;
                    const isSelected = isFirstHalf || isSecondHalf;
                    // The next tap on an unselected card fills whichever slot is
                    // open — surfaced as a ghost badge so the outcome is visible
                    // before committing.
                    const isNextSecondHalf = supportsSecondHalf
                      && !isSelected
                      && Boolean(selectedCategoryId)
                      && !selectedCategoryBId;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        disabled={!canEdit || isRandom}
                        aria-pressed={isSelected}
                        style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0.02em' }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3.5 rounded-[14px] transition-colors border-2 bg-white/[0.04] hover:bg-white/[0.08]",
                          isFirstHalf
                            ? "border-brand-green text-white"
                            : isSecondHalf
                              ? "border-brand-yellow text-white"
                              : "border-brand-blue text-white/70 hover:text-white",
                          (!canEdit || isRandom) && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="size-9 overflow-hidden shrink-0 flex items-center justify-center">
                          {cat.imageUrl
                            ? <img {...optimizedRemoteImageProps(cat.imageUrl, 72)} alt={cat.name} loading="lazy" decoding="async" className="size-full object-contain" />
                            : <span className="text-xl">{cat.icon}</span>
                          }
                        </div>
                        <span className="flex-1 text-left text-sm truncate">{cat.name}</span>
                        {supportsSecondHalf && (isSelected || isNextSecondHalf) && (
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 uppercase",
                              isFirstHalf
                                ? "bg-brand-green/20 text-brand-green"
                                : isSecondHalf
                                  ? "bg-brand-yellow/20 text-brand-yellow"
                                  : "bg-white/10 text-white/45"
                            )}
                            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 9, letterSpacing: '0.06em' }}
                          >
                            {isFirstHalf
                              ? t("friend.firstHalfBadge")
                              : isSecondHalf
                                ? t("friend.secondHalfBadge")
                                : t("friend.secondHalfOptional")}
                          </span>
                        )}
                        {isSelected && (
                          <Check className={cn(
                            "size-4 shrink-0",
                            isFirstHalf ? "text-brand-green" : "text-brand-yellow"
                          )} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Auction Info — categories don't apply, so this replaces the picker. */}
        {isAuctionMode && (
          <div className="p-5 rounded-[14px] bg-white/[0.05] flex flex-col items-center text-center gap-2.5">
            <div
              className="size-14 rounded-full flex items-center justify-center"
              style={{ background: AUCTION_PURPLE }}
            >
              <Gavel className="size-7 text-white" strokeWidth={2.5} />
            </div>
            <h4
              className="text-white uppercase"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: '0.04em' }}
            >
              {t("friend.auctionHeader")}
            </h4>
            <p
              className="text-white/65 max-w-xs"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: 12, lineHeight: 1.45 }}
            >
              {t("friend.auctionDescriptionLong")}
            </p>
          </div>
        )}

        {isFootballGridMode && (
          <div className="flex flex-col items-center gap-2.5 rounded-[14px] border border-brand-blue/30 bg-brand-blue/10 p-5 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-blue">
              <Grid3X3 className="size-7 text-brand-yellow" strokeWidth={2.5} />
            </div>
            <h4
              className="uppercase text-white"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: '0.04em' }}
            >
              {t("friend.footballGrid")}
            </h4>
            <p
              className="max-w-xs text-white/65"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: 12, lineHeight: 1.45 }}
            >
              {t("friend.footballGridDescriptionLong")}
            </p>
          </div>
        )}

        {mode === 'duel' && duelGame && (
          <div className="flex flex-col items-center gap-2.5 rounded-[14px] border border-brand-blue/30 bg-brand-blue/10 p-5 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-blue">
              <Swords className="size-7 text-brand-yellow" strokeWidth={2.5} />
            </div>
            <h4
              className="uppercase text-white"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: '0.04em' }}
            >
              {t(DUEL_GAME_LABEL_KEYS[duelGame])}
            </h4>
          </div>
        )}

        {mode === 'room_game' && (
          <div className="flex flex-col items-center gap-2.5 rounded-[14px] border border-brand-blue/30 bg-brand-blue/10 p-5 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-blue">
              <Crosshair className="size-7 text-brand-yellow" strokeWidth={2.5} />
            </div>
            <h4
              className="uppercase text-white"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: '0.04em' }}
            >
              {t(ROOM_GAME_LABEL_KEYS[roomGame ?? ROOM_GAMES[0]].title)}
            </h4>
            {roomGame === 'shared_player' && roomGame === serverRoomGame && (
              <RoomGameOptions options={settings?.roomOptions ?? null} canEdit={canEdit} onChange={(options) => onRoomOptions?.(options)} />
            )}
          </div>
        )}

        {/* Ranked Sim Info */}
        {mode === 'ranked_sim' && (
          <div className="p-5 rounded-[14px] bg-white/[0.05] flex flex-col items-center text-center gap-2.5">
            <div className="size-14 rounded-full bg-brand-orange flex items-center justify-center">
              <Trophy className="size-7 text-white" strokeWidth={2.5} />
            </div>
            <h4
              className="text-brand-orange uppercase"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: '0.04em' }}
            >
              {t("friend.rankedSimHeader")}
            </h4>
            <p
              className="text-white/65 max-w-xs"
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, fontSize: 12, lineHeight: 1.45 }}
            >
              {t("friend.rankedSimDescriptionLong")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
