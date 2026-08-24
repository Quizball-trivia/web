'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import type { AuctionGameState } from '../../types';
import type { AuctionActions } from '../../hooks/useAuctionGame';
import { formatMoney, SOLO_PICK_MS } from '../../data';
import { CountdownTimer } from '../bidding/CountdownTimer';
import { SnapshotClues } from '../bidding/parts/SnapshotClues';
import { POS_COLORS, AUCTION_PURPLE } from '../../constants/auction.constants';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';
import { usePositionLabel } from '../../hooks/usePositionLabel';
import { SCREEN_GLOW } from '../shared/ScreenBackdrop';
import { AuctionScreen } from '../shared/AuctionScreen';
import { MoneyChip } from '../shared/MoneyChip';
import { PlayerPhoto } from '../shared/PlayerPhoto';
import { FlagChip } from '../shared/FlagChip';

/** A-vs-B choice (known vs mystery) when only one player needs a position. */
export function SoloPickScreen({
  state,
  actions,
  humanPlayerId,
  serverDrivenTransitions = false,
}: {
  state: AuctionGameState;
  actions: AuctionActions;
  humanPlayerId: string;
  /** Live match: the server resolves other seats' picks, so this client must not. */
  serverDrivenTransitions?: boolean;
}) {
  const { t } = useLocale();
  const posLabel = usePositionLabel();
  const pick = state.soloPick;
  const isHumanPicking = pick ? pick.playerId === humanPlayerId : true;
  const picker = pick ? state.players.find((p) => p.id === pick.playerId) ?? null : null;
  // The seat's choice has landed (broadcast to everyone): lock both options
  // until the server starts the next round instead of re-arming the buttons.
  const picked = pick?.selectedOption ?? null;

  // Mock-mode only: stand in for the bot that owns this pick. In a live match
  // the server decides for bots and rejects anyone choosing on another seat's
  // behalf — firing this there spammed both spectators with an error banner
  // every solo-pick round.
  const shouldAutoPickForBot = !serverDrivenTransitions && !isHumanPicking && (picker?.isBot ?? false);

  useEffect(() => {
    if (!shouldAutoPickForBot) return;
    const timer = setTimeout(() => {
      actions.pickSoloOption(Math.random() > 0.5 ? 'A' : 'B');
    }, 1500);
    return () => clearTimeout(timer);
  }, [shouldAutoPickForBot, actions]);

  if (!pick) return null;

  const posColor = POS_COLORS[pick.positionGroup];

  if (!isHumanPicking) {
    const pickerName = picker?.username ?? '';
    const pickerIsBot = picker?.isBot ?? false;
    return (
      <AuctionScreen className="flex flex-col items-center justify-center p-4">
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Everyone watches the same ticking clock the chooser is under. */}
          {pick.endsAt != null && (
            <div className="mb-4">
              <CountdownTimer key={String(pick.endsAt)} endsAt={pick.endsAt} totalMs={SOLO_PICK_MS} />
            </div>
          )}
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-4xl mb-3"
          >
            {pickerIsBot ? '🤖' : '⏳'}
          </motion.div>
          <div className="font-poppins text-base font-semibold text-white/60">
            {t('auctionGame.opponentPicking', {
              name: pickerName,
              position: posLabel(pick.positionGroup).toLowerCase(),
            })}
          </div>
          <div className="mt-1.5 font-poppins text-xs font-semibold uppercase tracking-wide text-white/35">
            {t('auctionGame.opponentPickingHint')}
          </div>
        </div>
      </AuctionScreen>
    );
  }

  return (
    <AuctionScreen glow={SCREEN_GLOW.soloPick} className="flex flex-col items-center p-4 pt-[12vh] sm:pt-[14vh]">

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-2xl">
        <div className="relative w-full text-center">
          {/* The pick auto-resolves at the deadline — pinned to the screen's
              top-right corner (mirrors the leave button top-left) instead of
              hugging the banner mid-screen. */}
          {pick.endsAt != null && (
            <div className="fixed right-3 top-3 z-50">
              <CountdownTimer key={String(pick.endsAt)} endsAt={pick.endsAt} totalMs={SOLO_PICK_MS} />
            </div>
          )}
          <div
            className="inline-block rounded-[12px] px-4 py-2 font-poppins text-xs font-black uppercase text-black mb-3"
            style={{ backgroundColor: posColor }}
          >
            {t('auctionGame.onlyYouNeedPosition', { position: posLabel(pick.positionGroup) })}
          </div>
          <h2 className="font-poppins text-2xl sm:text-3xl font-black uppercase text-white">
            {t('auctionGame.chooseYourPlayer')}
          </h2>
        </div>

        {/* ── Mobile: compact horizontal rows ── */}
        <div className="flex w-full flex-col gap-3 lg:hidden">
          {/* Known */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileTap={{ scale: picked ? 1 : 0.98 }}
            onClick={() => actions.pickSoloOption('A')}
            disabled={Boolean(picked)}
            className={cn(
              'flex w-full items-center gap-3 rounded-[18px] bg-brand-green p-4 text-left active:translate-y-[2px]',
              picked && picked !== 'A' && 'opacity-45',
              picked === 'A' && 'ring-4 ring-white/70',
            )}
          >
            <PlayerPhoto footballer={pick.optionA.footballer} size={56} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-poppins text-[10px] font-black uppercase text-black/70">{t('auctionGame.knownPlayer')}</div>
              <div className="font-poppins text-base font-black text-white truncate">{pick.optionA.footballer.name}</div>
              <div className="mt-0.5 flex items-center gap-1.5 font-poppins text-[11px] font-bold text-black/70">
                <FlagChip country={pick.optionA.footballer.nationality} width={16} height={11} />
                <span className="truncate">
                  {pick.optionA.footballer.nationality} · {t('auctionGame.valueAmount', { amount: formatMoney(pick.optionA.footballer.value) })}
                </span>
              </div>
            </div>
            <MoneyChip amount={pick.optionA.footballer.startingPrice} />
          </motion.button>

          {/* Mystery */}
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileTap={{ scale: picked ? 1 : 0.98 }}
            onClick={() => actions.pickSoloOption('B')}
            disabled={Boolean(picked)}
            className={cn(
              'flex w-full items-center gap-3 rounded-[18px] p-4 text-left active:translate-y-[2px]',
              picked && picked !== 'B' && 'opacity-45',
              picked === 'B' && 'ring-4 ring-white/70',
            )}
            style={{ backgroundColor: AUCTION_PURPLE }}
          >
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl">❓</div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 font-poppins text-[10px] font-black uppercase text-white/80">{t('auctionGame.mysteryPlayer')}</div>
              {/* Fully blind until chosen: the mystery's snapshot NUMBERS are
                  server-side only (a devtools reader could otherwise identify
                  the player), so render skeleton rows, never zeroed stats. */}
              {pick.optionB.footballer.snapshots?.length ? (
                <SnapshotClues
                  snapshots={pick.optionB.footballer.snapshots}
                  visibleClues={0}
                  variant="panel"
                  position={pick.optionB.footballer.positionGroup}
                />
              ) : (
                <div className="space-y-0.5">
                  {pick.optionB.clues?.map((clue, i) => (
                    <p key={i} className="font-poppins text-[10px] font-semibold text-white/85 leading-snug">{clue}</p>
                  ))}
                </div>
              )}
            </div>
            <MoneyChip amount={pick.optionB.footballer.startingPrice} />
          </motion.button>
        </div>

        {/* ── Desktop: two big centered cards ── */}
        <div className="hidden lg:grid grid-cols-2 gap-4 w-full">
          {/* Option A — Revealed */}
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: picked ? 1 : 1.02 }}
            whileTap={{ scale: picked ? 1 : 0.97 }}
            onClick={() => actions.pickSoloOption('A')}
            disabled={Boolean(picked)}
            className={cn(
              'flex flex-col items-center gap-3 rounded-[22px] bg-brand-green p-6 sm:p-8 text-center transition-transform hover:brightness-105 active:translate-y-[2px]',
              picked && picked !== 'A' && 'opacity-45',
              picked === 'A' && 'ring-4 ring-white/70',
            )}
          >
            <PlayerPhoto footballer={pick.optionA.footballer} size={80} />
            <div className="font-poppins text-sm font-black uppercase text-black/70">
              {t('auctionGame.knownPlayer')}
            </div>
            <div className="font-poppins text-lg font-black text-white">{pick.optionA.footballer.name}</div>
            <div className="font-poppins text-sm font-bold text-black/70">
              {t('auctionGame.valueAmount', { amount: formatMoney(pick.optionA.footballer.value) })}
            </div>
            <MoneyChip amount={pick.optionA.footballer.startingPrice} size="lg" />
            <div className="flex items-center gap-2">
              <FlagChip country={pick.optionA.footballer.nationality} />
              <span className="font-poppins text-sm font-bold uppercase text-black/70">
                {pick.optionA.footballer.nationality}
              </span>
            </div>
          </motion.button>

          {/* Option B — Mystery */}
          <motion.button
            type="button"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: picked ? 1 : 1.02 }}
            whileTap={{ scale: picked ? 1 : 0.97 }}
            onClick={() => actions.pickSoloOption('B')}
            disabled={Boolean(picked)}
            className={cn(
              'flex flex-col items-center gap-3 rounded-[22px] p-6 sm:p-8 text-center transition-transform hover:brightness-110 active:translate-y-[2px]',
              picked && picked !== 'B' && 'opacity-45',
              picked === 'B' && 'ring-4 ring-white/70',
            )}
            style={{ backgroundColor: AUCTION_PURPLE }}
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="size-20 rounded-full bg-white/15 flex items-center justify-center text-4xl"
            >
              ❓
            </motion.div>
            <div className="font-poppins text-sm font-black text-white/80 uppercase">
              {t('auctionGame.mysteryPlayer')}
            </div>
            {pick.optionB.footballer.snapshots?.length ? (
              <div className="mt-1 w-full text-left">
                <SnapshotClues
                  snapshots={pick.optionB.footballer.snapshots}
                  visibleClues={0}
                  variant="panel"
                  position={pick.optionB.footballer.positionGroup}
                />
              </div>
            ) : (
              <div className="space-y-2 mt-1">
                {pick.optionB.clues?.map((clue, i) => (
                  <p key={i} className="font-poppins text-xs font-semibold text-white/85 leading-snug">
                    {clue}
                  </p>
                ))}
              </div>
            )}
            <MoneyChip amount={pick.optionB.footballer.startingPrice} size="lg" className="mt-auto" />
          </motion.button>
        </div>
      </div>
    </AuctionScreen>
  );
}
