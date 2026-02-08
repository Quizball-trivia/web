import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Check, Eye, EyeOff, Lock, Shuffle, Trophy } from "lucide-react";
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
  const mode = settings?.gameMode ?? 'friendly';
  const serverIsPublic = lobby?.isPublic ?? false;
  const serverIsRandom = settings?.friendlyRandom ?? true;

  // --- Optimistic local state for instant toggle feedback ---
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

  const isPublic = optimisticPublic ?? serverIsPublic;
  const isRandom = optimisticRandom ?? serverIsRandom;

  // --- Category state ---
  const serverSelectedCategoryIds = useMemo(
    () =>
      [settings?.friendlyCategoryAId ?? null, settings?.friendlyCategoryBId ?? null].filter(
        (id): id is string => Boolean(id)
      ),
    [settings?.friendlyCategoryAId, settings?.friendlyCategoryBId]
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(serverSelectedCategoryIds);
  const lastSentCategoryPairRef = useRef<string | null>(null);
  const canEdit = Boolean(isHost && lobby?.status === "waiting" && !lobby?.members.every((m) => m.isReady));
  const lastLobbyIdRef = useRef<string | null>(null);

  const clearInFlightTimeout = useCallback(() => {
    if (!inFlightTimeoutRef.current) return;
    clearTimeout(inFlightTimeoutRef.current);
    inFlightTimeoutRef.current = null;
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
      (inFlight.gameMode === undefined || inFlight.gameMode === mode) &&
      (inFlight.friendlyRandom === undefined || inFlight.friendlyRandom === serverIsRandom) &&
      (inFlight.friendlyCategoryAId === undefined ||
        inFlight.friendlyCategoryAId === (settings?.friendlyCategoryAId ?? null)) &&
      (inFlight.friendlyCategoryBId === undefined ||
        inFlight.friendlyCategoryBId === (settings?.friendlyCategoryBId ?? null));

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
    mode,
    serverIsPublic,
    serverIsRandom,
    settings?.friendlyCategoryAId,
    settings?.friendlyCategoryBId,
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
    lastSentCategoryPairRef.current = null;

    const resetTimer = setTimeout(() => {
      setOptimisticPublic(null);
      setOptimisticRandom(null);
      setSelectedCategoryIds(serverSelectedCategoryIds);
    }, 0);

    return () => clearTimeout(resetTimer);
  }, [clearFlushTimer, clearInFlightTimeout, lobby?.lobbyId, serverSelectedCategoryIds]);

  // Sync server categories → local (only when server confirms random is off)
  useEffect(() => {
    if (serverIsRandom || mode !== "friendly") {
      // Don't clear selectedCategoryIds — they're hidden behind {!isRandom && ...}
      // and preserving them prevents a 1-frame gray flash when toggling random back off.
      lastSentCategoryPairRef.current = null;
      return;
    }
    const syncTimer = setTimeout(() => {
      setSelectedCategoryIds(serverSelectedCategoryIds);
    }, 0);
    if (serverSelectedCategoryIds.length === 2) {
      lastSentCategoryPairRef.current = `${serverSelectedCategoryIds[0]}|${serverSelectedCategoryIds[1]}`;
    } else {
      lastSentCategoryPairRef.current = null;
    }
    return () => clearTimeout(syncTimer);
  }, [mode, serverIsRandom, serverSelectedCategoryIds]);

  // Auto-emit category pair changes via the same coalesced queue.
  useEffect(() => {
    if (!canEdit || serverIsRandom || mode !== "friendly") return;
    if (selectedCategoryIds.length !== 2) return;

    const selectedPairKey = `${selectedCategoryIds[0]}|${selectedCategoryIds[1]}`;
    const serverPairKey =
      serverSelectedCategoryIds.length === 2
        ? `${serverSelectedCategoryIds[0]}|${serverSelectedCategoryIds[1]}`
        : null;

    if (selectedPairKey === serverPairKey) {
      lastSentCategoryPairRef.current = selectedPairKey;
      return;
    }

    if (lastSentCategoryPairRef.current === selectedPairKey) {
      return;
    }

    lastSentCategoryPairRef.current = selectedPairKey;
    queueChange({
      friendlyCategoryAId: selectedCategoryIds[0],
      friendlyCategoryBId: selectedCategoryIds[1],
    });
  }, [canEdit, serverIsRandom, mode, queueChange, selectedCategoryIds, serverSelectedCategoryIds]);

  useEffect(() => {
    if (!settingsErrorVersion) return;

    clearFlushTimer();
    clearInFlightTimeout();
    pendingChangesRef.current = {};
    inFlightChangesRef.current = null;
    lastSentCategoryPairRef.current = null;

    const rollbackTimer = setTimeout(() => {
      setOptimisticPublic(null);
      setOptimisticRandom(null);
      if (!serverIsRandom && mode === "friendly") {
        setSelectedCategoryIds(serverSelectedCategoryIds);
      }
    }, 0);

    return () => clearTimeout(rollbackTimer);
  }, [clearFlushTimer, clearInFlightTimeout, mode, serverIsRandom, serverSelectedCategoryIds, settingsErrorVersion]);

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
    onUpdateSettings({ gameMode: newMode });
  };

  const toggleCategory = (catId: string) => {
    if (!canEdit || isRandom) return;
    setSelectedCategoryIds((current) => {
      let next: string[];
      if (current.includes(catId)) {
        next = current.filter((id) => id !== catId);
      } else if (current.length < 2) {
        next = [...current, catId];
      } else {
        next = [current[1], catId];
      }
      return next;
    });
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
      clearPendingKeys(["friendlyRandom", "friendlyCategoryAId", "friendlyCategoryBId"]);
      if (nextRandom === serverIsRandom) {
        setOptimisticRandom(null);
      }
      return;
    }

    if (nextRandom) {
      queueChange({ friendlyRandom: true });
    } else {
      // Turning random off — include categories
      let cats = selectedCategoryIds;
      if (cats.length < 2) {
        const fallback = categories.slice(0, 2).map((cat) => cat.id);
        if (fallback.length < 2) {
          toast.error("Not enough categories to disable random");
          setOptimisticRandom(null); // revert
          return;
        }
        cats = fallback;
        setSelectedCategoryIds(fallback);
        toast.info("Random disabled. Default categories selected.");
      }
      queueChange({
        friendlyRandom: false,
        friendlyCategoryAId: cats[0],
        friendlyCategoryBId: cats[1],
      });
    }
  };

  // --- Render ---
  return (
    <div className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] font-fun">
      {/* Header */}
      <div className="px-5 py-4 border-b-[3px] border-[#0D1B21] flex items-center justify-between">
        <h2 className="text-lg font-black text-white">Game Setup</h2>
        {!isHost && (
          <span className="flex items-center gap-1.5 text-[10px] font-black text-[#56707A] bg-[#243B44] px-2.5 py-1 rounded-full border-b-2 border-[#1B2F36] uppercase">
            <Lock className="size-3" /> Host Only
          </span>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* Mode Selector */}
        <div className="space-y-3">
          <span className="text-[10px] font-black text-[#56707A] uppercase tracking-wider">Match Mode</span>
          <div className="flex bg-[#131F24] rounded-xl border-b-[3px] border-[#0D1B21] p-1">
            <button
              onClick={() => handleModeChange('friendly')}
              disabled={!canEdit}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-wide transition-all",
                mode === 'friendly'
                  ? "bg-[#1CB0F6] text-white border-b-[3px] border-[#1899D6]"
                  : "text-[#56707A] hover:text-white"
              )}
            >
              Friendly
            </button>
            <button
              onClick={() => handleModeChange('ranked_sim')}
              disabled={!canEdit}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-black uppercase tracking-wide transition-all",
                mode === 'ranked_sim'
                  ? "bg-[#FF9600] text-white border-b-[3px] border-[#DB8200]"
                  : "text-[#56707A] hover:text-white"
              )}
            >
              Ranked Sim
            </button>
          </div>
          <p className="text-xs font-bold text-[#56707A]">
            {mode === 'friendly'
              ? "Play for fun. Pick categories or go random. No RP at stake."
              : "Simulate a Competitive match. Ban/Pick phase enabled."}
          </p>
        </div>

        {/* Lobby Visibility */}
        <div className="space-y-3">
          <span className="text-[10px] font-black text-[#56707A] uppercase tracking-wider">Lobby Visibility</span>
          <button
            onClick={handleVisibilityClick}
            disabled={!canEdit}
            className={cn(
              "w-full flex items-center justify-between p-3.5 rounded-xl border-b-[3px] transition-all",
              isPublic
                ? "bg-[#58CC02]/15 border-[#58CC02]/40"
                : "bg-[#131F24] border-[#0D1B21]",
              !canEdit && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "size-9 rounded-lg flex items-center justify-center border-b-2",
                isPublic
                  ? "bg-[#58CC02] border-[#46A302]"
                  : "bg-[#243B44] border-[#1B2F36]"
              )}>
                {isPublic ? <Eye className="size-4 text-white" /> : <EyeOff className="size-4 text-[#56707A]" />}
              </div>
              <div className="text-left">
                <div className="text-sm font-black text-white">{isPublic ? 'Public' : 'Private'}</div>
                <div className="text-[10px] font-bold text-[#56707A]">
                  {isPublic
                    ? 'Anyone can find & join this lobby'
                    : 'Only players with the code can join'}
                </div>
              </div>
            </div>
            <div className={cn(
              "w-10 h-6 rounded-full border-b-2 transition-all relative",
              isPublic
                ? "bg-[#58CC02] border-[#46A302]"
                : "bg-[#243B44] border-[#1B2F36]"
            )}>
              <div className={cn(
                "absolute top-0.5 size-5 rounded-full bg-white transition-all shadow-sm",
                isPublic ? "left-[18px]" : "left-0.5"
              )} />
            </div>
          </button>
        </div>

        {/* Categories (Friendly Only) */}
        {mode === 'friendly' && (
          <div className="space-y-3">
            <span className="text-[10px] font-black text-[#56707A] uppercase tracking-wider">Categories</span>
            <button
              onClick={handleRandomToggle}
              disabled={!canEdit}
              className={cn(
                "w-full flex items-center justify-between p-3.5 rounded-xl border-b-[3px] transition-all",
                isRandom
                  ? "bg-[#CE82FF]/15 border-[#CE82FF]/40"
                  : "bg-[#131F24] border-[#0D1B21]",
                !canEdit && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "size-9 rounded-lg flex items-center justify-center border-b-2",
                  isRandom
                    ? "bg-[#CE82FF] border-[#B066E0]"
                    : "bg-[#243B44] border-[#1B2F36]"
                )}>
                  <Shuffle className={cn("size-4", isRandom ? "text-white" : "text-[#56707A]")} />
                </div>
                <div className="text-left">
                  <div className="text-sm font-black text-white">Random Categories</div>
                  <div className="text-[10px] font-bold text-[#56707A]">
                    {isRandom ? 'Categories picked randomly each game' : 'Choose your own categories below'}
                  </div>
                </div>
              </div>
              <div className={cn(
                "w-10 h-6 rounded-full border-b-2 transition-all relative",
                isRandom
                  ? "bg-[#CE82FF] border-[#B066E0]"
                  : "bg-[#243B44] border-[#1B2F36]"
              )}>
                <div className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white transition-all shadow-sm",
                  isRandom ? "left-[18px]" : "left-0.5"
                )} />
              </div>
            </button>

            {!isRandom && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map(cat => {
                  const isSelected = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      disabled={!canEdit || isRandom}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-xl text-sm font-bold transition-all border-b-[3px]",
                        isSelected
                          ? "bg-[#58CC02]/15 border-[#58CC02] text-white"
                          : "bg-[#131F24] border-[#0D1B21] text-[#56707A] hover:text-white hover:bg-[#1B2F36]",
                        (!canEdit || isRandom) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {cat.icon && <span className="text-base">{cat.icon}</span>}
                      <span className="truncate">{cat.name}</span>
                      {isSelected && <Check className="size-3.5 ml-auto text-[#58CC02]" />}
                    </button>
                  );
                })}
              </div>
            )}

            {isRandom && (
              <div className="p-5 rounded-xl bg-[#131F24] border-2 border-dashed border-[#243B44] flex flex-col items-center text-center gap-2">
                <Shuffle className="size-8 text-[#CE82FF] opacity-60" />
                <p className="text-sm font-bold text-[#56707A]">Categories will be selected randomly.</p>
              </div>
            )}
          </div>
        )}

        {/* Ranked Sim Info */}
        {mode === 'ranked_sim' && (
          <div className="p-5 rounded-xl bg-[#FF9600]/10 border-b-[3px] border-[#FF9600]/20 flex flex-col items-center text-center gap-2">
            <div className="size-14 rounded-full bg-[#FF9600] border-4 border-b-[6px] border-[#DB8200] flex items-center justify-center">
              <Trophy className="size-7 text-white" strokeWidth={2.5} />
            </div>
            <h4 className="text-base font-black text-[#FF9600]">Ranked Simulation</h4>
            <p className="text-xs font-bold text-[#56707A] max-w-xs">
              This match follows standard ranked rules. You will enter a Ban/Pick phase before the game starts.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
