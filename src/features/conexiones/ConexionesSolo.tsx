"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Shuffle } from "lucide-react";
import { DailyEnd } from "@/features/wordgames/daily/WordDailyShell";
import { GreenButton, TopBar, poppins } from "@/features/wordgames/ui";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { cn } from "@/lib/utils";
import { conexionesCopy } from "./conexiones.copy";
import { conexionesDailyGame } from "./conexiones.game";
import { SOLO_MISTAKES, shareGrid, soloFound, type CxBoard, type CxSoloOutcome, type CxSoloState } from "./conexiones.logic";
import { ConexionesGrid, MistakeDots, SolvedBand, TIER_BG, usePrefersReducedMotion } from "./ConexionesBoard";

export const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function Notice({ outcome, locale }: { outcome: CxSoloOutcome | "timeout" | null; locale: string }) {
  const c = conexionesCopy(locale);
  const still = usePrefersReducedMotion();
  const text = outcome === "right" ? c.right : outcome === "oneAway" ? c.oneAway : outcome === "wrong" ? c.wrong : outcome === "repeat" ? c.repeat : null;
  return (
    <div className="flex h-9 items-center justify-center" aria-live="polite">
      <AnimatePresence mode="wait">
        {text && (
          <motion.span key={`${outcome}`} initial={still ? false : { y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={still ? { duration: 0 } : undefined}
            className={cn("rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide", outcome === "right" ? "bg-brand-green text-black" : outcome === "oneAway" ? "bg-brand-yellow text-black" : "bg-white/15 text-white")}
            style={poppins} data-cx-notice={outcome}>
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ConexionesPlayView({ locale, number, board, state, selected, outcome, shakeKey, pending, onToggle, onSubmit, onShuffle, onClear, onExit }: {
  locale: string; number: number; board: CxBoard; state: CxSoloState; selected: readonly string[]; outcome: CxSoloOutcome | null; shakeKey: number; pending: boolean;
  onToggle: (id: string) => void; onSubmit: () => void; onShuffle: () => void; onClear: () => void; onExit: () => void;
}) {
  const c = conexionesCopy(locale);
  const d = wordDailyCopy(locale);
  const ready = selected.length === 4;
  return (
    <div className="flex flex-1 flex-col">
      <TopBar wrap brand={c.brand} exitLabel={d.exit} onExit={onExit}
        right={<span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-black tabular-nums text-white" style={poppins}>#{number}</span>} />
      <Notice outcome={outcome} locale={locale} />
      <ConexionesGrid board={board} order={state.order} solved={state.solved} selected={selected} locale={locale} disabled={pending || state.status !== "playing"}
        shakeKey={outcome && outcome !== "right" ? shakeKey : undefined} bandTone={() => "tier"} bandLabel={(s) => (s.missed ? c.unsolved : undefined)} onToggle={onToggle} />
      <div className="mt-4"><MistakeDots left={SOLO_MISTAKES - state.mistakes} total={SOLO_MISTAKES} label={c.mistakesLeft} /></div>
      <div className="flex-1" />
      <div className="sticky bottom-0 mt-4 space-y-2 bg-surface-page-alt/95 pb-1 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onShuffle} className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15" style={poppins}>
            <Shuffle className="size-4" aria-hidden />{c.shuffle}
          </button>
          <button type="button" onClick={onClear} disabled={selected.length === 0} className="h-11 rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15 disabled:opacity-40" style={poppins}>{c.clear}</button>
        </div>
        <GreenButton disabled={!ready || pending} onClick={onSubmit}>{ready ? c.submit : c.pickFour(selected.length)}</GreenButton>
      </div>
    </div>
  );
}

export function ShareSquares({ state }: { state: CxSoloState }) {
  return (
    <div className="mx-auto mt-3 grid w-fit gap-1" aria-hidden>
      {state.tries.map((t, i) => (
        <div key={i} className="flex gap-1">{t.tiers.map((tier, j) => <span key={j} className={cn("size-4 rounded", tier ? TIER_BG[tier] : "bg-white/20")} />)}</div>
      ))}
    </div>
  );
}

export function ConexionesEndView({ locale, number, board, state, guestOnPastBoard, leaderboard, friends, onArchive, onExit }: {
  locale: string; number: number; board: CxBoard; state: CxSoloState; guestOnPastBoard: boolean; leaderboard: ReactNode; friends?: ReactNode; onArchive: () => void; onExit?: () => void;
}) {
  const c = conexionesCopy(locale);
  const found = soloFound(state);
  const won = state.status === "won";
  const left = SOLO_MISTAKES - state.mistakes;
  return (
    <DailyEnd game={conexionesDailyGame(locale)} locale={locale} day={state.day} shareText={c.shareText(number, found, shareGrid(state))}
      guestOnPastBoard={guestOnPastBoard} ranked={state.ranked} rank={state.rank} leaderboard={leaderboard} friends={friends} onArchive={onArchive} onExit={onExit}>
      <div className="rounded-3xl bg-brand-blue px-5 pb-5 pt-4 text-center" data-cx-end>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{c.title} #{number}</p>
        <p className="mt-2 text-6xl font-black tabular-nums" style={poppins}>{found}<span className="text-3xl text-white/60">/4</span></p>
        <p className="text-sm font-black uppercase tracking-wide text-white/75" style={poppins}>{c.groups}</p>
        <p className="mt-2 text-base font-bold">{won ? c.endWon(state.mistakes) : c.endLost(found)}</p>
        <p className="mt-1 text-sm font-semibold text-white/80" data-cx-points>{c.pointsLine(won ? 4 + left : found, won, left)}</p>
        <div className="mt-3 flex justify-center gap-6 text-xs font-bold text-white/80">
          <span><span className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/60">{c.mistakes}</span><span className="text-lg font-black tabular-nums text-white" style={poppins}>{state.mistakes}</span></span>
          <span><span className="block text-[10px] font-black uppercase tracking-[0.15em] text-white/60">{c.time}</span><span className="text-lg font-black tabular-nums text-white" style={poppins}>{clock((state.endedAt ?? state.startedAt) - state.startedAt)}</span></span>
        </div>
        <ShareSquares state={state} />
        {state.groupsLater && <p className="mt-3 text-xs font-semibold text-white/80" data-cx-groups-later>{c.groupsLater}</p>}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-1.5">
        {[...state.solved].sort((a, b) => a.tier - b.tier).map((s) => <SolvedBand key={s.groupId} solved={s} board={board} locale={locale} tone="tier" label={s.missed ? c.unsolved : undefined} />)}
      </div>
    </DailyEnd>
  );
}
