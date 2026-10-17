"use client";

import { useMemo, useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { Check, Flag, History, Lightbulb, Search, Shield, Shuffle, Target, ThumbsDown, Trophy, X, Zap } from "lucide-react";
import { footballGridAssetUrl } from "@/lib/football-grid/assets";
import { cn } from "@/lib/utils";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import { PartyResultsScreen } from "@/features/party-kit";
import type { MatchFinalResultsPayload, MatchParticipant } from "@/lib/realtime/socket.types";
import { raceCopy, type RaceCopy } from "./race.copy";
import type { PickResult } from "./race.engine";
import { formatValue, l10n, rng, searchStats, type L10n, type PublicStat, type RaceNation } from "./race.rules";
import type { DraftState } from "./race.draft";
import type { AvatarCustomization } from "@/types/game";
import type { RaceSeatView, RaceView, RaceWording } from "./race.views";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
const idOf = (seat: number) => `seat-${seat}`;

/** Full-height frame every race screen sits in; wider on desktop while the race is on (stats beside the pitch). */
export { Brand };

export function RaceFrame({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-surface-page-alt text-white">
        <div className={cn("mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-6 pt-4", wide ? "lg:max-w-5xl lg:px-8" : "lg:max-w-3xl")}>{children}</div>
      </div>
    </MotionConfig>
  );
}

function Brand({ copy, className }: { copy: RaceCopy; className?: string }) {
  return <p className={cn("font-black uppercase tracking-tight", className)} style={poppins}>{copy.brandA} <span className="text-brand-yellow">{copy.brandB}</span></p>;
}

const TONES = ["bg-brand-blue", "bg-brand-orange", "bg-brand-purple", "bg-brand-cyan", "bg-brand-red-soft", "bg-brand-green-light", "bg-brand-gold-deep", "bg-brand-slate"];

/** The nation's flag; an invented nation (no flag) gets a coloured badge with its letters. */
export function NationFlag({ nation, round = false, className }: { nation: RaceNation; round?: boolean; className?: string }) {
  const shape = round ? "rounded-full" : "rounded-[4px]";
  if (nation.flag) {
    return (
      <span aria-hidden className={cn("relative inline-block shrink-0 overflow-hidden bg-white/10", shape, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={footballGridAssetUrl(`/assets/football-grid/flags/${nation.flag}.svg`) ?? undefined} alt="" className="absolute inset-0 size-full object-cover" />
      </span>
    );
  }
  const tone = TONES[[...nation.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TONES.length];
  return <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center text-[9px] font-black uppercase leading-none text-white", shape, tone, className)}>{(nation.code ?? nation.id).slice(0, 2)}</span>;
}

function useLabels(wording: RaceWording, locale: string) {
  return useMemo(() => {
    const metricOf = new Map(wording.metrics.map((m) => [m.id, m]));
    const scopeOf = new Map(wording.scopes.map((s) => [s.id, s]));
    return {
      metric: (s: { metric: string }) => metricOf.get(s.metric)!,
      stat: (s: { metric: string }) => l10n(metricOf.get(s.metric)!.label, locale),
      scope: (id: string) => l10n(scopeOf.get(id)!.label, locale),
    };
  }, [wording, locale]);
}

export const PITCH_STRIPES = { backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 44px, transparent 44px 88px)" } as const;
export const GOAL_NET = {
  backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
  backgroundSize: "7px 7px",
} as const;

/**
 * The race, drawn on a pitch: one lane per player, the start on the left, the goal on the right. A flag is the racer; the
 * avatar at the start of the lane is who owns it. Flags move as each pick is revealed.
 */
export function RaceTrack({ view, copy, locale }: { view: RaceView; copy: RaceCopy; locale: string }) {
  const cols = view.target + 1;
  const tight = view.seats.length > 4;
  return (
    <section aria-label={copy.theme} className="rounded-3xl bg-fut-pitch p-2 shadow-[inset_0_0_40px_rgba(0,0,0,0.35)]">
      <div className="overflow-hidden rounded-2xl border-2 border-white/70" style={PITCH_STRIPES}>
        <div aria-hidden className="flex border-b-2 border-white/70 text-[10px] font-black uppercase text-white/75" style={poppins}>
          <span className="w-[5.25rem] shrink-0 border-r-2 border-white/70 lg:w-36" />
          <span className="grid flex-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }, (_, i) => (
              <span key={i} className="flex h-5 items-center justify-center">{i === 0 ? "" : i === view.target ? <Flag className="size-3" /> : i}</span>
            ))}
          </span>
        </div>
        <ol>
          {view.seats.map((s) => {
            const me = s.seat === view.mySeat;
            const name = l10n(s.nation.name, locale);
            const at = Math.min(s.position, view.target);
            return (
              <li key={s.seat} aria-label={`${name}, ${me ? copy.you : s.name}${s.status ? ` (${s.status === "left" ? copy.seatLeft : copy.seatAway})` : ""}: ${copy.position(s.position, view.target)}`}
                className={cn("flex items-stretch border-b border-white/30 last:border-b-0", me && "bg-brand-green/30", s.status === "left" && "opacity-50")}>
                <div className="flex w-[5.25rem] shrink-0 items-center gap-1.5 border-r-2 border-white/70 px-1.5 py-1 lg:w-36">
                  <span className="relative shrink-0">
                    {s.avatar && <DuelAvatar size="xs" customization={s.avatar} />}
                    {view.phase === "pick" && s.picked && (
                      <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-brand-green ring-2 ring-fut-pitch"><Check className="size-2.5" strokeWidth={4} /></span>
                    )}
                  </span>
                  <span className="min-w-0">
                    {/* Scoreboard codes on phones (the lane is narrow); the full name on desktop and in every reveal. */}
                    <span className="block text-xs font-black uppercase leading-tight lg:hidden" style={poppins}>{s.nation.code ?? s.nation.id}</span>
                    <span className="hidden text-[11px] font-black uppercase leading-tight break-words lg:block" style={poppins}>{name}</span>
                    {me && <span className="block text-[10px] font-bold leading-tight text-brand-yellow">{copy.you}</span>}
                    {s.status && <span className={cn("block text-[10px] font-bold leading-tight", s.status === "left" ? "text-brand-red-light" : "text-white/70")}>{s.status === "left" ? copy.seatLeft : copy.seatAway}</span>}
                  </span>
                </div>
                <div className={cn("relative flex-1", tight ? "h-10" : "h-12")}>
                  <div aria-hidden className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {Array.from({ length: cols }, (_, i) => (
                      <span key={i} className={cn("border-r border-white/20 last:border-r-0", i === view.target && "border-l-2 border-l-white/70")} style={i === view.target ? GOAL_NET : undefined} />
                    ))}
                  </div>
                  {/* The flag travels inside an inset box, so on a narrow lane it never leaves the pitch at either end. */}
                  <div className={cn("absolute inset-y-0", tight ? "inset-x-3.5" : "inset-x-[1.125rem]")}>
                    <motion.span className="absolute top-1/2 z-10" initial={false} style={{ x: "-50%", y: "-50%" }}
                      animate={{ left: `${(at / view.target) * 100}%` }} transition={{ type: "spring", stiffness: 240, damping: 22 }}>
                      <NationFlag nation={s.nation} round className={cn("block ring-2", tight ? "size-6" : "size-8", me ? "ring-brand-yellow" : "ring-white")} />
                      {s.position > view.target && (
                        <span className="absolute -left-2 -top-1.5 rounded-full bg-brand-yellow px-1 text-[9px] font-black text-black" style={poppins}>+{s.position - view.target}</span>
                      )}
                    </motion.span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function ScopeChip({ children }: { children: React.ReactNode }) {
  return <span className="inline-block rounded-full bg-brand-blue/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-brand-cyan" style={poppins}>{children}</span>;
}

/** One stat as a tile: the wording (and its scope when the list mixes scopes); once played, the flags that took it. */
function StatTile({ stat, label, scope, selected, used, usedTag, usedLabel, seats, onSelect }: {
  stat: PublicStat; label: string; scope?: string; selected: boolean; used: PickResult | undefined; seats: RaceSeatView[]; onSelect: (id: string) => void;
  /** The visible word on a played tile ("Played"), and what its flags say, for screen readers. */
  usedTag?: string;
  usedLabel?: string;
}) {
  return (
    <button type="button" disabled={Boolean(used)} aria-pressed={selected} data-stat={stat.id} onClick={() => onSelect(stat.id)}
      className={cn("relative flex min-h-[4.25rem] w-full flex-col justify-center gap-1 rounded-2xl border-2 px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
        selected ? "border-brand-yellow bg-brand-yellow/15" : "border-white/10 bg-white/[0.06] hover:bg-white/[0.1]", used && "opacity-45 hover:bg-white/[0.06]")}>
      <span className={cn("block text-[13px] font-black leading-tight break-words", selected && "pr-5")} style={poppins}>{label}</span>
      {scope && <span className="block"><ScopeChip>{scope}</ScopeChip></span>}
      {used && (
        <span className="flex items-center gap-1.5">
          {usedTag && <span aria-hidden className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white/80" style={poppins}>{usedTag}</span>}
          <span className="flex -space-x-1.5">{used.leaders.map((seat) => <NationFlag key={seat} nation={seats[seat].nation} round className="size-5 ring-2 ring-surface-page-alt" />)}</span>
        </span>
      )}
      {used && usedLabel && <span className="sr-only">{usedLabel}</span>}
      {selected && !used && <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-brand-yellow text-black"><Check className="size-3.5" strokeWidth={3} /></span>}
    </button>
  );
}

/** Arrow keys, Home and End move through a radio group or tab list (one Tab stop for the group): focus and select. */
function onArrowKeys(event: React.KeyboardEvent<HTMLElement>) {
  const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]:not(:disabled), [role=tab]:not(:disabled)")];
  const at = items.indexOf(document.activeElement as HTMLButtonElement);
  if (at < 0) return;
  const next = event.key === "ArrowRight" || event.key === "ArrowDown" ? (at + 1) % items.length
    : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (at - 1 + items.length) % items.length
      : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : null;
  if (next === null) return;
  event.preventDefault();
  items[next].focus();
  items[next].click();
}

const FAMILY_ICON: Record<string, typeof Trophy> = { ideas: Lightbulb, results: Trophy, goals: Target, defence: Shield, drama: Zap, unwanted: ThumbsDown, history: History };

/**
 * Choosing a stat in two taps without a long list: the competition on top (the match's three), then a category, then
 * about four tiles. "Ideas" suggests one stat per category. Typing searches every stat of the match instead. Wording
 * only: nothing here hints at who leads a stat. A stat already played stays, dimmed, with the flags that took it.
 */
export function StatPicker({ view, wording, copy, locale, busy, onPick }: {
  view: RaceView; wording: RaceWording; copy: RaceCopy; locale: string; busy: boolean; onPick: (statId: string) => void;
}) {
  const labels = useLabels(wording, locale);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState(view.scopes[0]);
  const [family, setFamily] = useState("ideas");
  const [selected, setSelected] = useState<string | null>(null);
  const [shuffles, setShuffles] = useState(0);
  const usedBy = useMemo(() => new Map(view.history.map((h) => [h.statId, h])), [view.history]);
  const inScope = useMemo(() => view.stats.filter((s) => s.scope === scope), [view.stats, scope]);
  const free = (s: PublicStat) => !usedBy.has(s.id);
  const ideas = useMemo(() => {
    const random = rng(view.round * 97 + shuffles * 13 + scope.length * 7 + 5);
    const shuffled = inScope.filter((s) => !usedBy.has(s.id)).map((s) => ({ s, k: random() })).sort((a, b) => a.k - b.k).map((x) => x.s);
    // One idea per category first, so the four never ask the same kind of thing.
    const seen = new Set<string>();
    const varied = shuffled.filter((s) => (seen.has(s.family) ? false : (seen.add(s.family), true)));
    return [...varied, ...shuffled.filter((s) => !varied.includes(s))].slice(0, 4);
  }, [inScope, view.round, usedBy, shuffles, scope]);
  const categories = [{ id: "ideas", count: ideas.length }, ...wording.families.map((f) => ({ id: f.id, count: inScope.filter((s) => s.family === f.id && free(s)).length }))]
    .filter((c) => c.id === "ideas" || inScope.some((s) => s.family === c.id));
  // The chosen category can vanish (another era, a stat used up, a nation out of the race): fall back to Ideas.
  const activeFamily = categories.some((c) => c.id === family && (c.id === "ideas" || c.count > 0)) ? family : "ideas";
  const searching = query.trim().length > 0;
  const tiles = useMemo(() => {
    if (searching) return [...searchStats(wording, view.stats, query)].sort((a, b) => Number(usedBy.has(a.id)) - Number(usedBy.has(b.id)));
    if (activeFamily === "ideas") return ideas;
    return inScope.filter((s) => s.family === activeFamily).sort((a, b) => Number(usedBy.has(a.id)) - Number(usedBy.has(b.id)));
  }, [searching, wording, view.stats, query, activeFamily, ideas, inScope, usedBy]);
  const choice = view.stats.find((s) => s.id === selected && !usedBy.has(s.id));
  const playedLabel = (p: PickResult) => (p.leaders.length === 0 ? copy.nobodyMoves
    : copy.movedBy(p.leaders.map((seat) => l10n(view.seats[seat].nation.name, locale)).join(", "), p.leaders.includes(view.mySeat)));
  const familyLabel = (id: string) => copy.families[id] ?? l10n(wording.families.find((f) => f.id === id)?.label ?? { en: id, es: id }, locale);
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="text-center text-[11px] font-black uppercase tracking-[0.2em] text-white/70" style={poppins}>{copy.pickTitle}</h2>
      <label className="flex h-11 items-center gap-2 rounded-2xl bg-white px-3 text-surface-page focus-within:ring-2 focus-within:ring-brand-yellow">
        <Search aria-hidden className="size-4 shrink-0 text-surface-page/50" />
        <span className="sr-only">{copy.searchLabel}</span>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={copy.searchPlaceholder} autoComplete="off" enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-bold placeholder:font-semibold placeholder:text-surface-page/45 focus:outline-none" />
        {searching && <button type="button" onClick={() => setQuery("")} aria-label={copy.clearSearch} className="flex size-7 items-center justify-center rounded-full bg-surface-page/10"><X className="size-3.5" /></button>}
      </label>
      {!searching && (
        <>
          <div role="radiogroup" aria-label={copy.competition} onKeyDown={onArrowKeys} className={cn("grid gap-1 rounded-2xl bg-black/25 p-1",
            view.scopes.length === 1 ? "grid-cols-1" : view.scopes.length === 2 ? "grid-cols-2" : view.scopes.length === 3 ? "grid-cols-3" : view.scopes.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-5")}>
            {view.scopes.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={scope === id} tabIndex={scope === id ? 0 : -1} onClick={() => setScope(id)}
                className={cn("min-h-10 rounded-xl px-1.5 py-1 text-[12px] font-extrabold leading-tight break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                  scope === id ? "bg-brand-blue text-white shadow" : "text-white/65 hover:bg-white/10")} style={poppins}>{labels.scope(id)}</button>
            ))}
          </div>
          <div role="tablist" aria-label={copy.category} onKeyDown={onArrowKeys} className="flex flex-wrap gap-1.5">
            {categories.map((c) => {
              const Icon = FAMILY_ICON[c.id] ?? Lightbulb;
              const active = activeFamily === c.id;
              return (
                <button key={c.id} type="button" role="tab" id={`race-tab-${c.id}`} aria-controls="race-tab-panel" aria-selected={active} tabIndex={active ? 0 : -1} disabled={c.count === 0} onClick={() => setFamily(c.id)}
                  className={cn("relative flex min-h-14 min-w-[4.25rem] flex-1 basis-[22%] flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-black uppercase leading-none tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-35",
                    active ? (c.id === "ideas" ? "bg-brand-yellow text-black" : "bg-white text-surface-page") : "bg-white/[0.07] text-white/80 hover:bg-white/[0.12]")} style={poppins}>
                  <Icon aria-hidden className="size-[18px]" strokeWidth={2.5} />
                  <span className="w-full text-center">{familyLabel(c.id)}</span>
                  {c.id !== "ideas" && <span className={cn("absolute right-1 top-1 rounded-full px-1 text-[9px] tabular-nums", active ? "bg-surface-page/10" : "bg-white/10 text-white/60")}>{c.count}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
      <div role="tabpanel" id="race-tab-panel" aria-labelledby={searching ? undefined : `race-tab-${activeFamily}`} aria-label={searching ? copy.searchLabel : undefined} className="flex flex-col gap-2">
        {activeFamily === "ideas" && !searching && (
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-white/60">{copy.ideasHint}</p>
            <button type="button" onClick={() => setShuffles((n) => n + 1)} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/80 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
              <Shuffle className="size-3" /> {copy.shuffle}
            </button>
          </div>
        )}
        {tiles.length === 0 ? (
          <p role="status" className="rounded-2xl bg-white/[0.06] px-4 py-4 text-center text-sm text-white/75">{copy.noMatch}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {tiles.map((s) => (
              <StatTile key={s.id} stat={s} label={labels.stat(s)} scope={searching ? labels.scope(s.scope) : undefined} selected={s.id === choice?.id}
                used={usedBy.get(s.id)} seats={view.seats} onSelect={setSelected}
                usedTag={copy.used} usedLabel={usedBy.has(s.id) ? `${copy.used}. ${playedLabel(usedBy.get(s.id)!)}` : undefined} />
            ))}
          </div>
        )}
      </div>
      {choice && (
        <div className="sticky bottom-3 z-20 flex items-center gap-2 rounded-2xl bg-surface-page p-2 shadow-lg ring-1 ring-white/15">
          <span className="min-w-0 flex-1 pl-1.5">
            <span className="block text-[13px] font-black leading-tight break-words" style={poppins}>{labels.stat(choice)}</span>
            <span className="block text-[11px] text-white/60">{labels.scope(choice.scope)}</span>
          </span>
          <button type="button" disabled={busy} onClick={() => onPick(choice.id)}
            className="h-12 shrink-0 rounded-2xl bg-brand-green px-5 text-sm font-black uppercase tracking-wide text-white hover:bg-brand-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-45" style={poppins}>{copy.lock}</button>
        </div>
      )}
    </div>
  );
}

/** One pick of the round on show: who picked it, the stat, then every racer's value with the leader on top. */
export function RevealCard({ view, wording, copy, locale }: { view: RaceView; wording: RaceWording; copy: RaceCopy; locale: string }) {
  const labels = useLabels(wording, locale);
  if (!view.reveal) return null;
  const { item, index, total, open } = view.reveal;
  const picker = view.seats[item.seat];
  const mine = item.seat === view.mySeat;
  const stat = view.stats.find((s) => s.id === item.statId);
  if (!stat) return null;
  const metric = labels.metric(stat);
  const scopeId = stat.scope;
  const order = open ? view.seats.map((s) => s.seat).sort((a, b) => (metric.dir === "low" ? item.values[a] - item.values[b] : item.values[b] - item.values[a])) : view.seats.map((s) => s.seat);
  const leaderNames = item.leaders.map((seat) => l10n(view.seats[seat].nation.name, locale));
  const verdict = !open ? null
    : item.leaders.length === 0 ? { tone: "bg-surface-page/[0.06] text-surface-page/80", text: copy.nobodyMoves }
    : item.leaders.length > 1 ? { tone: "bg-brand-yellow/25 text-surface-page", text: copy.tie(leaderNames.join(" · ")) }
      : item.leaders[0] === item.seat ? { tone: "bg-brand-green/20 text-brand-green-deep", text: copy.goodCall }
        : { tone: "bg-brand-red-soft/20 text-brand-red-deep", text: mine ? copy.backfired(leaderNames[0]) : copy.helps(leaderNames[0]) };
  return (
    <motion.section key={`${view.round}-${index}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} role="status" className="rounded-3xl bg-white px-4 py-4 text-surface-page shadow-lg">
      <div className="flex items-center gap-2">
        {picker.avatar && <DuelAvatar size="xs" customization={picker.avatar} />}
        <p className="min-w-0 flex-1 text-xs font-bold text-surface-page/70 break-words">{item.auto ? copy.autoPicked(mine ? copy.you : picker.name) : mine ? copy.youPicked : copy.picked(picker.name)}</p>
        {total > 1 && <span className="shrink-0 rounded-full bg-surface-page/10 px-2 py-0.5 text-[10px] font-black tabular-nums" style={poppins}>{copy.step(index + 1, total)}</span>}
      </div>
      <p className="mt-2 text-xl font-black leading-snug lg:text-2xl" style={poppins}>{l10n(metric.label, locale)}</p>
      <span className="mt-1 inline-block rounded-full bg-brand-blue/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-brand-blue" style={poppins}>{labels.scope(scopeId)}</span>
      <ol className="mt-3 grid gap-1.5">
        {order.map((seat, i) => {
          const s = view.seats[seat];
          const leads = open && item.leaders.includes(seat);
          return (
            <motion.li key={seat} layout className={cn("flex items-center gap-2 rounded-xl px-2.5 py-2", leads ? "bg-brand-yellow" : "bg-surface-page/[0.06]")}>
              <NationFlag nation={s.nation} className="h-5 w-7 ring-1 ring-black/15" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black leading-tight break-words" style={poppins}>{l10n(s.nation.name, locale)}</span>
                {open && item.details[seat] && <span className={cn("block text-[11px] font-semibold leading-tight break-words", leads ? "text-black/65" : "text-surface-page/55")}>{l10n(item.details[seat]!, locale)}</span>}
              </span>
              {leads && <span className="shrink-0 rounded-full bg-brand-green px-2 py-0.5 text-[11px] font-black text-white" style={poppins}>{copy.move}</span>}
              <span className="w-16 shrink-0 text-right text-lg font-black tabular-nums" style={poppins}>
                {open ? <motion.span initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.06 * i }} className="inline-block">{formatValue(metric, item.values[seat], locale)}</motion.span> : "?"}
              </span>
            </motion.li>
          );
        })}
      </ol>
      <p aria-live="polite" className={cn("mt-3 min-h-9 rounded-xl px-3 py-2 text-center text-sm font-black", verdict?.tone ?? "bg-surface-page/[0.04]")} style={poppins}>{verdict?.text ?? "…"}</p>
    </motion.section>
  );
}

/** A round: the pitch with everyone's racer, then the stat picker (pick) or the picks one by one (reveal). */
export function RaceBoard({ view, wording, locale, secondsLeft, busy, onPick, error = null, onLeave }: {
  view: RaceView; wording: RaceWording; locale: string; secondsLeft: number | null; busy: boolean; onPick: (statId: string) => void;
  /** A refused pick's code (not_open, stat_used). */
  error?: string | null;
  onLeave?: () => void;
}) {
  const copy = raceCopy(locale);
  const labels = useLabels(wording, locale);
  // Who the server still waits for: seats that are in (an away seat gets its pick from the clock).
  const pending = view.seats.filter((s) => !s.picked && !s.status).length;
  // Committed once the server has the pick, whether or not its label is still listed.
  const committed = view.phase === "pick" && view.myPick !== null;
  const picked = view.myPick ? view.stats.find((s) => s.id === view.myPick) ?? null : null;
  return (
    <div className="flex flex-1 flex-col gap-3">
      <header className="flex items-center gap-2">
        {onLeave && (
          <button type="button" onClick={onLeave} aria-label={copy.leave} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><X className="size-4" /></button>
        )}
        {view.tournament ? (
          <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-black uppercase leading-tight text-brand-yellow break-words" style={poppins}>
            <Trophy aria-hidden className="size-4 shrink-0" strokeWidth={2.5} /> {l10n(view.tournament, locale)}
          </p>
        ) : (
          <>
            <Brand copy={copy} className="hidden min-w-0 flex-1 text-[15px] leading-tight min-[380px]:block min-[400px]:text-base" />
            <span className="flex-1 min-[380px]:hidden" aria-hidden />
          </>
        )}
        <span className="rounded-full bg-surface-page px-3 py-1 text-xs font-black uppercase tabular-nums" style={poppins}>{copy.round(view.round + 1)}</span>
        {view.phase === "pick" && secondsLeft !== null && (
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-black tabular-nums", secondsLeft <= 5 ? "bg-brand-red-soft/25 text-brand-red-light" : "bg-white/10 text-white/70")} style={poppins}>{copy.seconds(secondsLeft)}</span>
        )}
      </header>
      <p className="sr-only" aria-live="polite">{view.phase === "pick" ? `${copy.round(view.round + 1)}. ${copy.pickTitle}` : ""}</p>
      <p className="sr-only" aria-live="assertive">{view.phase === "pick" && !committed && secondsLeft !== null && secondsLeft <= 5 && secondsLeft > 0 ? copy.hurry : ""}</p>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] content-start gap-3 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-5">
        <div className="flex min-w-0 flex-col gap-2 lg:sticky lg:top-4 lg:order-2">
          <RaceTrack view={view} copy={copy} locale={locale} />
          {view.suddenDeath && <p role="status" className="rounded-xl bg-brand-yellow/15 px-3 py-2 text-center text-xs font-black text-brand-yellow" style={poppins}>{copy.suddenDeath}</p>}
          <p className="hidden text-[11px] leading-snug text-white/45 lg:block">{l10n(wording.source, locale)}</p>
        </div>
        <div className="min-w-0 lg:order-1">
          {view.phase === "pick" && !committed ? (
            <StatPicker key={view.round} view={view} wording={wording} copy={copy} locale={locale} busy={busy} onPick={onPick} />
          ) : committed ? (
            <div role="status" className="rounded-2xl bg-white/[0.07] px-4 py-4 text-center">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60" style={poppins}>{copy.yourPick}</p>
              {picked && <p className="mt-1 text-lg font-black leading-snug" style={poppins}>{labels.stat(picked)}</p>}
              {picked && <p className="mt-1"><ScopeChip>{labels.scope(picked.scope)}</ScopeChip></p>}
              <p className="mt-3 text-sm font-bold text-white/70">{pending === 0 ? copy.revealing : copy.waiting(pending)}</p>
            </div>
          ) : (
            <RevealCard view={view} wording={wording} copy={copy} locale={locale} />
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="fixed inset-x-4 bottom-6 z-40 mx-auto max-w-sm rounded-xl bg-brand-red-soft/90 px-3 py-2 text-center text-sm font-semibold text-white">{copy.errors[error] ?? copy.errors.default}</p>
      )}
    </div>
  );
}

/** Before the first round: who races with which nation, the three rules, this race's theme, the countdown. */
export function RaceIntro({ view, wording, locale, secondsLeft }: { view: RaceView; wording: RaceWording; locale: string; secondsLeft: number | null }) {
  const copy = raceCopy(locale);
  const labels = useLabels(wording, locale);
  const n = view.seats.length;
  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <div className="text-center">
        <Brand copy={copy} className="text-4xl leading-none" />
        <p className="mt-2 text-sm font-black uppercase tracking-[0.2em] text-white/60" style={poppins}>{copy.introTitle(n)}</p>
      </div>
      <ul className={cn("mx-auto grid w-full max-w-sm gap-3", n === 2 || n === 4 ? "grid-cols-2" : "grid-cols-3")}>
        {view.seats.map((s, i) => (
          <motion.li key={s.seat} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 * i }} className="flex min-w-0 flex-col items-center gap-1.5">
            <span className="relative">
              {s.avatar && <DuelAvatar size="md" customization={s.avatar} />}
              <NationFlag nation={s.nation} round className="absolute -bottom-1 -right-2 size-7 ring-2 ring-surface-page-alt" />
            </span>
            <span className="w-full text-center text-sm font-black uppercase leading-tight break-words [overflow-wrap:anywhere]" style={poppins}>{l10n(s.nation.name, locale)}</span>
            <span className={cn("w-full text-center text-[11px] leading-tight break-words [overflow-wrap:anywhere]", s.seat === view.mySeat ? "font-black text-brand-yellow" : "text-white/60")}>{s.seat === view.mySeat ? copy.you : s.name}</span>
          </motion.li>
        ))}
      </ul>
      <ul className="space-y-2 rounded-2xl bg-white/[0.06] px-4 py-4">
        {copy.introRules(view.finish).map((line) => (
          <li key={line} className="flex gap-2.5 text-[14px] leading-snug text-white/85"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-yellow" />{line}</li>
        ))}
      </ul>
      <div className="text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60" style={poppins}>{copy.theme}</p>
        {view.tournament && <p className="mt-1 flex items-center justify-center gap-2 text-2xl font-black uppercase text-brand-yellow" style={poppins}><Trophy aria-hidden className="size-6" strokeWidth={2.5} />{l10n(view.tournament, locale)}</p>}
        <p className="mt-2 flex flex-wrap justify-center gap-1.5">{view.scopes.map((id) => <ScopeChip key={id}>{labels.scope(id)}</ScopeChip>)}</p>
      </div>
      {secondsLeft !== null && <p className="text-center text-lg font-black text-brand-yellow" style={poppins} aria-live="polite">{copy.startsIn(secondsLeft)}</p>}
    </div>
  );
}

/** The final result on the party results screen: places by distance (shared), good calls as the second stat, no XP. */
export function RaceResults({ view, locale, onRoom, onExit }: { view: RaceView; locale: string; onRoom: () => void; onExit: () => void }) {
  const copy = raceCopy(locale);
  const table = view.standings ?? [];
  const mine = table.find((s) => s.seat === view.mySeat);
  const firsts = table.filter((s) => s.place === 1);
  const ranOut = view.endedBy === "rounds" || view.endedBy === "stats";
  const headline = mine?.place !== 1 ? copy.youPlace(mine?.place ?? table.length)
    : view.endedBy === "left" ? copy.othersLeft(view.seats.length === 2)
      : ranOut ? copy.furthestWon(firsts.length > 1)
        : firsts.length > 1 ? copy.tieFirst : copy.youWon;
  const participants: MatchParticipant[] = view.seats.map((s) => ({ userId: idOf(s.seat), seat: s.seat, avatarUrl: null, avatarCustomization: s.avatar ?? null, username: s.seat === view.mySeat ? copy.you : s.name }));
  const finalResults: MatchFinalResultsPayload = {
    matchId: "race",
    winnerId: firsts.length === 1 ? idOf(firsts[0].seat) : null,
    players: {},
    standings: table.map((s) => ({ userId: idOf(s.seat), rank: s.place, totalPoints: s.position, correctAnswers: s.goodCalls, avgTimeMs: null })),
    durationMs: 0,
    resultVersion: 1,
  };
  const rowDetail = Object.fromEntries(table.map((s) => [idOf(s.seat), copy.resultDetail(l10n(view.seats[s.seat].nation.name, locale), s.goodCalls, s.backfires)]));
  return (
    <PartyResultsScreen finalResults={finalResults} participants={participants} selfUserId={idOf(view.mySeat)} onPlayAgain={onRoom} onMainMenu={onExit}
      headline={headline} hideXp correctLabel={copy.goodCalls} pointsLabel={copy.spaces} useGivenRanks rowDetail={rowDetail} />
  );
}

/** Before the race: the dealt nations, picked in turn. On your turn tap one; a taken nation shows who took it. */
export function RaceDraft({ nations, seats, mySeat, draft, tournament, locale, secondsLeft, onPick, busy = false }: {
  nations: RaceNation[]; seats: Array<{ seat: number; name: string; avatar?: AvatarCustomization }>; mySeat: number; draft: DraftState;
  tournament: L10n | null; locale: string; secondsLeft: number | null; onPick: (nationId: string) => void; busy?: boolean;
}) {
  const copy = raceCopy(locale);
  const onTurn = draft.done ? null : draft.order[draft.turn];
  const mine = onTurn === mySeat;
  const takenBy = (id: string) => draft.picks.findIndex((p) => p === id);
  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-center gap-2">
        {tournament ? (
          <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] font-black uppercase leading-tight text-brand-yellow" style={poppins}>
            <Trophy aria-hidden className="size-4 shrink-0" strokeWidth={2.5} /> {l10n(tournament, locale)}
          </p>
        ) : <Brand copy={copy} className="flex-1 text-base" />}
        {secondsLeft !== null && !draft.done && <span className={cn("rounded-full px-2.5 py-1 text-xs font-black tabular-nums", secondsLeft <= 3 ? "bg-brand-red-soft/25 text-brand-red-light" : "bg-white/10 text-white/70")} style={poppins}>{copy.seconds(secondsLeft)}</span>}
      </header>
      <div className="text-center">
        <h2 className="text-2xl font-black" style={poppins}>{copy.draftTitle}</h2>
        <p className="mx-auto mt-1 max-w-xs text-[13px] leading-snug text-white/65">{copy.draftHint}</p>
      </div>
      <ol aria-label={copy.draftTitle} className="flex justify-center gap-3">
        {draft.order.map((seat, i) => {
          const s = seats[seat]; const picked = draft.picks[seat]; const nation = nations.find((n) => n.id === picked);
          return (
            <li key={seat} className={cn("flex w-16 flex-col items-center gap-1 rounded-2xl py-1.5", i === draft.turn && !draft.done && "bg-brand-yellow/15 ring-2 ring-brand-yellow")}>
              <span className="relative">
                {s.avatar && <DuelAvatar size="sm" customization={s.avatar} />}
                {nation && <NationFlag nation={nation} round className="absolute -bottom-1 -right-2 size-6 ring-2 ring-surface-page-alt" />}
              </span>
              <span className={cn("w-full text-center text-[10px] font-black leading-tight break-words", seat === mySeat ? "text-brand-yellow" : "text-white/70")} style={poppins}>{seat === mySeat ? copy.you : s.name}</span>
            </li>
          );
        })}
      </ol>
      <p role="status" aria-live="polite" className={cn("rounded-xl px-3 py-2 text-center text-sm font-black", mine ? "bg-brand-yellow text-black" : "bg-white/[0.07] text-white/80")} style={poppins}>
        {draft.done ? "…" : mine ? copy.draftYourTurn : copy.draftTurn(seats[onTurn!].name)}
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {nations.map((n) => {
          const by = takenBy(n.id);
          return (
            <button key={n.id} type="button" data-nation={n.id} disabled={!mine || busy || by >= 0} onClick={() => onPick(n.id)} aria-label={l10n(n.name, locale)}
              className={cn("relative flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 px-2 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                by >= 0 ? "border-white/5 bg-white/[0.03] opacity-55" : mine ? "border-white/20 bg-white/[0.08] hover:border-brand-yellow hover:bg-brand-yellow/10" : "border-white/10 bg-white/[0.05]")}>
              <NationFlag nation={n} className="h-10 w-14 shadow-md ring-1 ring-black/20" />
              <span className="text-center text-sm font-black uppercase leading-tight break-words" style={poppins}>{l10n(n.name, locale)}</span>
              {by >= 0 && (
                <span className="absolute right-2 top-2 flex items-center gap-1 text-[10px] font-bold text-white/70">
                  {seats[by].avatar && <DuelAvatar size="xs" customization={seats[by].avatar!} />}
                  {draft.auto[by] && <span>{copy.draftAuto}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
