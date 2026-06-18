'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import type { AuctionGameState } from '../../types';
import type { AuctionActions } from '../../hooks/useAuctionGame';
import { formatMoney } from '../../data';
import { POS_COLORS, AUCTION_PURPLE } from '../../constants/auction.constants';
import { useLocale } from '@/contexts/LocaleContext';
import { usePositionLabel } from '../../hooks/usePositionLabel';
import { ScreenBackdrop, SCREEN_GLOW } from '../shared/ScreenBackdrop';
import { PlayerPhoto } from '../shared/PlayerPhoto';
import { FlagChip } from '../shared/FlagChip';

/** A-vs-B choice (known vs mystery) when only one player needs a position. */
export function SoloPickScreen({
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
  const pick = state.soloPick;
  const isHumanPicking = pick ? pick.playerId === humanPlayerId : true;

  useEffect(() => {
    if (!pick || isHumanPicking) return;
    const timer = setTimeout(() => {
      actions.pickSoloOption(Math.random() > 0.5 ? 'A' : 'B');
    }, 1500);
    return () => clearTimeout(timer);
  }, [pick, isHumanPicking, actions]);

  if (!pick) return null;

  const posColor = POS_COLORS[pick.positionGroup];

  if (!isHumanPicking) {
    const botPlayer = state.players.find((p) => p.id === pick.playerId);
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page-alt p-4">
        <ScreenBackdrop />
        <div className="relative z-10 text-center">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-4xl mb-3"
          >
            🤖
          </motion.div>
          <div className="font-poppins text-base font-semibold text-white/50">
            {t('auctionGame.botPicking', {
              name: botPlayer?.username ?? '',
              position: posLabel(pick.positionGroup).toLowerCase(),
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-surface-page-alt p-4 pt-[12vh] sm:pt-[14vh]">
      <ScreenBackdrop glow={SCREEN_GLOW.soloPick} />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-2xl">
        <div className="text-center">
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

        <div className="grid grid-cols-2 gap-4 w-full">
          {/* Option A — Revealed */}
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => actions.pickSoloOption('A')}
            className="flex flex-col items-center gap-3 rounded-[22px] bg-brand-green p-6 sm:p-8 text-center transition-transform hover:brightness-105 active:translate-y-[2px]"
          >
            <PlayerPhoto footballer={pick.optionA.footballer} size={80} />
            <div className="font-poppins text-sm font-black uppercase text-black/70">
              {t('auctionGame.knownPlayer')}
            </div>
            <div className="font-poppins text-lg font-black text-white">{pick.optionA.footballer.name}</div>
            <div className="font-poppins text-sm font-bold text-black/70">
              {t('auctionGame.valueAmount', { amount: formatMoney(pick.optionA.footballer.value) })}
            </div>
            <div className="rounded-[10px] bg-black/85 px-4 py-1.5 font-poppins text-2xl font-black text-brand-yellow">
              {formatMoney(pick.optionA.footballer.startingPrice)}
            </div>
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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => actions.pickSoloOption('B')}
            className="flex flex-col items-center gap-3 rounded-[22px] p-6 sm:p-8 text-center transition-transform hover:brightness-110 active:translate-y-[2px]"
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
            <div className="space-y-2 mt-1">
              {pick.optionB.clues?.map((clue, i) => (
                <p key={i} className="font-poppins text-xs font-semibold text-white/85 leading-snug">
                  {clue}
                </p>
              ))}
            </div>
            <div className="mt-auto rounded-[10px] bg-black/85 px-4 py-1.5 font-poppins text-2xl font-black text-brand-yellow">
              {formatMoney(pick.optionB.footballer.startingPrice)}
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
