'use client';

/**
 * Bottom-fixed horizontal standings bar — the mobile placement used
 * when `mobileStandingsPlacement === 'bottom-bar'`. Hidden on `lg:`+.
 *
 * Each chip exposes the `data-party-score-anchor` /
 * `data-party-score-anchor-placement="mobile-bottom"` markers so
 * `usePartyScoreFlights` can land flights on the right avatar.
 */

import { AnimatePresence, motion } from 'motion/react';

import { AvatarDisplay } from '@/components/AvatarDisplay';
import { cn } from '@/lib/utils';

import type { PartyStandingViewModel } from './partyQuizScreen.types';
import { getRankStyle, getStandingDotStatus } from './partyQuizScreen.helpers';

interface PartyQuizMobileStandingsBarProps {
  standings: PartyStandingViewModel[];
  roundResolved: boolean;
  showOptions: boolean;
}

export function PartyQuizMobileStandingsBar({
  standings,
  roundResolved,
  showOptions,
}: PartyQuizMobileStandingsBarProps) {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-10 bg-gradient-to-t from-surface-page-alt via-surface-page-alt/95 to-transparent pt-6 pb-3 px-3">
      <div className="flex gap-2 overflow-x-auto scrollbar-none">
        {standings.map((player) => {
          const dotStatus = getStandingDotStatus({
            roundResolved,
            answered: player.answered,
            showOptions,
          });
          const hasAnswered = dotStatus === 'correct';
          const rankStyle = getRankStyle(player.rank);
          return (
            <motion.div
              key={player.userId}
              layout
              layoutId={`mobile-standing-${player.userId}`}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1.5 border-2 bg-transparent transition-colors',
                rankStyle.border,
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-black tabular-nums text-white',
                  rankStyle.pillBg,
                )}
                style={{ boxShadow: rankStyle.glow }}
              >
                {player.rank}
              </span>
              <div
                className="relative"
                data-party-score-anchor={player.userId}
                data-party-score-anchor-placement="mobile-bottom"
              >
                <AvatarDisplay
                  customization={player.avatarCustomization ?? { base: player.avatarUrl ?? undefined }}
                  size="xs"
                  className="size-7 shrink-0"
                />
                {player.isSelf && (
                  <span
                    className="absolute -top-1 -right-1 rounded-full bg-brand-orange px-1 py-[1px] text-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] font-poppins font-semibold uppercase"
                    style={{ fontSize: 7, letterSpacing: '0.06em', lineHeight: 1 }}
                  >
                    You
                  </span>
                )}
                {/* Answered check overlay on avatar */}
                {hasAnswered && !player.isSelf && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-brand-green-light ring-2 ring-surface-page-alt"
                  >
                    <svg viewBox="0 0 12 12" className="size-2 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  </motion.div>
                )}
              </div>
              <span className="text-xs font-bold text-white truncate max-w-[80px]">
                {player.username}
              </span>
              <span className="text-xs font-black tabular-nums text-white/70">
                {player.totalPoints}
              </span>
              <AnimatePresence mode="wait">
                {player.roundDelta != null && player.roundDelta > 0 && (
                  <motion.span
                    key={`mobile-bottom-delta-${player.userId}-${player.totalPoints}`}
                    initial={{ opacity: 0, scale: 0.75, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -4 }}
                    transition={{ duration: 0.22 }}
                    className="text-[10px] font-black text-brand-green-light"
                  >
                    +{player.roundDelta}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
