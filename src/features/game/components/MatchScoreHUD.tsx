import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MatchScoreHUDProps {
  playerScore: number;
  opponentScore: number;
  playerAvatar: string;
  opponentAvatar: string;
  playerName: string;
  opponentName: string;
  timeRemaining: number;
  maxTime: number;
  roundCurrent: number;
  roundTotal: number;
  playerAnswered: boolean;
  opponentAnswered: boolean;
}

export function MatchScoreHUD({
  playerScore,
  opponentScore,
  playerName,
  opponentName,
  playerAvatar,
  opponentAvatar,
  timeRemaining,
  maxTime,
  roundCurrent,
  roundTotal,
  playerAnswered,
  opponentAnswered,
}: MatchScoreHUDProps) {
  const timerPercentage = (timeRemaining / maxTime) * 100;
  const isUrgent = timeRemaining <= 3;

  return (
    <div className="w-full max-w-4xl mx-auto mb-6">
      <div className="flex items-center justify-between gap-4">
        
        {/* Player Side */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="text-right hidden sm:block">
             <div className="font-bold text-sm tracking-tight">{playerName}</div>
             <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center justify-end gap-1">
               {playerAnswered && <span className="text-primary animate-pulse">● Answered</span>}
             </div>
          </div>
          <Avatar className={cn(
             "border-2 size-12 shadow-lg transition-all duration-300",
             playerAnswered ? "border-primary ring-2 ring-primary/30" : "border-border"
          )}>
            <AvatarImage src={playerAvatar} />
            <AvatarFallback>{playerName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>

        {/* Center Scoreboard */}
        <div className="relative flex flex-col items-center shrink-0 w-32">
           
           {/* Round Indicator */}
           <div className="absolute -top-6 text-[10px] font-bold text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full backdrop-blur-sm border">
              ROUND {roundCurrent} / {roundTotal}
           </div>

           {/* Score Box */}
           <div className="relative z-10 flex items-center justify-center gap-4 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 px-6 py-2 shadow-2xl">
              <KeyframeScore score={playerScore} side="left" />
              <div className="h-6 w-px bg-white/20" />
              <KeyframeScore score={opponentScore} side="right" />
           </div>

           {/* Countdown Ring (Behind/Around) */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 size-[4.5rem]">
               <svg className="size-full -rotate-90">
                  <circle
                     className="text-muted/20"
                     strokeWidth="4"
                     stroke="currentColor"
                     fill="transparent"
                     r="32"
                     cx="36"
                     cy="36"
                  />
                  <circle
                     className={cn("transition-all duration-100 ease-linear", isUrgent ? "text-red-500" : "text-primary")}
                     strokeWidth="4"
                     strokeDasharray={201}
                     strokeDashoffset={201 - (201 * timerPercentage) / 100}
                     strokeLinecap="round"
                     stroke="currentColor"
                     fill="transparent"
                     r="32"
                     cx="36"
                     cy="36"
                  />
               </svg>
           </div>
        </div>

        {/* Opponent Side */}
        <div className="flex items-center gap-3 flex-1 justify-start">
          <Avatar className={cn(
             "border-2 size-12 shadow-lg transition-all duration-300",
             opponentAnswered ? "border-primary ring-2 ring-primary/30" : "border-border"
          )}>
            <AvatarImage src={opponentAvatar} />
            <AvatarFallback>{opponentName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="text-left hidden sm:block">
             <div className="font-bold text-sm tracking-tight">{opponentName}</div>
             <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1">
               {opponentAnswered && <span className="text-primary animate-pulse">● Answered</span>}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function KeyframeScore({ score, side }: { score: number; side: 'left' | 'right' }) {
  return (
    <AnimatePresence mode="popLayout" custom={side}>
      <motion.span
        key={score}
        initial={{ y: side === 'left' ? 20 : -20, opacity: 0, scale: 0.5 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: side === 'left' ? -20 : 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "text-3xl font-black tabular-nums tracking-tighter text-white",
          side === 'left' ? "text-left" : "text-right"
        )}
      >
        {score}
      </motion.span>
    </AnimatePresence>
  );
}
