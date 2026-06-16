'use client';

import { motion } from 'motion/react';
import { Crown } from 'lucide-react';
import type { AuctionGameState, PositionGroup } from '../types';
import { formatMoney, getTotalTeamValue, getFilledCount, isTeamComplete } from '../data';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

const POS_COLORS: Record<PositionGroup, string> = {
  GK: '#FFE500',
  DEF: '#1CB0F6',
  MID: '#58CC02',
  FWD: '#FF4B4B',
};

const MEDAL_EMOJI = ['🥇', '🥈', '🥉'];

export function AuctionResultsScreen({
  state,
  humanPlayerId,
  onPlayAgain,
  onExit,
}: {
  state: AuctionGameState;
  humanPlayerId: string;
  onPlayAgain: () => void;
  onExit: () => void;
}) {
  const rankedPlayers = [...state.players]
    .map((p) => ({
      ...p,
      teamValue: getTotalTeamValue(p.team),
      teamComplete: isTeamComplete(p.team),
      filledCount: getFilledCount(p.team),
    }))
    .sort((a, b) => {
      if (a.teamComplete !== b.teamComplete) return a.teamComplete ? -1 : 1;
      return b.teamValue - a.teamValue;
    });

  const winner = rankedPlayers[0];
  const humanRank = rankedPlayers.findIndex((p) => p.id === humanPlayerId);
  const humanWon = winner?.id === humanPlayerId;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-page-alt p-3 md:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%), radial-gradient(circle at bottom left, rgba(88,204,2,0.06), transparent 28%)',
        }}
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative z-10 w-full max-w-[600px] space-y-5 font-poppins md:space-y-6"
      >
        {/* Heading */}
        <div className="pb-1 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
            className="text-5xl mb-2"
          >
            {humanWon ? '🏆' : '⚽'}
          </motion.div>
          <h1
            className="font-poppins text-[2.5rem] font-black uppercase tracking-[0] sm:text-[3rem]"
            style={{
              lineHeight: '1.3',
              color: humanWon ? '#22C55E' : '#FACC15',
            }}
          >
            {humanWon ? 'You Win!' : 'Auction Over'}
          </h1>
          <p className="mt-1 font-poppins text-sm font-semibold text-white/50 uppercase">
            {humanWon
              ? 'Highest total team value!'
              : `You finished ${humanRank + 1}${humanRank === 0 ? 'st' : humanRank === 1 ? 'nd' : humanRank === 2 ? 'rd' : 'th'}`}
          </p>
        </div>

        {/* Rankings */}
        <div className="space-y-3">
          {rankedPlayers.map((player, rank) => {
            const isHuman = player.id === humanPlayerId;
            const isWinner = rank === 0;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + rank * 0.15 }}
                className={`rounded-[20px] p-4 sm:p-5 ${
                  isWinner
                    ? 'border-2 border-brand-yellow/30 bg-brand-yellow/5'
                    : isHuman
                      ? 'border-2 border-white/10 bg-white/5'
                      : 'border-2 border-white/5 bg-white/[0.02]'
                } ${player.isEliminated ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Rank */}
                  <div className="flex flex-col items-center shrink-0 w-10">
                    <span className="text-2xl">
                      {player.isEliminated
                        ? '❌'
                        : (MEDAL_EMOJI[rank] ?? `#${rank + 1}`)}
                    </span>
                  </div>

                  {/* Player info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-black text-white uppercase"
                        style={poppins}
                      >
                        {player.username}
                      </span>
                      {isHuman && (
                        <span className="rounded-full bg-brand-yellow px-2 py-0.5 text-[9px] font-black uppercase text-surface-page">
                          YOU
                        </span>
                      )}
                      {isWinner && <Crown className="size-4 text-brand-yellow" />}
                      {player.isEliminated && (
                        <span className="text-[9px] font-black text-brand-red uppercase">
                          Eliminated
                        </span>
                      )}
                    </div>

                    {/* Team */}
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {(['GK', 'DEF', 'MID', 'FWD'] as PositionGroup[]).flatMap(
                        (pos) =>
                          player.team.slots[pos].map((f) => (
                            <span
                              key={f.id}
                              className="rounded-[8px] px-1.5 py-0.5 text-[9px] font-bold text-white/80"
                              style={{
                                backgroundColor: `${POS_COLORS[pos]}15`,
                                border: `1px solid ${POS_COLORS[pos]}30`,
                              }}
                            >
                              {f.name.split(' ').pop()}
                            </span>
                          )),
                      )}
                    </div>

                    {/* Stats row */}
                    <div
                      className="mt-2.5 flex items-center gap-4 text-[11px] text-white/50"
                      style={poppins}
                    >
                      <span>
                        Players:{' '}
                        <span className="text-white font-bold">
                          {player.filledCount}/11
                        </span>
                      </span>
                      <span>
                        Budget:{' '}
                        <span className="text-brand-yellow font-bold">
                          {formatMoney(player.budget)}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Team value */}
                  <div className="shrink-0 text-right">
                    <div
                      className="text-[9px] uppercase text-white/30"
                      style={poppins}
                    >
                      Team Value
                    </div>
                    <div
                      className="text-xl tabular-nums"
                      style={{
                        ...poppins,
                        fontWeight: 800,
                        color: isWinner ? '#FFE500' : '#FFFFFF',
                        textShadow: isWinner
                          ? '0 2px 12px rgba(255,229,0,0.25)'
                          : undefined,
                      }}
                    >
                      {formatMoney(player.teamValue)}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Action buttons — ranked style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="mx-auto flex w-full max-w-[498px] flex-col items-stretch gap-3 pt-2"
        >
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex h-[64px] w-full items-center justify-center rounded-[20px] border-b-4 border-brand-green-deep bg-brand-green font-poppins font-semibold uppercase text-white text-[1.5rem] transition-colors active:translate-y-[2px]"
          >
            Play Again
          </button>
          <button
            type="button"
            onClick={onExit}
            className="flex h-[64px] w-full items-center justify-center rounded-[20px] border-[3px] border-brand-green bg-transparent font-poppins font-semibold uppercase text-white text-[1.5rem] transition-colors hover:bg-brand-green/10 active:translate-y-[2px]"
          >
            Exit
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
