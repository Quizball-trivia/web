"use client";

import { motion } from "motion/react";
import { Check, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/locale";
import type { AvatarCustomization } from "@/types/game";
import { GoalCard, GoalPicture } from "@/features/minuto/MinutoCard";
import { MinuteInput } from "@/features/minuto/MinuteInput";
import { formatMinute } from "@/features/minuto/minuto.logic";
import { minutoCopy } from "@/features/minuto/minuto.copy";
import type { DuelCopy } from "./duel.copy";
import type { MinutoDuelView, Seat } from "./duel.views";
import { SEAT_BG, SEAT_RING } from "./duel.seats";
import { DuelAvatar } from "./DuelAvatar";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
type Side = "me" | "rival";
const SEAT_TOP: Record<Side, string> = { me: "border-t-brand-green", rival: "border-t-brand-blue" };

/**
 * One seat's minute box, like the stream's "MINUTO" boxes under each camera: hidden until the reveal. The box grows
 * from the desktop breakpoint (the side columns) by CSS alone.
 */
function SeatMinute({ name, heading, answered, minute, revealed, side, points, status, className }: {
  name: string; heading: string; answered: boolean; minute: number | null; revealed: boolean; side: Side; points: number | null; status: string; className?: string;
}) {
  return (
    <div role="group" aria-label={`${name}: ${status}`} className={cn("flex min-w-0 flex-col items-center gap-1 rounded-2xl border-2 px-2 py-2 lg:py-4", answered ? SEAT_RING[side] : "border-white/15", answered && SEAT_BG[side], className)}>
      <span className="sr-only" aria-live="polite">{`${name}: ${status}`}</span>
      <span aria-hidden className="w-full truncate text-center text-[11px] font-black uppercase tracking-wide text-white/80 lg:hidden" style={poppins}>{name}</span>
      <span aria-hidden className="hidden w-full truncate text-center text-xs font-black uppercase tracking-[0.2em] text-white/80 lg:block" style={poppins}>{heading}</span>
      <span aria-hidden className="flex h-9 items-center text-2xl font-black tabular-nums lg:h-16 lg:text-5xl" style={poppins}>
        {revealed ? (minute === null ? "—" : `${minute}'`) : answered ? (side === "me" && minute !== null ? `${minute}'` : <Check className="size-6 lg:size-10" strokeWidth={3} />) : <Clock3 className="size-5 text-white/40 lg:size-9" />}
      </span>
      {revealed && points !== null && (
        <motion.span aria-hidden initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("rounded-full px-2.5 py-0.5 text-xs font-black lg:text-base", points > 0 ? "bg-brand-yellow text-black" : "bg-white/10 text-white/60")} style={poppins}>
          +{points}
        </motion.span>
      )}
    </div>
  );
}

/** Desktop only, where the stream has each player's camera: avatar, total and full name (phones show the top scoreboard). */
function SeatHeader({ name, avatar, score, scoreLabel, className }: { name: string; avatar: AvatarCustomization; score: number; scoreLabel: string; className?: string }) {
  return (
    <div className={cn("hidden flex-col gap-3 lg:flex", className)}>
      <div className="flex items-center justify-between gap-3">
        <DuelAvatar size="md" customization={avatar} />
        <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white text-4xl font-black tabular-nums text-surface-page shadow-lg" style={poppins}>{score}</span>
      </div>
      <p className="line-clamp-2 break-words text-center text-base font-black leading-tight" style={poppins}>{name}<span className="sr-only">. {scoreLabel}</span></p>
    </div>
  );
}

/** One dot per goal: who took it (you green, rival blue, both yellow), the current one ringed. */
function RoundDots({ view, mySeat }: { view: MinutoDuelView; mySeat: Seat }) {
  const rival: Seat = mySeat === 0 ? 1 : 0;
  return (
    <ol aria-hidden className="flex items-center justify-center gap-1.5">
      {Array.from({ length: view.totalRounds }, (_, i) => {
        const r = view.results[i];
        const mine = r?.points[mySeat] ?? 0;
        const theirs = r?.points[rival] ?? 0;
        const tone = !r ? "bg-white/15" : mine > 0 && theirs > 0 ? "bg-brand-yellow" : mine > 0 ? "bg-brand-green" : theirs > 0 ? "bg-brand-blue" : "bg-white/35";
        return <li key={i} className={cn("size-2.5 rounded-full lg:size-3", tone, i === view.round && !r && "ring-2 ring-white ring-offset-2 ring-offset-surface-page-alt")} />;
      })}
    </ol>
  );
}

/**
 * "¿En qué minuto?" as a friend duel: the same goal card for both seats, one minute each, hidden from the rival until
 * the reveal (the server never sends the rival's minute before it). The input is held until a snapshot shows the
 * guess stored.
 *
 * One grid, every element rendered once and placed by CSS: phones stack goal → both boxes → input; desktop spreads it
 * like the stream (your column | the goal | the rival's column). Nothing remounts when the breakpoint is crossed, so a
 * half-typed minute survives a rotation.
 */
export function MinutoDuelBoard({ view, mySeat, names, avatars, copy, locale, finished, paused = false, busy, onGuess }: {
  view: MinutoDuelView; mySeat: Seat; names: [string, string]; avatars: [AvatarCustomization, AvatarCustomization]; copy: DuelCopy; locale: Locale;
  /** `paused` (a seat dropped) holds the input disabled but mounted, so a half-typed minute survives the pause. */
  finished: boolean; paused?: boolean; busy: boolean; onGuess: (minute: number) => void;
}) {
  const c = minutoCopy(locale);
  const rival: Seat = mySeat === 0 ? 1 : 0;
  const open = !finished && view.phase === "guess";
  const settled = view.phase === "guess" ? null : view.settled;
  const meAnswered = view.me?.answered ?? false;
  const rivalAnswered = view.rival?.answered ?? false;
  const myGuess = settled ? settled.guesses[mySeat] : view.me?.guess ?? null;
  const theirGuess = settled ? settled.guesses[rival] : null;

  let verdict: string | null = null;
  if (settled) {
    const [mine, theirs] = [settled.points[mySeat], settled.points[rival]];
    if (settled.guesses[0] === null && settled.guesses[1] === null) verdict = copy.md.nobody;
    else if (mine === 3 && theirs === 3) verdict = copy.md.bothExact;
    else if (mine === 3) verdict = copy.md.youExact;
    else if (theirs === 3) verdict = copy.md.rivalExact(names[rival]);
    else if (mine === 1 && theirs === 1) verdict = copy.md.tie;
    else if (mine === 1) verdict = copy.md.youCloser;
    else if (theirs === 1) verdict = copy.md.rivalCloser(names[rival]);
  }
  // In the flow, never pinned: it sits at the bottom when everything fits (the 1fr row) and under the picture when the
  // screen is too short, instead of covering it.
  const bottomBar = "col-span-2 row-start-3 self-end pb-1 pt-1 lg:col-span-1 lg:p-0";

  return (
    <div className="grid flex-1 grid-cols-2 grid-rows-[auto_auto_1fr] gap-x-2 gap-y-3 lg:flex-none lg:grid-cols-[minmax(0,1fr)_minmax(0,2.6fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto_1fr_auto] lg:items-start lg:gap-x-6 lg:gap-y-4">
      {/* Desktop column cards behind each player's header, box (and, for you, the input). */}
      <div aria-hidden className={cn("hidden rounded-3xl border-t-4 bg-white/[0.06] lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:block lg:self-stretch", SEAT_TOP.me)} />
      <div aria-hidden className={cn("hidden rounded-3xl border-t-4 bg-white/[0.06] lg:col-start-3 lg:row-span-2 lg:row-start-1 lg:block lg:self-stretch", SEAT_TOP.rival)} />

      <SeatHeader name={copy.you} avatar={avatars[mySeat]} score={view.scores[mySeat]} scoreLabel={c.seatScore(copy.you, view.scores[mySeat])} className="relative lg:col-start-1 lg:row-start-1 lg:mx-4 lg:mt-5" />
      <SeatHeader name={names[rival]} avatar={avatars[rival]} score={view.scores[rival]} scoreLabel={c.seatScore(names[rival], view.scores[rival])} className="relative lg:col-start-3 lg:row-start-1 lg:mx-4 lg:mt-5" />

      <div className="col-span-2 row-start-1 flex min-w-0 flex-col lg:col-span-1 lg:col-start-2 lg:row-span-4 lg:row-start-1">
        <div className="flex items-center justify-end gap-2 lg:justify-center">
          <p aria-hidden className="mr-auto hidden text-2xl font-black uppercase tracking-tight lg:mr-2 lg:block" style={poppins}>{c.brandA} <span className="text-brand-orange">{c.brandB}</span></p>
          <span className="rounded-full bg-surface-page px-3 py-1 text-xs font-black uppercase tabular-nums lg:text-sm" style={poppins}>{copy.round(view.round + 1, view.totalRounds)}</span>
          <span className="hidden rounded-full border border-white/30 px-3 py-1 text-xs font-black uppercase text-white/80 lg:inline lg:text-sm" style={poppins}>{c.withData}</span>
        </div>
        <GoalCard goal={view.goal} locale={locale} minute={settled ? settled.answer : null} className="mt-2 lg:mt-3" />
        <GoalPicture goal={view.goal} locale={locale} minute={settled ? settled.answer : null} className="mt-3 lg:aspect-[21/9]" />
        <div className="mt-3"><RoundDots view={view} mySeat={mySeat} /></div>
      </div>

      <SeatMinute name={copy.you} heading={c.minuteBox} answered={meAnswered || myGuess !== null} minute={myGuess} revealed={Boolean(settled)} side="me" points={settled ? settled.points[mySeat] : null}
        status={settled ? (myGuess === null ? copy.md.noAnswer : `${myGuess}'`) : meAnswered ? copy.md.answered : copy.md.thinking}
        className="relative col-start-1 row-start-2 lg:mx-4" />
      <SeatMinute name={names[rival]} heading={c.minuteBox} answered={rivalAnswered || theirGuess !== null} minute={theirGuess} revealed={Boolean(settled)} side="rival" points={settled ? settled.points[rival] : null}
        status={settled ? (theirGuess === null ? copy.md.noAnswer : `${theirGuess}'`) : rivalAnswered ? copy.md.answered : copy.md.thinking}
        className="relative col-start-2 row-start-2 lg:col-start-3 lg:mx-4 lg:mb-5" />

      {open && !meAnswered && (
        <div className={cn(bottomBar, "lg:relative lg:col-start-1 lg:row-start-3 lg:mx-4 lg:mb-5")}>
          <MinuteInput key={view.round} locale={locale} busy={busy || paused} onSubmit={onGuess} id={`minuto-duel-${view.round}`} stackOnDesktop />
        </div>
      )}
      {open && meAnswered && (
        <div className={cn(bottomBar, "lg:relative lg:col-start-1 lg:row-start-3 lg:mx-4 lg:mb-5")}>
          <p role="status" className="rounded-2xl bg-white/[0.07] px-4 py-3 text-center text-sm font-bold text-white/80">{rivalAnswered ? copy.md.revealing : copy.md.waitingRival(names[rival])}</p>
        </div>
      )}
      {settled && (
        <div className={cn(bottomBar, "lg:col-start-2 lg:row-start-5")}>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status" className="rounded-2xl bg-white/[0.07] px-4 py-3 text-center">
            <p className="text-base font-black text-brand-yellow lg:text-xl" style={poppins}>{verdict}</p>
            <p className="mt-0.5 text-lg font-black uppercase lg:text-2xl" style={poppins}>{copy.md.was(formatMinute(settled.answer))}</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
