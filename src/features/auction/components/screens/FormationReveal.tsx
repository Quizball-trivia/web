'use client';

import { motion } from 'motion/react';
import type { AuctionGameState, AuctionPlayer } from '../../types';
import { createEmptyTeam } from '../../data';
import { useLocale } from '@/contexts/LocaleContext';
import { ScreenBackdrop, SCREEN_GLOW } from '../shared/ScreenBackdrop';
import { SquadPitch } from '../pitch/SquadPitch';

/** Intro screen: announces the (shared) formation and shows the empty pitch layout. */
export function FormationReveal({
  state,
  onContinue,
}: {
  state: AuctionGameState;
  onContinue: () => void;
}) {
  const { t } = useLocale();
  // An empty squad in the chosen formation — renders the real pitch with all
  // position slots laid out, so players see the actual layout they'll fill.
  const emptyPlayer: AuctionPlayer = {
    id: 'formation-preview',
    username: '',
    avatarSeed: '',
    budget: 0,
    team: createEmptyTeam(state.formation),
    isBot: false,
    isEliminated: false,
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page-alt p-4">
      <ScreenBackdrop glow={SCREEN_GLOW.formation} />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative z-10 flex flex-col items-center gap-6 text-center"
      >
        <motion.img
          src="/assets/brand/goal-ball-small.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
          width={56}
          height={56}
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="block size-14 object-contain"
        />

        <div>
          <h2 className="font-poppins text-[2rem] font-black uppercase text-white sm:text-[2.5rem]">
            {t('auctionGame.formation')}
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-2 font-poppins text-[3.5rem] font-black text-brand-yellow sm:text-[4.5rem]"
            style={{ textShadow: '0 2px 16px rgba(255,229,0,0.25)' }}
          >
            {state.formation.name}
          </motion.div>
        </div>

        {/* Actual pitch with the formation laid out (reuses the in-game SquadPitch) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="w-[200px] sm:w-[240px]"
        >
          <SquadPitch player={emptyPlayer} formation={state.formation} size="md" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="text-xs font-poppins font-semibold text-white/40 uppercase"
        >
          {t('auctionGame.allPlayersSameFormation')}
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7 }}
          whileTap={{ scale: 0.97 }}
          onClick={onContinue}
          className="mt-4 flex h-14 w-56 items-center justify-center rounded-[20px] bg-brand-green font-poppins text-lg font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none"
        >
          {t('auctionGame.startAuction')}
        </motion.button>
      </motion.div>
    </div>
  );
}
