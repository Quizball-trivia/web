'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { MAX_PENALTY_ROUNDS } from '../types/possession.types';
import type { Phase } from '../types/possession.types';
import { AnimatedPointsCounter } from './AnimatedPointsCounter';
import { MatchHudAvatar, MatchHudIconButton } from './MatchHudPrimitives';
import { useLocale } from '@/contexts/LocaleContext';
import type { AvatarCustomization } from '@/types/game';

interface PenaltyHUDProps {
  penaltyPlayerScore: number;
  penaltyOpponentScore: number;
  penaltyPlayerAttempts?: Array<'goal' | 'miss'>;
  penaltyOpponentAttempts?: Array<'goal' | 'miss'>;
  playerPoints?: number;
  opponentPoints?: number;
  penaltyRound: number;
  isPenaltySuddenDeath: boolean;
  isPlayerShooter: boolean;
  playerName: string;
  opponentName: string;
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  opponentAvatarCustomization?: AvatarCustomization | null;
  timeRemaining: number;
  phase: Phase;
  onQuit?: () => void;
}

export function PenaltyHUD({
  penaltyPlayerScore,
  penaltyOpponentScore,
  penaltyPlayerAttempts,
  penaltyOpponentAttempts,
  playerPoints = 0,
  opponentPoints = 0,
  penaltyRound,
  isPenaltySuddenDeath,
  playerName,
  opponentName,
  playerAvatarCustomization = null,
  opponentAvatarCustomization = null,
  timeRemaining,
  phase,
  onQuit,
}: PenaltyHUDProps) {
  const { t } = useLocale();

  // Sudden death restarts the pip rows: capture each side's cumulative score at
  // the moment SD begins, then show only the SD-relative goals so the dots clear
  // to empty and refill round by round (instead of staying at all-5-filled).
  // Adjust-state-during-render pattern (no effect): the baseline is set the first
  // render SD is active and cleared when it ends. See react.dev — "storing
  // information from previous renders".
  const [sdBaseline, setSdBaseline] = useState<{
    playerScore: number;
    opponentScore: number;
    playerAttempts: number;
    opponentAttempts: number;
  } | null>(null);
  if (isPenaltySuddenDeath && sdBaseline === null) {
    setSdBaseline({
      playerScore: penaltyPlayerScore,
      opponentScore: penaltyOpponentScore,
      playerAttempts: penaltyPlayerAttempts?.length ?? penaltyPlayerScore,
      opponentAttempts: penaltyOpponentAttempts?.length ?? penaltyOpponentScore,
    });
  } else if (!isPenaltySuddenDeath && sdBaseline !== null) {
    setSdBaseline(null);
  }

  const baseline = isPenaltySuddenDeath ? sdBaseline : null;
  const pipPlayerScore = baseline ? Math.max(0, penaltyPlayerScore - baseline.playerScore) : penaltyPlayerScore;
  const pipOpponentScore = baseline ? Math.max(0, penaltyOpponentScore - baseline.opponentScore) : penaltyOpponentScore;
  const playerPips = (penaltyPlayerAttempts && penaltyPlayerAttempts.length > 0)
    ? (baseline ? penaltyPlayerAttempts.slice(baseline.playerAttempts) : penaltyPlayerAttempts)
    : Array.from({ length: pipPlayerScore }, () => 'goal' as const);
  const opponentPips = (penaltyOpponentAttempts && penaltyOpponentAttempts.length > 0)
    ? (baseline ? penaltyOpponentAttempts.slice(baseline.opponentAttempts) : penaltyOpponentAttempts)
    : Array.from({ length: pipOpponentScore }, () => 'goal' as const);
  const pipClassName = (result: 'goal' | 'miss' | undefined) => {
    if (result === 'goal') return 'bg-brand-green-light border-brand-green-light';
    if (result === 'miss') return 'bg-brand-red-soft border-brand-red-soft';
    return 'bg-transparent border-white/20';
  };

  return (
    <div
      className="relative w-full space-y-2 mb-3"
      // family-only to preserve font-black / tracking on descendants
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {onQuit && (
        <MatchHudIconButton
          onClick={onQuit}
          className="fixed right-[calc(env(safe-area-inset-right)+0.75rem)] top-[calc(env(safe-area-inset-top)+0.25rem)] z-[70] sm:right-[calc(env(safe-area-inset-right)+0.5rem)] sm:top-[calc(env(safe-area-inset-top)+0.5rem)]"
          title={t('possession.leaveMatch')}
          aria-label={t('possession.leaveMatch')}
        >
          <X className="size-5" />
        </MatchHudIconButton>
      )}

      <div className="flex items-center justify-between gap-1 px-12 sm:gap-3 sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3">
          <MatchHudAvatar customization={playerAvatarCustomization} side="player" />
          <div className="min-w-0">
            <div className="hidden truncate text-xs font-bold text-white/85 sm:block">{playerName}</div>
            <div className="text-2xl font-black leading-6 tabular-nums text-white sm:text-3xl sm:leading-7">{penaltyPlayerScore}</div>
            <div className="hidden sm:block">
              <AnimatedPointsCounter value={playerPoints} accentClassName="text-brand-yellow" />
            </div>
            <div className="text-[8px] font-black uppercase leading-none tracking-[0.08em] text-white/45 sm:hidden">
              {playerPoints} {t('possession.pointsLabel')}
            </div>
          </div>
        </div>
        <div className="flex min-w-[44px] shrink-0 flex-col items-center justify-center sm:min-w-[100px]">
          <div className="mb-1 hidden text-[10px] font-black uppercase tracking-[0.18em] text-brand-orange sm:block">
            {isPenaltySuddenDeath ? t('possession.suddenDeath') : t('possession.penaltyRound', { round: penaltyRound, max: MAX_PENALTY_ROUNDS })}
          </div>
          <motion.div
            animate={timeRemaining <= 2 && phase === 'penalty-playing' ? { scale: [1, 1.1, 1] } : {}}
            transition={timeRemaining <= 2 ? { repeat: Infinity, duration: 0.6 } : {}}
            className={`text-2xl font-black tabular-nums transition-colors duration-200 sm:text-3xl ${
              phase === 'penalty-playing' ? '' : 'hidden sm:block'
            } ${
              phase === 'penalty-playing'
                ? timeRemaining <= 2 ? 'text-red-500' : 'text-white'
                : 'text-white/40'
            }`}
          >
            {phase === 'penalty-playing' ? timeRemaining : '\u2014'}
          </motion.div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-3">
          <div className="min-w-0 text-right">
            <div className="ml-auto hidden truncate text-xs font-bold text-white/85 sm:block">{opponentName}</div>
            <div className="text-2xl font-black leading-6 tabular-nums text-white sm:text-3xl sm:leading-7">{penaltyOpponentScore}</div>
            <div className="hidden sm:block">
              <AnimatedPointsCounter
                value={opponentPoints}
                align="right"
                accentClassName="text-brand-red-soft"
              />
            </div>
            <div className="text-[8px] font-black uppercase leading-none tracking-[0.08em] text-white/45 sm:hidden">
              {opponentPoints} {t('possession.pointsLabel')}
            </div>
          </div>
          <MatchHudAvatar customization={opponentAvatarCustomization} side="opponent" />
        </div>
      </div>
      {/* Penalty score pips */}
      <div className="flex justify-center gap-4 px-3">
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_PENALTY_ROUNDS }).map((_, i) => (
            <div key={`pp-${i}`} data-testid="penalty-player-pip" className={`size-3 rounded-full border-2 ${pipClassName(playerPips[i])}`} />
          ))}
        </div>
        <div className="text-[10px] font-black text-white/30 tracking-wider">{t('possession.pens')}</div>
        <div className="flex gap-1.5">
          {Array.from({ length: MAX_PENALTY_ROUNDS }).map((_, i) => (
            <div key={`op-${i}`} data-testid="penalty-opponent-pip" className={`size-3 rounded-full border-2 ${pipClassName(opponentPips[i])}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
