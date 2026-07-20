'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AuctionGameState } from '../../types';
import type { AuctionActions } from '../../hooks/useAuctionGame';
import { formatMoney, getMaxBid, getMinBid, needsPosition, CLUE_STUDY_MS, OPENING_TURN_MS, RAISE_TURN_MS } from '../../data';
import { POS_COLORS } from '../../constants/auction.constants';
import { useLocale } from '@/contexts/LocaleContext';
import { usePositionLabel } from '../../hooks/usePositionLabel';
import { SCREEN_GLOW } from '../shared/ScreenBackdrop';
import { AuctionScreen } from '../shared/AuctionScreen';
import { AuctionRoundIntro } from '../screens/AuctionRoundIntro';
import { AllSquads } from '../pitch/AllSquads';
import { CountdownTimer } from './CountdownTimer';
import { BidTicker } from './BidTicker';
import { BiddingRivals } from './BiddingRivals';
import { QuickBidPanel } from './QuickBidPanel';

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

  // Full-screen round intro: shown once per clue-phase round, dismissed by the
  // intro's own timer. Tracked by roundIndex (not a boolean) so a remount during
  // the same round can't replay it, and a genuinely new round always arms it.
  const [introDoneForRound, setIntroDoneForRound] = useState<number | null>(null);
  const showRoundIntro = isCluePhase && introDoneForRound !== state.roundIndex;

  const visibleClues = round ? (isCluePhase ? round.clueRevealIndex : round.clues.length) : 0;
  const allCluesRevealed = round ? visibleClues >= round.clues.length : false;
  const hasBids = round ? round.highestBid > 0 : false;

  // Study window: every clue is on the board and the server is counting down to
  // the first turn. `biddingStartsAt` is server-driven, so it survives reloads.
  const studyEndsAt = isCluePhase ? round?.biddingStartsAt ?? null : null;

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

  // Why can't I bid? `turnOrder` only contains seats that still need this
  // position, so a player who is full there is silently excluded for the whole
  // lot. Without a reason the UI just said "Watching" and looked broken.
  const inTurnOrder = round.turnOrder.includes(humanPlayerId);
  const sitOutReason: 'eliminated' | 'position-filled' | null = humanPlayer.isEliminated
    ? 'eliminated'
    : !inTurnOrder
      ? 'position-filled'
      : null;

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
      <AnimatePresence>
        {showRoundIntro && (
          <AuctionRoundIntro
            key={state.roundIndex}
            roundIndex={state.roundIndex}
            positionGroup={round.positionGroup}
            onDone={() => {
              setIntroDoneForRound(state.roundIndex);
              // Live mode: releases the server's ui-ready gate so clues start
              // revealing now rather than behind the intro.
              actions.confirmRoundIntro?.();
            }}
          />
        )}
      </AnimatePresence>

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

            {/* Clues — large type, slow reveal. Each clue eases up into place
                over ~0.9s so the board fills deliberately rather than snapping. */}
            <div className="space-y-4 min-h-[140px]">
              <AnimatePresence>
                {round.clues.slice(0, visibleClues).map((clue, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-start gap-3"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.2 }}
                      className="mt-0.5 size-7 shrink-0 rounded-full flex items-center justify-center bg-black font-poppins text-sm font-black text-brand-yellow leading-none"
                    >
                      {i + 1}
                    </motion.div>
                    <p className="font-poppins text-lg font-bold leading-snug text-black sm:text-xl">{clue}</p>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isCluePhase && !allCluesRevealed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 pt-1">
                  <div className="size-4 rounded-full border-2 border-black/15 border-t-black/50 animate-spin" />
                  <span className="font-poppins text-sm font-semibold text-black/55">
                    {t('auctionGame.revealingClue', { current: visibleClues + 1, total: round.clues.length })}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Study countdown — all clues are out, bidding opens when it hits 0. */}
            {studyEndsAt && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center justify-between gap-3 rounded-[14px] bg-black/10 px-3.5 py-2.5"
              >
                <span className="font-poppins text-xs font-black uppercase tracking-wide text-black/70">
                  {t('auctionGame.biddingOpensIn')}
                </span>
                <CountdownTimer key={String(studyEndsAt)} endsAt={studyEndsAt} totalMs={CLUE_STUDY_MS} />
              </motion.div>
            )}

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

          {/* Bidding controls — held back through the study window so the board
              doesn't advertise "bidding open" while the countdown is still running. */}
          {allCluesRevealed && !studyEndsAt && (
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

                        {/* Your budget — the number you actually decide against,
                            and visible on every turn, not just your own. (It
                            replaced a raw bid count, which competed for the same
                            visual weight while informing almost nothing.) */}
                        <div className="text-right">
                          <div className="font-poppins text-[11px] font-black uppercase text-white/70 mb-1">
                            {t('auctionGame.budgetLabel')}
                          </div>
                          <div className="font-poppins text-3xl sm:text-4xl font-black text-white tabular-nums leading-none">
                            {formatMoney(humanPlayer.budget)}
                          </div>
                          <div className="font-poppins text-xs font-semibold text-white/50 mt-1.5">
                            {t('auctionGame.totalBidsShort', { count: round.bids.length })}
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

              {/* Who you're up against: folded / still in / leading, and how
                  much each has left to outbid you with. */}
              <BiddingRivals players={state.players} round={round} humanPlayerId={humanPlayerId} />

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
                        isOpeningBid={mustOpen}
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
                // Not your turn. Lead with WHY you can't act (sat out for this
                // lot / folded), then who everyone is waiting on.
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-2">
                  {sitOutReason && (
                    <div
                      className="flex items-center justify-center gap-2 rounded-[14px] border-2 px-5 py-3 text-center font-poppins text-sm font-black uppercase"
                      style={{
                        borderColor: `${posColor}55`,
                        backgroundColor: `${posColor}14`,
                        color: posColor,
                      }}
                    >
                      {sitOutReason === 'eliminated'
                        ? t('auctionGame.eliminatedWatching')
                        : t('auctionGame.positionFilledWatching', {
                            position: posLabel(round.positionGroup),
                          })}
                    </div>
                  )}
                  <div
                    aria-live="polite"
                    className="flex items-center justify-center gap-2 rounded-[14px] border-2 border-white/5 bg-white/[0.03] px-5 py-3 text-center font-poppins text-sm font-semibold uppercase text-white/45"
                  >
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
