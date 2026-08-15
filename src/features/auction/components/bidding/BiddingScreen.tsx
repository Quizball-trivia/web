'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { AuctionGameState } from '../../types';
import type { AuctionActions } from '../../hooks/useAuctionGame';
import { formatMoney, OPENING_TURN_MS, RAISE_TURN_MS } from '../../data';
import { useLocale } from '@/contexts/LocaleContext';
import { usePositionLabel } from '../../hooks/usePositionLabel';
import { useBiddingViewModel } from '../../hooks/useBiddingViewModel';
import { useRoundIntro } from '../../hooks/useRoundIntro';
import { SCREEN_GLOW } from '../shared/ScreenBackdrop';
import { AuctionScreen } from '../shared/AuctionScreen';
import { DropInBadge } from '../shared/DropInBadge';
import { AuctionRoundIntro } from '../screens/AuctionRoundIntro';
import { AllSquads } from '../pitch/AllSquads';
import { CountdownTimer } from './CountdownTimer';
import { BidTicker } from './BidTicker';
import { BiddingRivals } from './BiddingRivals';
import { CluesList } from './parts/CluesList';
import { SnapshotClues } from './parts/SnapshotClues';
import { StudyCountdown } from './parts/StudyCountdown';
import { TurnControls } from './parts/TurnControls';
import { SitOutWaiting } from './parts/SitOutWaiting';

/** Main bidding UI (mobile): mystery card, clues, current-bid panel, ticker, bid panel, squads. */
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
  const vm = useBiddingViewModel(state, actions, humanPlayerId);
  const { showRoundIntro, onIntroDone } = useRoundIntro(state, actions);

  const {
    round,
    humanPlayer,
    isCluePhase,
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
    competitorsNeedingPos,
    pendingTurnAction,
  } = vm;

  if (!vm.ready || !round || !humanPlayer) return null;

  return (
    <AuctionScreen glow={SCREEN_GLOW.bidding} className="flex flex-col">
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
            {/* "Rivals want this" — shared drop-in ribbon, top-left, outside the
                card. Held back until the round intro overlay has cleared. */}
            {competitorsNeedingPos > 0 && !showRoundIntro && (
              <DropInBadge
                className="absolute -left-2 -top-3.5 z-20 rounded-lg bg-brand-orange px-3.5 py-1.5 font-poppins text-xs font-black uppercase tracking-wide text-white shadow-[0_3px_10px_rgba(0,0,0,0.45)]"
                landingRotate={-6}
              >
                {competitorsNeedingPos > 1
                  ? t('auctionGame.rivalsWantThisPlural', { count: competitorsNeedingPos })
                  : t('auctionGame.rivalsWantThis', { count: competitorsNeedingPos })}
              </DropInBadge>
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

            {/* Clues — scouting snapshots when available, else text clues */}
            {round.footballer.snapshots?.length ? (
              <SnapshotClues snapshots={round.footballer.snapshots} visibleClues={visibleClues} variant="card" accent={posColor} position={round.footballer.positionGroup} />
            ) : (
              <CluesList clues={round.clues} visibleClues={visibleClues} variant="card" accent={posColor} />
            )}

            {/* Study countdown — all clues are out, bidding opens when it hits 0. */}
            {studyEndsAt && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                <StudyCountdown endsAt={studyEndsAt} variant="card" />
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

          {/* Bidding controls — held back through the study window. */}
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

              {/* Who you're up against */}
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
                  <TurnControls
                    minBid={minBid}
                    maxBid={maxBid}
                    currentBudget={humanPlayer.budget}
                    mustOpen={mustOpen}
                    pendingTurnAction={pendingTurnAction}
                    onBid={actions.placeBid}
                    onFold={actions.fold}
                    showTurnLabel
                  />
                </motion.div>
              ) : isBidding ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                  <SitOutWaiting
                    sitOutReason={sitOutReason}
                    positionGroup={round.positionGroup}
                    posColor={posColor}
                    humanFolded={humanFolded}
                    currentTurnPlayer={currentTurnPlayer}
                  />
                </motion.div>
              ) : null}
            </>
          )}
        </div>

        {/* All squads — sits directly below the bidding controls */}
        <div className="px-4 pb-5 pt-1">
          <AllSquads state={state} humanPlayerId={humanPlayerId} pitchSize="md" activePosition={round.positionGroup} />
        </div>
      </div>
    </AuctionScreen>
  );
}
