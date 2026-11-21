'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock, Crown, Eye, Radio, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KIND_LABEL, L, SHOW_COPY } from '../show.copy';
import type { ShowLocale, ShowStageDef } from '../show.types';
import type { BoardRow } from '../show.sim';
import type { ShowSettings } from '../useShowSim';

export function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const JOIN_CHOICES = [5, 10, 15, 20];

export function CreatorPanel({ locale, initial, onCreate }: {
  locale: ShowLocale;
  initial: ShowSettings;
  onCreate: (s: ShowSettings) => void;
}) {
  const copy = SHOW_COPY[locale];
  const [title, setTitle] = useState(initial.title);
  const [joinMinutes, setJoinMinutes] = useState(initial.joinMinutes);
  const [georgiaOnly, setGeorgiaOnly] = useState(initial.georgiaOnly);
  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white">
        <div className="flex items-center gap-2 font-poppins text-xs font-black uppercase tracking-[0.2em] text-brand-yellow">
          <Radio className="size-4" /> {copy.creatorTitle}
        </div>
        <label className="mt-5 block font-poppins text-xs font-bold uppercase text-white/60">{copy.showName}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 font-poppins text-base font-bold text-white outline-none focus:border-brand-yellow"
        />
        <div className="mt-5 font-poppins text-xs font-bold uppercase text-white/60">{copy.joinWindow}</div>
        <div className="mt-1.5 grid grid-cols-4 gap-2">
          {JOIN_CHOICES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setJoinMinutes(m)}
              className={cn(
                'rounded-xl border-2 py-2.5 font-poppins text-sm font-black',
                joinMinutes === m ? 'border-brand-yellow bg-brand-yellow text-black' : 'border-white/15 text-white',
              )}
            >
              {copy.minutes(m)}
            </button>
          ))}
        </div>
        <label className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3">
          <span className="font-poppins text-sm font-bold">{copy.georgiaOnly}</span>
          <input type="checkbox" checked={georgiaOnly} onChange={(e) => setGeorgiaOnly(e.target.checked)} className="size-5 accent-brand-yellow" />
        </label>
        <button
          type="button"
          onClick={() => onCreate({ title: title.trim() || initial.title, joinMinutes, georgiaOnly })}
          className="mt-6 w-full rounded-2xl bg-brand-green py-4 font-poppins text-base font-black uppercase text-white shadow-[0_8px_24px_rgba(56,182,14,0.3)]"
        >
          {copy.createShow}
        </button>
      </div>
    </div>
  );
}

export function Lobby({ locale, title, now, openedAt, closesAt, joined, isHost, onStartNow }: {
  locale: ShowLocale;
  title: string;
  now: number;
  openedAt: number;
  closesAt: number;
  joined: number;
  isHost: boolean;
  onStartNow: () => void;
}) {
  const copy = SHOW_COPY[locale];
  const progress = Math.min(1, (now - openedAt) / Math.max(1, closesAt - openedAt));
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 text-white">
      <div className="flex items-center justify-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-brand-red px-3 py-1 font-poppins text-[11px] font-black uppercase tracking-widest">
          <span className="size-2 animate-pulse rounded-full bg-white" /> {copy.lobbyLive}
        </span>
      </div>
      <h1 className="text-center font-poppins text-3xl font-black uppercase leading-tight">{title}</h1>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
        <div className="font-poppins text-xs font-black uppercase tracking-[0.2em] text-white/60">{copy.startsIn}</div>
        <div className="mt-1 font-poppins text-6xl font-black tabular-nums">{mmss(closesAt - now)}</div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-brand-yellow" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 font-poppins text-lg font-black">
          <Users className="size-5 text-brand-yellow" />
          <motion.span key={joined} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="tabular-nums">{joined}</motion.span>
          <span className="text-sm font-bold text-white/60">{copy.joined}</span>
        </div>
      </div>
      <div className="rounded-2xl bg-brand-green/20 px-4 py-3 text-center font-poppins text-sm font-bold text-brand-green-light">{copy.youreIn}</div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="font-poppins text-xs font-black uppercase tracking-[0.2em] text-brand-yellow">{copy.howItWorks}</div>
        <ol className="mt-3 flex flex-col gap-2.5 font-poppins text-sm font-medium text-white/85">
          {[copy.rule1, copy.rule2, copy.rule3, copy.rule4].map((r, i) => (
            <li key={r} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black">{i + 1}</span>
              {r}
            </li>
          ))}
        </ol>
      </div>
      {isHost && (
        <button type="button" onClick={onStartNow} className="rounded-2xl bg-brand-green py-4 font-poppins text-base font-black uppercase">
          {copy.startNow}
        </button>
      )}
    </div>
  );
}

export function ShowHeader({ locale, stageIndex, stageCount, stage, qIndex, secondsLeft, points, rank, alive, spectating }: {
  locale: ShowLocale;
  stageIndex: number;
  stageCount: number;
  stage: ShowStageDef;
  qIndex: number;
  secondsLeft: number | null;
  points: number;
  rank: number | null;
  alive: number;
  spectating: boolean;
}) {
  const copy = SHOW_COPY[locale];
  const q = stage.questions[qIndex];
  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-4">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: stageCount }, (_, i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full', i < stageIndex ? 'bg-brand-green-light' : i === stageIndex ? 'bg-brand-yellow' : 'bg-white/10')} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="rounded-full bg-brand-blue px-3 py-1.5 font-poppins text-[11px] font-black uppercase tracking-wide text-white">
          {stage.final ? copy.finalStage : L(stage.title, locale)} · {copy.question(qIndex + 1, stage.questions.length)}
        </span>
        {secondsLeft != null && (
          <span className={cn(
            'flex items-center gap-1 rounded-full px-3 py-1.5 font-poppins text-sm font-black tabular-nums',
            secondsLeft <= 3 ? 'bg-brand-red text-white' : 'bg-white/10 text-white',
          )}>
            <Clock className="size-3.5" /> {secondsLeft}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between font-poppins text-xs font-bold uppercase text-white/60">
        {spectating ? (
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-white/80"><Eye className="size-3.5" /> {copy.spectating}</span>
        ) : (
          <span className="tabular-nums">{rank != null ? `#${rank}` : ''} · {copy.points(points)}</span>
        )}
        <span className="flex items-center gap-1 tabular-nums"><Users className="size-3.5" /> {copy.playersLeft(alive)}</span>
      </div>
      {q && (
        <div className="mt-3 text-center font-poppins text-[11px] font-black uppercase tracking-[0.25em] text-brand-yellow/80">
          {L(KIND_LABEL[q.kind], locale)}
        </div>
      )}
    </div>
  );
}

export function StageIntro({ locale, stage, index, count }: { locale: ShowLocale; stage: ShowStageDef; index: number; count: number }) {
  const copy = SHOW_COPY[locale];
  const rule = stage.final
    ? copy.finalRule
    : stage.keep && 'share' in stage.keep
      ? copy.keepShare(Math.round(stage.keep.share * 100))
      : stage.keep
        ? copy.keepCount(stage.keep.count)
        : '';
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.86, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className={cn('w-full max-w-sm rounded-[28px] px-6 py-8 text-center text-white', stage.final ? 'bg-brand-gold/90' : 'bg-brand-blue')}
      >
        <div className="font-poppins text-xs font-black uppercase tracking-[0.25em] text-brand-yellow">
          {stage.final ? copy.finalStage : copy.stage(index + 1, count)}
        </div>
        <div className="mt-2 font-poppins text-4xl font-black uppercase leading-none">{L(stage.title, locale)}</div>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {[...new Set(stage.questions.map((q) => q.kind))].map((k) => (
            <span key={k} className="rounded-full bg-white/15 px-2.5 py-1 font-poppins text-[11px] font-bold uppercase">{L(KIND_LABEL[k], locale)}</span>
          ))}
        </div>
        <div className="mt-4 font-poppins text-sm font-bold text-white/90">{rule}</div>
      </motion.div>
    </div>
  );
}

function BoardRowView({ row, you, out }: { row: BoardRow; you: boolean; out: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 px-3 py-2.5', you ? 'bg-brand-green text-white' : 'text-white', !you && out && 'opacity-50')}>
      <span className="w-10 text-center font-poppins text-sm font-black tabular-nums">#{row.rank}</span>
      <span className="min-w-0 flex-1 truncate font-poppins text-sm font-black uppercase">{row.name}</span>
      <span className="font-poppins text-sm font-black tabular-nums">{row.points}</span>
    </div>
  );
}

/** The standings with the cut drawn: the top 3, then a window around you. */
export function CutBoard({ board, keep, youId, locale }: { board: BoardRow[]; keep: number; youId: string; locale: ShowLocale }) {
  const copy = SHOW_COPY[locale];
  const you = board.find((r) => r.id === youId);
  const center = you?.rank ?? keep;
  const lo = Math.max(1, Math.min(center - 3, keep - 1));
  const hi = Math.min(board.length, Math.max(center + 3, keep + 2));
  const top = board.filter((r) => r.rank <= Math.min(3, lo - 1));
  const window = board.filter((r) => r.rank >= lo && r.rank <= hi);
  const rows: React.ReactNode[] = [];
  top.forEach((r) => rows.push(<BoardRowView key={r.id} row={r} you={r.id === youId} out={false} />));
  if (top.length > 0 && lo > top.length + 1) rows.push(<div key="gap" className="py-1 text-center text-white/30">⋯</div>);
  window.forEach((r) => {
    rows.push(<BoardRowView key={r.id} row={r} you={r.id === youId} out={r.rank > keep} />);
    if (r.rank === keep && keep < board.length) {
      rows.push(
        <div key="cut" className="flex items-center gap-2 px-3 py-1.5">
          <span className="h-0.5 flex-1 bg-brand-red" />
          <span className="font-poppins text-[10px] font-black uppercase tracking-[0.2em] text-brand-red">{copy.cutLine}</span>
          <span className="h-0.5 flex-1 bg-brand-red" />
        </div>,
      );
    }
  });
  return <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">{rows}</div>;
}

export function StageResult({ locale, board, keep, youId, youThrough, wasPlaying }: {
  locale: ShowLocale;
  board: BoardRow[];
  keep: number;
  youId: string;
  youThrough: boolean;
  wasPlaying: boolean;
}) {
  const copy = SHOW_COPY[locale];
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 text-white">
      {wasPlaying && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          className={cn('rounded-3xl px-5 py-6 text-center', youThrough ? 'bg-brand-green' : 'bg-brand-red')}
        >
          <div className="font-poppins text-3xl font-black uppercase">{youThrough ? copy.through : copy.out}</div>
          <div className="mt-1 font-poppins text-sm font-bold text-white/90">{youThrough ? copy.throughSub(keep) : copy.outSub}</div>
        </motion.div>
      )}
      <CutBoard board={board} keep={keep} youId={youId} locale={locale} />
    </div>
  );
}

export function ChampionScreen({ locale, board, youId, onRestart }: { locale: ShowLocale; board: BoardRow[]; youId: string; onRestart: () => void }) {
  const copy = SHOW_COPY[locale];
  const [first, second, third] = board;
  const you = board.find((r) => r.id === youId);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-4 py-8 text-white">
      <motion.div initial={{ y: -30, opacity: 0, rotate: -12 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
        <Crown className="size-16 text-brand-yellow drop-shadow-[0_0_20px_rgba(255,229,0,0.6)]" />
      </motion.div>
      <div className="font-poppins text-xs font-black uppercase tracking-[0.3em] text-brand-yellow">{copy.champion}</div>
      <div className="font-poppins text-4xl font-black uppercase">{first?.name}</div>
      <div className="font-poppins text-lg font-bold tabular-nums text-white/70">{copy.points(first?.points ?? 0)}</div>
      <div className="mt-2 grid w-full grid-cols-3 items-end gap-2">
        {[second, first, third].map((r, i) => r && (
          <div key={r.id} className="flex flex-col items-center gap-1.5">
            <span className="max-w-full truncate font-poppins text-xs font-black uppercase">{r.name}</span>
            <div className={cn(
              'flex w-full items-start justify-center rounded-t-2xl pt-2 font-poppins text-xl font-black',
              i === 1 ? 'h-28 bg-brand-yellow text-black' : i === 0 ? 'h-20 bg-white/30' : 'h-14 bg-brand-gold/60',
            )}>
              {r.rank}
            </div>
          </div>
        ))}
      </div>
      {you && <div className="font-poppins text-base font-bold">{copy.yourFinal(you.rank)}</div>}
      <button type="button" onClick={onRestart} className="mt-2 rounded-full bg-white/10 px-6 py-3 font-poppins text-sm font-black uppercase">
        {copy.playAgain}
      </button>
    </div>
  );
}

export function RevealSplash({ points, correct, show }: { points: number | null; correct: boolean; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0.4, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 16 }}
          className={cn(
            'pointer-events-none absolute left-1/2 top-24 z-50 -translate-x-1/2 rounded-full px-6 py-2 font-poppins text-3xl font-black tabular-nums shadow-xl',
            correct ? 'bg-brand-yellow text-black' : points && points > 0 ? 'bg-brand-yellow/80 text-black' : 'bg-brand-red text-white',
          )}
        >
          {points == null ? '—' : `+${points}`}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
