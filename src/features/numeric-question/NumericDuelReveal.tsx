'use client';

import { motion } from 'motion/react';
import { Check, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { formatValue } from '@/features/aproximado/aproximado.copy';
import type { DuelReason, DuelSide } from './numericDuel';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

const SIDE_DOT: Record<DuelSide, string> = { player: 'bg-brand-blue', opponent: 'bg-brand-red-soft' };

const REASON_KEY = {
  closer: 'numericDraft.reasonCloser',
  faster: 'numericDraft.reasonFaster',
  onlyAnswer: 'numericDraft.reasonOnlyAnswer',
  coinFlip: 'numericDraft.reasonCoinFlip',
} as const satisfies Record<DuelReason, string>;

export interface NumericDuelRevealProps {
  answer: number;
  unit: string;
  precision: number;
  names: Record<DuelSide, string>;
  guesses: Record<DuelSide, number | null>;
  diffs: Record<DuelSide, number | null>;
  winner: DuelSide;
  reason: DuelReason;
  /** What winning means here, per winner ("You pick 2", "You win the duel"…). */
  winnerLabels: Record<DuelSide, string>;
}

/**
 * The numeric duel's result: the answer pinned in the middle of a number line, both guesses placed against it, how far
 * off each one was, and who won the pick and why.
 */
export function NumericDuelReveal({ answer, unit, precision, names, guesses, diffs, winner, reason, winnerLabels }: NumericDuelRevealProps) {
  const { t, locale } = useLocale();
  const format = (value: number, withUnit = true) => formatValue(value, withUnit ? unit : '', precision, locale).trim();
  const sides: DuelSide[] = ['player', 'opponent'];

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/55" style={poppins}>
          {t('numericDraft.answerLabel')}
        </div>
        <div className="mt-1 text-4xl tabular-nums text-brand-yellow" style={poppins}>
          {format(answer)}
        </div>
      </motion.div>

      <DuelNumberLine answer={answer} guesses={guesses} diffs={diffs} names={names} format={(v) => format(v, false)} />

      <div className="flex w-full flex-col gap-2">
        {sides.map((side, i) => {
          const guess = guesses[side];
          const diff = diffs[side];
          const won = side === winner;
          return (
            <motion.div
              key={side}
              initial={{ opacity: 0, x: side === 'player' ? -12 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.25 }}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3',
                won ? 'bg-brand-green/15 ring-2 ring-brand-green' : 'bg-white/[0.05]',
              )}
            >
              <span className={cn('size-2.5 shrink-0 rounded-full', SIDE_DOT[side])} />
              <span className="min-w-0 flex-1 truncate text-sm uppercase text-white" style={poppins}>
                {names[side]}
              </span>
              <span className="text-right text-sm tabular-nums text-white" style={poppins}>
                {guess === null ? t('numericDraft.noAnswer') : format(guess, false)}
              </span>
              {diff !== null && (
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tabular-nums',
                    diff === 0 ? 'bg-brand-yellow text-surface-page' : 'bg-white/10 text-white/70',
                  )}
                  style={poppins}
                >
                  {diff === 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Crosshair className="size-3" />
                      {t('numericDraft.bullseye')}
                    </span>
                  ) : (
                    t('numericDraft.offBy', { diff: format(diff, false) })
                  )}
                </span>
              )}
              {won && <Check className="size-4 shrink-0 text-brand-green-light" strokeWidth={3} />}
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.1, type: 'spring', stiffness: 260, damping: 18 }}
        className={cn('w-full rounded-[20px] px-5 py-4 text-center', winner === 'player' ? 'bg-brand-green' : 'bg-white/10')}
      >
        <div className="text-xl uppercase text-white" style={poppins}>
          {winnerLabels[winner]}
        </div>
        <div className="mt-1 text-xs uppercase tracking-[0.1em] text-white/75" style={poppins}>
          {t(REASON_KEY[reason])}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * The answer sits in the middle; the scale reaches just past the farther guess. A guess more than 3× as far off as the
 * other is pinned at the edge with an arrow instead of squashing the closer one against the answer.
 */
function DuelNumberLine({
  answer,
  guesses,
  diffs,
  names,
  format,
}: {
  answer: number;
  guesses: Record<DuelSide, number | null>;
  diffs: Record<DuelSide, number | null>;
  names: Record<DuelSide, string>;
  format: (value: number) => string;
}) {
  const known = [diffs.player, diffs.opponent].filter((d): d is number => d !== null).sort((a, b) => a - b);
  let reach = known.length ? known[known.length - 1] : 0;
  if (known.length === 2 && known[0] > 0 && known[1] > known[0] * 3) reach = known[0] * 3;
  reach = Math.max(reach * 1.15, Math.abs(answer) * 0.03, 1);
  const lo = answer - reach;
  const hi = answer + reach;
  const at = (value: number) => 6 + ((Math.min(hi, Math.max(lo, value)) - lo) / (hi - lo)) * 88;

  return (
    <div aria-hidden className="relative h-24 w-full">
      <div className="absolute inset-x-0 top-[46px] h-1 rounded-full bg-white/20" />
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: 0.2 }}
        className="absolute top-[30px] h-9 w-1 -translate-x-1/2 rounded-full bg-brand-yellow"
        style={{ left: `${at(answer)}%` }}
      />
      {(['player', 'opponent'] as const).map((side, i) => {
        const guess = guesses[side];
        if (guess === null) return null;
        const outside = guess < lo ? '←' : guess > hi ? '→' : null;
        const left = at(guess);
        const above = side === 'player';
        return (
          <motion.div
            key={side}
            initial={{ opacity: 0, left: `${at(answer)}%` }}
            animate={{ opacity: 1, left: `${left}%` }}
            transition={{ delay: 0.35 + i * 0.2, type: 'spring', stiffness: 140, damping: 18 }}
            className="absolute top-0 h-full -translate-x-1/2"
          >
            <span
              className={cn(
                'absolute left-1/2 top-[42px] block size-3 -translate-x-1/2 rounded-full ring-2 ring-surface-page',
                SIDE_DOT[side],
              )}
            />
            <span
              className={cn(
                'absolute left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] uppercase tabular-nums text-white',
                SIDE_DOT[side],
                above ? 'top-[8px]' : 'top-[64px]',
                left < 20 && 'translate-x-[-20%]',
                left > 80 && 'translate-x-[-80%]',
              )}
              style={poppins}
            >
              {outside === '←' && <span>←</span>}
              <span className="max-w-[72px] truncate">{names[side]}</span>
              <span className="text-white/80">{format(guess)}</span>
              {outside === '→' && <span>→</span>}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
