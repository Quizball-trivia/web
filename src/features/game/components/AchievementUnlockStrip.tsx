'use client';

import { Award, Flame, Star, Trophy, Users, Zap, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

import type { AchievementUnlockPayload } from '@/lib/realtime/socket.types';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  Trophy,
  Star,
  Zap,
  Flame,
  Users,
  Award,
};

interface AchievementUnlockStripProps {
  achievements: AchievementUnlockPayload[];
  className?: string;
}

export function AchievementUnlockStrip({
  achievements,
  className,
}: AchievementUnlockStripProps) {
  if (achievements.length === 0) return null;

  return (
    <div className={cn('rounded-[30px] border border-[#FCD200]/24 bg-[#17140B]/88 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)] backdrop-blur sm:p-5', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#FCD200]">
            Achievement Unlock{achievements.length > 1 ? 's' : ''}
          </div>
          <div className="mt-1 text-sm font-black text-white">
            Freshly earned in this match
          </div>
        </div>
        <div className="rounded-full border border-[#FCD200]/25 bg-[#FCD200]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#FFE98A]">
          {achievements.length} new
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {achievements.map((achievement, index) => {
          const Icon = iconMap[achievement.icon] ?? Trophy;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.12 + (index * 0.07), duration: 0.35, ease: 'easeOut' }}
              className="relative overflow-hidden rounded-[24px] border border-[#FCD200]/18 bg-[linear-gradient(135deg,rgba(252,208,0,0.14),rgba(252,208,0,0.04)_45%,rgba(255,255,255,0.02))] p-4"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(252,208,0,0.2),transparent_36%)] opacity-90" />
              <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#FFE98A]/70 to-transparent" />

              <div className="relative z-10 flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#FCD200]/24 bg-[#FCD200]/12 text-[#FFE98A] shadow-[0_0_28px_rgba(252,208,0,0.08)]">
                  <Icon className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-white">{achievement.title}</div>
                    <span className="rounded-full bg-[#58CC02]/16 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-[#A8FF8A]">
                      Unlocked
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-bold leading-relaxed text-white/68">
                    {achievement.description}
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: 0.18 + (index * 0.07), duration: 0.45, ease: 'easeOut' }}
                      className="h-full rounded-full bg-[linear-gradient(90deg,#FCD200,#FFE98A)]"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
