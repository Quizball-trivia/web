'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AuctionGameState } from '../../types';
import type { AuctionActions } from '../../hooks/useAuctionGame';
import { formatMoney, getMaxBid, getMinBid, needsPosition, OPENING_TURN_MS, RAISE_TURN_MS } from '../../data';
import { POS_COLORS } from '../../constants/auction.constants';
import { useLocale } from '@/contexts/LocaleContext';
import { usePositionLabel } from '../../hooks/usePositionLabel';
import { SCREEN_GLOW } from '../shared/ScreenBackdrop';
import { AuctionScreen } from '../shared/AuctionScreen';
import { RoundTransitionOverlay } from '@/components/game/RoundTransitionOverlay';
import { AllSquads } from '../pitch/AllSquads';
import { CountdownTimer } from './CountdownTimer';
import { BidTicker } from './BidTicker';
import { QuickBidPanel } from './QuickBidPanel';

/** How long the round-start intro shows over the clue card before fading. */
const ROUND_INTRO_MS = 1600;

/** Main bidding UI: mystery card, clues, current-bid panel, ticker, bid panel, squads. */
export function BiddingScreen({
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
  const round = state.currentRound;
  const humanPlayer = state.players.find((p) => p.id === humanPlayerId);

  const isCluePhase = state.phase === 'clue-reveal';
  const isBidding = state.phase === 'bidding';

  // Round-start intro: a brief overlay on the clue card each new round.
  // Deadline-based + interval-ticked (same pattern as the possession intro) so
  // a remount or the clue-reveal re-render can't strand it visible. Keyed on
  // (clue-phase, roundIndex): each new clue-phase round arms a fresh deadline,
  // and the interval ticks `nowMs` until it passes.
  const [introDeadline, setIntroDeadline] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!isCluePhase) {
      queueMicrotask(() => setIntroDeadline(null));
      return;
    }
    const deadline = Date.now() + ROUND_INTRO_MS;
    queueMicrotask(() => {
      setIntroDeadline(deadline);
      setNowMs(Date.now());
    });
    const interval = setInterval(() => {
      setNowMs(Date.now());
      if (Date.now() >= deadline) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [isCluePhase, state.roundIndex]);

  const showRoundIntro = introDeadline !== null && nowMs < introDeadline;

  const visibleClues = round ? (isCluePhase ? round.clueRevealIndex : round.clues.length) : 0;
  const allCluesRevealed = round ? visibleClues >= round.clues.length : false;
  const hasBids = round ? round.highestBid > 0 : false;

  const minBid = round ? getMinBid(round) : 0;

  if (!round || !humanPlayer) return null;

  // Turn-based: you only act on your turn.
  const myTurn = isBidding && round.currentTurnId === humanPlayerId;
  // Forced opener (no standing bid yet) must bid — fold is disabled.
  const mustOpen = myTurn && !round.highestBidderId;
  const currentTurnPlayer = round.currentTurnId
    ? state.players.find((p) => p.id === round.currentTurnId)
    : null;
  const humanFolded = round.foldedIds.includes(humanPlayerId);

  const maxBid = getMaxBid(humanPlayer);
  const posColor = POS_COLORS[round.positionGroup];

  const highestBidder = round.highestBidderId
    ? state.players.find((p) => p.id === round.highestBidderId)
    : null;

  const competitorsNeedingPos = state.players.filter(
    (p) => p.id !== humanPlayerId && !p.isEliminated && needsPosition(p, round.positionGroup),
  ).length;

  // Human has bid this round but is no longer the top bidder → OUTBID.
  const humanOutbid =
    isBidding &&
    round.bids.some((b) => b.playerId === humanPlayerId) &&
    round.highestBidderId !== humanPlayerId;
  const pendingTurnAction = actions.pendingTurnAction ?? null;

  return (
    <AuctionScreen glow={SCREEN_GLOW.bidding} className="flex flex-col">
      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto">
        {/* Main area */}
        <div className="flex flex-col items-center gap-3 px-4 pt-4 pb-2 mx-auto w-full max-w-lg">
          {/* Mystery card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative w-full rounded-[20px] bg-brand-yellow p-4 sm:p-5"
            style={isCluePhase ? { boxShadow: `0 0 40px ${posColor}08` } : undefined}
          >
            {/* Round-start intro — overlays only this clue card, then fades,
                using the SAME RoundTransitionOverlay component + appear/disappear
                animation as the ranked match (dark scrim over the yellow card). */}
            <AnimatePresence>
              {showRoundIntro && (
                <RoundTransitionOverlay
                  title={posLabel(round.positionGroup)}
                  categoryName={t('auctionGame.round', { round: state.roundIndex })}
                  subtitle={t('auctionGame.mysteryPlayer')}
                  className="z-30 rounded-[20px] bg-surface-deep/95 backdrop-blur-sm"
                />
              )}
            </AnimatePresence>


            {/* "Rivals want this" — tilted ribbon badge, top-left, outside the card.
                Drops in from above + overshoots + bounces (slightly longer fall than
                the shared DropInBadge, so kept inline). Held back until the round
                intro overlay has cleared so it doesn't drop behind/through it. */}
            {competitorsNeedingPos > 0 && !showRoundIntro && (
              <motion.div
                initial={{ y: -600, opacity: 0, rotate: -28, scale: 0.55 }}
                animate={{
                  opacity: 1,
                  y: [-600, 30, -12, 6, -2, 0],
                  rotate: [-28, -2, -10, -4, -7, -6],
                  scale: [0.55, 1.1, 0.94, 1.04, 0.99, 1],
                }}
                transition={{
                  y: { duration: 1.0, times: [0, 0.55, 0.7, 0.82, 0.92, 1], ease: [0.4, 0, 0.7, 0.2] },
                  rotate: { duration: 1.0, times: [0, 0.55, 0.7, 0.82, 0.92, 1], ease: 'easeOut' },
                  scale: { duration: 1.0, times: [0, 0.55, 0.7, 0.82, 0.92, 1], ease: 'easeOut' },
                  opacity: { duration: 0.2, ease: 'easeOut' },
                }}
                style={{ transformOrigin: 'center' }}
                className="absolute -left-2 -top-3.5 z-20 rounded-lg bg-brand-orange px-3.5 py-1.5 font-poppins text-xs font-black uppercase tracking-wide text-white shadow-[0_3px_10px_rgba(0,0,0,0.45)]"
              >
                {competitorsNeedingPos > 1
                  ? t('auctionGame.rivalsWantThisPlural', { count: competitorsNeedingPos })
                  : t('auctionGame.rivalsWantThis', { count: competitorsNeedingPos })}
              </motion.div>
            )}

            {/* Turn countdown — shows the active player's clock, top-right */}
            {isBidding && round.turnEndsAt && round.currentTurnId && (
              <div className="absolute right-3 top-3 z-20">
                <CountdownTimer
                  key={round.currentTurnId + String(round.turnEndsAt)}
                  endsAt={round.turnEndsAt}
                  totalMs={round.highestBidderId ? RAISE_TURN_MS : OPENING_TURN_MS}
                />
              </div>
            )}

            {/* Position + round chips — head the question card */}
            <div className="mb-3 flex items-center gap-2 pr-16">
              <div className="flex h-7 items-center justify-center rounded-[10px] bg-black px-3 font-poppins text-xs font-black uppercase text-brand-yellow">
                {posLabel(round.positionGroup)}
              </div>
              <div className="flex h-7 items-center justify-center rounded-[10px] bg-brand-blue px-3 font-poppins text-xs font-semibold uppercase text-white">
                {t('auctionGame.round', { round: state.roundIndex })}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <motion.div
                animate={isCluePhase ? { rotate: [0, 10, -10, 0] } : {}}
                transition={isCluePhase ? { duration: 2, repeat: Infinity } : {}}
                className="text-xl"
              >
                ❓
              </motion.div>
              <div className="font-poppins text-sm font-black uppercase text-black">
                {t('auctionGame.mysteryPlayer')}
              </div>
            </div>

            {/* Clues */}
            <div className="space-y-2.5 min-h-[80px]">
              <AnimatePresence>
                {round.clues.slice(0, visibleClues).map((clue, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-2.5"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.1 }}
                      className="size-5 shrink-0 rounded-full flex items-center justify-center bg-black font-poppins text-[10px] font-black text-brand-yellow leading-none"
                    >
                      {i + 1}
                    </motion.div>
                    <p className="font-poppins text-[13px] font-semibold text-black/80 leading-tight">{clue}</p>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isCluePhase && !allCluesRevealed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 pt-1">
                  <div className="size-4 rounded-full border-2 border-black/15 border-t-black/50 animate-spin" />
                  <span className="font-poppins text-xs font-semibold text-black/55">
                    {t('auctionGame.revealingClue', { current: visibleClues + 1, total: round.clues.length })}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Starting price — own row below the clues (no overlap) */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/10 pt-3">
              <span className="font-poppins text-[11px] font-black uppercase tracking-wide text-black/60">
                {t('auctionGame.startingPriceLabel')}
              </span>
              <span className="rounded-[10px] bg-black px-3.5 py-1.5 font-poppins text-lg font-black uppercase tabular-nums text-brand-yellow">
                {formatMoney(round.startingPrice)}
              </span>
            </div>
          </motion.div>

          {/* Bidding controls */}
          {allCluesRevealed && (
            <>
              {/* Current bid display */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full rounded-[16px] border-2 border-white/10 bg-white/[0.03] p-4"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={round.highestBid}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {hasBids ? (
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-poppins text-[11px] font-black uppercase text-white/70 mb-1">
                            {t('auctionGame.highestBid')}
                          </div>
                          <motion.div
                            key={round.highestBid}
                            initial={{ scale: 1.15 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="font-poppins text-3xl sm:text-4xl font-black text-brand-yellow tabular-nums leading-none"
                            style={{ textShadow: '0 2px 16px rgba(255,229,0,0.3)' }}
                          >
                            {formatMoney(round.highestBid)}
                          </motion.div>
                          {highestBidder && (
                            <div className="font-poppins text-xs font-semibold text-white/70 mt-1.5">
                              {highestBidder.id === humanPlayerId
                                ? t('auctionGame.yourBid')
                                : t('auctionGame.bidBy', { name: highestBidder.username })}
                            </div>
                          )}
                        </div>

                        {/* Bid count — top-aligned with the Highest Bid label */}
                        <div className="text-right">
                          <div className="font-poppins text-[11px] font-black uppercase text-white/70 mb-1">
                            {t('auctionGame.totalBids')}
                          </div>
                          <div className="font-poppins text-3xl sm:text-4xl font-black text-white tabular-nums leading-none">
                            {round.bids.length}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-1">
                        <motion.div
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="font-poppins text-sm font-black uppercase text-brand-green"
                        >
                          {t('auctionGame.biddingOpen')}
                        </motion.div>
                        <div className="font-poppins text-2xl font-black text-white/60 tabular-nums mt-0.5">
                          {formatMoney(round.startingPrice)}
                        </div>
                        <div className="font-poppins text-[11px] font-semibold text-white/30 mt-0.5">
                          {t('auctionGame.placeFirstBidToStartClock')}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {/* Bid activity ticker */}
              {round.bids.length > 0 && (
                <BidTicker
                  bids={round.bids}
                  players={state.players}
                  humanPlayerId={humanPlayerId}
                  outbid={humanOutbid}
                />
              )}

              {/* Turn-based bid controls */}
              {myTurn ? (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-2">
                  {pendingTurnAction ? (
                    <div className="flex items-center justify-center gap-2 rounded-[14px] border-2 border-white/5 bg-white/[0.03] px-5 py-3 text-center font-poppins text-sm font-semibold uppercase text-white/45">
                      <span className="size-3 shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-brand-yellow" />
                      {pendingTurnAction.kind === 'bid'
                        ? t('auctionGame.bidPlacedWaiting')
                        : t('auctionGame.foldPlacedWaiting')}
                    </div>
                  ) : (
                    <>
                      <div className="text-center font-poppins text-xs font-black uppercase tracking-wide text-brand-yellow">
                        {t('auctionGame.yourTurn')}
                      </div>
                      <QuickBidPanel
                        key={minBid}
                        minBid={minBid}
                        maxBid={maxBid}
                        currentBudget={humanPlayer.budget}
                        onBid={actions.placeBid}
                      />
                      {/* Fold only when there's a standing bid — the opener must bid. */}
                      {!mustOpen && (
                        <button
                          type="button"
                          onClick={actions.fold}
                          className="flex h-11 w-full items-center justify-center rounded-[12px] border-2 border-brand-red/40 bg-brand-red/10 font-poppins text-sm font-black uppercase text-brand-red transition-colors hover:bg-brand-red/20"
                        >
                          {t('auctionGame.fold')}
                        </button>
                      )}
                    </>
                  )}
                </motion.div>
              ) : isBidding ? (
                // Not your turn → status: folded / waiting for the active player.
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                  <div className="flex items-center justify-center gap-2 rounded-[14px] border-2 border-white/5 bg-white/[0.03] px-5 py-3 text-center font-poppins text-sm font-semibold uppercase text-white/45">
                    {humanFolded ? (
                      t('auctionGame.youFolded')
                    ) : currentTurnPlayer ? (
                      <>
                        <span className="size-2 shrink-0 animate-pulse rounded-full bg-brand-yellow" />
                        {t('auctionGame.waitingForTurn', { name: currentTurnPlayer.username })}
                      </>
                    ) : (
                      t('auctionGame.watching')
                    )}
                  </div>
                </motion.div>
              ) : null}
            </>
          )}
        </div>

        {/* All squads — sits directly below the bidding controls (no bottom-pin gap) */}
        <div className="px-4 pb-5 pt-1">
          <AllSquads state={state} humanPlayerId={humanPlayerId} pitchSize="md" activePosition={round.positionGroup} />
        </div>
      </div>
    </AuctionScreen>
  );
}
