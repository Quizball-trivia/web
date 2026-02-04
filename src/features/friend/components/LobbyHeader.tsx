import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DEFAULT_AVATAR_PRIMARY, DEFAULT_AVATAR_SECONDARY } from "@/lib/avatars";
import type { LobbyMember } from "@/lib/realtime/socket.types";
import type { HeadToHeadSummary } from "@/lib/domain";
import { copyToClipboard } from "@/utils/clipboard";
import { Copy, Users } from "lucide-react";
import { toast } from "sonner";

interface LobbyHeaderProps {
  lobbyCode: string | null;
  me?: LobbyMember;
  opponent?: LobbyMember;
  h2hSummary: HeadToHeadSummary | null;
}

export function LobbyHeader({ lobbyCode, me, opponent, h2hSummary }: LobbyHeaderProps) {
  const copyCode = async () => {
    if (!lobbyCode) return;
    const success = await copyToClipboard(lobbyCode);
    if (success) toast.success("Room Code copied!");
  };

  const getH2HText = () => {
    if (!opponent || !h2hSummary) return null;
    return (
       <div className="flex flex-col items-center">
          <Badge variant="outline" className="bg-background/50 backdrop-blur border-primary/20 text-xs font-mono mb-1">
             H2H: You <span className="text-green-500 font-bold mx-1">{h2hSummary.winsA}</span> - <span className="text-red-500 font-bold mx-1">{h2hSummary.winsB}</span> Opponent
          </Badge>
          <span className="text-[10px] text-muted-foreground">
             {h2hSummary.total} games • last played {h2hSummary.lastPlayedAt ? new Date(h2hSummary.lastPlayedAt).toLocaleDateString() : 'never'}
          </span>
       </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-card border border-border rounded-xl p-4 shadow-sm relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

      {/* Left: Code & Title */}
      <div className="flex items-center gap-4 z-10">
        <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Users className="size-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Friendly Lobby</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Code:
            <span className="font-mono font-bold text-foreground bg-muted px-2 py-0.5 rounded select-all">
              {lobbyCode || "..."}
            </span>
            <button
              onClick={copyCode}
              aria-label="Copy lobby code"
              className="hover:text-primary transition-colors"
              disabled={!lobbyCode}
            >
              <Copy className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Center: H2H Chip (Mobile: Stacked below, Desktop: Centered) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block z-10">
         {getH2HText() || (opponent && <span className="text-xs text-muted-foreground">No match history</span>)}
      </div>

      {/* Right: Avatars */}
      <div className="flex items-center gap-6 flex-1 justify-center md:justify-end z-10">
        {/* H2H Mobile */}
        <div className="md:hidden w-full text-center mb-2">
           {getH2HText() || (opponent && <span className="text-xs text-muted-foreground">No match history</span>)}
        </div>

        {/* You */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative group">
            <AvatarDisplay
              customization={{ base: me?.avatarUrl ?? DEFAULT_AVATAR_PRIMARY }}
              size="md"
              className={cn(
                "rounded-full transition-all duration-300", 
                me?.isReady ? "ring-2 ring-green-500 ring-offset-2 ring-offset-background" : "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            />
            {me?.isHost && (
              <Badge className="absolute -top-1 -right-1 text-[10px] px-1 h-4 rounded-full shadow-sm bg-primary text-black">HOST</Badge>
            )}
          </div>
          <div className="flex flex-col items-center">
             <span className="text-xs font-bold text-primary flex items-center gap-1">
                {me?.username || 'You'} <span className="opacity-70 font-normal text-[10px]">(You)</span>
             </span>
             {me?.isReady && <span className="text-[10px] text-green-500 font-bold">Ready</span>}
          </div>
        </div>

        {/* VS */}
        <div className="text-lg font-black text-muted-foreground/30 italic">VS</div>

        {/* Opponent */}
        <div className={cn("flex flex-col items-center gap-2", !opponent && "opacity-50")}>
          <div className="relative group">
             {opponent ? (
                 <AvatarDisplay
                  customization={{ base: opponent.avatarUrl ?? DEFAULT_AVATAR_SECONDARY }}
                  size="md"
                  className={cn(
                    "rounded-full transition-all duration-300", 
                    opponent.isReady ? "ring-2 ring-green-500 ring-offset-2 ring-offset-background" : "ring-2 ring-red-500 ring-offset-2 ring-offset-background"
                  )}
                />
             ) : (
                <div className="size-10 rounded-full bg-muted border-2 border-dashed border-muted-foreground flex items-center justify-center">
                   <Users className="size-4 text-muted-foreground" />
                </div>
             )}
          </div>
          <div className="flex flex-col items-center">
             <span className="text-xs font-medium flex items-center gap-1">
                {opponent?.username || 'Waiting...'} 
             </span>
             {opponent?.isReady && <span className="text-[10px] text-green-500 font-bold">Ready</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
