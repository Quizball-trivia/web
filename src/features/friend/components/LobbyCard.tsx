import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PublicLobby } from "@/lib/domain/lobby";
import { ArrowRight, Trophy, Users } from "lucide-react";
import { AvatarDisplay } from "@/components/AvatarDisplay";

interface LobbyCardProps {
  lobby: PublicLobby;
  onJoin: (inviteCode: string) => void;
  isJoining?: boolean;
}

export function LobbyCard({ lobby, onJoin, isJoining }: LobbyCardProps) {
  const isFull = lobby.memberCount >= lobby.maxMembers;
  
  return (
    <Card className="group relative overflow-hidden border-2 border-brand-green bg-transparent transition-all hover:bg-brand-green/5">
      <div className="flex items-center gap-4 p-4">
        {/* Host Avatar */}
        <div className="relative shrink-0">
          <AvatarDisplay
            customization={lobby.host.avatarCustomization ?? { base: lobby.host.avatarUrl }}
            size="sm"
          />
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background border border-border shadow-sm">
            <Users className="size-3 text-muted-foreground" />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2 mb-1">
             <span className="font-bold truncate text-base">{lobby.displayName}</span>
             {lobby.gameMode === 'ranked_sim' && (
                <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] gap-1 bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                   <Trophy className="size-3" /> Ranked
                </Badge>
             )}
           </div>

           <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-xs">
                {lobby.inviteCode}
              </span>
              <span className={cn("flex items-center gap-1 text-xs", isFull ? "text-brand-red-soft" : "text-brand-green")}>
                <div className={cn("size-1.5 rounded-full", isFull ? "bg-brand-red-soft" : "bg-brand-green animate-pulse")} />
                {lobby.memberCount}/{lobby.maxMembers}
              </span>
           </div>
        </div>

        {/* Action */}
        <Button
           size="sm"
           className={cn(
             "transition-all gap-2",
             isFull
               ? "bg-transparent border-2 border-white/15 text-white/50"
               : "bg-brand-green text-white hover:bg-brand-green-deep"
           )}
           disabled={isFull || isJoining}
           onClick={() => onJoin(lobby.inviteCode)}
        >
           {isFull ? (
             "Full"
           ) : (
             <>
               Join <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
             </>
           )}
        </Button>
      </div>
    </Card>
  );
}
