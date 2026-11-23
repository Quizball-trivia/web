'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Bomb, Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { L, SHOW_COPY } from '../show.copy';
import { minesTally, REVEAL_POINTS, REVEAL_STEP_MS, revealStepAt, revealSteps, sliderPoints } from '../show.rules';
import type {
  ChoiceQuestion, EvolutionQuestion, MinesQuestion, ShowAnswer, ShowLocale, ShowOption, ShowQuestion,
  SliderQuestion, ZoomOutQuestion,
} from '../show.types';
import type { RevealStats } from '../useShowSim';
import { ShowArtView } from './ShowArtView';

export interface QuestionViewProps<Q extends ShowQuestion = ShowQuestion> {
  q: Q;
  locale: ShowLocale;
  now: number;
  startsAt: number;
  deadline: number;
  answer: ShowAnswer | null;
  /** Absent while spectating. */
  onAnswer?: (a: ShowAnswer) => void;
  reveal: RevealStats | null;
  /** The OBS host screen: smaller art and two-column answers so a question fits 16:9. */
  variant?: 'phone' | 'host';
}

type BtnState = 'idle' | 'picked' | 'correct' | 'wrong' | 'dim';

/** A tap answer. At the reveal it fills with the share of players who picked it. */
export function ChoiceButton({
  option, locale, state, share, disabled, onPick, compact = false,
}: {
  option: ShowOption;
  locale: ShowLocale;
  state: BtnState;
  share: number | null;
  disabled: boolean;
  onPick: () => void;
  compact?: boolean;
}) {
  const pct = share == null ? null : Math.round(share * 100);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={cn(
        'relative flex w-full items-center overflow-hidden rounded-2xl border-2 px-4 text-left font-poppins font-bold uppercase text-white transition-colors',
        compact ? 'min-h-[54px] text-[13px]' : 'min-h-[62px] text-[15px] sm:text-[17px]',
        state === 'idle' && 'border-brand-yellow/90 shadow-[0_0_8px_rgba(255,229,0,0.2)] active:scale-[0.99]',
        state === 'picked' && 'border-brand-yellow bg-brand-yellow/20',
        state === 'correct' && 'border-brand-green bg-brand-green/25',
        state === 'wrong' && 'border-brand-red text-brand-red',
        state === 'dim' && 'border-white/15 opacity-60',
      )}
    >
      {pct != null && (
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('absolute inset-y-0 left-0', state === 'correct' ? 'bg-brand-green/45' : 'bg-white/10')}
        />
      )}
      <span className="relative flex flex-1 items-center gap-3">
        {option.art && <ShowArtView art={option.art} className="size-9 shrink-0" />}
        <span className="flex-1 leading-tight">{L(option.label, locale)}</span>
        {state === 'picked' && <Lock className="size-4 shrink-0 text-brand-yellow" />}
        {pct != null && <span className="shrink-0 tabular-nums">{pct}%</span>}
      </span>
    </button>
  );
}

function optionState(id: string, correctId: string, picked: string | null, revealed: boolean): BtnState {
  if (!revealed) return picked === id ? 'picked' : picked ? 'dim' : 'idle';
  if (id === correctId) return 'correct';
  if (id === picked) return 'wrong';
  return 'dim';
}

function PromptCard({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-5 text-center text-white backdrop-blur-sm">
      {sub && <div className="mb-1.5 font-poppins text-[11px] font-black uppercase tracking-[0.2em] text-brand-yellow">{sub}</div>}
      <div className="font-poppins text-[17px] font-bold leading-snug sm:text-[21px]">{children}</div>
    </div>
  );
}

function pickedId(a: ShowAnswer | null): string | null {
  return a && (a.kind === 'choice' || a.kind === 'reveal_choice') ? a.optionId : null;
}

export function ChoiceView({ q, locale, now, startsAt, answer, onAnswer, reveal, variant }: QuestionViewProps<ChoiceQuestion>) {
  const picked = pickedId(answer);
  const open = now >= startsAt && !answer && !!onAnswer && !reveal;
  const pair = q.options.length === 2;
  return (
    <div className="flex flex-col gap-4">
      {q.subject?.art && (
        <ShowArtView art={q.subject.art} className={cn('mx-auto overflow-hidden rounded-3xl border-2 border-white/10', variant === 'host' ? 'size-28' : 'size-36')} />
      )}
      <PromptCard sub={q.subject && L(q.subject.name, locale) ? L(q.subject.name, locale) : undefined}>{L(q.prompt, locale)}</PromptCard>
      <div className={pair || variant === 'host' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-2.5'}>
        {q.options.map((o) => (
          <ChoiceButton
            key={o.id}
            option={o}
            locale={locale}
            state={optionState(o.id, q.correctId, picked, !!reveal)}
            share={reveal ? reveal.shares[o.id] ?? 0 : null}
            disabled={!open}
            onPick={() => onAnswer?.({ kind: 'choice', optionId: o.id, elapsedMs: now - startsAt })}
          />
        ))}
      </div>
    </div>
  );
}

function WorthLadder({ step, locale, frozen }: { step: number; locale: ShowLocale; frozen: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {REVEAL_POINTS.map((p, i) => (
        <span
          key={p}
          className={cn(
            'rounded-full px-2.5 py-1 font-poppins text-[11px] font-black tabular-nums transition-colors',
            i === step ? 'bg-brand-yellow text-black' : i < step ? 'bg-white/5 text-white/25 line-through' : 'bg-white/10 text-white/60',
          )}
        >
          {p}
        </span>
      ))}
      {!frozen && <span className="sr-only">{SHOW_COPY[locale].worthNow(REVEAL_POINTS[step] ?? 0)}</span>}
    </div>
  );
}

export function ZoomOutView({ q, locale, now, startsAt, answer, onAnswer, reveal, variant }: QuestionViewProps<ZoomOutQuestion>) {
  const steps = revealSteps(q);
  const elapsed = Math.max(0, now - startsAt);
  const frozenStep = answer?.kind === 'reveal_choice' ? answer.step : null;
  const step = reveal ? steps - 1 : revealStepAt(elapsed, steps);
  // 6x at the start, 1x on the last step; it eases between steps instead of jumping.
  const progress = reveal ? 1 : Math.min(1, elapsed / (REVEAL_STEP_MS * (steps - 1)));
  const scale = 6 - 5 * progress;
  const picked = pickedId(answer);
  const open = now >= startsAt && !answer && !!onAnswer && !reveal;
  return (
    <div className="flex flex-col gap-3">
      <PromptCard>{L(q.prompt, locale)}</PromptCard>
      <div className={cn('relative mx-auto aspect-square w-full overflow-hidden rounded-3xl border-2 border-white/15 bg-white', variant === 'host' ? 'max-w-[200px]' : 'max-w-[300px]')}>
        <div
          className="absolute inset-0 transition-transform duration-200 ease-linear"
          style={{ transform: `scale(${scale})`, transformOrigin: `${q.focus.x * 100}% ${q.focus.y * 100}%` }}
        >
          <ShowArtView art={q.art} className="size-full" />
        </div>
      </div>
      <WorthLadder step={frozenStep ?? step} locale={locale} frozen={frozenStep != null} />
      <div className="grid grid-cols-2 gap-2.5">
        {q.options.map((o) => (
          <ChoiceButton
            key={o.id}
            compact
            option={o}
            locale={locale}
            state={optionState(o.id, q.correctId, picked, !!reveal)}
            share={reveal ? reveal.shares[o.id] ?? 0 : null}
            disabled={!open}
            onPick={() => onAnswer?.({ kind: 'reveal_choice', optionId: o.id, step, elapsedMs: elapsed })}
          />
        ))}
      </div>
    </div>
  );
}

export function EvolutionView({ q, locale, now, startsAt, answer, onAnswer, reveal, variant }: QuestionViewProps<EvolutionQuestion>) {
  const steps = revealSteps(q);
  const elapsed = Math.max(0, now - startsAt);
  const step = reveal ? steps - 1 : revealStepAt(elapsed, steps);
  const frozenStep = answer?.kind === 'reveal_choice' ? answer.step : null;
  const picked = pickedId(answer);
  const open = now >= startsAt && !answer && !!onAnswer && !reveal;
  const current = q.eras[Math.min(step, q.eras.length - 1)]!;
  return (
    <div className="flex flex-col gap-3">
      <PromptCard>{L(q.prompt, locale)}</PromptCard>
      <div className="mx-auto flex w-full max-w-[340px] flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
        <motion.div
          key={current.year}
          initial={{ opacity: 0, scale: 0.8, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="flex flex-col items-center"
        >
          <ShowArtView art={current.art} className={variant === 'host' ? 'size-24' : 'size-36'} />
          <span className="mt-1 font-poppins text-2xl font-black tabular-nums text-brand-yellow">{current.year}</span>
        </motion.div>
        <div className="flex items-end gap-2">
          {q.eras.map((e, i) => (
            <div key={e.year} className={cn('flex flex-col items-center transition-opacity', i <= step ? 'opacity-100' : 'opacity-25')}>
              {i <= step ? <ShowArtView art={e.art} className="size-10" /> : <div className="size-10 rounded-lg bg-white/10" />}
              <span className="font-poppins text-[10px] font-bold tabular-nums text-white/60">{i <= step ? e.year : '????'}</span>
            </div>
          ))}
        </div>
      </div>
      <WorthLadder step={frozenStep ?? step} locale={locale} frozen={frozenStep != null} />
      <div className="grid grid-cols-2 gap-2.5">
        {q.options.map((o) => (
          <ChoiceButton
            key={o.id}
            compact
            option={o}
            locale={locale}
            state={optionState(o.id, q.correctId, picked, !!reveal)}
            share={reveal ? reveal.shares[o.id] ?? 0 : null}
            disabled={!open}
            onPick={() => onAnswer?.({ kind: 'reveal_choice', optionId: o.id, step, elapsedMs: elapsed })}
          />
        ))}
      </div>
    </div>
  );
}

export function MinesView({ q, locale, now, startsAt, deadline, answer, onAnswer, reveal }: QuestionViewProps<MinesQuestion>) {
  const copy = SHOW_COPY[locale];
  const [selected, setSelected] = useState<string[]>([]);
  const submitted = useRef(false);
  const locked = answer?.kind === 'mines';
  const picks = locked ? answer.picked : selected;
  const open = now >= startsAt && !locked && !!onAnswer && !reveal;
  const fits = new Set(q.fits);

  const submit = (list: string[]) => {
    if (submitted.current || !onAnswer || list.length === 0) return;
    submitted.current = true;
    onAnswer({ kind: 'mines', picked: list, elapsedMs: Math.max(0, now - startsAt) });
  };

  // A selection you never locked in still counts at the buzzer.
  useEffect(() => {
    if (!submitted.current && onAnswer && selected.length > 0 && deadline - now < 400) submit(selected);
  });

  const toggle = (id: string) => {
    if (!open) return;
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const tally = minesTally(q.fits, picks);
  return (
    <div className="flex flex-col gap-3">
      <PromptCard>{L(q.prompt, locale)}</PromptCard>
      <div className="flex items-center justify-between px-1 font-poppins text-xs font-black uppercase tracking-wider text-white/70">
        <span>{copy.minesRule(q.fits.length, q.cards.length - q.fits.length)}</span>
        <span className="tabular-nums text-brand-yellow">{copy.picked(picks.length)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {q.cards.map((c) => {
          const isPicked = picks.includes(c.id);
          const isFit = fits.has(c.id);
          return (
            <motion.button
              key={c.id}
              type="button"
              whileTap={open ? { scale: 0.94 } : undefined}
              disabled={!open}
              onClick={() => toggle(c.id)}
              animate={reveal ? { rotateY: [90, 0] } : undefined}
              transition={reveal ? { duration: 0.35, delay: (q.cards.indexOf(c) % 9) * 0.06 } : undefined}
              className={cn(
                'relative flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1.5 py-2 text-center font-poppins text-[11px] font-bold uppercase leading-tight text-white',
                !reveal && (isPicked ? 'border-brand-yellow bg-brand-yellow/20' : 'border-white/20 bg-white/5'),
                reveal && isFit && (isPicked ? 'border-brand-green bg-brand-green/35' : 'border-brand-green/40 bg-brand-green/10'),
                reveal && !isFit && (isPicked ? 'border-brand-red bg-brand-red/35' : 'border-brand-red/30 bg-brand-red/10'),
              )}
            >
              {c.art && <ShowArtView art={c.art} className="size-11 overflow-hidden rounded-full bg-white/10" />}
              {reveal && (isFit ? <Check className="absolute right-1.5 top-1.5 size-4 text-brand-green-light" /> : <Bomb className="absolute right-1.5 top-1.5 size-4 text-brand-red" />)}
              {!reveal && isPicked && <Check className="absolute right-1.5 top-1.5 size-4 text-brand-yellow" />}
              <span>{L(c.label, locale)}</span>
            </motion.button>
          );
        })}
      </div>
      {!reveal && onAnswer && (
        <button
          type="button"
          disabled={!open || selected.length === 0}
          onClick={() => submit(selected)}
          className={cn(
            'mx-auto flex items-center gap-2 rounded-full px-8 py-3 font-poppins text-sm font-black uppercase',
            locked ? 'bg-white/10 text-white/60' : selected.length === 0 ? 'bg-white/10 text-white/40' : 'bg-brand-yellow text-black',
          )}
        >
          <Lock className="size-4" /> {locked ? copy.locked : copy.lockIn}
        </button>
      )}
      {reveal && (
        <div className="text-center font-poppins text-xs font-bold text-white/70">
          {locked && (tally.mines > 0 ? copy.boom : copy.foundOf(tally.found, q.fits.length))}
          {locked ? ' · ' : ''}
          {copy.avgFound(reveal.minesFoundAvg.toFixed(1))} · {copy.hitMine(Math.round(reveal.minesHitShare * 100))}
        </div>
      )}
    </div>
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US').replace(/,/g, ' ');
}

export function SliderView({ q, locale, now, startsAt, answer, onAnswer, reveal, variant }: QuestionViewProps<SliderQuestion>) {
  const copy = SHOW_COPY[locale];
  const [value, setValue] = useState(() => Math.round((q.min + q.max) / 2 / q.step) * q.step);
  const locked = answer?.kind === 'slider';
  const open = now >= startsAt && !locked && !!onAnswer && !reveal;
  const shown = locked ? answer.value : value;
  // At the reveal the big number is the answer; your guess moves to the line below.
  const headline = reveal ? q.answer : shown;
  const pct = (v: number) => ((v - q.min) / (q.max - q.min)) * 100;
  const unit = L(q.unit, locale);
  const yourPoints = locked ? sliderPoints(q, answer.value) : 0;
  return (
    <div className="flex flex-col gap-4">
      {q.art && (
        <ShowArtView art={q.art} className={cn('mx-auto w-full overflow-hidden rounded-3xl border-2 border-white/10', variant === 'host' ? 'aspect-[16/7] max-w-md' : 'aspect-video')} />
      )}
      <PromptCard sub={q.context ? L(q.context, locale) : undefined}>{L(q.prompt, locale)}</PromptCard>
      <div className="rounded-3xl border border-white/10 bg-white/5 px-5 pb-6 pt-5">
        <div className={cn('text-center font-poppins font-black tabular-nums', variant === 'host' ? 'text-4xl' : 'text-5xl', reveal ? 'text-brand-green-light' : 'text-white')}>
          {q.kind === 'what_minute' ? `${headline}'` : formatNumber(headline)}
          {unit && q.kind !== 'what_minute' && <span className="ml-2 text-base font-bold text-white/50">{unit}</span>}
        </div>
        <div className="relative mt-6 h-12">
          {reveal && (
            <div className="pointer-events-none absolute inset-x-0 top-1 h-4">
              {reveal.values.slice(0, 300).map((v, i) => (
                <span key={i} className="absolute top-0 size-1.5 -translate-x-1/2 rounded-full bg-white/30" style={{ left: `${pct(v)}%`, top: `${(i % 4) * 4}px` }} />
              ))}
            </div>
          )}
          <input
            type="range"
            min={q.min}
            max={q.max}
            step={q.step}
            value={shown}
            disabled={!open}
            onChange={(e) => setValue(Number(e.target.value))}
            className="absolute inset-x-0 top-6 w-full accent-brand-yellow"
            aria-label={L(q.prompt, locale)}
          />
          {reveal && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-0 -translate-x-1/2 rounded-full bg-brand-green px-2 py-0.5 font-poppins text-xs font-black text-white"
              style={{ left: `${pct(q.answer)}%` }}
            >
              {q.kind === 'what_minute' ? `${q.answer}'` : formatNumber(q.answer)}
            </motion.div>
          )}
        </div>
        <div className="mt-1 flex justify-between font-poppins text-[11px] font-bold tabular-nums text-white/40">
          <span>{formatNumber(q.min)}</span>
          <span>{formatNumber(q.max)}</span>
        </div>
      </div>
      {!reveal && onAnswer && (
        <button
          type="button"
          disabled={!open}
          onClick={() => onAnswer({ kind: 'slider', value, elapsedMs: Math.max(0, now - startsAt) })}
          className={cn(
            'mx-auto flex items-center gap-2 rounded-full px-8 py-3 font-poppins text-sm font-black uppercase',
            locked ? 'bg-white/10 text-white/60' : 'bg-brand-yellow text-black',
          )}
        >
          <Lock className="size-4" /> {locked ? copy.locked : copy.lockIn}
        </button>
      )}
      {reveal && onAnswer && (
        <div className="text-center font-poppins text-sm font-bold text-white/80">
          {locked
            ? answer.value === q.answer
              ? copy.exact
              : `${copy.yourGuess}: ${formatNumber(answer.value)} · ${copy.off(formatNumber(Math.abs(answer.value - q.answer)))} · +${yourPoints}`
            : copy.noAnswer}
        </div>
      )}
    </div>
  );
}

export function QuestionView(props: QuestionViewProps) {
  const { q } = props;
  switch (q.kind) {
    case 'true_false':
    case 'mcq':
    case 'odd_one_out':
    case 'fake_fact':
      return <ChoiceView {...props} q={q} />;
    case 'zoom_out':
      return <ZoomOutView {...props} q={q} />;
    case 'evolution':
      return <EvolutionView {...props} q={q} />;
    case 'mines':
      return <MinesView {...props} q={q} />;
    case 'closest_number':
    case 'what_minute':
      return <SliderView {...props} q={q} />;
  }
}
