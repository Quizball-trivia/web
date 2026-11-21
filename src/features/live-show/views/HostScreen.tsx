'use client';

import { motion } from 'motion/react';
import { Crown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KIND_LABEL, L, SHOW_COPY } from '../show.copy';
import type { ShowLocale } from '../show.types';
import type { ShowState } from '../useShowSim';
import { QuestionView } from './QuestionViews';
import { mmss } from './ShowScreens';

/** A stand-in QR: a seeded grid, so the layout has its real footprint before the join link exists. */
function qrCells(seed: string): boolean[] {
  let h = 7;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < 21 * 21; i += 1) {
    h = (h * 1103515245 + 12345) >>> 0;
    const x = i % 21;
    const y = Math.floor(i / 21);
    const finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
    if (finder) {
      const fx = x > 13 ? x - 14 : x;
      const fy = y > 13 ? y - 14 : y;
      cells.push(fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4));
    } else {
      cells.push((h >>> 16) % 2 === 0);
    }
  }
  return cells;
}

function FakeQr({ seed }: { seed: string }) {
  const cells = qrCells(seed);
  return (
    <div className="grid size-40 grid-cols-[repeat(21,1fr)] rounded-xl bg-white p-2">
      {cells.map((on, i) => <span key={i} className={on ? 'bg-black' : 'bg-white'} />)}
    </div>
  );
}

function TopTen({ state, locale }: { state: ShowState; locale: ShowLocale }) {
  const copy = SHOW_COPY[locale];
  return (
    <div className="flex h-full flex-col rounded-3xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-center justify-between font-poppins text-sm font-black uppercase tracking-widest text-brand-yellow">
        <span>{copy.host.top}</span>
        <span className="flex items-center gap-1.5 text-white"><Users className="size-4" /> {state.aliveCount} {copy.host.left}</span>
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        {state.board.slice(0, 10).map((r) => (
          <motion.div layout key={r.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
            <span className={cn('w-7 font-poppins text-lg font-black tabular-nums', r.rank <= 3 ? 'text-brand-yellow' : 'text-white/60')}>{r.rank}</span>
            <span className="min-w-0 flex-1 truncate font-poppins text-lg font-black uppercase text-white">{r.name}</span>
            <span className="font-poppins text-lg font-black tabular-nums text-white">{r.points}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** The 16:9 page the creator adds to OBS. It runs live; viewers see it on the stream a few seconds late. */
export function HostScreen({ state, locale }: { state: ShowState; locale: ShowLocale }) {
  const copy = SHOW_COPY[locale];
  const { screen } = state;
  const stageCount = state.pack.stages.length;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover font-fun text-white">
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-8 py-5">
        <span className="font-poppins text-2xl font-black uppercase tracking-wide">{state.settings.title}</span>
        {state.stage && (
          <span className="rounded-full bg-brand-blue px-4 py-1.5 font-poppins text-sm font-black uppercase">
            {state.stage.final ? copy.finalStage : copy.host.roundOf((('stage' in screen ? screen.stage : 0) ?? 0) + 1, stageCount)} · {L(state.stage.title, locale)}
          </span>
        )}
      </div>

      {(screen.kind === 'creator' || screen.kind === 'lobby') && (
        <div className="absolute inset-0 flex items-center justify-center gap-16 px-16 pt-10">
          <div className="flex flex-col items-center gap-3">
            <FakeQr seed={state.settings.title} />
            <span className="font-poppins text-lg font-black uppercase">{copy.host.scanToJoin}</span>
            <span className="font-poppins text-base font-bold text-white/70">{copy.joinWith}</span>
          </div>
          <div className="text-center">
            <div className="font-poppins text-lg font-black uppercase tracking-[0.3em] text-brand-yellow">{copy.startsIn}</div>
            <div className="font-poppins text-[120px] font-black leading-none tabular-nums">
              {screen.kind === 'lobby' ? mmss(screen.closesAt - state.now) : mmss(state.settings.joinMinutes * 60_000)}
            </div>
            <div className="mt-4 flex items-center justify-center gap-3 font-poppins text-3xl font-black">
              <Users className="size-8 text-brand-yellow" />
              {screen.kind === 'lobby' ? joinedCount(state) : 0} {copy.joined}
            </div>
          </div>
        </div>
      )}

      {screen.kind === 'stage_intro' && state.stage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-poppins text-[96px] font-black uppercase leading-none">
            {L(state.stage.title, locale)}
          </motion.div>
          <div className="flex gap-2">
            {[...new Set(state.stage.questions.map((q) => q.kind))].map((k) => (
              <span key={k} className="rounded-full bg-white/15 px-4 py-1.5 font-poppins text-lg font-bold uppercase">{L(KIND_LABEL[k], locale)}</span>
            ))}
          </div>
        </div>
      )}

      {(screen.kind === 'question' || screen.kind === 'reveal') && state.question && (
        <div className="absolute inset-0 grid grid-cols-[1fr_380px] gap-6 px-8 pb-6 pt-20">
          <div className="flex flex-col">
            <div className="flex items-center justify-between font-poppins text-base font-black uppercase tracking-widest text-brand-yellow">
              <span>{L(KIND_LABEL[state.question.kind], locale)}</span>
              {screen.kind === 'question' && (
                <span className="flex items-center gap-4 tabular-nums text-white">
                  <span className="text-brand-green-light">{state.answeredCount} / {state.aliveCount} {copy.host.answeredNow}</span>
                  <span>{Math.max(0, Math.ceil((screen.deadline - Math.max(state.now, screen.startsAt)) / 1000))}s</span>
                </span>
              )}
            </div>
            <div className="mt-3 flex-1 overflow-hidden">
              <div className="mx-auto max-w-2xl">
                <QuestionView
                  key={state.question.id}
                  q={state.question}
                  locale={locale}
                  now={state.now}
                  startsAt={screen.kind === 'question' ? screen.startsAt : 0}
                  deadline={screen.kind === 'question' ? screen.deadline : 0}
                  answer={null}
                  reveal={screen.kind === 'reveal' ? state.reveal : null}
                  variant="host"
                />
              </div>
            </div>
          </div>
          <TopTen state={state} locale={locale} />
        </div>
      )}

      {screen.kind === 'stage_result' && (
        <div className="absolute inset-0 grid grid-cols-[1fr_380px] gap-6 px-8 pb-6 pt-20">
          <div className="flex flex-col items-center justify-center text-center">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-poppins text-[110px] font-black leading-none tabular-nums text-brand-green-light">
              {screen.keep}
            </motion.div>
            <div className="mt-2 font-poppins text-3xl font-black uppercase">{copy.throughSub(screen.keep)}</div>
            <div className="mt-2 font-poppins text-xl font-bold text-brand-red">−{screen.board.length - screen.keep}</div>
          </div>
          <TopTen state={state} locale={locale} />
        </div>
      )}

      {screen.kind === 'champion' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <motion.div initial={{ y: -40, opacity: 0, rotate: -10 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, damping: 12 }}>
            <Crown className="size-28 text-brand-yellow drop-shadow-[0_0_30px_rgba(255,229,0,0.6)]" />
          </motion.div>
          <div className="font-poppins text-2xl font-black uppercase tracking-[0.3em] text-brand-yellow">{copy.champion}</div>
          <div className="font-poppins text-[96px] font-black uppercase leading-none">{screen.board[0]?.name}</div>
          <div className="font-poppins text-3xl font-bold tabular-nums text-white/70">{copy.points(screen.board[0]?.points ?? 0)}</div>
        </div>
      )}
    </div>
  );
}

/** Lobby head-count: joins arrive fast at first and taper off before the window closes. */
export function joinedCount(state: ShowState): number {
  if (state.screen.kind !== 'lobby') return state.fieldSize;
  const { openedAt, closesAt } = state.screen;
  const t = Math.min(1, ((state.now - openedAt) / Math.max(1, closesAt - openedAt)) * 1.6);
  return Math.max(1, Math.round(state.fieldSize * (1 - (1 - t) ** 2)));
}
