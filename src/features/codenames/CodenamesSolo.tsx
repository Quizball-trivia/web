"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Shirt, Skull, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { DailyEnd } from "@/features/wordgames/daily/WordDailyShell";
import { GreenButton, TopBar, poppins } from "@/features/wordgames/ui";
import { CodenamesBoard, type BoardCard } from "./CodenamesBoard";
import { useCardAlt } from "./codenames.alt";
import { codenamesCopy } from "./codenames.copy";
import { codenamesDailyGame } from "./codenames.daily";
import { useFlipSounds } from "./codenames.sounds";
import { cardArt, flipsThisClue, mineTotal, shareGrid, soloFound, type CardKind, type CodenamesSoloState } from "./codenames.view";

export function ClueBanner({ word, count, top, bottom, tone = "you" }: { word: string; count: number; top?: ReactNode; bottom?: ReactNode; tone?: "you" | "rival" }) {
  return (
    <div className={cn("rounded-2xl px-4 py-2.5 text-white shadow-lg shadow-black/20", tone === "you" ? "bg-brand-blue" : "bg-white/[0.08]")}>
      {top && <div className="text-[11px] font-black uppercase tracking-wide text-white/70">{top}</div>}
      <AnimatePresence mode="wait">
        <motion.p key={`${word}-${count}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          data-codenames-clue className={cn("flex items-baseline gap-2 font-black uppercase leading-tight", word.length > 12 ? "text-xl" : "text-2xl")} style={poppins}>
          <span className="min-w-0 break-words">{word}</span>
          <span className="shrink-0 rounded-lg bg-white px-2 text-xl text-black tabular-nums">{count}</span>
        </motion.p>
      </AnimatePresence>
      {bottom && <div className="mt-0.5 text-xs font-bold text-white/80">{bottom}</div>}
    </div>
  );
}

export const soloCards = (state: CodenamesSoloState, reveal: boolean): BoardCard[] =>
  state.cards.map((c) => ({ id: c.id, word: c.word, kind: reveal ? c.kind : null, revealed: state.flips.find((f) => f.cardId === c.id)?.kind ?? null }));

const TONE: Record<CardKind, string> = { mine: "text-white", theirs: "text-brand-red-light", neutral: "text-brand-yellow", owngoal: "text-brand-red-light" };

export function CodenamesPlayView({ locale, number, state, pending, onFlip, onStop, onResult, onExit, selected: heldPick, onSelect, notice }: {
  /** The daily's board number; null on a practice board (no number). */
  locale: string; number: number | null; state: CodenamesSoloState; pending: boolean;
  onFlip: (cardId: string) => void; onStop: () => void; onResult: () => void; onExit: () => void;
  /** Held by the caller (the daily keeps a confirmed pick the server refused); `onFlip` then owns clearing it. */
  selected?: string | null; onSelect?: (cardId: string | null) => void;
  notice?: ReactNode;
}) {
  const c = codenamesCopy(locale);
  const d = wordDailyCopy(locale);
  const altOf = useCardAlt(locale);
  const [ownPick, setOwnPick] = useState<string | null>(null);
  const held = onSelect !== undefined;
  const selected = held ? heldPick ?? null : ownPick;
  const setSelected = held ? onSelect : setOwnPick;
  const done = state.status === "done";
  const clue = state.clues[Math.min(state.clue, state.clues.length - 1)];
  const last = state.flips.at(-1);
  useFlipSounds(state.flips.length, last?.kind ?? null, true);
  const total = mineTotal(state);
  const wordBoard = state.cards.some((card) => card.word !== undefined);
  const tap = (id: string) => {
    if (selected !== id) return setSelected(id);
    if (!held) setSelected(null);
    onFlip(id);
  };
  return (
    <div className="flex flex-1 flex-col">
      <TopBar brand={c.brand} exitLabel={d.exit} onExit={onExit} wrap
        right={<span data-codenames-found className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-black uppercase text-white" style={poppins}>{c.found(soloFound(state), total)}</span>} />
      {number !== null && <p className="mt-3 text-xs font-black uppercase tracking-wide text-white/55" style={poppins}>#{number}</p>}
      {!done && (
        <ClueBanner word={clue.word} count={clue.count} top={c.clueOf(state.clue + 1, state.totalClues ?? state.clues.length)} bottom={c.guessesLeft(state.guessesLeft)} />
      )}
      {notice}
      <div className="mt-2 min-h-6" aria-live="polite">
        <AnimatePresence mode="wait">
          {last && !done && (
            <motion.p key={state.flips.length} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: last.kind === "mine" ? 0 : [0, -6, 6, -3, 0] }} exit={{ opacity: 0 }}
              className={cn("text-sm font-bold", TONE[last.kind])}>
              {c.kinds[last.kind]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <CodenamesBoard className="mt-1" cards={soloCards(state, done)} mode={done ? "end" : "guess"} selected={selected} disabled={pending || done} kinds={c.kinds} flipLabel={c.flip} cardLabel={c.cardLabel} altOf={altOf} onTap={tap} />
      <div className="flex-1" />
      {!done && (
        <button type="button" onClick={() => { setSelected(null); onStop(); }} disabled={pending || flipsThisClue(state) === 0}
          className="mt-4 h-12 w-full rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15 disabled:opacity-40" style={poppins}>
          {c.stop}
        </button>
      )}
      {done && (
        <div data-codenames-end className="sticky bottom-0 mt-3 rounded-3xl bg-brand-blue px-5 pb-4 pt-3 text-white shadow-2xl shadow-black/40">
          <div className="flex items-end justify-between gap-3">
            <p className="text-xl font-black leading-tight" style={poppins}>{state.endReason === "complete" ? (wordBoard ? c.words.endComplete : c.endComplete) : state.endReason === "owngoal" ? c.endOwnGoal : c.endClues}</p>
            <p className="shrink-0 text-4xl font-black tabular-nums" style={poppins}>{soloFound(state)}/{total}</p>
          </div>
          <GreenButton className="mt-3" onClick={onResult}>{c.seeResult}</GreenButton>
        </div>
      )}
    </div>
  );
}

const RING: Record<CardKind, string> = { mine: "ring-brand-green", theirs: "ring-brand-blue", neutral: "ring-brand-slate-light", owngoal: "ring-brand-red" };
const BADGE: Record<CardKind, string> = { mine: "bg-brand-green text-black", theirs: "bg-brand-blue text-white", neutral: "bg-brand-slate-light text-black", owngoal: "bg-brand-red text-white" };

function KindIcon({ kind }: { kind: CardKind }) {
  const Icon = kind === "owngoal" ? Skull : kind === "neutral" ? Users : Shirt;
  return <Icon className="size-3" strokeWidth={3} />;
}

/** Each clue with the cards picked for it, in order, then the cards it meant with the football reason behind each. */
export function ClueRecap({ state, kinds }: { state: CodenamesSoloState; kinds: Record<CardKind, string> }) {
  const kindOf = new Map(state.cards.map((c) => [c.id, c.kind]));
  const wordOf = new Map(state.cards.map((c) => [c.id, c.word]));
  const found = new Set(state.flips.filter((f) => f.kind === "mine").map((f) => f.cardId));
  return (
    <ol data-codenames-recap className="space-y-2">
      {state.clues.map((clue, i) => {
        const all = state.flips.filter((f) => f.clue === i);
        // The meant cards are listed below with their reasons; the row keeps the other cards flipped on this clue.
        const meant = new Set(clue.cards?.map((m) => m.id) ?? []);
        const picks = clue.cards ? all.filter((f) => !meant.has(f.cardId)) : all;
        return (
          <li key={i} className="rounded-2xl bg-white/[0.06] px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 font-black uppercase leading-tight" style={poppins}>{clue.word} <span className="text-white/60">· {clue.count}</span></p>
              <p className="shrink-0 text-xs font-bold text-white/60">{all.filter((f) => meant.has(f.cardId) || (!clue.cards && f.kind === "mine")).length}/{clue.count}</p>
            </div>
            {picks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {picks.map((f) => wordOf.get(f.cardId) ? (
                  <span key={f.cardId} className={cn("flex h-8 items-center gap-1.5 rounded-lg bg-white pl-2 pr-1 text-xs font-black uppercase text-black ring-[3px]", RING[f.kind])} title={kinds[f.kind]} style={poppins}>
                    {wordOf.get(f.cardId)}
                    <span className={cn("flex size-5 items-center justify-center rounded-full", BADGE[f.kind])}><KindIcon kind={f.kind} /></span>
                  </span>
                ) : (
                  <span key={f.cardId} className={cn("relative size-14 overflow-hidden rounded-lg bg-white ring-[3px]", RING[f.kind])} title={kinds[f.kind]}>
                    <Image src={cardArt(f.cardId)} alt={kinds[f.kind]} fill sizes="56px" className="object-cover" />
                    <span className={cn("absolute bottom-0.5 right-0.5 flex size-5 items-center justify-center rounded-full", BADGE[f.kind])}><KindIcon kind={f.kind} /></span>
                  </span>
                ))}
              </div>
            )}
            {clue.cards && (
              <ul className="mt-2 space-y-1">
                {clue.cards.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-xs text-white/75">
                    {wordOf.get(m.id) ? (
                      <span className={cn("shrink-0 rounded-md bg-white px-1.5 py-1 text-[11px] font-black uppercase leading-none text-black", found.has(m.id) ? "ring-2 ring-brand-green" : "opacity-70")} style={poppins}>{wordOf.get(m.id)}</span>
                    ) : (
                      <span className={cn("relative size-8 shrink-0 overflow-hidden rounded-md bg-white", found.has(m.id) ? "ring-2 ring-brand-green" : "opacity-70")}>
                        <Image src={cardArt(m.id)} alt={kinds[kindOf.get(m.id) ?? "mine"]} fill sizes="32px" className="object-cover" />
                      </span>
                    )}
                    <span className="min-w-0">{m.why}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function CodenamesEndView({ locale, number, state, guestOnPastBoard, leaderboard, friends, onArchive, onExit, picker }: {
  locale: string; number: number; state: CodenamesSoloState; guestOnPastBoard: boolean; leaderboard: ReactNode; friends?: ReactNode;
  /** The Pictures / Words switch: a finished daily opens on this screen, so the way to Words must be here too. */
  picker?: ReactNode;
  onArchive: () => void; onExit?: () => void;
}) {
  const c = codenamesCopy(locale);
  const altOf = useCardAlt(locale);
  const found = soloFound(state);
  const total = mineTotal(state);
  return (
    <DailyEnd game={codenamesDailyGame(locale)} locale={locale} day={state.day} shareText={c.shareText(number, found, total, shareGrid(state))}
      guestOnPastBoard={guestOnPastBoard} ranked={state.ranked} rank={state.rank} leaderboard={leaderboard} friends={friends} onArchive={onArchive} onExit={onExit}>
      {picker && <div className="mb-4">{picker}</div>}
      <div className="rounded-3xl bg-brand-blue px-5 pb-5 pt-4 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{c.brand.join(" ")} #{number}</p>
        <p className="mt-2 text-6xl font-black tabular-nums" style={poppins}>{found}/{total}</p>
        <p className="mt-1 text-sm font-bold text-white/85">{state.endReason === "complete" ? c.endComplete : state.endReason === "owngoal" ? c.endOwnGoal : c.endClues}</p>
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/55">{c.history}</p>
      {state.disclosed === false && <p data-codenames-answers-later className="mt-2 text-sm font-semibold text-white/70">{c.answersLater}</p>}
      <div className="mt-2"><ClueRecap state={state} kinds={c.kinds} /></div>
      <CodenamesBoard className="mt-4" cards={soloCards(state, true)} mode="end" kinds={c.kinds} cardLabel={c.cardLabel} altOf={altOf} />
    </DailyEnd>
  );
}
