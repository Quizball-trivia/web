"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Copy, Crown, Flag, Share2, Timer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/locale";
import type { AvatarCustomization } from "@/types/game";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import type { UltimoAnswerResult, UltimoRunState } from "@/lib/repositories/ultimo.repo";
import { CATEGORIES_PER_DAY, MAX_MISSES, puzzleNumber, tierOf, type CategoryResult, type Tier } from "./ultimo.logic";
import { textFor, ultimoCopy } from "./ultimo.copy";

/**
 * Último en pie's screens as pure views: everything comes in as props, every effect goes out through a callback. The game
 * (UltimoGame) and the games playground render these same components.
 */

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/** Connected widgets a view shows but does not own: the game passes the real ones, the playground passes stand-ins. */
export interface UltimoSlots {
  friend: ReactNode;
  leaderboard: ReactNode;
  signIn: (className: string, label: string) => ReactNode;
}

/** Brand tiles, never red: a short list is still a result. */
const TIER_TILE: Record<Tier, string> = {
  complete: "bg-brand-yellow text-black",
  good: "bg-brand-green text-white",
  some: "bg-brand-blue text-white ring-1 ring-white/50",
  none: "bg-white/10 text-white/50",
};

export type Feedback = { id: number; kind: UltimoAnswerResult; text: string; misses: number };
export const startedOn = (s: UltimoRunState): boolean => s.open || s.results.length > 0 || s.settled !== null;

/** The game's page frame (background + column), shared so the playground shows the same edges. */
export function UltimoFrame({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6 pt-3">{children}</div>
    </div>
  );
}

export function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center">{children}</div>;
}

export function ExitLink({ label, onExit }: { label: string; onExit: () => void }) {
  return <button type="button" onClick={onExit} className="mt-4 text-sm font-bold text-white/60 underline-offset-4 hover:text-white hover:underline">{label}</button>;
}

export function Brand({ locale, className }: { locale: Locale; className?: string }) {
  const c = ultimoCopy(locale);
  return (
    <p className={cn("font-black uppercase tracking-tight", className)} style={poppins}>
      {c.brandA} <span className="text-brand-green-light">{c.brandB}</span>
    </p>
  );
}

export function UltimoIntroView({ locale, number, state, busy, notice, guestOnPastBoard, guestLockedOut, slots, onStart, onArchive, onExit }: {
  locale: Locale; number: number; state: UltimoRunState | null; busy: boolean; notice: string | null; guestOnPastBoard: boolean; guestLockedOut: boolean;
  slots: Pick<UltimoSlots, "signIn" | "friend">;
  onStart: () => void; onArchive: () => void; onExit?: () => void;
}) {
  const c = ultimoCopy(locale);
  const inProgress = Boolean(state && !state.done && startedOn(state));
  return (
    <div className="flex flex-1 flex-col">
      {onExit && (
        <header className="mb-6 flex h-10 items-center">
          <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
        </header>
      )}
      <div className="flex flex-1 flex-col justify-center">
        <Brand locale={locale} className="text-3xl leading-none" />
        <p className="mt-2 text-sm font-bold text-white/60" style={poppins}>#{number}</p>
        {guestOnPastBoard && guestLockedOut && notice !== c.guestYesterday && (
          <div className="mt-4 rounded-2xl border border-brand-yellow/60 bg-brand-yellow/10 px-4 py-3">
            <p className="text-sm text-white/90">{c.guestYesterday}</p>
            {slots.signIn("mt-2 inline-flex h-9 items-center rounded-full bg-brand-yellow px-4 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep", c.playToday)}
          </div>
        )}
        <div className="relative mt-5 aspect-video w-full overflow-hidden rounded-2xl bg-game-art-night" aria-hidden>
          <Image src="/assets/demos/game-modes/ultimo.webp" alt="" fill sizes="(max-width: 480px) 100vw, 448px" className="object-cover" priority />
        </div>
        <ul className="mt-6 space-y-2.5">
          {c.intro.lines.map((line) => (
            <li key={line} className="flex gap-2.5 text-[15px] leading-snug text-white/85"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-green-light" />{line}</li>
          ))}
        </ul>
        {notice && <p role="alert" className="mt-6 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-sm font-semibold text-white">{notice}</p>}
        <button type="button" onClick={onStart} disabled={busy} className="mt-8 h-14 rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-60" style={poppins}>
          {busy ? c.loading : state?.done ? c.intro.finished : inProgress && state ? c.intro.resume(state.category + 1) : c.intro.start}
        </button>
        {slots.friend}
        <button type="button" onClick={onArchive} disabled={busy} className="mt-3 h-11 rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15 disabled:opacity-50" style={poppins}>{c.intro.past}</button>
        <p className="mt-4 text-center text-xs text-white/50">{c.intro.newBoard}</p>
      </div>
    </div>
  );
}

/** The playing screen. `now` is the server time to show (the game ticks it; the playground can hold it still). */
export function UltimoPlayView({ locale, state, now, avatar, pending, notice, feedback, onBegin, onSay, onNext, onResult, onExit }: {
  locale: Locale; state: UltimoRunState; now: number; avatar: AvatarCustomization; pending: string | null; notice: string | null; feedback: Feedback | null;
  onBegin: () => void; onSay: (text: string) => boolean; onNext: () => void; onResult: () => void; onExit?: () => void;
}) {
  const c = ultimoCopy(locale);
  const msLeft = state.open && state.deadline ? Date.parse(state.deadline) - now : 0;
  // The first answer's clock includes the reveal: while more than a turn is left, the title is being revealed.
  const revealing = state.open && state.said.length === 0 && msLeft > state.turnMs;
  const playing = state.open && !revealing;
  const secs = Math.max(0, Math.ceil(msLeft / 1000));
  const livePoints = state.score + (state.open ? state.said.length : 0);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3">
        {onExit && <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>}
        <Brand locale={locale} className="min-w-0 flex-1 truncate text-[13px]" />
        {playing && <Clock seconds={secs} />}
      </header>

      <div className={cn("mt-3 flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors", playing ? "bg-brand-green/15 ring-2 ring-brand-green" : "bg-white/[0.05]")}>
        <DuelAvatar customization={avatar} size="xs" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-white/80">{c.you}</p>
          <p className="text-2xl font-black leading-none tabular-nums" style={poppins}>{livePoints}<span className="ml-1 text-xs font-bold text-white/55">{c.pts}</span></p>
        </div>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: state.totalCategories }, (_, i) => {
            const r = state.results[i];
            return <span key={i} className={cn("h-2 w-5 rounded-full", r ? (r.complete ? "bg-brand-yellow" : "bg-brand-green") : i === state.category ? "bg-white/40" : "bg-white/15")} />;
          })}
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-white/10 bg-transparent px-4 py-3">
        <div className="flex items-center justify-between gap-2 text-[11px] font-black uppercase tracking-wide text-white/55">
          <span>{c.category(state.category + 1, state.totalCategories)}</span>
          {state.title && <span className="flex items-center gap-1"><Timer className="size-3" />{c.perTurn(Math.round(state.turnMs / 1000))}</span>}
        </div>
        {state.title ? (
          <>
            <h2 className="mt-1 text-lg font-black leading-snug" style={poppins}>{textFor(state.title, locale)}</h2>
            {state.total !== null && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div className="h-full rounded-full bg-brand-yellow" animate={{ width: `${(state.said.length / state.total) * 100}%` }} />
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-white/70">{c.left(state.total - state.said.length, state.total)}</span>
              </div>
            )}
          </>
        ) : (
          <div className="mt-2 h-6 w-3/4 rounded-lg bg-white/10" aria-hidden />
        )}
      </div>

      {notice && <p role="alert" className="mt-3 rounded-xl bg-brand-red-soft/20 px-3 py-2 text-center text-sm font-semibold">{notice}</p>}

      {!state.open && !state.settled && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <button type="button" onClick={onBegin} disabled={pending !== null} className="h-14 w-full rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep disabled:opacity-60" style={poppins}>
            {pending ? c.loading : c.begin}
          </button>
        </div>
      )}

      {revealing && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="text-sm text-white/65">{textFor(state.hint, locale)}</p>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-white/55">{c.startsIn}</p>
          <AnimatePresence mode="popLayout">
            <motion.span key={Math.ceil((msLeft - state.turnMs) / 1000)} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className="mt-2 text-7xl font-black tabular-nums" style={poppins}>
              {Math.max(1, Math.ceil((msLeft - state.turnMs) / 1000))}
            </motion.span>
          </AnimatePresence>
        </div>
      )}

      {playing && (
        <>
          <TurnCard label={state.said.length === 0 ? c.turnFirst : c.turnNext} errorsLabel={c.errors} misses={state.misses} share={Math.max(0, Math.min(1, msLeft / state.turnMs))} urgent={msLeft <= 5_000} />
          <FeedbackLine locale={locale} feedback={feedback} />
          <SaidChips names={state.said.map((n) => textFor(n, locale))} />
          <div className="flex-1" />
          <AnswerBox placeholder={c.placeholder} say={c.say} onSubmit={onSay} />
        </>
      )}

      {state.settled && !state.open && (
        <UltimoCategorySheet locale={locale} state={state} busy={pending !== null} onNext={state.done ? onResult : onNext} />
      )}
    </div>
  );
}

/** The header clock, as in every duel; urgent in the last seconds (turns here are short). */
function Clock({ seconds }: { seconds: number }) {
  const urgent = seconds <= 5;
  return (
    <motion.span key={urgent ? seconds : "calm"} initial={urgent ? { scale: 1.2 } : false} animate={{ scale: 1 }}
      className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-black tabular-nums transition-colors", urgent ? "bg-brand-red-soft/20 text-brand-red-light" : "bg-white/[0.06] text-white/50")} style={poppins}>
      {seconds} s
    </motion.span>
  );
}

function TurnCard({ label, errorsLabel, misses, share, urgent }: { label: string; errorsLabel: string; misses: number; share: number; urgent: boolean }) {
  return (
    <div className="mt-3 rounded-2xl bg-brand-green px-4 py-3 text-white shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black uppercase tracking-wide" style={poppins}>{label}</p>
        <span className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-white/75">{errorsLabel}</span>
          {Array.from({ length: MAX_MISSES }, (_, i) => (
            <span key={i} className={cn("size-2.5 rounded-full", i < misses ? "bg-brand-red-soft ring-2 ring-white/80" : "bg-white/35")} />
          ))}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/25">
        <div className={cn("h-full rounded-full transition-[width] duration-100 ease-linear", urgent ? "bg-brand-yellow" : "bg-white")} style={{ width: `${share * 100}%` }} />
      </div>
    </div>
  );
}

function FeedbackLine({ locale, feedback }: { locale: Locale; feedback: Feedback | null }) {
  const c = ultimoCopy(locale);
  return (
    <div className="mt-3 min-h-6">
      <AnimatePresence mode="wait">
        {feedback && (
          <motion.p key={feedback.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, x: feedback.kind === "ok" ? 0 : [0, -6, 6, -3, 0] }} exit={{ opacity: 0 }}
            className={cn("flex items-center gap-1.5 text-sm font-bold", feedback.kind === "ok" ? "text-white" : feedback.kind === "ambiguous" ? "text-brand-yellow" : "text-brand-red-light")}>
            {feedback.kind === "ok" && <><span className="flex size-5 items-center justify-center rounded-full bg-brand-green"><Check className="size-3.5" strokeWidth={3} /></span>{feedback.text}</>}
            {feedback.kind === "wrong" && c.feedback.wrong(feedback.text, feedback.misses, MAX_MISSES)}
            {feedback.kind === "repeat" && c.feedback.repeat(feedback.text, feedback.misses, MAX_MISSES)}
            {feedback.kind === "ambiguous" && c.feedback.ambiguous(feedback.text)}
            {feedback.kind === "late" && c.feedback.late}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function SaidChips({ names }: { names: string[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {names.map((name, i) => (
        <motion.li key={`${i}-${name}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className={cn("rounded-full border border-brand-green/60 bg-brand-green/20 px-2.5 py-1 text-xs font-semibold text-white", i === names.length - 1 && "ring-2 ring-white/50")}>
          {name}
        </motion.li>
      ))}
    </ul>
  );
}

/** The app's typed-answer look (DailyAnswerInput / Who Am I board): blue pill input, green pill button, stacked. */
function AnswerBox({ placeholder, say, onSubmit }: { placeholder: string; say: string; onSubmit: (text: string) => boolean }) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus({ preventScroll: true }); }, []);
  const submit = () => {
    if (!draft.trim() || !onSubmit(draft)) return;
    setDraft("");
    input.current?.focus({ preventScroll: true });
  };
  return (
    <form className="sticky bottom-0 mt-3 space-y-2 bg-surface-page-alt/95 pb-1 pt-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <input ref={input} value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 60))} autoComplete="off" autoCapitalize="words" autoCorrect="off" spellCheck={false} enterKeyHint="send"
        placeholder={placeholder} aria-label={placeholder}
        className="font-poppins h-14 w-full rounded-[20px] border-none bg-brand-blue px-5 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus:outline-none"
        style={{ fontWeight: 600, letterSpacing: "0.08em", boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }} />
      <button type="submit" disabled={!draft.trim()}
        className="font-poppins h-14 w-full rounded-[20px] bg-brand-green uppercase text-white outline-none transition-colors hover:bg-brand-green-deep disabled:cursor-not-allowed disabled:opacity-40"
        style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.06em", boxShadow: "0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)" }}>
        {say}
      </button>
    </form>
  );
}

export function UltimoCategorySheet({ locale, state, busy, onNext }: { locale: Locale; state: UltimoRunState; busy: boolean; onNext: () => void }) {
  const c = ultimoCopy(locale);
  const s = state.settled!;
  const complete = s.reason === "complete";
  const Icon = complete ? Crown : Flag;
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { nextRef.current?.focus({ preventScroll: true }); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center">
      <motion.div role="dialog" aria-modal="true" aria-label={complete ? c.catEnd.titleComplete : c.catEnd.titleOut} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md rounded-t-3xl bg-brand-blue px-5 pb-6 pt-5 text-white shadow-2xl shadow-black/40 sm:rounded-3xl">
        <p className="text-xs font-bold uppercase tracking-wide text-white/75">{s.reason === "time" ? c.catEnd.time : s.reason === "misses" ? c.catEnd.misses(MAX_MISSES) : c.catEnd.complete}</p>
        <p className="mt-2 flex items-center gap-2.5 text-2xl font-black" style={poppins}>
          <span className={cn("flex size-9 items-center justify-center rounded-full bg-white", complete ? "text-brand-green" : "text-brand-blue")}><Icon className="size-5" strokeWidth={2.5} /></span>
          {complete ? c.catEnd.titleComplete : c.catEnd.titleOut}
        </p>
        <p className="mt-1 text-sm text-white/80">{c.catEnd.named(s.named, state.total ?? s.named, s.points)}</p>
        {s.missingCount > 0 && (
          <>
            <p className="mt-4 text-xs font-black uppercase tracking-wide text-white/75">{c.catEnd.missing(s.missingCount)}</p>
            {s.missing ? (
              <ul className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                {s.missing.map((name, i) => <li key={i} className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white">{textFor(name, locale)}</li>)}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-white/75">{c.catEnd.revealLater}</p>
            )}
          </>
        )}
        <button ref={nextRef} type="button" onClick={onNext} disabled={busy} className="mt-5 h-12 w-full rounded-full bg-white text-sm font-black uppercase text-brand-blue hover:bg-white/90 disabled:opacity-60" style={poppins}>
          {state.done ? c.catEnd.result : c.catEnd.next}
        </button>
      </motion.div>
    </div>
  );
}

export const plural = (n: number, word: (n: number) => string) => `${n} ${word(n)}`;

/** The result screen. `onShare`/`onCopy` resolve true when the text went to the clipboard (the check mark shows). */
export function UltimoEndView({ locale, day, state, guestOnPastBoard, slots, onShare, onCopy, onArchive, onExit }: {
  locale: Locale; day: string; state: UltimoRunState; guestOnPastBoard: boolean; slots: Pick<UltimoSlots, "friend" | "leaderboard">;
  onShare: () => Promise<boolean>; onCopy: () => Promise<boolean>; onArchive: () => void; onExit?: () => void;
}) {
  const c = ultimoCopy(locale);
  const number = puzzleNumber(day);
  const tiers = state.results.map((r: CategoryResult) => tierOf(r, r.total));
  const [copied, setCopied] = useState(false);
  const flash = (ok: boolean) => {
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const share = async () => flash(await onShare());
  const copy = async () => flash(await onCopy());
  return (
    <div className="flex flex-1 flex-col">
      {onExit && (
        <header className="mb-5 flex h-10 items-center">
          <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
        </header>
      )}
      <div className="rounded-3xl bg-brand-blue px-5 pb-5 pt-4 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">{c.end.title} · #{number}</p>
        <p className="mt-2 text-6xl font-black leading-none tabular-nums" style={poppins}>{state.score}</p>
        <p className="mt-1 text-sm font-bold text-white/80">{c.end.points(state.score)} · {c.end.answers(state.answers)}</p>
        <div className="mt-4 flex justify-center gap-2">
          {state.results.map((r, i) => (
            <span key={i} className={cn("flex size-10 items-center justify-center rounded-xl text-sm font-black tabular-nums", TIER_TILE[tiers[i]])} style={poppins}>{r.named}</span>
          ))}
        </div>
        {state.ranked && state.rank ? (
          <p className="mx-auto mt-3 w-fit rounded-full bg-brand-yellow px-4 py-1 text-sm font-black text-black" style={poppins}>{c.end.rank(state.rank)}</p>
        ) : guestOnPastBoard ? (
          <p className="mt-3 text-xs text-white/75">{c.guestYesterday}</p>
        ) : null}
      </div>

      <ul className="mt-4 space-y-1.5">
        {state.results.map((r, i) => (
          <li key={i} className="rounded-xl border border-white/10 px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm">
              <span className={cn("size-4 shrink-0 rounded-md", TIER_TILE[tiers[i]])} />
              <span className="min-w-0 flex-1 truncate font-semibold">{textFor(r.title, locale) || c.category(i + 1, CATEGORIES_PER_DAY)}</span>
              <span className="shrink-0 text-xs font-bold tabular-nums text-white/70">{r.total !== null ? `${r.named}/${r.total}` : r.named}</span>
            </div>
            {r.total !== null && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className={cn("h-full rounded-full", r.complete ? "bg-brand-yellow" : "bg-brand-green")} style={{ width: `${(r.named / r.total) * 100}%` }} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={() => void share()} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand-green text-sm font-black uppercase text-white hover:bg-brand-green-deep" style={poppins}><Share2 className="size-4" />{c.end.share}</button>
        <button type="button" onClick={() => void copy()} aria-label={c.end.copied} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/15">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</button>
      </div>
      {slots.friend}
      <button type="button" onClick={onArchive} className="mt-3 h-11 rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15" style={poppins}>{c.intro.past}</button>
      {slots.leaderboard}
    </div>
  );
}

export function UltimoArchiveView({ locale, days, today, current, onBack, onOpen }: { locale: Locale; days: string[]; today: string; current: string; onBack: () => void; onOpen: (day: string) => void }) {
  const c = ultimoCopy(locale);
  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-5 flex h-10 items-center gap-3">
        <button type="button" onClick={onBack} aria-label={c.archive.back} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
        <h1 className="text-lg font-black uppercase" style={poppins}>{c.archive.title}</h1>
      </header>
      <ul className="space-y-2">
        {days.map((d) => (
          <li key={d}>
            <button type="button" onClick={() => onOpen(d)} className={cn("flex h-12 w-full items-center justify-between rounded-2xl px-4 text-sm font-bold", d === current ? "bg-brand-blue" : "bg-white/[0.07] hover:bg-white/10")}>
              <span style={poppins}>{c.archive.day(puzzleNumber(d))}</span>
              <span className="text-xs text-white/70">{d === today ? c.archive.today : d}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-center text-xs text-white/50">{c.intro.newBoard}</p>
    </div>
  );
}
