'use client';

import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/contexts/LocaleContext';
import { LeaderboardPodium } from '@/features/leaderboard/components/LeaderboardPodium';
import { LeaderboardTable } from '@/features/leaderboard/components/LeaderboardTable';
import type { ComponentProps } from 'react';

type LeaderboardEntry = ComponentProps<typeof LeaderboardPodium>['topThree'][number];

interface WelcomeLeaderboardSectionProps {
  entries: LeaderboardEntry[];
  onEntryClick: () => void;
  onViewFull: () => void;
}

export function WelcomeLeaderboardSection({
  entries,
  onEntryClick,
  onViewFull,
}: WelcomeLeaderboardSectionProps) {
  const { t } = useLocale();
  return (
    <section className="py-6 md:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <LeaderboardPodium
            topThree={entries.slice(0, 3)}
            onEntryClick={onEntryClick}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <LeaderboardTable
            entries={entries.slice(3, 8)}
            onEntryClick={onEntryClick}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
          className="mb-6 text-center"
        >
          <h2 className="text-lg md:text-xl font-black uppercase tracking-wide text-white">
            {t('welcome.leaderboardTitle')}
          </h2>
          <p className="mt-1 text-xs md:text-sm text-white/50 font-medium">
            {t('welcome.leaderboardSubtitle')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          <Button
            onClick={onViewFull}
            className="h-11 rounded-xl bg-brand-green px-6 font-poppins text-sm font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none"
          >
            {t('welcome.viewFullTable')}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
