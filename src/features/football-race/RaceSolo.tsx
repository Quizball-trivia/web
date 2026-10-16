"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Share2, Trophy, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import type { AvatarCustomization } from "@/types/game";
import { raceCopy } from "./race.copy";
import { l10n, toPublicStats, type L10n } from "./race.rules";
import { shareLine, type SoloConfig, type SoloState } from "./race.solo";
import type { RaceView, RaceWording } from "./race.views";
import { Brand, NationFlag, RaceTrack, RevealCard, StatPicker } from "./RaceRoom";

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

/** Today's race: your nation against three, the rules, the head start, one button. */
export function SoloIntro({ view, wording, locale, day, onStart }: { view: RaceView; wording: RaceWording; locale: string; day: string; onStart: () => void }) {
  const copy = raceCopy(locale);
  const [me, ...rivals] = view.seats;
  const date = new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "long" });
  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <div className="text-center">
        <Brand copy={copy} className="text-3xl leading-none" />
        <p className="mt-2 text-sm font-black uppercase tracking-[0.2em] text-white/60" style={poppins}>{copy.dailyTitle} · {date}</p>
        {view.tournament && <p className="mt-2 flex items-center justify-center gap-2 text-xl font-black uppercase text-brand-yellow" style={poppins}><Trophy aria-hidden className="size-5" strokeWidth={2.5} />{l10n(view.tournament, locale)}</p>}
      </div>
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <NationFlag nation={me.nation} className="h-16 w-24 shadow-lg ring-2 ring-brand-yellow" />
          <span className="text-sm font-black uppercase" style={poppins}>{l10n(me.nation.name, locale)}</span>
          <span className="text-[11px] font-bold text-brand-yellow">{copy.you}</span>
        </div>
        <span className="text-lg font-black text-white/50" style={poppins}>vs</span>
        <ul className="flex flex-col gap-1.5">
          {rivals.map((r) => (
            <li key={r.seat} className="flex items-center gap-2">
              <NationFlag nation={r.nation} className="h-6 w-9 ring-1 ring-black/20" />
              <span className="text-[13px] font-black uppercase" style={poppins}>{l10n(r.nation.name, locale)}</span>
            </li>
          ))}
          <li className="text-[11px] font-bold text-brand-orange">{copy.headStart}</li>
        </ul>
      </div>
      <ul className="space-y-2 rounded-2xl bg-white/[0.06] px-4 py-4">
        {copy.soloRules.map((line) => (
          <li key={line} className="flex gap-2.5 text-[14px] leading-snug text-white/85"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-yellow" />{line}</li>
        ))}
      </ul>
      <p className="text-center text-[11px] leading-snug text-white/40">{l10n(wording.source, locale)}</p>
      <button type="button" onClick={onStart} className="h-12 rounded-full bg-brand-green text-sm font-black uppercase tracking-wide text-white hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70" style={poppins}>{copy.start}</button>
    </div>
  );
}

/** A pick: the pitch, then the stat picker, or the reveal of the pick just made with a Next button. */
export function SoloBoard({ view, wording, locale, onPick, onNext, onExit, busy = false, notice = null }: {
  view: RaceView; wording: RaceWording; locale: string; onPick: (statId: string) => void; onNext: () => void; onExit: () => void;
  busy?: boolean; notice?: string | null;
}) {
  const copy = raceCopy(locale);
  return (
    <div className="flex flex-1 flex-col gap-3">
      <header className="flex items-center gap-2">
        <button type="button" onClick={onExit} aria-label={copy.leave} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><X className="size-4" /></button>
        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-black uppercase leading-tight text-brand-yellow" style={poppins}>
          <Trophy aria-hidden className="size-4 shrink-0" strokeWidth={2.5} /> {view.tournament ? l10n(view.tournament, locale) : copy.dailyTitle}
        </p>
        <span className="rounded-full bg-surface-page px-3 py-1 text-xs font-black uppercase tabular-nums" style={poppins}>{copy.pickCount(view.round + (view.phase === "pick" ? 1 : 0))}</span>
      </header>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] content-start gap-3 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-5">
        <div className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-4 lg:order-2">
          <RaceTrack view={view} copy={copy} locale={locale} />
          <p className="hidden text-[11px] leading-snug text-white/45 lg:block">{l10n(wording.source, locale)}</p>
        </div>
        <div className="min-w-0 lg:order-1">
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
export function SoloResult({ view, state, wording, locale, avatar, onShare, onFriends }: {
  view: RaceView; state: SoloState; wording: RaceWording; locale: string; avatar: AvatarCustomization;
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
      <RaceTrack view={view} copy={copy} locale={locale} />
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
