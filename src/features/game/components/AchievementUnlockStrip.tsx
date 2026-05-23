'use client';

import { Award, Flame, Star, Trophy, Users, Zap, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

import type { AchievementUnlockPayload } from '@/lib/realtime/socket.types';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';

function resolveI18n(field: Record<string, string>, locale: string): string {
  return field[locale] ?? field.en ?? Object.values(field)[0] ?? '';
}

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

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

const YELLOW = '#FFE500';

export function AchievementUnlockStrip({
  achievements,
  className,
}: AchievementUnlockStripProps) {
  const { locale, t } = useLocale();
  if (achievements.length === 0) return null;

  return (
    <div className={cn('w-full', className)}>
      {/* Header — flat, no card chrome */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-baseline gap-2">
          <h3
            className="text-lg uppercase text-white sm:text-xl"
            style={poppins}
          >
            {achievements.length > 1 ? t("achievements.newBadges") : t("achievements.newBadge")}
          </h3>
          <span className="text-[10px] font-fun font-black uppercase tracking-[0.22em] text-white/40">
            {t("achievements.unlocked")}
          </span>
        </div>
        <span
          className="text-[10px] font-fun font-black uppercase tracking-[0.22em]"
          style={{ color: YELLOW }}
        >
          {t("achievements.countNew", { count: achievements.length })}
        </span>
      </div>

      {/* Grid — single flat card per achievement, no nested chrome */}
      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        {achievements.map((achievement, index) => {
          const Icon = iconMap[achievement.icon] ?? Trophy;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + index * 0.07, duration: 0.35, ease: 'easeOut' }}
              className="flex items-center gap-3 rounded-[10px] p-3"
              style={{ backgroundColor: 'rgba(255,229,0,0.06)' }}
            >
              {/* Icon — single flat tile */}
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-[8px]"
                style={{ backgroundColor: YELLOW, color: '#000' }}
              >
                <Icon className="size-5" strokeWidth={2.5} />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-fun font-black uppercase tracking-wide text-white">
                  {resolveI18n(achievement.title, locale)}
                </div>
                <div className="mt-0.5 truncate text-[11px] font-fun font-black uppercase tracking-wide text-white/50">
                  {resolveI18n(achievement.description, locale)}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
