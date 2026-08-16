'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { AuctionGameState } from '../../types';
import type { AuctionActions } from '../../hooks/useAuctionGame';
import { formatMoney, OPENING_TURN_MS, RAISE_TURN_MS } from '../../data';
import { useLocale } from '@/contexts/LocaleContext';
import { usePositionLabel } from '../../hooks/usePositionLabel';
import { useBiddingViewModel } from '../../hooks/useBiddingViewModel';
import { useRoundIntro } from '../../hooks/useRoundIntro';
import { SPRING } from '../../constants/motion';
import { AuctionRoundIntro } from '../screens/AuctionRoundIntro';
import { StadiumBoard } from './StadiumBoard';
import { CountdownTimer } from './CountdownTimer';
import { CluesList } from './parts/CluesList';
import { SnapshotClues } from './parts/SnapshotClues';
import { StudyCountdown } from './parts/StudyCountdown';
import { TurnControls } from './parts/TurnControls';
import { SitOutWaiting } from './parts/SitOutWaiting';

/**
 * Desktop "stadium" bidding layout: the three squads' pitches fill the top as
 * the focus (full formation, GK included), and the clue card + auction actions
 * live in a floating panel below — the pitches are never covered. Rival status /
 * budgets / the leader crown are read from the stadium headers, so this panel
 * doesn't repeat a rivals grid; it does carry the recent-bid ticker + OUTBID.
 * Shares the view-model + parts with the mobile BiddingScreen.
 */
export function StadiumBiddingScreen({
  state,
  actions,
  humanPlayerId,
}: {
  state: AuctionGameState;
  actions: AuctionActions;
  humanPlayerId: string;
}) {
  const { t } = useLocale();
  const posLabel = usePositionLabel();
  const vm = useBiddingViewModel(state, actions, humanPlayerId);
  const { showRoundIntro, onIntroDone } = useRoundIntro(state, actions);

  const {
    round,
    humanPlayer,
    isBidding,
    visibleClues,
    allCluesRevealed,
    hasBids,
    studyEndsAt,
    minBid,
    maxBid,
    posColor,
    myTurn,
    mustOpen,
    humanFolded,
    sitOutReason,
    currentTurnPlayer,
    highestBidder,
    humanOutbid,
    pendingTurnAction,
  } = vm;

  if (!vm.ready || !round || !humanPlayer) return null;

  const showControls = allCluesRevealed && !studyEndsAt && isBidding;

  return (
    <div
      data-testid="stadium-screen"
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-surface-page-alt"
    >
      <AnimatePresence>
        {showRoundIntro && (
          <AuctionRoundIntro
            key={state.roundIndex}
            roundIndex={state.roundIndex}
            positionGroup={round.positionGroup}
            onDone={onIntroDone}
          />
        )}
      </AnimatePresence>

      {/* Stadiums row — full formation visible, never covered by the panel. */}
      <div className="min-h-0 flex-1 pt-2 md:pt-3">
        <StadiumBoard state={state} humanPlayerId={humanPlayerId} activePosition={round.positionGroup} />
      </div>

      {/* Clue + auction panel — floating brand-blue card, breathing room above
          so it never crowds the stadium row. */}
      <div className="shrink-0 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 md:px-4 md:pb-4 md:pt-5">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={SPRING.settle}
          className="mx-auto flex max-h-[48dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-[24px] border-2 border-white/15 bg-brand-blue px-3.5 pt-2 pb-2.5 shadow-[0_-8px_36px_rgba(0,0,0,0.5)] md:rounded-[24px]"
        >
          <div className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-white/20 md:hidden" />

          {/* Header: position + round chips, countdown on the right */}
          <div className="mb-2 flex shrink-0 items-center gap-2">
            <span
              className="flex h-6 items-center rounded-[8px] px-2.5 font-poppins text-[11px] font-black uppercase text-black"
              style={{ backgroundColor: posColor }}
            >
              {posLabel(round.positionGroup)}
            </span>
            <span className="flex h-6 items-center rounded-[8px] bg-white/10 px-2.5 font-poppins text-[11px] font-semibold uppercase text-white/70">
              {t('auctionGame.round', { round: state.roundIndex })}
            </span>
            <span className="flex items-center gap-1.5 font-poppins text-xs font-black uppercase text-white">
              <span className="text-base">❓</span> {t('auctionGame.mysteryPlayer')}
            </span>
            <div className="ml-auto">
              {isBidding && round.turnEndsAt && round.currentTurnId && (
                <CountdownTimer
                  key={round.currentTurnId + String(round.turnEndsAt)}
                  endsAt={round.turnEndsAt}
                  totalMs={round.highestBidderId ? RAISE_TURN_MS : OPENING_TURN_MS}
                />
              )}
            </div>
          </div>

          {/* Clues — scouting snapshots when available, else text clues */}
          {round.footballer.snapshots?.length ? (
            <SnapshotClues snapshots={round.footballer.snapshots} visibleClues={visibleClues} variant="panel" accent={posColor} position={round.footballer.positionGroup} />
          ) : (
            <CluesList clues={round.clues} visibleClues={visibleClues} variant="panel" accent={posColor} />
          )}

          {/* Footer: study countdown → OR → bid status + clean controls */}
          <div className="mt-3 shrink-0 space-y-2.5">
            {studyEndsAt ? (
              <StudyCountdown endsAt={studyEndsAt} variant="panel" />
            ) : (
              <BidStatusBar
                label={hasBids ? t('auctionGame.highestBid') : t('auctionGame.startingPriceLabel')}
                amount={formatMoney(hasBids ? round.highestBid : round.startingPrice)}
                by={highestBidder ? (highestBidder.id === humanPlayerId ? t('auctionGame.yourBid') : t('auctionGame.bidBy', { name: highestBidder.username })) : null}
                budget={formatMoney(humanPlayer.budget)}
                budgetLabel={t('auctionGame.budgetLabel')}
                outbid={humanOutbid}
                outbidLabel={t('auctionGame.outbid')}
                accent={posColor}
              />
            )}

            {/* Turn-based controls (only once bidding is open) */}
            {showControls &&
              (myTurn ? (
                <TurnControls
                  minBid={minBid}
                  maxBid={maxBid}
                  currentBudget={humanPlayer.budget}
                  mustOpen={mustOpen}
                  pendingTurnAction={pendingTurnAction}
                  onBid={actions.placeBid}
                  onFold={actions.fold}
                />
              ) : (
                <SitOutWaiting
                  sitOutReason={sitOutReason}
                  positionGroup={round.positionGroup}
                  posColor={posColor}
                  humanFolded={humanFolded}
                  currentTurnPlayer={currentTurnPlayer}
                />
              ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** Compact bid-status row: current/highest bid on the left, your budget on the
 *  right, with an OUTBID flag. Replaces the old stat box + ticker stack. */
function BidStatusBar({
  label,
  amount,
  by,
  budget,
  budgetLabel,
  outbid,
  outbidLabel,
  accent,
}: {
  label: string;
  amount: string;
  by: string | null;
  budget: string;
  budgetLabel: string;
  outbid: boolean;
  outbidLabel: string;
  accent: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-[14px] border-l-[3px] bg-black/25 px-4 py-1.5"
      style={{ borderColor: accent }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-poppins text-[9px] font-black uppercase tracking-wide text-white/70">{label}</span>
          {outbid && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-full bg-brand-red/20 px-2 py-0.5 font-poppins text-[9px] font-black uppercase text-brand-red"
            >
              {outbidLabel}
            </motion.span>
          )}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={amount}
            initial={{ scale: 1.1, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={SPRING.snap}
            className="font-poppins text-xl font-black tabular-nums leading-none text-brand-yellow"
          >
            {amount}
          </motion.div>
        </AnimatePresence>
        {by && <div className="mt-0.5 font-poppins text-[10px] font-semibold text-white/50">{by}</div>}
      </div>
      <div className="text-right">
        <div className="font-poppins text-[9px] font-black uppercase tracking-wide text-white/70">{budgetLabel}</div>
        <div className="font-poppins text-lg font-black tabular-nums leading-none text-white">{budget}</div>
      </div>
    </div>
  );
}
