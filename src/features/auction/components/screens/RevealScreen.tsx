'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { AuctionGameState } from '../../types';
import type { AuctionActions } from '../../hooks/useAuctionGame';
import { formatMoney } from '../../data';
import { POS_COLORS, poppins } from '../../constants/auction.constants';
import { useLocale } from '@/contexts/LocaleContext';
import { SCREEN_GLOW } from '../shared/ScreenBackdrop';
import { AuctionScreen } from '../shared/AuctionScreen';
import { AuctionPrimaryButton } from '../shared/AuctionPrimaryButton';
import { SoldFlash } from '../shared/SoldFlash';
import { MoneyFx } from '../shared/MoneyFx';
import { DealBadge } from '../shared/DealBadge';
import { PlayerPhoto } from '../shared/PlayerPhoto';
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

  useEffect(() => {
    const timers = [
      setTimeout(() => setShowSold(false), 1200),
      setTimeout(() => setStage(1), 800),
      setTimeout(() => setStage(2), 1400),
      setTimeout(() => setStage(3), 2000),
      setTimeout(() => setStage(4), 2600),
      setTimeout(() => setStage(5), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!round) return null;

  const winner = state.players.find((p) => p.id === round.winnerId);
  const posColor = POS_COLORS[round.positionGroup];
  const isHumanWin = round.winnerId === humanPlayerId;
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

          {/* Position + nationality — stage 2 */}
          <AnimatePresence>
            {stage >= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-1.5 flex items-center gap-2"
              >
                <span
                  className="rounded-[8px] px-2.5 py-1 font-poppins text-[10px] font-black uppercase text-black"
                  style={{ backgroundColor: posColor }}
                >
                  {round.positionGroup}
                </span>
                <span className="font-poppins text-sm font-semibold text-white/50">
                  {round.footballer.nationality}
                </span>
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
                    {t('auctionGame.trueValue')}
                  </div>
                  <div className="font-poppins text-2xl font-black text-black tabular-nums leading-tight">
                    {formatMoney(round.footballer.value)}
                  </div>
                </div>

                {winner && (
                  <div className="relative rounded-[16px] bg-brand-green px-6 py-3 text-center shadow-[0_4px_16px_rgba(56,182,14,0.25)]">
                    {/* Deal-quality badge — only for YOUR win (it's a you-centric
                        judgement of your deal; meaningless for an opponent's buy). */}
                    {stage >= 4 && isHumanWin && (
                      <DealBadge paid={round.winningBid} value={round.footballer.value} />
                    )}
                    <div className="text-[10px] font-black uppercase text-white/70" style={poppins}>
                      {t('auctionGame.soldFor')}
                    </div>
                    <div className="font-poppins text-2xl font-black text-white tabular-nums leading-tight">
                      {formatMoney(round.winningBid)}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Assignment message — stage 4 */}
          <AnimatePresence>
            {stage >= 4 && winner && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="mt-4"
              >
                <span className="font-poppins text-sm font-semibold text-white/80">
                  {isHumanWin
                    ? t('auctionGame.joinedYourSquad', { name: round.footballer.name })
                    : t('auctionGame.joinedSquad', { name: round.footballer.name, owner: winner.username })}
                </span>
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
