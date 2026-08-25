/* eslint-disable @next/next/no-img-element -- Category images are runtime CMS URLs. */

import { optimizedRemoteImageProps } from "@/lib/images/remoteImage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Check, Eye, EyeOff, Gavel, Grid3X3, Lock, Search, Shuffle, Trophy } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { CategorySummary } from "@/lib/domain";
import type { LobbyGameMode, LobbySettings as LobbySettingsState, LobbyState } from "@/lib/realtime/socket.types";
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
  settingsErrorVersion?: number;
}

type SettingsPatch = Partial<LobbySettingsState> & { isPublic?: boolean };

const MODE_TABS: ReadonlyArray<{ value: LobbyGameMode; labelKey: MessageKey }> = [
  { value: 'friendly_possession', labelKey: 'friend.classic' },
  { value: 'friendly_party_quiz', labelKey: 'friend.partyQuiz' },
  { value: 'football_grid', labelKey: 'friend.footballGrid' },
  { value: 'ranked_sim', labelKey: 'friend.rankedSim' },
  { value: 'auction', labelKey: 'friend.auction' },
];

const MODE_DESCRIPTION_KEYS: Record<LobbyGameMode, MessageKey> = {
  friendly_possession: 'friend.classicDescription',
  friendly_party_quiz: 'friend.partyQuizDescription',
  football_grid: 'friend.footballGridDescription',
  ranked_sim: 'friend.rankedSimDescription',
  auction: 'friend.auctionDescription',
};

// Max lobby members each mode can seat — a tab is switchable only while the
// current member count fits (mirrors the server's LOBBY_MODE_CAPACITY check).
const MODE_CAPACITY: Record<LobbyGameMode, number> = {
  friendly_possession: 2,
  friendly_party_quiz: 6,
  football_grid: 2,
  ranked_sim: 2,
  auction: 3,
};

export function LobbySettings({
  isHost,
  lobby,
  categories,
  onUpdateSettings,
  settingsErrorVersion = 0,
}: LobbySettingsProps) {
  const { t } = useLocale();
  const settings = lobby?.settings;
  const serverMode = settings?.gameMode ?? 'friendly_possession';
  const memberCount = lobby?.members.length ?? 0;
  // Only party quiz seats more than 3, so past that the tabs disappear
  // entirely; at exactly 3 the tabs stay and per-tab capacity gating below
  // decides what's switchable (party ⇄ auction both seat 3+).
  const isPartyLocked = memberCount > 3;
  const serverIsPublic = lobby?.isPublic ?? false;
  const serverIsRandom = settings?.friendlyRandom ?? true;

  // --- Optimistic local state for instant toggle feedback ---
  const [optimisticMode, setOptimisticMode] = useState<LobbyGameMode | null>(null);
  const [optimisticPublic, setOptimisticPublic] = useState<boolean | null>(null);
  const [optimisticRandom, setOptimisticRandom] = useState<boolean | null>(null);

  // Single coalesced debounce: all setting changes merge into one emit
  const pendingChangesRef = useRef<SettingsPatch>({});
  const inFlightChangesRef = useRef<SettingsPatch | null>(null);
  const flushPendingChangesRef = useRef<() => void>(() => {});
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Sync optimistic state when server confirms ---
  useEffect(() => {
    if (optimisticMode === null) return;
    const hasPendingMode =
      pendingChangesRef.current.gameMode !== undefined ||
      inFlightChangesRef.current?.gameMode !== undefined;
    if (hasPendingMode) {
      return;
    }

    const timer = setTimeout(() => setOptimisticMode(null), 0);
    return () => clearTimeout(timer);
  }, [optimisticMode, serverMode]);

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

  const mode = optimisticMode ?? serverMode;
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
    },
    [clearFlushTimer]
  );

  const flushPendingChanges = useCallback(() => {
    clearFlushTimer();
    if (inFlightChangesRef.current) {
      return;
    }

    const pending = { ...pendingChangesRef.current };
    pendingChangesRef.current = {};

    if (Object.keys(pending).length === 0) {
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
    }, 3000);
  }, [clearFlushTimer, clearInFlightTimeout, lobby?.lobbyId, onUpdateSettings]);

  useEffect(() => {
    flushPendingChangesRef.current = flushPendingChanges;
  }, [flushPendingChanges]);

  // --- Coalesced flush: merge pending changes into a single emit ---
  const queueChange = useCallback(
    (changes: SettingsPatch) => {
      if (Object.keys(changes).length === 0) {
        return;
      }

      Object.assign(pendingChangesRef.current, changes);
      if (!inFlightChangesRef.current) {
        clearFlushTimer();
        flushTimerRef.current = setTimeout(() => {
          flushPendingChanges();
        }, 350);
      }
    },
    [clearFlushTimer, flushPendingChanges]
  );

  useEffect(() => {
    const inFlight = inFlightChangesRef.current;
    if (!inFlight) return;

    const applied =
      (inFlight.isPublic === undefined || inFlight.isPublic === serverIsPublic) &&
      (inFlight.gameMode === undefined || inFlight.gameMode === serverMode) &&
      (inFlight.friendlyRandom === undefined || inFlight.friendlyRandom === serverIsRandom) &&
      (inFlight.friendlyCategoryAId === undefined ||
        inFlight.friendlyCategoryAId === (settings?.friendlyCategoryAId ?? null));

    if (!applied) return;

    logger.info("Lobby settings update acknowledged", {
      lobbyId: lobby?.lobbyId ?? null,
      changes: inFlight,
    });
    inFlightChangesRef.current = null;
    clearInFlightTimeout();
    if (Object.keys(pendingChangesRef.current).length > 0) {
      flushPendingChanges();
    }
  }, [
    clearInFlightTimeout,
    flushPendingChanges,
    lobby,
    serverMode,
    serverIsPublic,
    serverIsRandom,
    settings?.friendlyCategoryAId,
  ]);

  // Hard reset local settings transition state when switching lobbies.
  useEffect(() => {
    const lobbyId = lobby?.lobbyId ?? null;
    if (lastLobbyIdRef.current === lobbyId) return;
    lastLobbyIdRef.current = lobbyId;

    clearFlushTimer();
    clearInFlightTimeout();
    pendingChangesRef.current = {};
    inFlightChangesRef.current = null;
    lastSentCategoryIdRef.current = null;

    const resetTimer = setTimeout(() => {
      setOptimisticMode(null);
      setOptimisticPublic(null);
      setOptimisticRandom(null);
      setSelectedCategoryId(serverSelectedCategoryId);
      setSelectedCategoryBId(serverSelectedCategoryBId);
    }, 0);

    return () => clearTimeout(resetTimer);
  }, [clearFlushTimer, clearInFlightTimeout, lobby?.lobbyId, serverSelectedCategoryId, serverSelectedCategoryBId]);

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

  useEffect(() => {
    if (!settingsErrorVersion) return;
    if (settingsErrorVersion === handledErrorVersionRef.current) return;
    handledErrorVersionRef.current = settingsErrorVersion;

    clearFlushTimer();
    clearInFlightTimeout();
    pendingChangesRef.current = {};
    inFlightChangesRef.current = null;
    lastSentCategoryIdRef.current = null;

    const rollbackTimer = setTimeout(() => {
      setOptimisticMode(null);
      setOptimisticPublic(null);
      setOptimisticRandom(null);
      if (!serverIsRandom && isFriendlyMode) {
        setSelectedCategoryId(serverSelectedCategoryId);
        setSelectedCategoryBId(serverSelectedCategoryBId);
      }
    }, 0);

    return () => clearTimeout(rollbackTimer);
  }, [clearFlushTimer, clearInFlightTimeout, isFriendlyMode, serverIsRandom, serverSelectedCategoryId, serverSelectedCategoryBId, settingsErrorVersion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearFlushTimer();
      clearInFlightTimeout();
    };
  }, [clearFlushTimer, clearInFlightTimeout]);

  // --- Handlers ---
  const handleModeChange = (newMode: LobbyGameMode) => {
    if (!canEdit) return;
    const targetMode =
      pendingChangesRef.current.gameMode ??
      inFlightChangesRef.current?.gameMode ??
      serverMode;
    setOptimisticMode(newMode);
    if (newMode !== targetMode) {
      queueChange({ gameMode: newMode });
    } else {
      clearPendingKeys(["gameMode"]);
      if (newMode === serverMode) {
        setOptimisticMode(null);
      }
    }
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
              {MODE_TABS.map(({ value, labelKey }) => {
                const overCapacity = memberCount > MODE_CAPACITY[value];
                return (
                  <button
                    key={value}
                    onClick={() => handleModeChange(value)}
                    disabled={!canEdit || overCapacity}
                    aria-pressed={mode === value}
                    title={overCapacity ? t("friend.errorModeCapacity") : undefined}
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 13, letterSpacing: '0.04em' }}
                    className={cn(
                      "py-2.5 rounded-[10px] uppercase transition-colors",
                      mode === value
                        ? "bg-brand-blue text-white"
                        : overCapacity
                          ? "text-white/25 cursor-not-allowed"
                          : "text-white/55 hover:text-white"
                    )}
                  >
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
              : t(MODE_DESCRIPTION_KEYS[mode])}
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
