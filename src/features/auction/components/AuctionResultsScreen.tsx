'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { Crown } from 'lucide-react';
import { AvatarPreview } from '@/components/AvatarPreview';
import type { AuctionGameState, AuctionPlayer, PositionGroup } from '../types';
import { formatMoney, getTotalTeamValue, getFilledCount, isTeamComplete } from '../data';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

const POS_COLORS: Record<PositionGroup, string> = {
  GK: '#FFE500',
  DEF: '#1CB0F6',
  MID: '#58CC02',
  FWD: '#FF4B4B',
};

// Rank → medal accent colour (gold / silver / bronze), neutral for 4th+.
const MEDAL_COLOR = ['#FFD700', '#C0C0C0', '#CD7F32'];
const medalColor = (rank0: number) => MEDAL_COLOR[rank0] ?? '#566570';

// ─── Podium (top 3) — gold / silver / bronze, matching the Betsson leaderboard ─
const PODIUM_STYLE: Record<1 | 2 | 3, { medal: string; gradientFrom: string; gradientTo: string; height: string; order: string }> = {
  1: { medal: '#FFD700', gradientFrom: 'rgba(255,215,0,0.9)', gradientTo: 'rgba(255,176,0,0.4)', height: 'h-28 sm:h-36', order: 'order-2' },
  2: { medal: '#C0C0C0', gradientFrom: 'rgba(214,214,222,0.85)', gradientTo: 'rgba(160,160,170,0.35)', height: 'h-20 sm:h-28', order: 'order-1' },
  3: { medal: '#CD7F32', gradientFrom: 'rgba(205,127,50,0.9)', gradientTo: 'rgba(160,90,30,0.4)', height: 'h-16 sm:h-24', order: 'order-3' },
};

function PodiumColumn({
  player,
  rank,
  isHuman,
  teamValue,
  delay,
}: {
  player: AuctionPlayer;
  rank: 1 | 2 | 3;
  isHuman: boolean;
  teamValue: number;
  delay: number;
}) {
  const { t } = useLocale();
  const s = PODIUM_STYLE[rank];
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 24 }}
      className={cn('flex min-w-0 flex-col items-center justify-end', s.order)}
    >
      {/* Avatar (no ring) + crown for the winner */}
      <div className="relative mb-2">
        {rank === 1 && (
          <Crown className="absolute -top-5 left-1/2 size-5 -translate-x-1/2" style={{ color: s.medal }} fill="currentColor" />
        )}
        <AvatarPreview customization={{ base: player.avatarSeed || 'avatar-1' }} width={rank === 1 ? 64 : 52} />
      </div>
      {/* Name */}
      <div className="mb-1 flex max-w-full items-center gap-1">
        <span className="max-w-[100px] truncate text-center text-[11px] font-black uppercase text-white" style={poppins}>
          {player.username}
        </span>
      </div>
      {/* Podium bar — medal gradient */}
      <div
        className={cn('flex w-full max-w-[120px] flex-col items-center justify-center rounded-t-[14px] px-2 pt-2 pb-3', s.height)}
        style={{ background: `linear-gradient(180deg, ${s.gradientFrom} 0%, ${s.gradientTo} 100%)` }}
      >
        <span className="font-poppins text-lg font-black text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{rank}</span>
        <span className="font-poppins text-sm font-black tabular-nums text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{formatMoney(teamValue)}</span>
        {isHuman && (
          <span className="mt-1 rounded-full bg-black/70 px-1.5 py-px text-[8px] font-black uppercase text-brand-yellow" style={poppins}>
            {t('auctionGame.youBadge')}
          </span>
        )}
      </div>
    </motion.div>
  );
}

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
  const { t } = useLocale();
  const ordinal = (n: number) => {
    if (n === 1) return t('auctionGame.ordinal1');
    if (n === 2) return t('auctionGame.ordinal2');
    if (n === 3) return t('auctionGame.ordinal3');
    return t('auctionGame.ordinalN', { rank: n });
  };
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
            className="mb-2 flex items-center justify-center text-5xl"
          >
            {humanWon ? (
              <Image
                src="/assets/brand/world-cup-trophy.webp"
                alt=""
                width={72}
                height={72}
                className="h-16 w-auto object-contain drop-shadow-[0_4px_16px_rgba(255,215,0,0.35)]"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/assets/brand/goal-ball-small.webp"
                alt=""
                aria-hidden="true"
                draggable={false}
                width={56}
                height={56}
                className="block size-14 object-contain"
              />
            )}
          </motion.div>
          <h1
            className="font-poppins text-[2.5rem] font-black uppercase tracking-[0] sm:text-[3rem]"
            style={{
              lineHeight: '1.3',
              color: humanWon ? '#22C55E' : '#FACC15',
            }}
          >
            {humanWon ? t('auctionGame.youWin') : t('auctionGame.auctionOver')}
          </h1>
          <p className="mt-1 font-poppins text-sm font-semibold text-white/50 uppercase">
            {humanWon
              ? t('auctionGame.highestTeamValueSubtitle')
              : t('auctionGame.youFinishedRank', { rank: ordinal(humanRank + 1) })}
          </p>
        </div>

        {/* Podium — top 3 (party-quiz style) */}
        {rankedPlayers.length >= 1 && (
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
            {rankedPlayers.slice(0, 3).map((player, i) => (
              <PodiumColumn
                key={player.id}
                player={player}
                rank={(i + 1) as 1 | 2 | 3}
                isHuman={player.id === humanPlayerId}
                teamValue={player.teamValue}
                delay={0.3 + i * 0.12}
              />
            ))}
          </div>
        )}

        {/* Detailed stats list (preserves squad chips, players filled, budget) */}
        <div className="space-y-3">
          {rankedPlayers.map((player, rank) => {
            const isHuman = player.id === humanPlayerId;
            const isWinner = rank === 0;

            const medal = medalColor(rank);

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + rank * 0.15 }}
                className={`relative rounded-[18px] border-2 bg-white/[0.02] p-4 ${player.isEliminated ? 'opacity-50' : ''}`}
                style={{ borderColor: medal }}
              >
                {/* YOU ribbon — larger, tilted, top-right corner */}
                {isHuman && (
                  <motion.span
                    initial={{ scale: 0, rotate: 0 }}
                    animate={{ scale: 1, rotate: 8 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 13, delay: 0.5 + rank * 0.15 }}
                    className="absolute -right-2 -top-3 z-20 rounded-lg bg-brand-yellow px-3 py-1 text-sm font-black uppercase text-surface-page shadow-[0_3px_10px_rgba(0,0,0,0.45)]"
                    style={poppins}
                  >
                    {t('auctionGame.youBadge')}
                  </motion.span>
                )}
                {/* Header: rank + name ........ team value */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {/* Rank — transparent with medal border */}
                    <span
                      className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black tabular-nums"
                      style={{ ...poppins, borderColor: medal, color: medal }}
                    >
                      {player.isEliminated ? '✕' : rank + 1}
                    </span>
                    <span className="truncate text-sm font-black uppercase text-white" style={poppins}>
                      {player.username}
                    </span>
                    {isWinner && <Crown className="size-4 shrink-0" style={{ color: medal }} fill="currentColor" />}
                  </div>
                  <span
                    className="shrink-0 text-xl font-black tabular-nums"
                    style={{ ...poppins, color: medal, textShadow: isWinner ? `0 2px 12px ${medal}40` : undefined }}
                  >
                    {formatMoney(player.teamValue)}
                  </span>
                </div>

                {/* Squad chips — solid position colours */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {(['GK', 'DEF', 'MID', 'FWD'] as PositionGroup[]).flatMap((pos) =>
                    player.team.slots[pos].map((f) => (
                      <span
                        key={f.id}
                        className="rounded-[8px] px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: POS_COLORS[pos], color: '#0b1418' }}
                      >
                        {f.name.split(' ').pop()}
                      </span>
                    )),
                  )}
                </div>

                {/* Stat pills */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-md bg-white/8 px-2 py-1 text-[10px] font-bold text-white/70" style={poppins}>
                    {t('auctionGame.playersFilled', { filled: player.filledCount })}
                  </span>
                  <span className="rounded-md bg-white/8 px-2 py-1 text-[10px] font-bold text-white/70" style={poppins}>
                    {t('auctionGame.budgetAmount', { amount: formatMoney(player.budget) })}
                  </span>
                  {player.isEliminated && (
                    <span className="rounded-md bg-brand-red/20 px-2 py-1 text-[10px] font-bold uppercase text-brand-red" style={poppins}>
                      {t('auctionGame.eliminated')}
                    </span>
                  )}
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
            className="flex h-[64px] w-full items-center justify-center rounded-[20px] bg-brand-green font-poppins font-semibold uppercase text-white text-[1.5rem] shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none"
          >
            {t('auctionGame.playAgain')}
          </button>
          <button
            type="button"
            onClick={onExit}
            className="flex h-[64px] w-full items-center justify-center rounded-[20px] border-[3px] border-brand-green bg-transparent font-poppins font-semibold uppercase text-white text-[1.5rem] transition-colors hover:bg-brand-green/10 active:translate-y-[2px]"
          >
            {t('auctionGame.exit')}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
