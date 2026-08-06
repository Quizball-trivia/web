'use client';

// Weekend League Money Drop board — the daily-challenge betting UI (sliders,
// bill stacks, drop animation) adapted to the synchronized WL flow: no
// lifelines, the window is the server's, and the verdict arrives with the
// public reveal instead of a local confirm animation.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { playSfx } from '@/lib/sounds/gameSounds';

const OPTION_COLORS = [
  { light: 'bg-emerald-500/15', text: 'text-emerald-400', sliderRange: '[&_[data-slot=slider-range]]:bg-emerald-500', sliderThumb: '[&_[data-slot=slider-thumb]]:border-emerald-500' },
  { light: 'bg-blue-500/15', text: 'text-blue-400', sliderRange: '[&_[data-slot=slider-range]]:bg-blue-500', sliderThumb: '[&_[data-slot=slider-thumb]]:border-blue-500' },
  { light: 'bg-yellow-500/15', text: 'text-yellow-400', sliderRange: '[&_[data-slot=slider-range]]:bg-yellow-500', sliderThumb: '[&_[data-slot=slider-thumb]]:border-yellow-500' },
  { light: 'bg-purple-500/15', text: 'text-purple-400', sliderRange: '[&_[data-slot=slider-range]]:bg-purple-500', sliderThumb: '[&_[data-slot=slider-thumb]]:border-purple-500' },
];

function OptionRow({ index, option, color, textClass = 'text-white' }: {
  index: number;
  option: string;
  color: (typeof OPTION_COLORS)[0];
  textClass?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 md:gap-3">
      <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-black md:size-9 md:rounded-xl', color.light, color.text)}>
        {String.fromCharCode(65 + index)}
      </div>
      <span className={cn('truncate text-sm font-bold md:text-base', textClass)} title={option}>{option}</span>
    </div>
  );
}

function DollarBill() {
  return (
    <div className="flex h-5 w-8 items-center justify-center rounded-sm border border-brand-green-deep bg-gradient-to-br from-brand-green-light to-brand-green shadow-sm">
      <span className="text-xs font-bold text-white">$</span>
    </div>
  );
}

function BillStack({ amount }: { amount: number }) {
  const dollarCount = Math.min(Math.ceil(amount / 30), 10);
  const rotations = useMemo(
    () => Array.from({ length: dollarCount }, (_, i) => (((i * 7 + 3) % 10) - 5) * 0.5),
    [dollarCount],
  );
  if (dollarCount === 0) return null;
  return (
    <div className="pointer-events-none flex items-end">
      {[...Array(dollarCount)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: rotations[i] }}
          transition={{ duration: 0.3, delay: i * 0.05, type: 'spring', stiffness: 300 }}
          className="relative"
          style={{ marginLeft: i > 0 ? '-8px' : '0', zIndex: dollarCount - i }}
        >
          <DollarBill />
        </motion.div>
      ))}
    </div>
  );
}

function FallingBills({ amount }: { amount: number }) {
  const count = Math.max(1, Math.min(8, Math.floor(amount / 30)));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: `${15 + (i * 70) / count}%`, top: '50%' }}
          initial={{ y: 0, opacity: 1, rotate: 0 }}
          animate={{ y: [0, 200, 400], opacity: [1, 0.8, 0], rotate: [0, -15 + i * 8, -30 + i * 12] }}
          transition={{ duration: 1.2, delay: i * 0.08, ease: 'easeIn' }}
        >
          <DollarBill />
        </motion.div>
      ))}
    </div>
  );
}

export interface MoneyDropOption {
  id: string;
  label: string;
}

/**
 * The betting board + reveal theatre. Controlled: the parent owns budget,
 * submission and the reveal moment; this renders the daily Money Drop look.
 *
 * - Betting phase (`correctId == null`): sliders, remaining counter, confirm
 *   enabled once every point is placed (all-in, daily rules). The window
 *   closing auto-submits whatever is allocated via `onSubmit` from the parent.
 * - Reveal (`correctId != null`): wrong options with money drop away with the
 *   falling-bill animation; the correct one glows and shows what survived.
 */
export function MoneyDropBoard({
  options,
  budget,
  locked,
  windowClosing = false,
  spectator = false,
  correctId,
  onSubmit,
}: {
  options: MoneyDropOption[];
  /** What the player carries into this question (server-clamped upstream). */
  budget: number;
  /** Interaction disabled (dispatch lead, answered, window over, spectator). */
  locked: boolean;
  /** ~1s of answer window left — fires the auto-submit while the server still
   *  accepts (the daily game submits AT the deadline; the wire needs margin). */
  windowClosing?: boolean;
  spectator?: boolean;
  /** Set when the public reveal is out — flips the board into the drop theatre. */
  correctId: string | null;
  onSubmit: (bets: Record<string, number>) => void;
}) {
  const { t } = useLocale();
  const [bets, setBets] = useState<Record<string, number>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [dropped, setDropped] = useState<string[]>([]);
  const revealPlayed = useRef(false);

  const totalAllocated = options.reduce((sum, o) => sum + (bets[o.id] ?? 0), 0);
  const remaining = budget - totalAllocated;
  const isFullyAllocated = budget > 0 && totalAllocated === budget;
  const betting = correctId == null && !confirmed && !locked;

  const setBet = (id: string, value: number) => {
    if (!betting) return;
    setBets((cur) => {
      const others = options.reduce((s, o) => s + (o.id === id ? 0 : cur[o.id] ?? 0), 0);
      return { ...cur, [id]: Math.max(0, Math.min(value, budget - others)) };
    });
  };

  const submittedRef = useRef(false);
  const confirm = () => {
    if (!betting || !isFullyAllocated || submittedRef.current) return;
    submittedRef.current = true;
    setConfirmed(true);
    onSubmit(bets);
  };

  // Timeout auto-submit (daily rules: whatever is placed counts, the rest is
  // gone). `submittedRef` flips ONLY when a sheet actually goes to the wire —
  // an empty board passing the deadline must not block a later manual confirm
  // on remount/retry paths.
  const betsRef = useRef(bets);
  useEffect(() => {
    betsRef.current = bets;
  }, [bets]);
  useEffect(() => {
    if (!windowClosing || spectator || correctId != null || submittedRef.current) return;
    const sheet = betsRef.current;
    if (Object.values(sheet).some((v) => v > 0)) {
      submittedRef.current = true;
      onSubmit(sheet);
    }
  }, [windowClosing, spectator, correctId, onSubmit]);

  // Reveal choreography: wrong options with money fall one second apart, the
  // survivor chime/buzzer follows — the daily game's exact beat. One-shot:
  // timers live in a ref (cleared only on unmount) so re-renders from the
  // first drop can't cancel the rest of the sequence.
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  const revealTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  useEffect(() => () => revealTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (correctId == null || revealPlayed.current) return;
    revealPlayed.current = true;
    const sheet = betsRef.current;
    const wrong = optionsRef.current.filter((o) => o.id !== correctId && (sheet[o.id] ?? 0) > 0);
    wrong.forEach((o, i) => {
      revealTimers.current.push(setTimeout(() => setDropped((d) => [...d, o.id]), i * 1000));
    });
    if (!spectator) {
      revealTimers.current.push(setTimeout(
        () => playSfx((sheet[correctId] ?? 0) > 0 ? 'dailyCorrect' : 'wrongAnswer'),
        wrong.length * 1000 + 600,
      ));
    }
  }, [correctId, spectator]);

  if (correctId != null) {
    return (
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option, index) => {
          const isCorrect = option.id === correctId;
          const betAmount = bets[option.id] ?? 0;
          const hasDropped = dropped.includes(option.id);
          const color = OPTION_COLORS[index % OPTION_COLORS.length]!;
          if (isCorrect) {
            return (
              <motion.div
                key={option.id}
                className="rounded-[20px] border-2 border-brand-green/40 bg-brand-green/15 px-3 py-3 md:px-4 md:py-4"
                animate={{ boxShadow: ['0 0 0px rgba(88,204,2,0)', '0 0 20px rgba(88,204,2,0.35)', '0 0 0px rgba(88,204,2,0)'] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <div className="flex items-center justify-between">
                  <OptionRow index={index} option={option.label} color={{ ...color, light: 'bg-brand-green-light', text: 'text-white' }} textClass="text-brand-green-light" />
                  {betAmount > 0 && (
                    <span className="ml-2 shrink-0 text-sm font-black text-brand-green-light">+{betAmount}</span>
                  )}
                </div>
              </motion.div>
            );
          }
          if (hasDropped && betAmount > 0) {
            return (
              <motion.div
                key={option.id}
                className="relative overflow-visible rounded-[20px] border-2 border-brand-red-soft/30 bg-brand-red-soft/10 px-3 py-3 md:px-4 md:py-4"
                animate={{ y: [0, 20, 300], opacity: [1, 0.8, 0], rotateX: [0, 5, 15], scale: [1, 0.95, 0.8] }}
                transition={{ duration: 0.8, ease: 'easeIn' }}
              >
                <FallingBills amount={betAmount} />
                <div className="flex items-center justify-between">
                  <OptionRow index={index} option={option.label} color={{ ...color, light: 'bg-brand-red-soft', text: 'text-white' }} />
                  <span className="ml-2 shrink-0 text-sm font-black text-brand-red-soft">-{betAmount}</span>
                </div>
              </motion.div>
            );
          }
          return (
            <div key={option.id} className={cn('rounded-[20px] bg-surface-card/40 px-3 py-3 backdrop-blur-sm md:px-4 md:py-4', (hasDropped || betAmount === 0) && 'opacity-30')}>
              <div className="flex items-center justify-between">
                <OptionRow index={index} option={option.label} color={color} />
                {betAmount > 0 && <span className="ml-2 shrink-0 text-sm font-black text-brand-slate">{betAmount}</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-slate md:text-sm">
          {t('dailyGames.placeYourBets')}
        </span>
        <span className={cn('text-xs font-black tabular-nums md:text-sm', remaining === 0 ? 'text-brand-green-light' : 'text-brand-orange')}>
          {remaining === 0 ? t('dailyGames.allIn') : t('dailyGames.remaining', { amount: remaining })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option, index) => {
          const betAmount = bets[option.id] ?? 0;
          const color = OPTION_COLORS[index % OPTION_COLORS.length]!;
          return (
            <div key={option.id} className={cn('relative overflow-visible rounded-[20px] bg-surface-card/40 px-3 py-3 backdrop-blur-sm md:px-4 md:py-4', (confirmed || locked) && 'opacity-60')}>
              <div className="mb-2 flex items-center justify-between md:mb-3">
                <OptionRow index={index} option={option.label} color={color} />
                {betAmount > 0 && (
                  <span className="ml-2 shrink-0 text-sm font-black tabular-nums text-brand-orange">{betAmount}</span>
                )}
              </div>
              <Slider
                aria-label={option.label}
                value={[betAmount]}
                onValueChange={(value) => setBet(option.id, value[0] ?? 0)}
                max={budget}
                step={10}
                disabled={!betting}
                className={cn(
                  'w-full',
                  '[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-track]]:bg-white/10 md:[&_[data-slot=slider-track]]:h-2.5',
                  color.sliderRange,
                  '[&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-2 [&_[data-slot=slider-thumb]]:bg-white',
                  color.sliderThumb,
                )}
              />
              {betAmount > 0 && (
                <div className="pointer-events-none mt-2 flex justify-end">
                  <BillStack amount={betAmount} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!spectator && !confirmed && !locked && (
        <button
          type="button"
          onClick={confirm}
          disabled={!isFullyAllocated}
          style={isFullyAllocated ? { boxShadow: '0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)' } : undefined}
          className={cn(
            'w-full rounded-[20px] py-3.5 font-poppins text-sm font-semibold uppercase tracking-wide text-white transition-colors md:py-4 md:text-base',
            isFullyAllocated ? 'bg-brand-green hover:bg-brand-green-deep' : 'cursor-not-allowed bg-brand-green/30 opacity-40',
          )}
        >
          {isFullyAllocated ? t('dailyGames.confirmBets') : t('weekendLeague.gMdAllocateAll', { amount: budget })}
        </button>
      )}
      {(confirmed || (locked && !spectator)) && (
        <div className="text-center font-poppins text-[13px] font-bold uppercase text-white/50">
          {t('dailyGames.revealingAnswer')}
        </div>
      )}
    </div>
  );
}
