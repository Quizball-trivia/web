/* eslint-disable @next/next/no-img-element -- Category images are runtime CMS URLs. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Check, Eye, EyeOff, Lock, Search, Shuffle, Trophy } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { CategorySummary } from "@/lib/domain";
import type { LobbyGameMode, LobbySettings as LobbySettingsState, LobbyState } from "@/lib/realtime/socket.types";
import { logger } from "@/utils/logger";

interface LobbySettingsProps {
  isHost: boolean;
  lobby: LobbyState | null;
  categories: CategorySummary[];
  onUpdateSettings: (settings: Partial<LobbySettingsState> & { isPublic?: boolean }) => void;
  settingsErrorVersion?: number;
}

type SettingsPatch = Partial<LobbySettingsState> & { isPublic?: boolean };

export function LobbySettings({
  isHost,
  lobby,
  categories,
  onUpdateSettings,
  settingsErrorVersion = 0,
}: LobbySettingsProps) {
  const settings = lobby?.settings;
  const serverMode = settings?.gameMode ?? 'friendly_possession';
  const memberCount = lobby?.members.length ?? 0;
  const isPartyLocked = memberCount > 2;
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
  const isPublic = optimisticPublic ?? serverIsPublic;
  const isRandom = optimisticRandom ?? serverIsRandom;

  // --- Category state ---
  const serverSelectedCategoryId = settings?.friendlyCategoryAId ?? null;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(serverSelectedCategoryId);
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
    }, 0);

    return () => clearTimeout(resetTimer);
  }, [clearFlushTimer, clearInFlightTimeout, lobby?.lobbyId, serverSelectedCategoryId]);

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
    }, 0);
    lastSentCategoryIdRef.current = serverSelectedCategoryId;
    return () => clearTimeout(syncTimer);
  }, [hasCategoryTransitionInProgress, isFriendlyMode, serverIsRandom, serverSelectedCategoryId]);

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
      }
    }, 0);

    return () => clearTimeout(rollbackTimer);
  }, [clearFlushTimer, clearInFlightTimeout, isFriendlyMode, serverIsRandom, serverSelectedCategoryId, settingsErrorVersion]);

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

    const next = selectedCategoryId === catId ? null : catId;
    setSelectedCategoryId(next);

    // Emit category update only from explicit user interactions.
    const pending = pendingChangesRef.current;
    const inFlight = inFlightChangesRef.current;
    const targetCategoryAId =
      pending.friendlyCategoryAId ??
      inFlight?.friendlyCategoryAId ??
      (settings?.friendlyCategoryAId ?? null);

    if (next !== targetCategoryAId) {
      lastSentCategoryIdRef.current = next;
      queueChange({
        friendlyCategoryAId: next,
        friendlyCategoryBId: null,
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
          toast.error("Not enough categories to disable random");
          setOptimisticRandom(null); // revert
          return;
        }
        cat = fallback;
        setSelectedCategoryId(fallback);
        toast.info("Random disabled. Default category selected.");
      }
      queueChange({
        friendlyRandom: false,
        friendlyCategoryAId: cat,
        friendlyCategoryBId: null,
      });
    }
  };

  // --- Render ---
  return (
    <div className="rounded-[20px]">
      <div className="px-5 pb-1 flex items-center justify-between">
        <h2
          className="uppercase text-white"
          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: '0.04em' }}
        >
          Game Setup
        </h2>
        {!isHost && (
          <span
            className="flex items-center gap-1.5 text-brand-slate uppercase"
            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 10, letterSpacing: '0.08em' }}
          >
            <Lock className="size-3" /> Host Only
          </span>
        )}
      </div>

      <div className="rounded-[20px] p-5 space-y-6">
        {/* Mode Selector */}
        <div className="space-y-3">
          <span className="text-[10px] font-black text-brand-slate uppercase tracking-wider">Match Mode</span>
          {isPartyLocked ? (
            <div className="rounded-[14px] bg-surface-deep p-1.5">
              <div className="flex items-center justify-between rounded-[10px] bg-brand-blue px-4 py-3 text-white">
                <div>
                  <div className="text-sm font-black uppercase tracking-wide">Party Quiz</div>
                  <div className="text-[10px] font-bold text-white/70">
                    Multiplayer friendly lobbies automatically use standings mode.
                  </div>
                </div>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                  {memberCount}/6
                </span>
              </div>
            </div>
          ) : (
            <div className="flex bg-surface-deep rounded-[14px] p-1 gap-1">
              <button
                onClick={() => handleModeChange('friendly_possession')}
                disabled={!canEdit}
                className={cn(
                  "flex-1 py-2.5 rounded-[10px] text-sm font-black uppercase tracking-wide transition-colors",
                  mode === 'friendly_possession'
                    ? "bg-brand-blue text-white"
                    : "text-white/55 hover:text-white"
                )}
              >
                Classic
              </button>
              <button
                onClick={() => handleModeChange('friendly_party_quiz')}
                disabled={!canEdit}
                className={cn(
                  "flex-1 py-2.5 rounded-[10px] text-sm font-black uppercase tracking-wide transition-colors",
                  mode === 'friendly_party_quiz'
                    ? "bg-brand-blue text-white"
                    : "text-white/55 hover:text-white"
                )}
              >
                Party Quiz
              </button>
              <button
                onClick={() => handleModeChange('ranked_sim')}
                disabled={!canEdit}
                className={cn(
                  "flex-1 py-2.5 rounded-[10px] text-sm font-black uppercase tracking-wide transition-colors",
                  mode === 'ranked_sim'
                    ? "bg-brand-blue text-white"
                    : "text-white/55 hover:text-white"
                )}
              >
                Ranked Sim
              </button>
            </div>
          )}
          <p className="text-xs font-bold text-brand-slate">
            {isPartyLocked
              ? "Party quiz keeps the same question pacing, but swaps the pitch for a live leaderboard."
              : mode === 'friendly_possession'
                ? "Play for fun. Pick categories or go random. No RP at stake."
                : mode === 'friendly_party_quiz'
                  ? "Use the shared-question party quiz flow in a 1v1 or bigger lobby. No RP at stake."
                : "Simulate a Competitive match. Ban/Pick phase enabled."}
          </p>
        </div>

        {/* Lobby Visibility */}
        <div className="space-y-3">
          <span className="text-[10px] font-black text-brand-slate uppercase tracking-wider">Lobby Visibility</span>
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
                <div className="text-sm font-black text-white">{isPublic ? 'Public' : 'Private'}</div>
                <div className="text-[10px] font-bold text-brand-slate">
                  {isPublic
                    ? 'Anyone can find & join this lobby'
                    : 'Only players with the code can join'}
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
          <div className="space-y-3">
            <span className="text-[10px] font-black text-brand-slate uppercase tracking-wider">Categories</span>
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
                  <div className="text-sm font-black text-white">Random Categories</div>
                  <div className="text-[10px] font-bold text-brand-slate">
                    {isRandom ? 'Categories picked randomly each game' : 'Choose your own categories below'}
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
                <p className="text-[10px] font-bold text-brand-slate">
                  {mode === 'friendly_party_quiz'
                    ? 'Pick the category pool for the party quiz. Questions stay shared across the full lobby.'
                    : 'Pick one category for the first half. The second half category is chosen at halftime.'}
                </p>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/45" />
                  <input
                    type="text"
                    placeholder="SEARCH CATEGORY..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="h-11 w-full rounded-[14px] border-2 border-brand-blue bg-transparent pl-10 pr-3 text-sm uppercase text-white outline-none placeholder:text-white/40 placeholder:tracking-[0.06em] focus:outline-none"
                    style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, letterSpacing: '0.04em' }}
                  />
                </div>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-[#243B44] scrollbar-track-transparent">
                  {filteredCategories.length === 0 ? (
                    <p className="py-6 text-center text-xs font-bold text-brand-slate uppercase tracking-wider">
                      No categories match &quot;{categorySearch}&quot;
                    </p>
                  ) : filteredCategories.map(cat => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        disabled={!canEdit || isRandom}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3.5 rounded-[14px] font-bold transition-colors border-2 bg-white/[0.04] hover:bg-white/[0.08]",
                          isSelected
                            ? "border-brand-green text-white"
                            : "border-brand-blue text-white/70 hover:text-white",
                          (!canEdit || isRandom) && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="size-9 overflow-hidden shrink-0 flex items-center justify-center">
                          {cat.imageUrl
                            ? <img src={cat.imageUrl} alt={cat.name} className="size-full object-contain" />
                            : <span className="text-xl">{cat.icon}</span>
                          }
                        </div>
                        <span className="flex-1 text-left text-sm truncate">{cat.name}</span>
                        {isSelected && <Check className="size-4 shrink-0 text-brand-green" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {isRandom && (
              <div className="p-5 rounded-[14px] flex flex-col items-center text-center gap-2">
                <Shuffle className="size-8 text-brand-yellow opacity-80" />
                <p className="text-sm font-bold text-brand-slate">Categories will be selected randomly.</p>
              </div>
            )}
          </div>
        )}

        {/* Ranked Sim Info */}
        {mode === 'ranked_sim' && (
          <div className="p-5 rounded-xl bg-brand-orange/10 border-b-[3px] border-brand-orange/20 flex flex-col items-center text-center gap-2">
            <div className="size-14 rounded-full bg-brand-orange border-4 border-b-[6px] border-[#DB8200] flex items-center justify-center">
              <Trophy className="size-7 text-white" strokeWidth={2.5} />
            </div>
            <h4 className="text-base font-black text-brand-orange">Ranked Simulation</h4>
            <p className="text-xs font-bold text-brand-slate max-w-xs">
              This match follows standard ranked rules. You will enter a Ban/Pick phase before the game starts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
