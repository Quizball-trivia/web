'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AuctionGameState } from '../../types';
import type { AuctionActions } from '../../hooks/useAuctionGame';
import { formatMoney, computeSquadChemistry, chemistryMultiplier, getFutureValue } from '../../data';
import { resolveClubCrestByName } from '@/lib/clubs';
import { getLeague } from '../../data/leagues';
import { POS_COLORS, poppins, withAlpha } from '../../constants/auction.constants';
import { useLocale } from '@/contexts/LocaleContext';
import { SCREEN_GLOW } from '../shared/ScreenBackdrop';
import { AuctionScreen } from '../shared/AuctionScreen';
import { AuctionPrimaryButton } from '../shared/AuctionPrimaryButton';
import { SoldFlash } from '../shared/SoldFlash';
import { MoneyFx } from '../shared/MoneyFx';
import { DealBadge } from '../shared/DealBadge';
import { PlayerPhoto } from '../shared/PlayerPhoto';
import { FlagChip } from '../shared/FlagChip';
import { ClubCrest } from '../shared/ClubCrest';
import { LeagueLogo } from '../shared/LeagueLogo';
import { ChemistryBadge } from '../shared/ChemistryPanel';
import { AllSquads } from '../pitch/AllSquads';

/** Staged dramatic reveal: SOLD flash → photo → name → value/sold → deal badge → squads → next. */
export function RevealScreen({
  state,
  actions,
  humanPlayerId,
  serverDrivenTransitions = false,
}: {
  state: AuctionGameState;
  actions: AuctionActions;
  humanPlayerId: string;
  serverDrivenTransitions?: boolean;
}) {
  const { t } = useLocale();
  const round = state.currentRound;
  const [stage, setStage] = useState(0);
  const [showSold, setShowSold] = useState(true);
  const [holdDone, setHoldDone] = useState(false);
  const serverRevealAckedRoundRef = useRef<string | null>(null);

  useEffect(() => {
    const timers = [
      setTimeout(() => setShowSold(false), 700),
      setTimeout(() => setStage(1), 400),
      setTimeout(() => setStage(2), 700),
      setTimeout(() => setStage(3), 1000),
      setTimeout(() => setStage(4), 1300),
      setTimeout(() => setStage(5), 1600),
      // Everything is on screen at 1.6s; hold the full picture a short beat
      // before acking so the server doesn't sweep into the next round instantly.
      // Full picture on screen at 1.6s; hold it so the sold player is
      // actually readable before the server sweeps into the next round.
      setTimeout(() => setHoldDone(true), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!serverDrivenTransitions || stage < 5 || !holdDone || !round) return;
    const revealKey = `${state.roundIndex}:${round.footballer.id}`;
    if (serverRevealAckedRoundRef.current === revealKey) return;
    serverRevealAckedRoundRef.current = revealKey;
    actions.confirmReveal();
  }, [actions, holdDone, round, serverDrivenTransitions, stage, state.roundIndex]);

  if (!round) {
    return (
      <AuctionScreen className="flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 text-center"
        >
          <div className="size-10 animate-spin rounded-full border-4 border-white/20 border-t-brand-yellow" />
          <p className="font-poppins text-sm font-black uppercase tracking-[0.14em] text-white/75">
            {t('auctionGame.confirmingTransfer')}
          </p>
        </motion.div>
      </AuctionScreen>
    );
  }

  const winner = state.players.find((p) => p.id === round.winnerId);
  const posColor = POS_COLORS[round.positionGroup];
  const isHumanWin = round.winnerId === humanPlayerId;
  const club = resolveClubCrestByName(round.footballer.club ?? null);
  const league = getLeague(round.footballer.league ?? null);
  // Scoring uses the player's LATER-season value (the clue phase showed an
  // earlier season); the gap between what you paid and this is the profit.
  const futureValue = getFutureValue(round.footballer);
  const valueSeason = round.footballer.snapshots?.at(-1)?.season ?? null;

  // Chemistry this signing added to the winner's squad. The player is already
  // assigned by reveal time, so we diff the winner's current chem against the
  // same squad with this footballer removed from their position slot.
  let winnerChemNow = 0;
  let chemGain = 0;
  if (winner) {
    winnerChemNow = computeSquadChemistry(winner.team).total;
    const posSlots = winner.team.slots[round.positionGroup].filter((f) => f.id !== round.footballer.id);
    const teamWithout = { ...winner.team, slots: { ...winner.team.slots, [round.positionGroup]: posSlots } };
    chemGain = winnerChemNow - computeSquadChemistry(teamWithout).total;
  }
  // Randomly alternate the win cash-FX (burst / fountain), stable per reveal.
  const moneyFxVariant: 'burst' | 'fountain' =
    round.footballer.id.length % 2 === 0 ? 'burst' : 'fountain';

  return (
    <AuctionScreen glow={isHumanWin ? SCREEN_GLOW.win : SCREEN_GLOW.soloPick} className="flex flex-col">

      {/* SOLD! flash */}
      <SoldFlash visible={showSold && round.highestBid > 0} />

      {/* Cash FX on human win (burst or fountain, alternating) */}
      <MoneyFx active={isHumanWin && stage >= 2} variant={moneyFxVariant} />

      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto">
        {/* Player reveal */}
        <div className="flex flex-col items-center px-4 pt-6 pb-3">
          {/* Photo — stage 1 */}
          <AnimatePresence>
            {stage >= 1 && (
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                className="rounded-full border-4 overflow-hidden mb-3"
                style={{ borderColor: posColor, boxShadow: `0 4px 30px ${posColor}40, 0 0 60px ${posColor}15` }}
              >
                <PlayerPhoto footballer={round.footballer} size={100} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name — stage 2 */}
          <AnimatePresence>
            {stage >= 2 && (
              <motion.h2
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="font-poppins text-[1.8rem] sm:text-[2.2rem] font-black uppercase text-white text-center leading-tight"
              >
                {round.footballer.name}
              </motion.h2>
            )}
          </AnimatePresence>

          {/* Position + chemistry identity chips (nation flag, club crest,
              league badge) — stage 2. These are the three chemistry dimensions,
              shown so players can see at a glance why a signing links up. */}
          <AnimatePresence>
            {stage >= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-2 flex flex-wrap items-center justify-center gap-1.5"
              >
                <span
                  className="rounded-[8px] px-2.5 py-1 font-poppins text-[10px] font-black uppercase text-black"
                  style={{ backgroundColor: posColor }}
                >
                  {round.positionGroup}
                </span>
                <span className="flex items-center gap-1.5 rounded-[8px] bg-white/8 px-2 py-1">
                  <FlagChip country={round.footballer.nationality} width={18} height={12} />
                  <span className="font-poppins text-[11px] font-semibold text-white/70">
                    {round.footballer.nationality}
                  </span>
                </span>
                {round.footballer.club && (
                  <span className="flex items-center gap-1.5 rounded-[8px] bg-white/8 px-2 py-1">
                    <ClubCrest club={round.footballer.club} size={16} />
                    <span className="font-poppins text-[11px] font-semibold text-white/70">
                      {club?.label ?? round.footballer.club}
                    </span>
                  </span>
                )}
                {league && (
                  <span className="flex items-center gap-1.5 rounded-[8px] bg-white/8 px-2 py-1">
                    <LeagueLogo league={round.footballer.league} size={16} />
                    <span className="font-poppins text-[11px] font-semibold text-white/70">
                      {league.abbr}
                    </span>
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Value + Sold For cards — stage 3 */}
          <AnimatePresence>
            {stage >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="mt-4 flex items-stretch gap-3"
              >
                <div className="rounded-[16px] bg-brand-yellow px-6 py-3 text-center shadow-[0_4px_16px_rgba(255,229,0,0.25)]">
                  <div className="text-[10px] font-black uppercase text-black/60" style={poppins}>
                    {valueSeason ? `${valueSeason} ${t('auctionGame.valueLabel')}` : t('auctionGame.trueValue')}
                  </div>
                  <div className="font-poppins text-2xl font-black text-black tabular-nums leading-tight">
                    {formatMoney(futureValue)}
                  </div>
                </div>

                {winner && (
                  <div className="relative rounded-[16px] bg-brand-green px-6 py-3 text-center shadow-[0_4px_16px_rgba(56,182,14,0.25)]">
                    {/* Deal-quality badge — only for YOUR win (it's a you-centric
                        judgement of your deal; meaningless for an opponent's buy). */}
                    {stage >= 4 && isHumanWin && (
                      <DealBadge paid={round.winningBid} value={futureValue} />
                    )}
                    <div className="text-[10px] font-black uppercase text-white/70" style={poppins}>
                      {t('auctionGame.soldFor')}
                    </div>
                    <div className="font-poppins text-2xl font-black text-white tabular-nums leading-tight">
                      {formatMoney(round.winningBid)}
                    </div>
                  </div>
                )}

                {!winner && stage >= 3 && (
                  <div className="relative rounded-[16px] bg-white/10 px-6 py-3 text-center">
                    <div className="font-poppins text-lg font-black uppercase tracking-wide text-white/85">
                      {t('auctionGame.unsold')}
                    </div>
                    <div className="mt-0.5 text-[10px] font-bold uppercase text-white/45" style={poppins}>
                      {t('auctionGame.unsoldSub')}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Assignment message + chemistry gained — stage 4 */}
          <AnimatePresence>
            {stage >= 4 && winner && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="mt-4 flex flex-col items-center gap-2"
              >
                <span className="font-poppins text-sm font-semibold text-white/80">
                  {isHumanWin
                    ? t('auctionGame.joinedYourSquad', { name: round.footballer.name })
                    : t('auctionGame.joinedSquad', { name: round.footballer.name, owner: winner.username })}
                </span>
                <div className="flex items-center gap-2">
                  {chemGain > 0 && (
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.15 }}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 font-poppins text-[11px] font-black uppercase tabular-nums"
                      style={{ backgroundColor: withAlpha('#58CC02', 0.18), color: '#58CC02' }}
                    >
                      ⚡ {t('auctionGame.chemGainBadge', { chem: chemGain })}
                    </motion.span>
                  )}
                  <ChemistryBadge total={winnerChemNow} multiplier={chemistryMultiplier(winnerChemNow)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* All squads — stage 5 */}
        <AnimatePresence>
          {stage >= 5 && (
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 150, damping: 18 }}
              className="px-4 pb-3 pt-1"
            >
              <AllSquads state={state} humanPlayerId={humanPlayerId} highlightId={round.footballer.id} pitchSize="md" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next round button — stage 5 */}
        <AnimatePresence>
          {stage >= 5 && !serverDrivenTransitions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="px-4 pb-6"
            >
              <AuctionPrimaryButton onClick={actions.confirmReveal} className="mx-auto">
                {t('auctionGame.nextRound')}
              </AuctionPrimaryButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AuctionScreen>
  );
}
