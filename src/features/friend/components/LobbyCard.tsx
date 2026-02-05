import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PublicLobby } from "@/lib/domain/lobby";
import { ArrowRight, Trophy, Users } from "lucide-react";

interface LobbyCardProps {
  lobby: PublicLobby;
  onJoin: (inviteCode: string) => void;
  isJoining?: boolean;
}

export function LobbyCard({ lobby, onJoin, isJoining }: LobbyCardProps) {
  const isFull = lobby.memberCount >= lobby.maxMembers;
  
  return (
    <Card className="group relative overflow-hidden border-border transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center gap-4 p-4">
        {/* Host Avatar */}
        <div className="relative shrink-0">
          <Avatar className="size-12 border-2 border-border group-hover:border-primary/50 transition-colors">
            <AvatarImage src={lobby.host.avatarUrl} alt={lobby.host.username} />
            <AvatarFallback>{lobby.host.username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
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
              <span className={cn("flex items-center gap-1 text-xs", isFull ? "text-red-500" : "text-green-500")}>
                <div className={cn("size-1.5 rounded-full", isFull ? "bg-red-500" : "bg-green-500 animate-pulse")} />
                {lobby.memberCount}/{lobby.maxMembers}
              </span>
           </div>
        </div>

        {/* Action */}
        <Button 
           size="sm" 
           variant={isFull ? "outline" : "default"}
           className={cn("transition-all gap-2", !isFull && "hover:bg-primary/90")}
           disabled={isFull || isJoining}
           onClick={() => onJoin(lobby.inviteCode)}
        >
           {isFull ? (
             "Full"
           ) : (
             <>
               Join <ArrowRight className="size-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
             </>
           )}
        </Button>
      </div>
    </Card>
  );
}
