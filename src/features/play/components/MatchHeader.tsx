import { AvatarDisplay } from "@/components/AvatarDisplay";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/utils";
import { Clock, Shield, Sword } from "lucide-react";

export type DraftPhase = 'ban' | 'pick' | 'ready';

interface PlayerInfo {
  username: string;
  avatar: string;
  rp: number;
}

interface MatchHeaderProps {
  player: PlayerInfo;
  opponent: PlayerInfo;
  phase: DraftPhase;
  timeLeft: number;
  currentActor: 'player' | 'opponent';
}

export function MatchHeader({ player, opponent, phase, timeLeft, currentActor }: MatchHeaderProps) {
  return (
    <div className="w-full bg-card/80 backdrop-blur-md border-b border-primary/20 relative overflow-hidden">
       {/* Background Glow */}
       <div className={cn(
          "absolute top-0 w-1/2 h-full opacity-20 transition-all duration-500 pointer-events-none",
          currentActor === 'player' ? "left-0 bg-blue-500/30" : "right-0 bg-red-500/30" // Simplified logic, usually we'd color code sides
       )} />

       <div className="container mx-auto max-w-5xl py-4 px-4 flex items-center justify-between relative z-10">
          
          {/* Player (Left) */}
          <div className={cn("flex items-center gap-4 transition-opacity", currentActor === 'opponent' && "opacity-60")}>
             <div className="relative">
                <AvatarDisplay customization={{ base: player.avatar as any }} size="lg" className="border-2 border-blue-500" />
                <div className="absolute -bottom-2 -right-2 bg-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded text-white border border-blue-400">
                   YOU
                </div>
             </div>
             <div className="hidden sm:block">
                <div className="font-bold text-lg leading-none">{player.username}</div>
                <div className="text-xs text-muted-foreground font-mono">{player.rp} RP</div>
             </div>
          </div>

          {/* Center Info */}
          <div className="flex flex-col items-center">
             {/* Timer */}
             <div className={cn(
                "text-4xl font-black tabular-nums transition-colors",
                timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-foreground"
             )}>
                {timeLeft}
             </div>

             {/* Phase Badge */}
             <div className="mt-1">
                {phase === 'ban' && (
                   <Badge variant="outline" className="border-red-500 text-red-500 bg-red-500/10 gap-1 uppercase tracking-widest">
                      <Shield className="size-3" /> Ban Phase
                   </Badge>
                )}
                {phase === 'pick' && (
                   <Badge variant="outline" className="border-green-500 text-green-500 bg-green-500/10 gap-1 uppercase tracking-widest">
                      <Sword className="size-3" /> Pick Phase
                   </Badge>
                )}
                {phase === 'ready' && (
                   <Badge className="bg-green-600 border-0 gap-1 uppercase tracking-widest">
                      Ready to Start
                   </Badge>
                )}
             </div>

             {/* Turn Indicator Text */}
             <div className="text-[10px] font-bold uppercase mt-1 text-muted-foreground">
                {currentActor === 'player' ? "Your Turn" : "Opponent's Turn"}
             </div>
          </div>

          {/* Opponent (Right) */}
          <div className={cn("flex items-center gap-4 flex-row-reverse text-right transition-opacity", currentActor === 'player' && "opacity-60")}>
             <div className="relative">
                {/* Fallback avatar if string provided */}
                <div className="size-12 rounded-full bg-muted border-2 border-red-500 flex items-center justify-center text-xl overflow-hidden">
                   {opponent.avatar.length > 20 ? ( // Assuming base64 or url vs simple emoji/id
                       <img src={opponent.avatar} alt="Opponent" className="w-full h-full object-cover" />
                   ) : (
                       <span>{opponent.avatar || "😈"}</span>
                   )}
                </div>
                <div className="absolute -bottom-2 -left-2 bg-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded text-white border border-red-400">
                   FOE
                </div>
             </div>
             <div className="hidden sm:block">
                <div className="font-bold text-lg leading-none">{opponent.username}</div>
                <div className="text-xs text-muted-foreground font-mono">{opponent.rp} RP</div>
             </div>
          </div>

       </div>
       
       {/* Timeline / Progress Bar */}
       <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
          <div className={cn(
             "h-full transition-all duration-1000",
             phase === 'ban' ? "w-1/3 bg-red-500" : 
             phase === 'pick' ? "w-2/3 bg-green-500" : 
             "w-full bg-blue-500 slate-pulse"
          )} />
       </div>
    </div>
  );
}
