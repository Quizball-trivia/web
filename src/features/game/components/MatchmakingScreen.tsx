"use client";

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OpponentInfo } from '@/lib/realtime/socket.types';

interface MatchmakingScreenProps {
  matchType: 'ranked' | 'friendly';
  rankedSearchDurationMs?: number | null;
  rankedSearchStartedAt?: number | null;
  rankedFoundOpponent?: OpponentInfo | null;
  onCancel: () => void;
}

export function MatchmakingScreen({
  matchType,
  rankedSearchDurationMs = null,
  rankedSearchStartedAt = null,
  rankedFoundOpponent = null,
  onCancel,
}: MatchmakingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [searchTime, setSearchTime] = useState(0);

  useEffect(() => {
    if (matchType !== 'ranked' || !rankedSearchStartedAt) return;

    const tick = () => {
      const elapsed = Math.max(0, Date.now() - rankedSearchStartedAt);
      const duration = rankedSearchDurationMs ?? 6000;
      const nextProgress = Math.min(95, Math.floor((elapsed / duration) * 100));
      setProgress(nextProgress);
      setSearchTime(Math.floor(elapsed / 1000));
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [matchType, rankedSearchDurationMs, rankedSearchStartedAt]);

  useEffect(() => {
    if (matchType === 'ranked') return;

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 300);

    const timeInterval = setInterval(() => {
      setSearchTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(timeInterval);
    };
  }, [matchType]);

  const foundLabel = rankedFoundOpponent?.username ?? 'Opponent';
  const showFoundState = matchType === 'ranked' && rankedFoundOpponent !== null;
  const displayedProgress = showFoundState ? 100 : progress;

  return (
    <div className="min-h-screen bg-[#131F24] flex flex-col items-center justify-center font-fun px-6">

      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Animated search icon */}
        <div className="relative flex items-center justify-center">
          {/* Ping rings */}
          {!showFoundState && (
            <>
              <motion.div
                animate={{ scale: [1, 2.2], opacity: [0.3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                className="absolute size-24 rounded-full bg-[#1CB0F6]/20"
              />
              <motion.div
                animate={{ scale: [1, 2.2], opacity: [0.3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
                className="absolute size-24 rounded-full bg-[#1CB0F6]/20"
              />
            </>
          )}

          {/* Center icon */}
          <motion.div
            animate={showFoundState ? { scale: [1, 1.15, 1] } : { scale: [1, 1.08, 1] }}
            transition={showFoundState
              ? { duration: 0.4, ease: 'easeOut' }
              : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            }
            className={cn(
              'relative size-24 rounded-full flex items-center justify-center text-5xl border-4 border-b-[6px]',
              showFoundState
                ? 'bg-[#58CC02] border-[#46A302]'
                : 'bg-[#1CB0F6] border-[#1899D6]'
            )}
          >
            {showFoundState ? <Check className="size-11 text-white" strokeWidth={3.5} /> : '⚽'}
          </motion.div>
        </div>

        {/* Status text */}
        <div className="text-center">
          {!showFoundState ? (
            <>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                Searching...
              </h2>
              <p className="text-sm font-bold text-[#56707A] mt-1">
                {searchTime}s elapsed
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black text-[#58CC02] uppercase tracking-tight">
                Opponent Found!
              </h2>
              <p className="text-sm font-bold text-[#56707A] mt-1">
                {foundLabel} joined the match
              </p>
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-3">
          <div className="w-full h-4 rounded-full bg-[#243B44] border-b-2 border-[#1B2F36] overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                showFoundState
                  ? 'bg-[#58CC02] border-b-2 border-[#46A302]'
                  : 'bg-[#1CB0F6] border-b-2 border-[#1899D6]'
              )}
              initial={{ width: '0%' }}
              animate={{ width: `${displayedProgress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          <p className="text-center text-xs font-bold text-[#56707A]">
            {showFoundState
              ? 'Preparing category draft...'
              : 'Looking for players...'}
          </p>
        </div>

        {/* Match type badge */}
        <div className={cn(
          'px-4 py-1.5 rounded-full border-b-[3px] text-xs font-black uppercase tracking-wider text-white',
          matchType === 'ranked'
            ? 'bg-[#FF9600] border-[#DB8200]'
            : 'bg-[#1CB0F6] border-[#1899D6]'
        )}>
          {matchType === 'ranked' ? 'Ranked Match' : 'Friendly Match'}
        </div>

        {/* Tip */}
        <div className="w-full bg-[#1B2F36] rounded-2xl border-b-[3px] border-[#0D1B21] px-5 py-4">
          <p className="text-sm text-[#56707A]">
            <span className="font-black text-white">Tip: </span>
            Matches are 10 fast questions — answer quickly for bonus points.
          </p>
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="w-full py-3.5 rounded-2xl bg-[#1B2F36] border-b-4 border-[#0D1B21] text-base font-black text-[#56707A] uppercase tracking-wide hover:bg-[#FF4B4B] hover:border-[#E04242] hover:text-white active:translate-y-[2px] active:border-b-2 transition-all"
        >
          Cancel Matchmaking
        </button>
      </div>
    </div>
  );
}
