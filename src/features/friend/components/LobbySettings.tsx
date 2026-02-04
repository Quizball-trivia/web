import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CategorySummary } from "@/lib/domain";
import type { LobbyGameMode, LobbySettings as LobbySettingsState, LobbyState } from "@/lib/realtime/socket.types";
import { Check, Lock, Shuffle, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

interface LobbySettingsProps {
  isHost: boolean;
  lobby: LobbyState | null;
  categories: CategorySummary[];
  onUpdateSettings: (settings: Partial<LobbySettingsState>) => void;
}

export function LobbySettings({ isHost, lobby, categories, onUpdateSettings }: LobbySettingsProps) {
  const settings = lobby?.settings;
  const mode = settings?.gameMode ?? 'friendly';
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
    // Sync server category selection to local state - controlled component pattern
    if (isRandom || mode !== "friendly") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCategoryIds([]);
      return;
    }
    setSelectedCategoryIds(serverSelectedCategoryIds);
  }, [isRandom, mode, serverSelectedCategoryIds]);

  const handleModeChange = (newMode: string) => {
    if (!canEdit) return;
    onUpdateSettings({ gameMode: newMode as LobbyGameMode });
  };

  const toggleCategory = (catId: string) => {
    if (!canEdit || isRandom) return;
    setSelectedCategoryIds((current) => {
      let next: string[];
      if (current.includes(catId)) {
        // Allow deselect to make room for a different choice.
        next = current.filter((id) => id !== catId);
      } else if (current.length < 2) {
        next = [...current, catId];
      } else {
        // Replace the oldest selection with the newly chosen category.
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

  const toggleRandom = (checked: boolean) => {
    if (!canEdit) return;
    if (!checked) {
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
    <Card className="border-border/60">
      <CardHeader className="py-4 px-4 border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Game Setup</CardTitle>
        {!isHost && (
           <Badge variant="secondary" className="gap-1">
              <Lock className="size-3" /> Host Only
           </Badge>
        )}
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {/* Mode Selector */}
        <div className="space-y-3">
           <Label>Match Mode</Label>
           <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                 <TabsTrigger value="friendly" disabled={!canEdit}>Friendly</TabsTrigger>
                 <TabsTrigger value="ranked_sim" disabled={!canEdit}>Ranked Sim</TabsTrigger>
              </TabsList>
              <TabsContent value="friendly" className="text-xs text-muted-foreground mt-2">
                 Play for fun. Pick categories or go random. No RP at stake.
              </TabsContent>
              <TabsContent value="ranked_sim" className="text-xs text-muted-foreground mt-2">
                 Simulate a Competitive match. Ban/Pick phase enabled. Questions from all categories.
              </TabsContent>
           </Tabs>
        </div>

        {/* Categories (Friendly Only) */}
        {mode === 'friendly' && (
           <div className="space-y-3">
              <div className="flex items-center justify-between">
                 <Label>Categories</Label>
                 <div className="flex items-center gap-2">
                    <Label htmlFor="random-mode" className="text-xs text-muted-foreground cursor-pointer">Random</Label>
                    <Switch 
                       id="random-mode" 
                       checked={isRandom} 
                       onCheckedChange={toggleRandom}
                       disabled={!canEdit}
                    />
                 </div>
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
                                "flex items-center gap-2 p-2 rounded-lg border text-sm transition-all",
                                isSelected 
                                   ? "bg-primary/10 border-primary text-primary" 
                                   : "bg-muted/50 border-transparent hover:bg-muted text-muted-foreground",
                                (!canEdit || isRandom) && "opacity-70 cursor-not-allowed"
                             )}
                          >
                             {cat.icon && <span className="text-base">{cat.icon}</span>}
                             <span className="truncate">{cat.name}</span>
                             {isSelected && <Check className="size-3 ml-auto" />}
                          </button>
                       );
                    })}
                 </div>
              )}

              {isRandom && (
                 <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-border flex flex-col items-center text-center gap-2 text-muted-foreground">
                    <Shuffle className="size-8 opacity-50" />
                    <p className="text-sm">Categories will be selected randomly.</p>
                 </div>
              )}
           </div>
        )}

        {/* Ranked Info */}
        {mode === 'ranked_sim' && (
           <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex flex-col items-center text-center gap-2">
              <Trophy className="size-8 text-yellow-500" />
              <div className="space-y-1">
                 <h4 className="font-bold text-yellow-500">Ranked Simulation</h4>
                 <p className="text-xs text-muted-foreground">
                    This match follows standard ranked rules. You will enter a Ban/Pick phase before the game starts.
                 </p>
              </div>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
