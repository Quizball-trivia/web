'use client';

import type { ComponentType } from 'react';
import { AnimatePresence } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { useRounds, type RoundProps } from '../lib/runner';
import { FifaShell, Intro, StatPill, Summary, GOLD, GREEN } from './ui';

/**
 * Generic solo mode: intro -> `total` rounds of one round type -> summary.
 * Most FIFA Universe prototypes are exactly this with a different round.
 */
export function RoundsMode({
  title,
  subtitle,
  icon,
  tagline,
  steps,
  chips,
  total,
  Round,
  levelFor = () => 0,
  backHref,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tagline: string;
  steps: string[];
  chips?: string[];
  total: number;
  Round: ComponentType<RoundProps>;
  /** Difficulty ramp: round index -> level. */
  levelFor?: (index: number) => number;
  backHref?: string;
}) {
  const t = useMiniT();
  const run = useRounds(total);
  return (
    <FifaShell
      title={title}
      subtitle={subtitle}
      backHref={backHref}
      headerRight={
        run.phase !== 'intro' ? (
          <div className="flex items-center gap-2">
            <StatPill label={t('Round')} value={`${Math.min(run.index + 1, total)}/${total}`} color={GOLD} />
            <StatPill label={t('Score')} value={run.score} color={GREEN} />
          </div>
        ) : undefined
      }
    >
      <AnimatePresence mode="wait">
        {run.phase === 'intro' ? (
          <Intro key="intro" icon={icon} title={title} tagline={tagline} steps={steps} chips={chips} onStart={run.start} />
        ) : run.phase === 'summary' ? (
          <Summary
            key="summary"
            score={run.score}
            subline={t('{n}/{total} correct', { n: run.correct, total })}
            rows={run.results.map((r, i) => ({ key: String(i), label: r.label, tag: r.tag, right: r.correct ? `+${r.points}` : t('Missed'), ok: r.correct }))}
            onPlayAgain={run.start}
          />
        ) : (
          <div key={run.roundKey} className="flex flex-1 flex-col">
            <Round level={levelFor(run.index)} used={run.used} onDone={run.done} />
          </div>
        )}
      </AnimatePresence>
    </FifaShell>
  );
}
