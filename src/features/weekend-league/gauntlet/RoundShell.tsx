'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { poppins } from '../constants';
import { ROUND_LABEL_KEYS, ROUNDS } from './gauntlet.data';
import type { GameDef, RoundDef, RoundResult } from './gauntlet.types';

/** Per-round countdown clock; auto-times-out as a miss. */
export function useRoundClock(seconds: number, fast: boolean, onTimeout: () => void) {
  const total = fast ? Math.max(3, Math.round(seconds / 4)) : seconds;
  const [deadline, setDeadline] = useState(() => Date.now() + total * 1000);
  const [secondsLeft, setSecondsLeft] = useState(total);
  const [stopped, setStopped] = useState(false);
  const timeoutRef = useRef(onTimeout);
  useEffect(() => {
    timeoutRef.current = onTimeout;
  });

  useEffect(() => {
    if (stopped) return;
    const id = setInterval(() => {
      const left = Math.max(0, (deadline - Date.now()) / 1000);
      setSecondsLeft(Math.ceil(left));
      if (left <= 0) {
        setStopped(true);
        timeoutRef.current();
      }
    }, 200);
    return () => clearInterval(id);
  }, [stopped, deadline]);

  const stop = useCallback(() => setStopped(true), []);
  /** Restart for the next question in a multi-question round. */
  const restart = useCallback(() => {
    setDeadline(Date.now() + total * 1000);
    setSecondsLeft(total);
    setStopped(false);
  }, [total]);
  const frac = Math.max(0, Math.min(1, secondsLeft / total));
  return { secondsLeft, frac, total, stop, restart, stopped };
}

/** Locks in an answer exactly once; after a short in-place beat, reports up. */
export function useAnswerLock(onResolved: (r: RoundResult) => void) {
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  const onResolvedRef = useRef(onResolved);
  useEffect(() => {
    onResolvedRef.current = onResolved;
  });

  const lock = useCallback((result: RoundResult) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    setTimeout(() => onResolvedRef.current(result), 900);
  }, []);

  return { locked, lock };
}

/** The persistent header every round shows: context, score, rank and timer. */
export function RoundHeader({
  game,
  gameIndex,
  round,
  score,
  rank,
  secondsLeft,
  frac,
  spectator = false,
}: {
  game: GameDef;
  gameIndex: number;
  round: RoundDef;
  score: number;
  rank: number;
  secondsLeft: number;
  frac: number;
  /** Hide the personal score/rank — spectators have neither. */
  spectator?: boolean;
}) {
  const { t } = useLocale();
  const urgent = secondsLeft <= 4;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-16">
      <div className="flex items-center justify-between font-poppins text-[11px] font-black uppercase tracking-wide text-white/50">
        <span>{t('weekendLeague.gRoundOf', { g: gameIndex + 1, r: round.index + 1 })}</span>
        <span className="text-brand-yellow">{t('weekendLeague.gUpTo', { n: round.maxPoints })}</span>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <span className="font-poppins text-base font-black uppercase text-white" style={poppins}>
          {t(ROUND_LABEL_KEYS[round.type])}
        </span>
        {spectator ? (
          <span className="flex items-center gap-1.5 font-poppins text-[11px] font-black uppercase tracking-wide text-brand-cyan">
            <span className="size-1.5 animate-pulse rounded-full bg-brand-cyan" /> {t('weekendLeague.gSpectator')}
          </span>
        ) : (
          <span className="font-poppins text-sm font-black tabular-nums text-white" style={poppins}>
            {t('weekendLeague.gScoreRank', { score, rank })}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between font-poppins text-[10px] font-bold uppercase tracking-wide text-white/40">
        <span>{t('weekendLeague.gPlayersAdvance', { players: game.players, advance: game.advance })}</span>
        <span className={`tabular-nums ${urgent ? 'text-brand-red-soft' : ''}`}>{secondsLeft}s</span>
      </div>

      {/* Timer bar */}
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${urgent ? 'bg-brand-red-soft' : 'bg-brand-cyan'}`}
          style={{ width: `${frac * 100}%` }}
        />
      </div>

      {/* Five-round progress dots */}
      <div className="mt-2 flex items-center gap-1.5">
        {ROUNDS.map((r) => (
          <span
            key={r.index}
            className={`h-1 flex-1 rounded-full ${
              r.index < round.index ? 'bg-brand-green-light' : r.index === round.index ? 'bg-brand-yellow' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/** Answer button state classes shared by every round type. */
export function answerClasses(opts: { locked: boolean; isCorrect: boolean; isSelected: boolean }): string {
  const { locked, isCorrect, isSelected } = opts;
  if (!locked) return 'border-white/12 bg-surface-card-deep hover:bg-white/[0.06]';
  if (isCorrect) return 'border-brand-green bg-brand-green/15';
  if (isSelected) return 'border-brand-red-soft bg-brand-red-soft/15';
  return 'border-white/8 bg-surface-card-deep opacity-50';
}

/** Speed-scaled points for the simple rounds: half at the buzzer, full instantly. */
export function speedPoints(max: number, frac: number): number {
  return Math.round(max * (0.5 + 0.5 * frac));
}
