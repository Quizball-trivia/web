'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { AuctionGameState } from '../../types';
import type { AuctionActions } from '../../hooks/useAuctionGame';
import { formatMoney, OPENING_TURN_MS, RAISE_TURN_MS, SNAPSHOT_STAT_STEPS } from '../../data';
import { useLocale } from '@/contexts/LocaleContext';
import { usePositionLabel } from '../../hooks/usePositionLabel';
import { useBiddingViewModel } from '../../hooks/useBiddingViewModel';
import { useRoundIntro } from '../../hooks/useRoundIntro';
import { SPRING } from '../../constants/motion';
import { AuctionRoundIntro } from '../screens/AuctionRoundIntro';
import { SCREEN_GLOW } from '../shared/ScreenBackdrop';
import { AuctionScreen } from '../shared/AuctionScreen';
import { StadiumBoard } from './StadiumBoard';
import { CountdownTimer } from './CountdownTimer';
import { CluesList } from './parts/CluesList';
import { SnapshotClues } from './parts/SnapshotClues';
import { StudyCountdown } from './parts/StudyCountdown';
import { TurnControls } from './parts/TurnControls';
import { SitOutWaiting } from './parts/SitOutWaiting';

function StadiumMysteryLoadingState({
  mysteryLabel,
  statusLabel,
}: {
  mysteryLabel: string;
  statusLabel: string;
}) {
  return (
    <AuctionScreen
      glow={SCREEN_GLOW.bidding}
      className="flex h-[100dvh] min-h-0 items-center justify-center px-4 py-8"
    >
      <motion.div
        data-testid="stadium-mystery-loading"
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={SPRING.settle}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-[28px] border-2 border-white/15 bg-brand-blue px-5 py-6 text-center shadow-[0_18px_60px_rgba(0,0,0,0.5)]"
      >
        <div aria-hidden="true" className="absolute -right-14 -top-16 size-48 rotate-12 rounded-[42px] bg-white/5" />
        <div aria-hidden="true" className="absolute -bottom-20 -left-12 size-48 -rotate-12 rounded-[42px] bg-black/10" />

        <motion.div
          aria-hidden="true"
          animate={{ y: [0, -6, 0], rotate: [-3, 3, -3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="relative mx-auto flex size-20 items-center justify-center rounded-full border-2 border-white/15 bg-black/20 text-4xl shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
        >
          ❓
        </motion.div>

        <p className="relative mt-4 font-poppins text-xl font-black uppercase tracking-wide text-white">
          {mysteryLabel}
        </p>

        <div aria-hidden="true" className="relative mt-5 space-y-2.5">
          {[76, 92, 64].map((width, index) => (
            <motion.div
              key={width}
              animate={{ opacity: [0.35, 0.75, 0.35] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.18 }}
              className="flex h-10 items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-3"
            >
              <span className="size-5 shrink-0 rounded-md bg-white/20" />
              <span className="h-2.5 rounded-full bg-white/25" style={{ width: `${width}%` }} />
            </motion.div>
          ))}
        </div>

        <p className="relative mt-4 font-poppins text-sm font-semibold text-white/70">{statusLabel}</p>
      </motion.div>
    </AuctionScreen>
  );
}

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
  disconnectedSeatIds = [],
}: {
  state: AuctionGameState;
  actions: AuctionActions;
  humanPlayerId: string;
  disconnectedSeatIds?: readonly string[];
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

  if (!vm.ready || !round || !humanPlayer) {
    return (
      <StadiumMysteryLoadingState
        mysteryLabel={t('auctionGame.mysteryPlayer')}
        statusLabel={t('auctionGame.preparingMysteryPlayer')}
      />
    );
  }

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
        <StadiumBoard
          state={state}
          humanPlayerId={humanPlayerId}
          activePosition={round.positionGroup}
          disconnectedSeatIds={disconnectedSeatIds}
        />
      </div>

      {/* Clue + auction panel — floating brand-blue card, breathing room above
          so it never crowds the stadium row. */}
      <div className="shrink-0 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 md:px-4 md:pb-4 md:pt-5">
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={SPRING.settle}
          className="relative mx-auto flex max-h-[54dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-[24px] border-2 border-white/15 bg-brand-blue px-3.5 pt-2 pb-2.5 shadow-[0_-8px_36px_rgba(0,0,0,0.5)] md:rounded-[24px]"
        >
          <div className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-white/20 md:hidden" />

          {/* Header — mirrors the mobile mystery card: black position chip +
              round chip up top, the mystery-player line beneath, live turn
              countdown floating top-right. */}
          {isBidding && round.turnEndsAt && round.currentTurnId && (
            <div className="absolute right-3 top-3 z-20">
              <CountdownTimer
                key={round.currentTurnId + String(round.turnEndsAt)}
                endsAt={round.turnEndsAt}
                totalMs={round.highestBidderId ? RAISE_TURN_MS : OPENING_TURN_MS}
              />
            </div>
          )}
          <div className="mb-2 flex shrink-0 items-center gap-2 pr-16">
            <div className="flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-[10px] bg-black px-3 font-poppins text-xs font-black uppercase text-brand-yellow">
              {posLabel(round.positionGroup)}
            </div>
            <div className="flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-[10px] bg-black/25 px-3 font-poppins text-xs font-semibold uppercase text-white">
              {t('auctionGame.round', { round: state.roundIndex })}
            </div>
          </div>
          <div className="mb-2 flex shrink-0 items-center gap-2">
            <span className="text-lg">❓</span>
            <span className="font-poppins text-sm font-black uppercase text-white">
              {t('auctionGame.mysteryPlayer')}
            </span>
          </div>

          {/* Clues — scouting snapshots when available, else text clues */}
          {round.footballer.snapshots?.length ? (
            <div className="space-y-2.5">
              <SnapshotClues snapshots={round.footballer.snapshots} visibleClues={visibleClues} variant="panel" accent={posColor} position={round.footballer.positionGroup} />
              {/* Authored text hints follow the stat facets as the last reveal steps. */}
              {round.clues.length > SNAPSHOT_STAT_STEPS.length && (
                <CluesList
                  clues={round.clues.slice(SNAPSHOT_STAT_STEPS.length)}
                  visibleClues={Math.max(0, visibleClues - SNAPSHOT_STAT_STEPS.length)}
                  variant="panel"
                  accent={posColor}
                />
              )}
            </div>
          ) : (
            <CluesList clues={round.clues} visibleClues={visibleClues} variant="panel" accent={posColor} />
          )}

          {/* Footer — CONSTANT height across clue / study / bidding phases so
              the panel never grows and the stadiums above never shrink. The
              phase content swaps inside the reserved box, bottom-aligned. */}
          {/* Reserved height must cover the tallest phase (status bar with
              bidder line + gap + controls ≈ 106px) or bidding overflows. */}
          <div className="mt-2 flex h-[108px] shrink-0 flex-col justify-end gap-2">
            {studyEndsAt ? (
              <StudyCountdown endsAt={studyEndsAt} variant="panel" />
            ) : isBidding ? (
              <BidStatusBar
                label={hasBids ? t('auctionGame.highestBid') : t('auctionGame.startingPriceLabel')}
                amount={formatMoney(hasBids ? round.highestBid : round.startingPrice)}
                by={highestBidder ? (highestBidder.id === humanPlayerId ? t('auctionGame.yourBid') : t('auctionGame.bidBy', { name: highestBidder.username })) : null}
                budget={formatMoney(humanPlayer.budget)}
                budgetLabel={t('auctionGame.budgetLabel')}
                outbid={humanOutbid}
                outbidLabel={t('auctionGame.outbid')}
              />
            ) : (
              <div className="flex items-center justify-between gap-2 border-t border-white/15 pt-3">
                <span className="font-poppins text-[11px] font-black uppercase tracking-wide text-white/80">
                  {t('auctionGame.startingPriceLabel')}
                </span>
                <span className="rounded-[10px] bg-black px-3.5 py-1.5 font-poppins text-lg font-black uppercase tabular-nums text-brand-yellow">
                  {formatMoney(round.startingPrice)}
                </span>
              </div>
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
}: {
  label: string;
  amount: string;
  by: string | null;
  budget: string;
  budgetLabel: string;
  outbid: boolean;
  outbidLabel: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-xl bg-black/25 px-3 py-1"
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
        <div className="relative h-[1.2rem] min-w-[5rem] overflow-visible" aria-live="polite">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={amount}
              initial={{ y: 10, scale: 1.24, opacity: 0, filter: 'brightness(1.8)' }}
              animate={{
                y: 0,
                scale: [1.24, 0.96, 1],
                opacity: 1,
                filter: ['brightness(1.8)', 'brightness(1.25)', 'brightness(1)'],
                textShadow: [
                  '0 0 20px rgba(255,229,0,0.95)',
                  '0 0 10px rgba(255,229,0,0.5)',
                  '0 0 0 rgba(255,229,0,0)',
                ],
              }}
              exit={{ y: -8, scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.42, times: [0, 0.62, 1] }}
              className="absolute left-0 top-0 font-poppins text-lg font-black tabular-nums leading-none text-brand-yellow"
              data-testid="desktop-current-bid"
            >
              {amount}
            </motion.div>
          </AnimatePresence>
        </div>
        <AnimatePresence initial={false} mode="wait">
          {by && (
            <motion.div
              key={by}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 5 }}
              className="mt-0.5 font-poppins text-[10px] font-semibold text-white/50"
            >
              {by}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="text-right">
        <div className="font-poppins text-[9px] font-black uppercase tracking-wide text-white/70">{budgetLabel}</div>
        <div className="font-poppins text-lg font-black tabular-nums leading-none text-white">{budget}</div>
      </div>
    </div>
  );
}
