'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, RotateCw, Send, Trophy, type LucideIcon } from 'lucide-react';
import { MiniGameShell, StatPill } from '@/features/mini-games/components/MiniGameShell';
import { footballGridAssetUrl } from '@/lib/football-grid/assets';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { matchesName } from '@/features/mini-games/lib/matching';
import { ALL_NAMES, fmtPoints } from '../lib/data';

export const GOLD = '#FFD54A';
export const GREEN = '#38B60E';
export const RED = '#FB3101';
export const BLUE = '#1645FF';

export { StatPill };

/** Every FIFA Universe prototype sits in the shared mini-game shell with the gold accent. */
export function FifaShell({
  title,
  subtitle,
  headerRight,
  backHref,
  children,
  wide = false,
  scrollable = true,
}: {
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  backHref?: string;
  children: ReactNode;
  wide?: boolean;
  scrollable?: boolean;
}) {
  return (
    <MiniGameShell title={title} subtitle={subtitle} accent={GOLD} headerRight={headerRight} backHref={backHref ?? '/demos'} wide={wide} scrollable={scrollable}>
      {children}
    </MiniGameShell>
  );
}

/** Pre-game explainer: icon, tagline, how-to bullets, format chips and a Start button. */
export function Intro({
  icon: Icon,
  title,
  tagline,
  steps,
  chips = [],
  cta,
  onStart,
}: {
  icon: LucideIcon;
  title: string;
  tagline: string;
  steps: string[];
  chips?: string[];
  cta?: string;
  onStart: () => void;
}) {
  const t = useMiniT();
  return (
    <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col justify-center py-4">
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-6 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-yellow/15 text-brand-yellow">
          <Icon className="size-8" />
        </span>
        <h2 className="mt-4 font-poppins text-2xl font-black uppercase tracking-wide text-white">{title}</h2>
        <p className="mt-1.5 font-poppins text-sm font-semibold text-white/60">{tagline}</p>
        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {chips.map((c) => (
              <span key={c} className="rounded-full bg-brand-blue/30 px-2.5 py-1 font-poppins text-[10px] font-black uppercase tracking-wider text-white/85">
                {c}
              </span>
            ))}
          </div>
        )}
        <ol className="mt-5 space-y-2.5 text-left">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-blue font-poppins text-xs font-black text-white">{i + 1}</span>
              <span className="pt-0.5 font-poppins text-sm font-semibold leading-snug text-white/80">{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <PrimaryButton onClick={onStart} className="mt-5">
        {cta ?? t('Start')}
      </PrimaryButton>
    </motion.div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  className = '',
  tone = 'yellow',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  tone?: 'yellow' | 'blue' | 'green' | 'ghost';
}) {
  const tones = {
    yellow: 'bg-brand-yellow text-black',
    blue: 'bg-brand-blue text-white',
    green: 'bg-brand-green text-white',
    ghost: 'bg-white/[0.06] text-white/70 hover:bg-white/10',
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-13 min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 font-poppins text-base font-black uppercase tracking-wide transition-transform active:scale-[0.98] disabled:opacity-40 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

export interface Choice {
  id: string;
  label: string;
  sub?: string;
  /** Optional leading element, e.g. a flag chip. */
  lead?: ReactNode;
}

/** 4-up answer grid. Once `picked` is set the grid locks and paints correct/wrong. */
export function Choices({
  options,
  picked,
  correctId,
  onPick,
  disabled = false,
  columns = 2,
}: {
  options: Choice[];
  picked: string | null;
  correctId: string | null;
  onPick: (id: string) => void;
  disabled?: boolean;
  columns?: 1 | 2;
}) {
  const locked = picked !== null || disabled;
  return (
    <div className={`grid gap-2 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {options.map((o) => {
        const isPick = picked === o.id;
        const isRight = picked !== null && correctId === o.id;
        const isWrong = isPick && correctId !== null && correctId !== o.id;
        const bg = isRight ? GREEN : isWrong ? RED : isPick ? BLUE : 'rgba(22,69,255,0.55)';
        return (
          <motion.button
            key={o.id}
            type="button"
            disabled={locked}
            onClick={() => onPick(o.id)}
            whileTap={locked ? undefined : { scale: 0.97 }}
            animate={{ backgroundColor: bg, opacity: locked && !isRight && !isPick ? 0.55 : 1 }}
            transition={{ duration: 0.2 }}
            className="flex min-h-[56px] items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left font-poppins text-white disabled:cursor-default"
          >
            {o.lead}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-black leading-tight">{o.label}</span>
              {o.sub && <span className="block truncate text-[11px] font-semibold text-white/65">{o.sub}</span>}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/** Typed guess with name suggestions from the dataset. Submits the raw text. */
export function NameInput({
  onSubmit,
  disabled = false,
  placeholder,
  autoFocus = true,
}: {
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const t = useMiniT();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!autoFocus || disabled) return;
    const id = window.setTimeout(() => ref.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [autoFocus, disabled]);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length < 2) return [];
    return ALL_NAMES.filter((n) => matchesName(q, [n]).ok || n.toLowerCase().includes(q)).slice(0, 5);
  }, [value]);

  const submit = (v: string) => {
    if (disabled || !v.trim()) return;
    setValue('');
    setHighlight(0);
    onSubmit(v.trim());
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); submit(focused && suggestions[highlight] ? suggestions[highlight] : value); }
  };

  return (
    <div className="relative">
      {focused && suggestions.length > 0 && !disabled && (
        <ul className="absolute bottom-full left-0 right-0 z-20 mb-1.5 overflow-hidden rounded-xl border border-white/10 bg-fut-menu shadow-xl">
          {suggestions.map((n, i) => (
            <li key={n}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); submit(n); }} onMouseEnter={() => setHighlight(i)} className={`w-full px-4 py-2.5 text-left font-poppins text-sm font-bold text-white ${i === highlight ? 'bg-brand-blue/40' : ''}`}>
                {n}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <input
          ref={ref}
          value={value}
          disabled={disabled}
          onChange={(e) => { setValue(e.target.value); setHighlight(0); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKeyDown}
          aria-autocomplete="list"
          placeholder={placeholder ?? t('Name the player…')}
          aria-label={placeholder ?? t('Name the player…')}
          autoComplete="off"
          spellCheck={false}
          className="font-poppins h-14 w-full rounded-[14px] border-none bg-brand-blue px-5 pr-14 text-center text-base font-semibold uppercase text-white outline-none placeholder:normal-case placeholder:text-white/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow disabled:opacity-50"
        />
        <button type="button" onClick={() => submit(value)} disabled={disabled || !value.trim()} aria-label={t('Go')} className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 disabled:opacity-40">
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Correct / wrong banner with the answer and an optional Next button. */
export function ResultBanner({
  correct,
  points,
  headline,
  answer,
  detail,
  onNext,
  nextLabel,
}: {
  correct: boolean;
  points?: number;
  headline?: string;
  answer?: string;
  detail?: string;
  onNext?: () => void;
  nextLabel?: string;
}) {
  const t = useMiniT();
  // Latch so a double tap during the exit animation cannot report the round twice.
  const [advanced, setAdvanced] = useState(false);
  const next = () => { if (advanced || !onNext) return; setAdvanced(true); onNext(); };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }} className="space-y-3">
      <div className="rounded-2xl border-2 p-3 text-center" style={{ borderColor: correct ? `${GREEN}66` : `${RED}66`, background: correct ? 'rgba(56,182,14,0.08)' : 'rgba(251,49,1,0.06)' }}>
        <div className="font-poppins text-sm font-black uppercase tracking-wide" style={{ color: correct ? GREEN : RED }}>
          {headline ?? (correct ? t('Correct!') : t('Wrong!'))}
        </div>
        {points !== undefined && points > 0 && <div className="mt-0.5 font-poppins text-2xl font-black text-white">+{fmtPoints(points)}</div>}
        {answer && <div className="mt-0.5 font-poppins text-lg font-black text-white">{answer}</div>}
        {detail && <div className="mt-0.5 font-poppins text-[11px] font-semibold text-white/55">{detail}</div>}
      </div>
      {onNext && (
        <PrimaryButton onClick={next} disabled={advanced}>{nextLabel ?? t('Next')}</PrimaryButton>
      )}
    </motion.div>
  );
}

/** End-of-run summary: big score, optional subline, result rows, Play again. */
export function Summary({
  score,
  title,
  subline,
  rows,
  onPlayAgain,
  extra,
}: {
  score: number | string;
  title?: string;
  subline?: string;
  rows?: Array<{ key: string; label: string; right: ReactNode; ok?: boolean | null; tag?: string }>;
  onPlayAgain: () => void;
  extra?: ReactNode;
}) {
  const t = useMiniT();
  return (
    <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col pt-2">
      <div className="rounded-3xl border-2 border-brand-yellow/40 bg-brand-yellow/[0.06] p-5 text-center">
        <Trophy className="mx-auto size-9 text-brand-yellow" />
        <div className="mt-2 font-poppins text-sm font-black uppercase tracking-wide text-white/60">{title ?? t('Run complete')}</div>
        <div className="mt-1 font-poppins text-5xl font-black text-brand-yellow">{typeof score === 'number' ? fmtPoints(score) : score}</div>
        {subline && <div className="mt-1 font-poppins text-xs font-semibold text-white/50">{subline}</div>}
        {extra}
      </div>
      {rows && rows.length > 0 && (
        <div className="mt-4 flex-1 space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: '44vh' }}>
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
              {r.tag && (
                <span className="w-14 shrink-0 rounded-md bg-fut-badge/50 px-1.5 py-0.5 text-center font-poppins text-[9px] font-black uppercase tracking-wider text-fut-gold-light">{r.tag}</span>
              )}
              <span className="min-w-0 flex-1 truncate font-poppins text-sm font-bold text-white">{r.label}</span>
              <span className={`font-poppins text-sm font-black ${r.ok === true ? 'text-brand-green' : r.ok === false ? 'text-brand-red' : 'text-white/70'}`}>{r.right}</span>
            </div>
          ))}
        </div>
      )}
      <PrimaryButton onClick={onPlayAgain} className="mt-4">
        <RotateCw className="size-5" /> {t('Play again')}
      </PrimaryButton>
    </motion.div>
  );
}

/** Thin countdown bar (0..1 progress = elapsed). */
export function TimerBar({ progress, color = GOLD }: { progress: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full transition-[width] duration-100 ease-linear" style={{ width: `${Math.max(0, Math.min(1, 1 - progress)) * 100}%`, background: color }} />
    </div>
  );
}

export function Lives({ lives, max = 3 }: { lives: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${lives} of ${max} lives`}>
      {Array.from({ length: max }, (_, i) => (
        <Heart key={i} className={`size-4 transition-colors ${i < lives ? 'fill-brand-red text-brand-red' : 'text-white/20'}`} />
      ))}
    </span>
  );
}

/** You-vs-rival scoreboard strip used by the duel-style prototypes. */
export function RivalBar({
  you,
  rival,
  turn = null,
  rivalThinking = false,
  center,
}: {
  you: ReactNode;
  rival: ReactNode;
  turn?: 'you' | 'rival' | null;
  rivalThinking?: boolean;
  center?: ReactNode;
}) {
  const t = useMiniT();
  const side = (label: string, value: ReactNode, active: boolean, color: string, right: boolean, thinking = false) => (
    <div className={`flex flex-1 items-center gap-2.5 rounded-2xl border px-3 py-2 ${right ? 'flex-row-reverse text-right' : ''}`} style={{ borderColor: active ? color : 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full font-poppins text-xs font-black text-white" style={{ background: color }}>
        {label[0]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-poppins text-[9px] font-black uppercase tracking-wider text-white/45">{label}</span>
        {thinking ? (
          <span className={`flex items-center gap-1 pt-1 ${right ? 'justify-end' : ''}`} aria-label={t('Opponent is thinking…')}>
            {[0, 0.15, 0.3].map((d) => (
              <span key={d} className="size-1.5 animate-bounce rounded-full bg-white/60" style={{ animationDelay: `${d}s` }} />
            ))}
          </span>
        ) : (
          <span className="block truncate font-poppins text-sm font-black text-white">{value}</span>
        )}
      </span>
    </div>
  );
  return (
    <div className="mb-3 flex items-stretch gap-2">
      {side(t('You'), you, turn === 'you', BLUE, false)}
      <div className="flex min-w-10 flex-col items-center justify-center text-center">
        {center ?? <span className="font-poppins text-[11px] font-black text-white/35">VS</span>}
      </div>
      {side(t('Rival'), rival, turn === 'rival', RED, true, rivalThinking)}
    </div>
  );
}

/** Tiny flag from the football-grid CDN. */
export function Flag({ code, width = 22, height = 15, className = '' }: { code: string; width?: number; height?: number; className?: string }) {
  if (!code) return null;
  return (
    <span className={`inline-block shrink-0 overflow-hidden rounded-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.4)] ${className}`} style={{ width, height }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={flagUrl(code)} alt="" width={width * 2} height={height * 2} className="block h-full w-full object-cover" />
    </span>
  );
}

export const flagUrl = (code: string) => footballGridAssetUrl(`/assets/football-grid/flags/${code}.svg`) ?? '';

/** Big stage-style headline that pops in (e.g. "⚡ PACE"). */
export function Callout({ children, color = GOLD, k }: { children: ReactNode; color?: string; k: string | number }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={k} initial={{ opacity: 0, scale: 0.8, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 380, damping: 22 }} className="text-center font-poppins text-xl font-black uppercase tracking-[0.18em]" style={{ color }}>
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
