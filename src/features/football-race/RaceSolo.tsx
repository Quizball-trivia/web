"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Flag, Share2, Trophy, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import type { AvatarCustomization } from "@/types/game";
import { raceCopy } from "./race.copy";
import { l10n, toPublicStats, type L10n, type RaceNation } from "./race.rules";
import { shareLine, type SoloConfig, type SoloState } from "./race.solo";
import type { RaceView, RaceWording } from "./race.views";
import { GOAL_NET, NationFlag, PITCH_STRIPES, RevealCard, StatPicker } from "./RaceRoom";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/** The daily race as the room screens see it: you are seat 0, the rivals are nations nobody plays. */
export function toSoloView(state: SoloState, cfg: SoloConfig, scopes: string[], tournament: L10n | null, me: { name: string; avatar: AvatarCustomization }, showing: boolean, locale: string): RaceView {
  const nationOf = new Map(cfg.pack.nations.map((n) => [n.id, n]));
  const last = state.picks[state.picks.length - 1];
  return {
    tournament, phase: showing ? "reveal" : state.result ? "over" : "pick", round: state.picks.length, target: cfg.target, finish: "instant", suddenDeath: false,
    seats: cfg.racers.map((id, seat) => ({ seat, name: seat === 0 ? me.name : l10n(nationOf.get(id)!.name, locale), avatar: seat === 0 ? me.avatar : undefined, nation: nationOf.get(id)!, position: state.positions[seat], picked: false })),
    mySeat: 0, myPick: null, scopes, stats: toPublicStats(cfg.pack, cfg.statIds), history: state.picks,
    reveal: showing && last ? { item: last, index: 0, total: 1, open: true } : null, standings: null, winners: null, endedBy: null,
  };
}

/**
 * The solo pitch: everyone starts on the line, your lane runs to `target` and a rival's to `rivalTarget` (the engine's
 * head start drawn as a shorter race). Positions in `view` are the engine's, rivals counted from their head start.
 */
export function LanesTrack({ view, locale, rivalTarget }: { view: RaceView; locale: string; rivalTarget: number }) {
  const copy = raceCopy(locale);
  const cols = view.target + 1;
  const headStart = view.target - rivalTarget;
  return (
    <section aria-label={copy.theme} className="rounded-3xl bg-fut-pitch p-2 shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]">
      <p className="px-2 pb-1.5 pt-0.5 text-center text-[11px] font-black uppercase tracking-wide text-white/85" style={poppins}>{copy.laneGoals(view.target, rivalTarget)}</p>
      <div className="overflow-hidden rounded-2xl border-2 border-white/70" style={PITCH_STRIPES}>
        <ol>
          {view.seats.map((s) => {
            const me = s.seat === view.mySeat;
            const goal = me ? view.target : rivalTarget;
            const moved = me ? s.position : s.position - headStart;
            const left = goal - moved;
            return (
              <li key={s.seat} aria-label={`${l10n(s.nation.name, locale)}: ${copy.toGo(left)}`}
                className={cn("flex items-stretch border-b border-white/30 last:border-b-0", me && "bg-brand-green/30")}>
                <div className="flex w-[5.75rem] shrink-0 items-center gap-1.5 border-r-2 border-white/70 px-1.5 py-1 lg:w-40">
                  {s.avatar && <DuelAvatar size="xs" customization={s.avatar} />}
                  <span className="min-w-0">
                    <span className="block text-xs font-black uppercase leading-tight lg:hidden" style={poppins}>{s.nation.code ?? s.nation.id}</span>
                    <span className="hidden text-[11px] font-black uppercase leading-tight break-words lg:block" style={poppins}>{l10n(s.nation.name, locale)}</span>
                    <span className={cn("block whitespace-nowrap text-[10px] font-bold leading-tight", me ? "text-brand-yellow" : "text-white/75")}>{copy.toGo(left)}</span>
                  </span>
                </div>
                <div className="relative h-12 flex-1">
                  <div aria-hidden className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {Array.from({ length: cols }, (_, i) => (
                      <span key={i}
                        className={cn("border-r border-white/20 last:border-r-0", i === goal && "border-l-2 border-l-white/70", i > goal && "border-r-0 bg-black/45")}
                        style={i === goal ? GOAL_NET : undefined} />
                    ))}
                  </div>
                  <motion.span className="absolute top-1/2 z-10" initial={false} style={{ x: "-50%", y: "-50%" }}
                    animate={{ left: `${((Math.min(moved, goal) + 0.5) / cols) * 100}%` }} transition={{ type: "spring", stiffness: 240, damping: 22 }}>
                    <NationFlag nation={s.nation} round className={cn("block size-8 ring-2", me ? "ring-brand-yellow" : "ring-white")} />
                  </motion.span>
                  <Flag aria-hidden className="absolute top-1 size-3 -translate-x-1/2 text-white/85" style={{ left: `${((goal + 0.5) / cols) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/**
 * Before the first pick: the day's four nations (same for everyone), tap one to race as it, the lanes as they will
 * look with it, and Start. `view` already has the chosen nation in seat 0.
 */
export function ChooseNation({ view, nations, chosen, locale, rivalTarget, busy = false, notice = null, onChoose, onStart, onExit }: {
  view: RaceView; nations: RaceNation[]; chosen: string | null; locale: string; rivalTarget: number;
  busy?: boolean; notice?: string | null; onChoose: (id: string) => void; onStart: () => void; onExit: () => void;
}) {
  const copy = raceCopy(locale);
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onExit} aria-label={copy.leave} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><X className="size-4" /></button>
        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-black uppercase leading-tight text-brand-yellow" style={poppins}>
          <Trophy aria-hidden className="size-4 shrink-0" strokeWidth={2.5} /> {view.tournament ? l10n(view.tournament, locale) : copy.dailyTitle}
        </p>
      </header>
      <section className="flex flex-col gap-2">
        <h2 className="text-center text-lg font-black uppercase" style={poppins}>{copy.chooseTitle}</h2>
        <p className="text-center text-[12px] font-bold text-white/60">{copy.chooseHint}</p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {nations.map((n) => {
            const on = chosen === n.id;
            return (
              <button key={n.id} type="button" aria-pressed={on} disabled={busy} onClick={() => onChoose(n.id)}
                className={cn("relative flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                  on ? "border-brand-yellow bg-brand-yellow/15" : "border-white/10 bg-white/[0.06] hover:bg-white/[0.1]")}>
                <NationFlag nation={n} className="h-12 w-[4.5rem] ring-1 ring-black/20" />
                <span className="text-[13px] font-black uppercase leading-tight break-words" style={poppins}>{l10n(n.name, locale)}</span>
                {on && <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-brand-yellow text-black"><Check className="size-3" strokeWidth={4} /></span>}
              </button>
            );
          })}
        </div>
      </section>
      {chosen && <LanesTrack view={view} locale={locale} rivalTarget={rivalTarget} />}
      {notice && <p role="alert" className="rounded-2xl bg-brand-red-soft/15 px-4 py-3 text-sm font-semibold text-brand-red-light">{notice}</p>}
      <button type="button" onClick={onStart} disabled={!chosen || busy}
        className="h-12 rounded-full bg-brand-green text-sm font-black uppercase tracking-wide text-white hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:bg-white/10 disabled:text-white/50" style={poppins}>
        {chosen ? copy.start : copy.chooseFirst}
      </button>
    </div>
  );
}

/** A pick: the pitch, then the stat picker, or the reveal of the pick just made with a Next button. */
export function SoloBoard({ view, wording, locale, rivalTarget, onPick, onNext, onExit, busy = false, notice = null }: {
  view: RaceView; wording: RaceWording; locale: string; rivalTarget: number; onPick: (statId: string) => void; onNext: () => void; onExit: () => void;
  busy?: boolean; notice?: string | null;
}) {
  const copy = raceCopy(locale);
  return (
    <div className="@container flex flex-1 flex-col gap-3">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onExit} aria-label={copy.leave} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><X className="size-4" /></button>
        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-black uppercase leading-tight text-brand-yellow" style={poppins}>
          <Trophy aria-hidden className="size-4 shrink-0" strokeWidth={2.5} /> {view.tournament ? l10n(view.tournament, locale) : copy.dailyTitle}
        </p>
        <span className="rounded-full bg-surface-page px-3 py-1 text-xs font-black uppercase tabular-nums" style={poppins}>{copy.pickCount(view.round + (view.phase === "pick" ? 1 : 0))}</span>
      </header>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] content-start gap-3 @4xl:grid-cols-[minmax(0,1fr)_400px] @4xl:items-start @4xl:gap-5">
        <div className="flex min-w-0 flex-col gap-2 @4xl:sticky @4xl:top-4 @4xl:order-2">
          <LanesTrack view={view} locale={locale} rivalTarget={rivalTarget} />
          <p className="hidden text-[11px] leading-snug text-white/45 @4xl:block">{l10n(wording.source, locale)}</p>
        </div>
        <div className="min-w-0 @4xl:order-1">
          {view.phase === "pick" ? (
            <StatPicker key={view.round} view={view} wording={wording} copy={copy} locale={locale} busy={busy} onPick={onPick} />
          ) : (
            <div className="flex flex-col gap-3">
              <RevealCard view={view} wording={wording} copy={copy} locale={locale} />
              <button type="button" onClick={onNext} disabled={busy} autoFocus className="h-12 rounded-full bg-brand-green text-sm font-black uppercase tracking-wide text-white hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" style={poppins}>{copy.next}</button>
            </div>
          )}
        </div>
      </div>
      {notice && <p role="alert" className="rounded-2xl bg-brand-red-soft/15 px-4 py-3 text-sm font-semibold text-brand-red-light">{notice}</p>}
    </div>
  );
}

/** The end: won or lost, picks used, the share line, every pick with who it moved, and the way to race friends. */
export function SoloResult({ view, state, wording, locale, avatar, rivalTarget, onShare, onFriends }: {
  view: RaceView; state: SoloState; wording: RaceWording; locale: string; avatar: AvatarCustomization; rivalTarget: number;
  onShare: (text: string) => Promise<boolean>; onFriends: () => void;
}) {
  const copy = raceCopy(locale);
  const [copied, setCopied] = useState(false);
  const won = state.result === "won";
  const winner = view.seats.find((s) => s.position >= view.target && s.seat !== 0);
  const metricOf = new Map(wording.metrics.map((m) => [m.id, m]));
  const line = shareLine(state);
  const headline = won ? (state.picks.length === view.target ? copy.soloPerfect : copy.soloWon(state.picks.length)) : copy.soloLost(winner ? l10n(winner.nation.name, locale) : "");
  const text = `${copy.brandA} ${copy.brandB} · ${copy.dailyTitle}\n${line}`;
  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="relative"><DuelAvatar size="lg" customization={avatar} /><NationFlag nation={view.seats[0].nation} round className="absolute -bottom-1 -right-2 size-9 ring-2 ring-surface-page-alt" /></span>
        <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("text-3xl font-black leading-tight", won ? "text-brand-yellow" : "text-white")} style={poppins}>{headline}</motion.p>
        <p aria-label={line} className="text-2xl tracking-wider">{line}</p>
      </div>
      <LanesTrack view={view} locale={locale} rivalTarget={rivalTarget} />
      <div className="flex flex-col gap-2">
        <button type="button" onClick={async () => { if (await onShare(text)) { setCopied(true); window.setTimeout(() => setCopied(false), 2000); } }}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-brand-green text-sm font-black uppercase tracking-wide text-white hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" style={poppins}>
          {copied ? <Check className="size-4" /> : <Share2 className="size-4" />} {copied ? copy.copied : copy.share}
        </button>
        <button type="button" onClick={onFriends}
          className="flex h-12 items-center justify-center gap-2 rounded-full bg-brand-blue text-sm font-black uppercase tracking-wide text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" style={poppins}>
          <Users className="size-4" /> {copy.playFriends}
        </button>
        <p className="text-center text-[12px] font-bold text-white/55">{copy.comeBack}</p>
      </div>
      <section>
        <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/60" style={poppins}>{copy.recap}</h2>
        <ol className="flex flex-col gap-1.5">
          {state.picks.map((p, i) => {
            const stat = view.stats.find((s) => s.id === p.statId)!;
            const good = p.leaders.includes(0);
            return (
              <li key={p.statId} className="flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2">
                <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black", good ? "bg-brand-green text-black" : "bg-brand-red-soft text-black")} style={poppins}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-black leading-tight break-words" style={poppins}>{l10n(metricOf.get(stat.metric)!.label, locale)}</span>
                  <span className="block text-[11px] text-white/55">{l10n(wording.scopes.find((s) => s.id === stat.scope)!.label, locale)}</span>
                </span>
                <span className="flex shrink-0 -space-x-1.5">{p.leaders.map((seat) => <NationFlag key={seat} nation={view.seats[seat].nation} round className="size-6 ring-2 ring-surface-page-alt" />)}</span>
                <span className="sr-only">{copy.movedBy(p.leaders.map((seat) => l10n(view.seats[seat].nation.name, locale)).join(", "), good)}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
