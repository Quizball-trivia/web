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
    <section className="px-6 py-12 md:py-20">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
            {t('welcome.leaderboardTitle')}
          </h2>
          <p className="text-sm md:text-base text-white/60 font-medium">
            {t('welcome.leaderboardSubtitle')}
          </p>
        </motion.div>

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
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <Button
            onClick={onViewFull}
            className="h-14 rounded-[20px] bg-brand-green px-10 font-poppins text-lg font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none"
          >
            {t('welcome.viewFullTable')}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
