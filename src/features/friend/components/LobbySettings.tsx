import { cn } from "@/lib/utils";
import { CategorySummary } from "@/lib/domain";
import type { LobbyGameMode, LobbySettings as LobbySettingsState, LobbyState } from "@/lib/realtime/socket.types";
import { Check, Eye, EyeOff, Lock, Shuffle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

interface LobbySettingsProps {
  isHost: boolean;
  lobby: LobbyState | null;
  categories: CategorySummary[];
  onUpdateSettings: (settings: Partial<LobbySettingsState>) => void;
  onToggleVisibility: () => void;
}

export function LobbySettings({ isHost, lobby, categories, onUpdateSettings, onToggleVisibility }: LobbySettingsProps) {
  const settings = lobby?.settings;
  const mode = settings?.gameMode ?? 'friendly';
  const isPublic = lobby?.isPublic ?? false;
  const isRandom = settings?.friendlyRandom ?? true;
  const serverSelectedCategoryIds = useMemo(
    () =>
      [settings?.friendlyCategoryAId ?? null, settings?.friendlyCategoryBId ?? null].filter(
        (id): id is string => Boolean(id)
      ),
    [settings?.friendlyCategoryAId, settings?.friendlyCategoryBId]
  );
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(serverSelectedCategoryIds);
  const canEdit = Boolean(isHost && lobby?.status === "waiting" && !lobby?.members.every((m) => m.isReady));

  useEffect(() => {
    if (isRandom || mode !== "friendly") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCategoryIds([]);
      return;
    }
    setSelectedCategoryIds(serverSelectedCategoryIds);
  }, [isRandom, mode, serverSelectedCategoryIds]);

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

      if (next.length === 2) {
        onUpdateSettings({
          friendlyCategoryAId: next[0],
          friendlyCategoryBId: next[1],
        });
      }

      return next;
    });
  };

  const toggleRandom = () => {
    if (!canEdit) return;
    const newRandom = !isRandom;
    if (!newRandom) {
      if (selectedCategoryIds.length < 2) {
        const fallback = categories.slice(0, 2).map((cat) => cat.id);
        if (fallback.length < 2) {
          toast.error("Not enough categories to disable random");
          return;
        }
        setSelectedCategoryIds(fallback);
        onUpdateSettings({
          friendlyRandom: false,
          friendlyCategoryAId: fallback[0],
          friendlyCategoryBId: fallback[1],
        });
        toast.info("Random disabled. Default categories selected.");
        return;
      }
      onUpdateSettings({
        friendlyRandom: false,
        friendlyCategoryAId: selectedCategoryIds[0],
        friendlyCategoryBId: selectedCategoryIds[1],
      });
      return;
    }
    onUpdateSettings({ friendlyRandom: true });
  };

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
            onClick={onToggleVisibility}
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
                  {isPublic ? 'Anyone can find & join this lobby' : 'Only players with the code can join'}
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
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#56707A] uppercase tracking-wider">Categories</span>
              <button
                onClick={toggleRandom}
                disabled={!canEdit}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border-b-2 transition-all",
                  isRandom
                    ? "bg-[#CE82FF] border-[#B066E0] text-white"
                    : "bg-[#243B44] border-[#1B2F36] text-[#56707A] hover:text-white"
                )}
              >
                <Shuffle className="size-3" />
                Random
              </button>
            </div>

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
