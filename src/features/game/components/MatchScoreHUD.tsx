import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface MatchScoreHUDProps {
  playerScore: number;
  opponentScore: number;
  playerAvatar: string;
  opponentAvatar: string;
  playerName: string;
  opponentName: string;
  timeRemaining: number;
  roundCurrent: number;
  roundTotal: number;
  playerAnswered: boolean;
  opponentAnswered: boolean;
  onQuit?: () => void;
}

export function MatchScoreHUD({
  playerScore,
  opponentScore,
  playerName,
  opponentName,
  playerAvatar,
  opponentAvatar,
  timeRemaining,
  roundCurrent,
  roundTotal,
  playerAnswered,
  opponentAnswered,
  onQuit,
}: MatchScoreHUDProps) {
  const isUrgent = timeRemaining <= 3;
  const progressPercent = (roundCurrent / roundTotal) * 100;
  const leadDiff = playerScore - opponentScore;
  const leadText =
    leadDiff === 0 ? 'Tied' : leadDiff > 0 ? `+${leadDiff} lead` : `+${Math.abs(leadDiff)} lead`;
  const leadClass =
    leadDiff === 0 ? 'text-white/45' : leadDiff > 0 ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div className="w-full max-w-4xl mx-auto mb-5 font-fun space-y-3">
      {/* Progress bar row */}
      <div className="flex items-center gap-3">
        {onQuit && (
          <button
            onClick={onQuit}
            className="shrink-0 p-1.5 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            <X className="size-5" />
          </button>
        )}

        <div className="flex-1 relative h-5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progressPercent}%`,
              background: 'linear-gradient(180deg, #4ade80 0%, #22c55e 100%)',
            }}
          >
            {/* Shine overlay */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent h-1/2" />
          </div>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-white tracking-wide">
            {roundCurrent} / {roundTotal}
          </span>
        </div>
      </div>

      {/* Player strip */}
      <div className="flex items-center justify-between gap-3">
        {/* Player side */}
        <div className="flex items-center gap-3 flex-1 min-w-0 rounded-2xl bg-[#172333]/85 border border-white/10 px-3 py-2.5">
          <Avatar className={cn(
            'size-11 border-2 transition-all duration-300 shrink-0',
            playerAnswered ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-white/20'
          )}>
            <AvatarImage src={playerAvatar} />
            <AvatarFallback className="text-xs font-bold bg-white/10">
              {playerName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white/85 truncate max-w-[120px]">{playerName}</div>
            <div className="text-3xl leading-7 font-black text-emerald-300 tabular-nums">
              {playerScore}
            </div>
          </div>
        </div>

        {/* Center timer */}
        <div className="shrink-0 flex flex-col items-center justify-center min-w-[124px]">
          <div
            className={cn(
              'font-fun text-4xl font-black tabular-nums transition-colors duration-200',
              isUrgent ? 'text-red-500 animate-pulse' : 'text-white'
            )}
          >
            {timeRemaining}
          </div>
          <div className="text-[10px] font-black tracking-[0.18em] text-white/35 -mt-0.5 mb-0.5">VS</div>
          <div className={cn('text-xs font-bold', leadClass)}>
            {leadText}
          </div>
        </div>

        {/* Opponent side */}
        <div className="flex items-center gap-3 flex-1 min-w-0 justify-end rounded-2xl bg-[#172333]/85 border border-white/10 px-3 py-2.5">
          <div className="min-w-0 text-right">
            <div className="text-xs font-bold text-white/85 truncate max-w-[120px] ml-auto">{opponentName}</div>
            <div className="text-3xl leading-7 font-black text-emerald-300 tabular-nums">
              {opponentScore}
            </div>
          </div>
          <Avatar className={cn(
            'size-11 border-2 transition-all duration-300 shrink-0',
            opponentAnswered ? 'border-emerald-400 ring-2 ring-emerald-400/30' : 'border-white/20'
          )}>
            <AvatarImage src={opponentAvatar} />
            <AvatarFallback className="text-xs font-bold bg-white/10">
              {opponentName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}
