'use client';

/**
 * Desktop standings sidebar for the realtime party quiz screen
 * (`lg:` and up). Renders one row per player with the rank pill,
 * avatar, name+crown, live points, delta flash, status dot, and the
 * outside-the-card "YOU" pill for self.
 *
 * Each row's avatar exposes the `data-party-score-anchor` /
 * `data-party-score-anchor-placement="desktop"` markers consumed by
 * `usePartyScoreFlights` to land flights on the right element.
 */

import { AnimatePresence, motion } from 'motion/react';
import { Crown } from 'lucide-react';

import { AvatarDisplay } from '@/components/AvatarDisplay';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';

import type { PartyStandingViewModel } from './partyQuizScreen.types';
import { getRankStyle, getStandingDotStatus } from './partyQuizScreen.helpers';

interface PartyQuizStandingsSidebarProps {
  standings: PartyStandingViewModel[];
  roundResolved: boolean;
  showOptions: boolean;
}

export function PartyQuizStandingsSidebar({
  standings,
  roundResolved,
  showOptions,
}: PartyQuizStandingsSidebarProps) {
  const { t } = useLocale();

  return (
    <div className="hidden lg:block">
      <div className="text-[10px] font-fun font-black uppercase tracking-[0.26em] text-white/45 px-1 mb-2">
        {t('partyResults.standings')}
      </div>
      <div className="space-y-1.5">
        {standings.map((player) => {
          const dotStatus = getStandingDotStatus({
            roundResolved,
            answered: player.answered,
            showOptions,
          });
          const rankStyle = getRankStyle(player.rank);
          return (
            <motion.div
              key={player.userId}
              layout
              layoutId={`standing-${player.userId}`}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="flex items-center gap-2"
            >
              <div
                className={cn(
                  'flex flex-1 items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors border-2',
                  rankStyle.border,
                  player.isSelf ? rankStyle.tint : 'bg-transparent',
                )}
                style={player.isSelf ? { boxShadow: rankStyle.selfGlow } : undefined}
              >
                {/* Rank pill */}
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-base font-black tabular-nums text-white',
                    rankStyle.pillBg,
                  )}
                  style={{ boxShadow: rankStyle.glow }}
                >
                  {player.rank}
                </span>

                {/* Avatar */}
                <div
                  className="shrink-0"
                  data-party-score-anchor={player.userId}
                  data-party-score-anchor-placement="desktop"
                >
                  <AvatarDisplay
                    customization={player.avatarCustomization ?? { base: player.avatarUrl ?? undefined }}
                    size="sm"
                    shape="circle"
                    className="bg-transparent"
                  />
                </div>

                {/* Name + leader crown */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-base font-bold text-white">{player.username}</span>
                    {player.isLeader && <Crown className="size-4 shrink-0 text-brand-yellow-deep" />}
                  </div>
                </div>

                {/* Points */}
                <span className="text-base font-black tabular-nums text-white shrink-0">
                  {player.totalPoints}
                </span>

                {/* Delta flash */}
                <AnimatePresence mode="wait">
                  {player.roundDelta != null && player.roundDelta > 0 && (
                    <motion.span
                      key={`delta-${player.userId}-${player.totalPoints}`}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 4 }}
                      transition={{ duration: 0.25 }}
                      className="text-sm font-black text-brand-green-light shrink-0"
                    >
                      +{player.roundDelta}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Status dot */}
                <span
                  className={cn(
                    'size-3 rounded-full shrink-0',
                    dotStatus === 'correct' && 'bg-brand-green-light',
                    dotStatus === 'answering' && 'bg-brand-cyan animate-pulse',
                    dotStatus === 'resolved' && 'bg-brand-purple animate-pulse',
                    dotStatus === 'idle' && 'bg-white/20',
                  )}
                />
              </div>
              {/* YOU pill — sits OUTSIDE the bordered card, stretches to
                  match its height so the right edge reads as a paired
                  action chip rather than a floating badge. */}
              {player.isSelf && (
                <span
                  className="flex shrink-0 self-stretch items-center justify-center rounded-[16px] bg-brand-orange px-4 text-sm font-black uppercase tracking-wider text-white"
                  style={{ boxShadow: '0 1.76px 6.334px 1.32px rgba(255,150,0,0.3)' }}
                >
                  You
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
