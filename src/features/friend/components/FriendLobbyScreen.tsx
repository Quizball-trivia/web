"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LobbyHeader } from "./LobbyHeader";
import { LobbySettings } from "./LobbySettings";
import { useFriendLobbyLogic } from "../hooks/useFriendLobbyLogic";

interface FriendLobbyScreenProps {
  roomCode: string;
  isHost: boolean;
}

export function FriendLobbyScreen({ roomCode, isHost }: FriendLobbyScreenProps) {
  const {
     lobby,
     lobbyCode,
     me,
     opponent,
     h2hSummary,
     allCategories,
     actions
  } = useFriendLobbyLogic({ roomCode, isHost });

  const settings = lobby?.settings;
  const bothReady = Boolean(me?.isReady && opponent?.isReady);
  const hasFriendlyCategories =
    settings?.friendlyRandom ||
    (settings?.friendlyCategoryAId &&
      settings?.friendlyCategoryBId &&
      settings?.friendlyCategoryAId !== settings?.friendlyCategoryBId);
  const readyCopy =
    settings?.gameMode === "friendly"
      ? "When both players are ready, the host can start the match."
      : "When both players are ready, the match will begin.";
  const canStartMatch =
    Boolean(
      isHost &&
        bothReady &&
        lobby?.status === "waiting" &&
        settings?.gameMode === "friendly" &&
        hasFriendlyCategories
    );

  return (
    <div className="container mx-auto max-w-5xl py-6 animate-in fade-in space-y-6">
      
      {/* Header with H2H */}
      <LobbyHeader 
         lobbyCode={lobbyCode} 
         me={me} 
         opponent={opponent} 
         h2hSummary={h2hSummary} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Settings Panel (Host Controls) */}
         <div className="lg:col-span-2 space-y-6">
            <LobbySettings 
               isHost={isHost}
               lobby={lobby}
               categories={allCategories}
               onUpdateSettings={actions.handleUpdateSettings}
            />
         </div>

         {/* Ready / Status Panel */}
         <div className="space-y-6">
            <Card className="border-border/60 sticky top-4">
               <CardHeader className="py-4 px-4 border-b border-border">
                  <CardTitle>Ready Check</CardTitle>
               </CardHeader>
               <CardContent className="p-4 space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {readyCopy}
                  </div>
                  <Button
                  size="lg"
                  className={cn(
                     "w-full h-14 text-lg font-bold transition-all",
                     me?.isReady
                        ? "bg-muted/50 text-muted-foreground hover:bg-muted hover:-translate-y-0.5"
                        : "shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
                  )}
                  onClick={actions.handleReadyToggle}
                  disabled={!lobby}
                  >
                  {me?.isReady ? (
                     <>
                        <CheckCircle2 className="size-5 mr-2" /> Ready (Click to unready)
                     </>
                  ) : (
                     "Mark Ready"
                  )}
                  </Button>
                  {settings?.gameMode === "friendly" && (
                    <Button
                      size="lg"
                      variant={canStartMatch ? "default" : "secondary"}
                      className={cn(
                        "w-full h-12 text-sm font-semibold transition-all",
                        canStartMatch
                          ? "shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
                          : "cursor-not-allowed opacity-70"
                      )}
                      onClick={actions.handleStartMatch}
                      disabled={!canStartMatch}
                    >
                      Start Match
                    </Button>
                  )}
                  <p className="text-xs text-center text-muted-foreground bg-muted/50 p-2 rounded">
                    {bothReady ? "Both players ready!" : opponent ? "Waiting for both players to ready up..." : "Waiting for opponent..."}
                  </p>
               </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
}
