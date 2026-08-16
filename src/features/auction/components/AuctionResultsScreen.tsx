'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { Crown } from 'lucide-react';
import { AvatarPreview } from '@/components/AvatarPreview';
import type { AuctionGameState, AuctionPlayer } from '../types';
import {
  chemistryMultiplier,
  computeSquadChemistry,
  formatMoney,
  getSquadProfit,
  getAdjustedProfit,
  getFilledCount,
  isTeamComplete,
  lastName,
  POSITION_ORDER,
} from '../data';

/** Profit with an explicit sign, e.g. "+$70M" / "−$40M". */
const formatProfit = (n: number): string => `${n < 0 ? '−' : '+'}${formatMoney(Math.abs(n))}`;
import { POS_COLORS, poppins, medalColor, MEDAL_COLORS } from '../constants/auction.constants';
import { ChemistryBadge, ChemistryBreakdown } from './shared/ChemistryPanel';
import { ScreenBackdrop, SCREEN_GLOW } from './shared/ScreenBackdrop';
import { AuctionPrimaryButton } from './shared/AuctionPrimaryButton';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';

// ─── Podium (top 3) — gold / silver / bronze, matching the Betsson leaderboard ─
const PODIUM_STYLE: Record<1 | 2 | 3, { medal: string; gradientFrom: string; gradientTo: string; height: string; order: string }> = {
  // Shortest bar must still hold the full stack (rank + score + chem ≈ 80px),
  // or the rank number overflows out the top on mobile.
  1: { medal: MEDAL_COLORS[0], gradientFrom: 'rgba(255,215,0,0.9)', gradientTo: 'rgba(255,176,0,0.4)', height: 'h-32 sm:h-36', order: 'order-2' },
  2: { medal: MEDAL_COLORS[1], gradientFrom: 'rgba(214,214,222,0.85)', gradientTo: 'rgba(160,160,170,0.35)', height: 'h-24 sm:h-28', order: 'order-1' },
  3: { medal: MEDAL_COLORS[2], gradientFrom: 'rgba(205,127,50,0.9)', gradientTo: 'rgba(160,90,30,0.4)', height: 'h-20 sm:h-24', order: 'order-3' },
};

function PodiumColumn({
  player,
  rank,
  isHuman,
  score,
  chemistry,
  multiplier,
  delay,
}: {
  player: AuctionPlayer;
  rank: 1 | 2 | 3;
  isHuman: boolean;
  /** Chemistry-adjusted value — the score the ranking is decided on. */
  score: number;
  chemistry: number;
  multiplier: number;
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
        <AvatarPreview customization={player.avatarCustomization ?? { base: player.avatarSeed || 'avatar-1' }} width={rank === 1 ? 64 : 52} />
      </div>
      {/* Name */}
      <div className="mb-1 flex max-w-full items-center gap-1">
        <span className="max-w-[100px] truncate text-center text-[11px] font-black uppercase text-white" style={poppins}>
          {player.username}
        </span>
      </div>
      {/* Podium bar — medal gradient */}
      <div
        className={cn('relative flex w-full max-w-[120px] flex-col items-center justify-center rounded-t-[14px] px-2 pt-2 pb-3', s.height)}
        style={{ background: `linear-gradient(180deg, ${s.gradientFrom} 0%, ${s.gradientTo} 100%)` }}
      >
        {isHuman && (
          <span
            className="absolute -right-2.5 -top-2.5 z-10 rotate-6 rounded-lg bg-brand-orange px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white shadow-[0_3px_10px_rgba(0,0,0,0.45)]"
            style={poppins}
          >
            {t('auctionGame.youBadge')}
          </span>
        )}
        <span className="font-poppins text-lg font-black text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{rank}</span>
        <span className="font-poppins text-sm font-black tabular-nums text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{formatProfit(score)}</span>
        <span className="mt-0.5 font-poppins text-[9px] font-black tabular-nums text-white/90" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
          ⚡{chemistry} · ×{multiplier.toFixed(1)}
        </span>
      </div>
    </motion.div>
  );
}

export function AuctionResultsScreen({
  state,
  humanPlayerId,
  onPlayAgain,
  onExit,
  coinsAwarded,
  apEarned,
  forfeited = false,
  removed = false,
}: {
  state: AuctionGameState;
  humanPlayerId: string;
  onPlayAgain: () => void;
  onExit: () => void;
  /** Coins this player earned (500 win / 300 finish). 0/null = none shown. */
  coinsAwarded?: number | null;
  /** Auction Points this player earned (1st +50 / 2nd +30 / 3rd +10). Absent or
   *  0 for friendly-lobby matches and forfeiters — nothing is rendered then. */
  apEarned?: number | null;
  /** This player left/forfeited: show the forfeit result, never coins. */
  forfeited?: boolean;
  /** The SERVER removed this player (drop / reconnect limit) — not a voluntary
   *  quit. Shown with honest "removed from the match" copy. */
  removed?: boolean;
}) {
  const { t } = useLocale();
  const ordinal = (n: number) => {
    if (n === 1) return t('auctionGame.ordinal1');
    if (n === 2) return t('auctionGame.ordinal2');
    if (n === 3) return t('auctionGame.ordinal3');
    return t('auctionGame.ordinalN', { rank: n });
  };
  const decorated = state.players.map((p) => {
    const chemistry = computeSquadChemistry(p.team).total;
    const multiplier = chemistryMultiplier(chemistry);
    return {
      ...p,
      chemistry,
      multiplier,
      // Profit (later-season value − amount paid), and profit scaled by
      // chemistry — the score the winner is decided on.
      profit: getSquadProfit(p),
      adjustedProfit: getAdjustedProfit(p),
      teamComplete: isTeamComplete(p.team),
      filledCount: getFilledCount(p.team),
    };
  });

  // Prefer the server's placings: coins were paid against that exact order, and
  // re-sorting locally can break ties differently on each client (the server
  // has a stable seat-index tiebreak this cannot see). The local sort is the
  // mock-mode fallback only.
  const serverOrder = state.rankings ?? null;
  const rankedPlayers = serverOrder
    ? serverOrder
        .map((seatId) => decorated.find((p) => p.id === seatId))
        .filter((p): p is (typeof decorated)[number] => Boolean(p))
    : [...decorated].sort((a, b) => {
        // Forfeiters always rank last (matches the server's rankAuctionPlayers) —
        // quitting while ahead can never win.
        const aForfeited = Boolean(a.forfeited);
        const bForfeited = Boolean(b.forfeited);
        if (aForfeited !== bForfeited) return aForfeited ? 1 : -1;
        if (a.teamComplete !== b.teamComplete) return a.teamComplete ? -1 : 1;
        // Then the chemistry-adjusted profit — most profit wins.
        return b.adjustedProfit - a.adjustedProfit;
      });

  const winner = rankedPlayers[0];
  const humanRank = rankedPlayers.findIndex((p) => p.id === humanPlayerId);
  const humanWon = !forfeited && winner?.id === humanPlayerId;
  // A forfeiter leaves while the other two are still bidding, so no standing is
  // final yet — show only their own guaranteed last place and their own squad.
  // Revealing the podium here would leak an in-progress match's state.
  const humanEntry = decorated.find((p) => p.id === humanPlayerId) ?? null;
  // Coins are never shown on a forfeit (the leaver gets nothing).
  const showCoins = !forfeited && (coinsAwarded ?? 0) > 0;
  // AP is ranked-auction only: friendly lobbies send no apEarned (and
  // forfeiters get 0), so an absent/zero value hides the whole reveal.
  const showAp = !forfeited && (apEarned ?? 0) > 0;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-page-alt p-3 md:p-6">
      <ScreenBackdrop glow={SCREEN_GLOW.results} />

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
            className={cn(
              'font-poppins text-[2.5rem] font-black uppercase tracking-[0] sm:text-[3rem]',
              forfeited ? 'text-brand-red' : humanWon ? 'text-brand-green' : 'text-brand-yellow',
            )}
            style={{ lineHeight: '1.3' }}
          >
            {forfeited
              ? removed
                ? t('auctionGame.removedFromMatch')
                : t('auctionGame.lostByForfeit')
              : humanWon
                ? t('auctionGame.youWin')
                : t('auctionGame.auctionOver')}
          </h1>
          {forfeited ? (
            <>
              <p className="mt-1 font-poppins text-lg font-black uppercase text-white">
                {t('auctionGame.forfeitYouFinishThird')}
              </p>
              <p className="mt-1 font-poppins text-sm font-semibold text-white/50 uppercase">
                {removed ? t('auctionGame.removedFromMatchSubtitle') : t('auctionGame.lostByForfeitSubtitle')}
              </p>
              <p className="mt-1 font-poppins text-xs font-semibold text-white/40">
                {t('auctionGame.forfeitMatchStillRunning')}
              </p>
            </>
          ) : (
            <p className="mt-1 font-poppins text-sm font-semibold text-white/50 uppercase">
              {humanWon
                ? t('auctionGame.highestTeamValueSubtitle')
                : t('auctionGame.youFinishedRank', { rank: ordinal(humanRank + 1) })}
            </p>
          )}

          {/* Reward chips — coins (win = +500, finish = +300) and Auction
              Points (1st +50 / 2nd +30 / 3rd +10). Neither shows on a forfeit;
              AP additionally stays hidden for friendly-lobby matches. */}
          {(showCoins || showAp) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, type: 'spring', stiffness: 320, damping: 18 }}
              className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1"
            >
              {showCoins && (
                <span className="inline-flex items-center gap-1.5">
                  <Image src="/assets/coin-1.png" alt="" width={20} height={20} className="size-5 object-contain" />
                  <span className="font-poppins text-lg font-black tabular-nums text-brand-yellow" style={poppins}>
                    {t('auctionGame.coinsEarned', { coins: coinsAwarded ?? 0 })}
                  </span>
                </span>
              )}
              {showAp && (
                <span className="font-poppins text-lg font-black tabular-nums text-white" style={poppins}>
                  {t('auctionGame.apEarned', { ap: apEarned ?? 0 })}
                </span>
              )}
            </motion.div>
          )}
        </div>

        {/* Podium — top 3 (party-quiz style). Hidden on a forfeit: the other
            seats are still playing, so there is nothing final to rank. */}
        {!forfeited && rankedPlayers.length >= 1 && (
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
            {rankedPlayers.slice(0, 3).map((player, i) => (
              <PodiumColumn
                key={player.id}
                player={player}
                rank={(i + 1) as 1 | 2 | 3}
                isHuman={player.id === humanPlayerId}
                score={player.adjustedProfit}
                chemistry={player.chemistry}
                multiplier={player.multiplier}
                delay={0.3 + i * 0.12}
              />
            ))}
          </div>
        )}

        {/* Detailed stats list (preserves squad chips, players filled, budget).
            On a forfeit this collapses to the leaver's own squad — no rival
            standings, no squads, nothing from the match still in progress. */}
        <div className="space-y-3">
          {forfeited && (
            <h2 className="font-poppins text-xs font-black uppercase tracking-wide text-white/50">
              {t('auctionGame.forfeitYourSquad')}
            </h2>
          )}
          {(forfeited ? (humanEntry ? [humanEntry] : []) : rankedPlayers).map((player, index) => {
            const isHuman = player.id === humanPlayerId;
            // A forfeiter is always last (3rd) and never a winner, regardless of
            // where they sat in the local list.
            const rank = forfeited ? 2 : index;
            const isWinner = !forfeited && rank === 0;

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
                  <div className="flex shrink-0 flex-col items-end">
                    <span
                      className="text-xl font-black tabular-nums leading-none"
                      style={{ ...poppins, color: medal, textShadow: isWinner ? `0 2px 12px ${medal}40` : undefined }}
                    >
                      {formatProfit(player.adjustedProfit)}
                    </span>
                    <span className="mt-1 font-poppins text-[10px] font-bold tabular-nums text-white/45">
                      {formatProfit(player.profit)} × {player.multiplier.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Squad chips — solid position colours */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {POSITION_ORDER.flatMap((pos) =>
                    player.team.slots[pos].map((f) => (
                      <span
                        key={f.id}
                        className="rounded-[8px] px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ backgroundColor: POS_COLORS[pos], color: '#0b1418' }}
                      >
                        {lastName(f.name)}
                      </span>
                    )),
                  )}
                </div>

                {/* Stat pills */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <ChemistryBadge total={player.chemistry} multiplier={player.multiplier} />
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
                  {isHuman && showAp && (
                    <span
                      className="rounded-md bg-brand-green/20 px-2 py-1 text-[10px] font-black uppercase tabular-nums text-brand-green"
                      style={poppins}
                    >
                      {t('auctionGame.apEarned', { ap: apEarned ?? 0 })}
                    </span>
                  )}
                </div>

                {/* Full chemistry breakdown — which club / league / nation links
                    produced this squad's chemistry (crests, badges, flags). */}
                <ChemistryBreakdown team={player.team} showInfo={rank === 0} className="mt-3" />
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
          <AuctionPrimaryButton onClick={onPlayAgain} size="wide">
            {t('auctionGame.playAgain')}
          </AuctionPrimaryButton>
          <AuctionPrimaryButton onClick={onExit} size="wide" variant="outline">
            {t('auctionGame.exit')}
          </AuctionPrimaryButton>
        </motion.div>
      </motion.div>
    </div>
  );
}
