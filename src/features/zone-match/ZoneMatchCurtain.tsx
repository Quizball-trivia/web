'use client';

/**
 * Phase curtains: when the match moves into a new phase, a full-screen card says what is about to happen in two or
 * three plain steps, with a track of the whole match showing where you are. The engine starts each phase's clock after
 * its curtain, so no answer or pick time is lost behind it.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHASE_CURTAIN_MS, type MatchState } from './zoneMatch.machine';
import { MATCH_ROUNDS } from './zoneMatch.rules';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

const FLOW = ['Playstyles', 'Categories', 'Kick-off', 'Match', 'Full time'] as const;

interface Curtain {
  key: string;
  eyebrow: string;
  title: string;
  lines: string[];
  tone: 'yellow' | 'blue' | 'red';
  ms: number;
  /** Index into FLOW. */
  flow: number;
}

/** The curtain the current phase opens with, if any. */
function curtainFor(state: MatchState): Curtain | null {
  if (state.stage === 'deckReveal') {
    return {
      key: 'reveal',
      eyebrow: 'Showdown',
      title: 'Playstyles revealed',
      lines: ['You each bring 3 playstyles', 'Each one works once per match', 'Read theirs — then press Ready'],
      tone: 'yellow',
      ms: PHASE_CURTAIN_MS,
      flow: 0,
    };
  }
  if (state.stage === 'categories') {
    return {
      key: 'categories',
      eyebrow: 'Your categories',
      title: '5 categories each',
      lines: [`${MATCH_ROUNDS} rounds — ${MATCH_ROUNDS / 2} attacks each, in turn`, 'Before each attack, pick one of your categories', 'Each category is used once'],
      tone: 'yellow',
      ms: PHASE_CURTAIN_MS,
      flow: 1,
    };
  }
  return null;
}

const TONE: Record<Curtain['tone'], string> = { yellow: 'text-brand-yellow', blue: 'text-brand-blue', red: 'text-brand-red-soft' };

export function PhaseCurtain({ state }: { state: MatchState }) {
  const curtain = curtainFor(state);
  const key = curtain?.key ?? null;
  const [doneFor, setDoneFor] = useState<string | null>(null);
  useEffect(() => {
    if (!key || !curtain) return;
    const id = window.setTimeout(() => setDoneFor(key), curtain.ms);
    return () => window.clearTimeout(id);
    // The curtain object is rebuilt each render; its key decides.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const visible = curtain !== null && doneFor !== curtain.key;

  return (
    <AnimatePresence>
      {visible && curtain && (
        <motion.div
          key={curtain.key}
          className="fixed inset-0 z-[92] flex flex-col items-center justify-center bg-surface-page/95 px-6 text-white backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
        >
          <motion.div
            className="flex w-full max-w-md flex-col items-center text-center"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
          >
            <div className={cn('text-xs uppercase tracking-[0.24em]', TONE[curtain.tone])} style={poppins}>{curtain.eyebrow}</div>
            <div className="mt-2 text-4xl uppercase leading-tight sm:text-5xl" style={poppins}>{curtain.title}</div>
            <ol className="mt-6 flex w-full flex-col gap-2">
              {curtain.lines.map((line, i) => (
                <motion.li
                  key={line}
                  className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-left text-sm text-white/90"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.25 + i * 0.22, type: 'spring', stiffness: 260, damping: 24 }}
                >
                  {curtain.lines.length > 1 && (
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-yellow text-sm text-surface-page" style={poppins}>
                      {i + 1}
                    </span>
                  )}
                  {line}
                </motion.li>
              ))}
            </ol>
          </motion.div>
          <FlowTrack current={curtain.flow} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The whole match at a glance: done phases ticked, the current one lit. */
function FlowTrack({ current }: { current: number }) {
  return (
    <motion.div
      className="absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] mx-auto flex w-full max-w-2xl items-center justify-center gap-1 px-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      {FLOW.map((label, i) => (
        <div key={`${label}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span
            className={cn(
              'grid size-5 place-items-center rounded-full text-[9px]',
              i < current ? 'bg-brand-green text-white' : i === current ? 'bg-brand-yellow text-surface-page ring-4 ring-brand-yellow/25' : 'bg-white/10 text-white/40',
            )}
            style={poppins}
          >
            {i < current ? <Check className="size-3" strokeWidth={4} /> : i + 1}
          </span>
          <span className={cn('truncate text-[9px] uppercase tracking-wide sm:text-[10px]', i === current ? 'text-white' : 'text-white/40')} style={poppins}>
            {label}
          </span>
        </div>
      ))}
    </motion.div>
  );
}
