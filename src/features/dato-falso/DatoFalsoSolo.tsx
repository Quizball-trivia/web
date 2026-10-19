"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DailyEnd } from "@/features/wordgames/daily/WordDailyShell";
import { GreenButton, TopBar, poppins } from "@/features/wordgames/ui";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { cn } from "@/lib/utils";
import { datoFalsoCopy } from "./datoFalso.copy";
import { datoFalsoDailyGame } from "./datoFalso.game";
import { DfClaim, DfJokers, DfOptions, DfProgress, DfVerdict } from "./DatoFalsoCard";
import { useRevealSound } from "./datoFalso.sounds";
import { dfRightCount, dfShareGrid, type DfJoker, type DfSoloState } from "./datoFalso.view";

function useSecondsTo(deadline: string | null, nowMs: () => number): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setNow(nowMs());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 250);
    return () => { window.clearTimeout(first); window.clearInterval(id); };
  }, [deadline, nowMs]);
  return deadline && now !== null ? Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000)) : null;
}

const realNow = () => Date.now();

export function DatoFalsoPlayView({ locale, number, state, pending, nowMs = realNow, onJoker, onPick, onNext, onExit }: {
  locale: string; number: number; state: DfSoloState; pending: boolean; nowMs?: () => number;
  onJoker: (joker: DfJoker) => void; onPick: (option: string) => void; onNext: () => void; onExit: () => void;
}) {
  const c = datoFalsoCopy(locale);
  const d = wordDailyCopy(locale);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedFor, setSelectedFor] = useState(state.index);
  // A new card clears the selection (set during render: no flash of the old pick).
  if (selectedFor !== state.index) { setSelectedFor(state.index); setSelected(null); }
  const reveal = state.reveal;
  useRevealSound(reveal ? `${state.day}:${state.index}` : null, Boolean(reveal && reveal.pick === reveal.fake));
  const seconds = useSecondsTo(reveal ? null : state.deadline, nowMs);
  const fakeLabel = reveal ? state.card.options.find((o) => o.id === reveal.fake)?.label ?? "" : "";
  const last = state.index + 1 >= state.total;
  const choice = selected && !state.removed.includes(selected) ? selected : null;
  return (
    <div className="flex flex-1 flex-col">
      <TopBar brand={c.brand} seconds={seconds} exitLabel={d.exit} onExit={onExit}
        right={<span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-black tabular-nums text-white" style={poppins} data-df-score>{c.points(state.score)}</span>} />
      <div className="mt-3 flex items-center gap-3">
        <span className="shrink-0 text-xs font-black uppercase tracking-wide text-white/55 tabular-nums" style={poppins}>#{number} · {c.cardOf(state.index + 1, state.total)}</span>
        <DfProgress marks={state.marks} total={state.total} index={state.index} className="flex-1" />
      </div>
      <DfClaim card={state.card} copy={c} className="mt-5" />
      {state.doubled && !reveal && <p className="mt-3 rounded-xl bg-brand-yellow/15 px-3 py-2 text-xs font-bold text-brand-yellow">{c.doubleOn}</p>}
      <DfOptions card={state.card} copy={c} removed={state.removed} selected={choice} reveal={reveal} myPick={reveal?.pick ?? null}
        disabled={pending} onSelect={setSelected} />
      {reveal ? (
        <DfVerdict copy={c} fakeLabel={fakeLabel} points={reveal.points} pick={reveal.pick} explain={reveal.explain}>
          <GreenButton className="mt-3 h-12 text-sm" onClick={onNext}>{last ? c.seeResult : c.next}</GreenButton>
        </DfVerdict>
      ) : (
        <>
          <div className="flex-1" />
          <div className="sticky bottom-0 mt-5 space-y-3 bg-surface-page-alt/95 pb-1 pt-2">
            <DfJokers copy={c} used={state.jokersUsed} doubled={state.doubled} disabled={pending} onJoker={onJoker} />
            <GreenButton disabled={!choice || pending} onClick={() => choice && onPick(choice)}>{pending ? c.sending : choice ? c.lockIn : c.pickHint}</GreenButton>
          </div>
        </>
      )}
    </div>
  );
}

export function DatoFalsoEndView({ locale, number, state, guestOnPastBoard, leaderboard, friends, review, onArchive, onExit }: {
  locale: string; number: number; state: DfSoloState; guestOnPastBoard: boolean; leaderboard: ReactNode; friends?: ReactNode;
  /** The day's cards with their fakes, once the day may show them (the server decides). */
  review?: ReactNode; onArchive: () => void; onExit?: () => void;
}) {
  const c = datoFalsoCopy(locale);
  const right = dfRightCount(state.marks);
  return (
    <DailyEnd game={datoFalsoDailyGame(locale)} locale={locale} day={state.day} shareText={c.shareText(number, state.score, dfShareGrid(state.marks))}
      guestOnPastBoard={guestOnPastBoard} ranked={state.ranked} rank={state.rank} leaderboard={leaderboard} friends={friends} onArchive={onArchive} onExit={onExit}>
      <div className="rounded-3xl bg-brand-blue px-5 pb-5 pt-4 text-center" data-df-end>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{c.title} #{number}</p>
        <p className="mt-2 text-6xl font-black tabular-nums" style={poppins}>{state.score}</p>
        <p className="text-sm font-black uppercase tracking-wide text-white/75" style={poppins}>{c.pointsStat}</p>
        <p className="mt-2 text-base font-bold">{c.endTitle(right, state.total)}</p>
        <div className="mx-auto mt-4 grid w-fit grid-cols-5 gap-1.5" aria-label={c.rightOf(right, state.total)}>
          {state.marks.map((m, i) => (
            <span key={i} className={cn("relative grid size-7 place-items-center rounded-lg text-[10px] font-black", m.right ? "bg-brand-green-light text-black" : "bg-brand-red-soft text-white")} style={poppins}>
              {m.double ? "×2" : ""}{m.cut ? "✂" : ""}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs font-bold text-white/75">{c.rightOf(right, state.total)}</p>
      </div>
      {review}
    </DailyEnd>
  );
}
