'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Star, Clock, TrendingUp, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CHALLENGES = [
  {
    id: 'moneyDrop',
    title: 'Money Drop',
    tier: 'bronze' as const,
    status: 'open' as const,
    rewards: '100 RP + Bronze Pack',
  },
  {
    id: 'countdown',
    title: 'Countdown',
    tier: 'silver' as const,
    status: 'locked' as const,
    rewards: '250 RP + Silver Pack',
    requirement: 'Level 10 Required',
  },
  {
    id: 'putInOrder',
    title: 'Put in Order',
    tier: 'gold' as const,
    status: 'locked' as const,
    rewards: '500 RP + Gold Pack',
    requirement: 'Gold Rank Required',
  },
  {
    id: 'clues',
    title: 'Clues',
    tier: 'platinum' as const,
    status: 'locked' as const,
    rewards: '1000 RP + Platinum Pack',
    requirement: 'Invite Only',
  },
];

// Helper to format time remaining
function getTimeRemaining(expiryDate: Date): string {
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export function GameHubScreen() {
  const [bossEventExpiry] = useState<Date>(() => new Date(Date.now() + 1000 * 60 * 60 * 48));

  const QUESTS = [
    {
      id: '1',
      label: 'Reach Gold II',
      subLabel: 'Earn 150 more RP',
      status: 'active' as const,
      progress: 65,
    },
    {
      id: '2',
      label: 'Weekend Warrior',
      subLabel: 'Complete 5 daily challenges',
      status: 'locked' as const,
    },
    {
      id: '3',
      label: 'Newcomer',
      subLabel: 'Complete tutorial',
      status: 'completed' as const,
    },
  ];

  const eventProgress = { current: 32, total: 50 };
  const eventPercent = Math.round((eventProgress.current / eventProgress.total) * 100);

  return (
    <div className="min-h-screen pb-20 font-fun">
      <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Your Path - Quest Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-[#CE82FF]" />
            <h2 className="text-sm font-black text-white uppercase tracking-wide">
              Your Path
            </h2>
          </div>

          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {QUESTS.map((quest) => {
              const isActive = quest.status === 'active';
              const isCompleted = quest.status === 'completed';
              const isLocked = quest.status === 'locked';

              return (
                <div
                  key={quest.id}
                  className={cn(
                    'shrink-0 w-[200px] bg-[#1B2F36] rounded-2xl border-b-4 p-4',
                    isCompleted && 'border-b-[#58CC02]',
                    isActive && 'border-b-[#1CB0F6]',
                    isLocked && 'border-b-[#243B44] opacity-60'
                  )}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div
                      className={cn(
                        'size-8 rounded-xl flex items-center justify-center shrink-0',
                        isCompleted && 'bg-[#58CC02]/20',
                        isActive && 'bg-[#1CB0F6]/20',
                        isLocked && 'bg-[#56707A]/20'
                      )}
                    >
                      {isCompleted ? (
                        <span className="text-xl">✓</span>
                      ) : isLocked ? (
                        <svg
                          className="size-4 text-[#56707A]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      ) : (
                        <TrendingUp className="size-4 text-[#1CB0F6]" />
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-black text-white mb-1">
                    {quest.label}
                  </h3>
                  <p className="text-xs text-[#56707A] font-semibold mb-3">
                    {quest.subLabel}
                  </p>

                  {isActive && quest.progress !== undefined && (
                    <div className="space-y-1">
                      <div className="h-2 bg-[#131F24] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1CB0F6] rounded-full"
                          style={{ width: `${quest.progress}%` }}
                        />
                      </div>
                      <p className="text-xs font-black text-[#1CB0F6] text-right">
                        {quest.progress}%
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* World Event - Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="size-5 text-[#FF9600] fill-current" />
              <h2 className="text-sm font-black text-white uppercase tracking-wide">
                World Event
              </h2>
            </div>
            <button className="text-xs font-bold text-[#1CB0F6] hover:text-[#1CB0F6]/80 transition-colors">
              View Past Events
            </button>
          </div>

          <div className="bg-gradient-to-br from-[#2A1F0F] via-[#1F1A12] to-[#1A1510] rounded-3xl border-4 border-[#B8860B] overflow-hidden relative">
            {/* Decorative gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#FFD700]/5 via-transparent to-[#FFD700]/5 opacity-30" />

            <div className="relative z-10 p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 bg-[#FFD700]/10 rounded-full px-3 py-1 mb-3 border border-[#B8860B]/30">
                    <span className="text-xs font-black text-[#FFD700] uppercase tracking-wider">
                      World Event
                    </span>
                    <Clock className="size-3 text-[#FFD700]" />
                    <span className="text-xs font-black text-[#FF4B4B]">
                      Ends in {bossEventExpiry ? getTimeRemaining(bossEventExpiry) : '...'}
                    </span>
                  </div>

                  <h3 className="text-3xl font-black text-transparent bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700] bg-clip-text mb-2 leading-tight italic">
                    THE GOLDEN BOOT
                  </h3>
                  <p className="text-sm text-white/60 font-semibold max-w-xl">
                    Score 50 goals across all ranked matches this weekend to unlock the exclusive &apos;Striker&apos; badge and a share of the 1M RP prize pool.
                  </p>
                </div>

                {/* Skull Icon */}
                <div className="hidden md:block shrink-0">
                  <svg
                    width="140"
                    height="140"
                    viewBox="0 0 100 100"
                    fill="none"
                    className="drop-shadow-[0_0_20px_rgba(184,134,11,0.3)]"
                  >
                    {/* Skull outline */}
                    <path
                      d="M50 10 C 30 10, 20 25, 20 40 C 20 50, 22 58, 25 65 L 25 75 L 35 75 L 35 85 L 45 85 L 45 90 L 55 90 L 55 85 L 65 85 L 65 75 L 75 75 L 75 65 C 78 58, 80 50, 80 40 C 80 25, 70 10, 50 10 Z"
                      stroke="#B8860B"
                      strokeWidth="3"
                      fill="none"
                      opacity="0.8"
                    />
                    {/* Left eye */}
                    <circle cx="38" cy="42" r="8" stroke="#B8860B" strokeWidth="3" fill="none" opacity="0.9" />
                    <circle cx="38" cy="42" r="4" fill="#B8860B" opacity="0.6" />
                    {/* Right eye */}
                    <circle cx="62" cy="42" r="8" stroke="#B8860B" strokeWidth="3" fill="none" opacity="0.9" />
                    <circle cx="62" cy="42" r="4" fill="#B8860B" opacity="0.6" />
                    {/* Nose */}
                    <path
                      d="M 45 55 L 50 65 L 55 55 Z"
                      stroke="#B8860B"
                      strokeWidth="2.5"
                      fill="none"
                      opacity="0.8"
                    />
                  </svg>
                </div>
              </div>

              {/* Progress */}
              <div className="bg-black/40 rounded-2xl p-4 space-y-3 border border-[#B8860B]/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                    Goals Scored
                  </span>
                  <span className="text-sm font-black text-white">
                    {eventProgress.current} / {eventProgress.total}
                  </span>
                </div>

                <div className="relative h-3 bg-[#1A1510] rounded-full overflow-hidden border border-[#B8860B]/20">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${eventPercent}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#58CC02] to-[#85E000]"
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent h-1/2" />
                  </motion.div>
                </div>

                <p className="text-sm font-black text-[#FFD700]">{eventPercent}%</p>
              </div>

              {/* CTA Button */}
              <button className="w-full md:w-auto px-8 py-4 rounded-2xl bg-gradient-to-b from-[#FFD700] to-[#FFA500] border-b-4 border-[#CC8800] text-[#1A1510] font-black text-base uppercase hover:from-[#FFA500] hover:to-[#FFD700] active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-3 group shadow-lg shadow-[#FFD700]/20">
                Continue Quest
                <div className="flex items-center gap-2">
                  <span className="text-xl">🪙</span>
                  <div className="w-3 h-3 rounded-full bg-[#FF4B4B]" />
                </div>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Weekly Challenges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-[#CE82FF]" />
              <h2 className="text-sm font-black text-white uppercase tracking-wide">
                Weekly Challenges
              </h2>
            </div>
            <span className="text-xs font-bold text-[#56707A] bg-[#1B2F36] px-3 py-1.5 rounded-full border-b-2 border-[#0D1B21]">
              Resets in 3d 12h
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CHALLENGES.map((challenge) => {
              const isLocked = challenge.status === 'locked';
              const tierColors = {
                bronze: {
                  border: 'border-b-[#FF9600]/60',
                  bg: 'bg-[#FF9600]/15',
                  text: 'text-[#FF9600]',
                  icon: '🥉',
                },
                silver: {
                  border: 'border-b-slate-400/60',
                  bg: 'bg-slate-400/15',
                  text: 'text-slate-300',
                  icon: '🥈',
                },
                gold: {
                  border: 'border-b-[#FFD700]/60',
                  bg: 'bg-[#FFD700]/15',
                  text: 'text-[#FFD700]',
                  icon: '🥇',
                },
                platinum: {
                  border: 'border-b-[#1CB0F6]/60',
                  bg: 'bg-[#1CB0F6]/15',
                  text: 'text-[#1CB0F6]',
                  icon: '💎',
                },
              }[challenge.tier];

              return (
                <button
                  key={challenge.id}
                  disabled={isLocked}
                  className={cn(
                    'text-left bg-[#1B2F36] rounded-2xl border-b-4 p-5 transition-all',
                    tierColors.border,
                    isLocked
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px] cursor-pointer'
                  )}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className={cn(
                        'size-12 rounded-xl flex items-center justify-center text-2xl shrink-0',
                        tierColors.bg
                      )}
                    >
                      {isLocked ? '🔒' : tierColors.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-black text-white mb-1">
                        {challenge.title}
                      </h3>
                      <p className="text-xs text-[#56707A] font-semibold">
                        {isLocked ? challenge.requirement : challenge.rewards}
                      </p>
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="flex items-center gap-2 text-xs font-black">
                      <span className={tierColors.text}>Start Challenge</span>
                      <ArrowUpRight className={cn('size-4', tierColors.text)} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
