"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown, Coins, Crown, Info, RefreshCw, Share2, Shield, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { DuelAvatar } from "@/features/duel/DuelAvatar";
import { GreenButton, QuietButton, TopBar, poppins } from "@/features/wordgames/ui";
import type { AvatarCustomization } from "@/types/game";
import { draftCopy, type DraftText } from "./draft.copy";
import type { ChallengeTarget } from "./draft.engine";
import { ShareSheet, useEscape } from "./DraftShareCard";
import {
  ACADEMY_RATING, BUDGET, FORMATIONS, XI, budgetFor, destination, effective, inXi, lines, matchDayGoals, matchGoals, priceOf, rateSeason, seasonStats, shareSquares, spentOn, wallet,
  type ClubSeason, type DraftPlayer, type Era, type FormationId, type League, type Lines, type MatchDay, type MatchResult, type Pick, type Prediction, type Pos, type SeasonResult, type Slot, type Variant,
} from "./draft.rules";

const surname = (name: string) => name.split(" ").slice(1).join(" ") || name;
const VARIANTS = ["budget", "classic", "knowledge"] as const;
const variantName = (c: DraftText, v: Variant) => (v === "knowledge" ? c.knowledge : v === "budget" ? c.budget : c.classic);
// Legends play with a smaller budget: the hint names the money the run will really have.
const variantHint = (c: DraftText, v: Variant, era: Era = "all") => (v === "knowledge" ? c.knowledgeHint : v === "budget" ? c.budgetHint(budgetFor(era)) : c.classicHint);
const euros = (m: number) => `€${m}M`;

/** A phone with the browser's bars showing: the pick screen tightens so everything still fits without scrolling. */
const SHORT_PHONE = "(max-height: 720px) and (max-width: 1023px)";
const watchShortPhone = (onChange: () => void) => { const q = window.matchMedia?.(SHORT_PHONE); q?.addEventListener("change", onChange); return () => q?.removeEventListener("change", onChange); };
const useShortPhone = () => useSyncExternalStore(watchShortPhone, () => window.matchMedia?.(SHORT_PHONE).matches ?? false, () => false);
const record = (s: SeasonResult) => `${s.w}–${s.d}–${s.l}`;
const POS_ORDER: Pos[] = ["GK", "DEF", "MID", "FWD"];
type PickerTab = Pos | "ALL";
const POS_CHIP: Record<Pos, string> = { GK: "bg-brand-yellow text-surface-page", DEF: "bg-brand-blue text-white", MID: "bg-brand-green text-white", FWD: "bg-brand-red-soft text-white" };

// ── Intro ──────────────────────────────────────────────────────────────────────────────────────────────────────────

export function DraftIntro({ locale, number, league, formation = "4-3-3", best, nextDaily, variant, onVariant, onDaily, onFree, onFriends, onExit, dailyLabel, guestNote, onSignIn, resumeLabel, onResume }: {
  /** The main button when today is already played, or for a guest (closed-day practice). */
  dailyLabel?: string; guestNote?: string | null; onSignIn?: () => void;
  /** An unfinished free draft waiting on the server. */
  resumeLabel?: string | null; onResume?: () => void;
  locale: string; number: number; league: League; formation?: FormationId; best?: string | null; nextDaily?: string | null; variant: Variant; onVariant: (v: Variant) => void;
  onDaily: () => void; onFree: () => void; onFriends: () => void; onExit: () => void;
}) {
  const c = draftCopy(locale);
  return (
    <div className="flex flex-1 flex-col">
      <TopBar brand={c.brand} exitLabel={c.exit} onExit={onExit} wrap />
      <div className="lg:mt-3 lg:grid lg:grid-cols-2 lg:gap-x-8">
      <div>
      <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-2xl bg-game-art-night lg:mt-0" aria-hidden>
        <Image src="/assets/demos/game-modes/football-draft.webp" alt="" fill sizes="(max-width: 1023px) 100vw, 480px" className="object-cover" priority />
      </div>
      <p className="mt-3 text-3xl font-black uppercase leading-none" style={poppins}>{c.brand[0]} <span className="text-brand-green-light">{c.brand[1]}</span></p>
      <p className="mt-2 text-sm font-bold text-white/60" style={poppins}>#{number} · {c.tag}</p>
      </div>
      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
      <div className="mt-4 grid grid-cols-3 gap-1.5 lg:mt-0" role="radiogroup" aria-label={VARIANTS.map((v) => variantName(c, v)).join(" / ")}>
        {VARIANTS.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={variant === v} onClick={() => onVariant(v)}
            className={cn("min-w-0 rounded-2xl px-2 py-2 text-left transition-colors", variant === v ? "bg-brand-green/15 ring-2 ring-brand-green" : "bg-white/[0.06] hover:bg-white/10")}>
            <span className="block text-[13px] font-black leading-tight" style={poppins}>{variantName(c, v)}</span>
            <span className="mt-0.5 block text-[11px] leading-tight text-white/60">{variantHint(c, v)}</span>
          </button>
        ))}
      </div>
      {variant === "budget" && <p className="mt-2 text-xs font-semibold leading-snug text-brand-yellow">{c.budgetRule}</p>}
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/[0.05] px-3 py-2.5">
        <Trophy className="size-5 shrink-0 text-brand-gold" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm"><span className="text-white/60">{c.leagueOfDay}: </span><span className="font-bold">{league.name}</span></p>
          <p className="text-xs text-white/70">{c.dailySetup(formation)} · {c.perfectTarget(league.games)}</p>
          {(best || nextDaily) && <p className="mt-0.5 text-xs font-semibold text-brand-green-light">{[best && c.personalBest(best), nextDaily && c.nextDaily(nextDaily)].filter(Boolean).join(" · ")}</p>}
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {resumeLabel && onResume && <QuietButton onClick={onResume}>{resumeLabel}</QuietButton>}
        <GreenButton onClick={onDaily}>{dailyLabel ?? c.playDaily}</GreenButton>
        {guestNote && <button type="button" onClick={onSignIn} className="w-full text-center text-xs font-semibold text-brand-green-light underline underline-offset-2">{guestNote}</button>}
        <div className="grid grid-cols-2 gap-2">
          <QuietButton onClick={onFree}>{c.freePlay}</QuietButton>
          <QuietButton onClick={onFriends}>{c.withFriends}</QuietButton>
        </div>
      </div>
      </div>
      <ul className="mt-5 space-y-2 pb-2 text-sm leading-snug text-white/85 lg:col-start-1">
        {c.rules.map((line) => <li key={line} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-green-light" />{line}</li>)}
      </ul>
      </div>
    </div>
  );
}

/** Free play and friends: choose what to play. The daily has no such screen because everyone plays the same setup. */
export interface DraftSetupValues { leagueId: string; era: Era; formation: FormationId; variant: Variant; seats: number }
const CHIP = "rounded-2xl px-3 py-2.5 text-sm font-black transition-colors";
const chipTone = (on: boolean) => (on ? "bg-brand-green/15 text-white ring-2 ring-brand-green" : "bg-surface-card text-white/85 hover:bg-white/10");

function SetupRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70" style={poppins}>{label}</legend>
      {children}
    </fieldset>
  );
}

export function DraftSetup({ locale, leagues, values, friends, onChange, onStart, onExit }: {
  locale: string; leagues: League[]; values: DraftSetupValues; friends: boolean; onChange: (v: DraftSetupValues) => void; onStart: () => void; onExit: () => void;
}) {
  const c = draftCopy(locale);
  const set = (patch: Partial<DraftSetupValues>) => onChange({ ...values, ...patch });
  const eras: [Era, string][] = [["all", c.allTime], ["modern", c.modern], ["legends", c.legends]];
  return (
    <div className="flex flex-1 flex-col">
      <TopBar brand={c.brand} exitLabel={c.exit} onExit={onExit} wrap />
      <h2 className="mt-4 text-2xl font-black uppercase" style={poppins}>{c.setupTitle}</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SetupRow label={c.setLeague}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {leagues.map((l) => <button key={l.id} type="button" aria-pressed={values.leagueId === l.id} onClick={() => set({ leagueId: l.id })} className={cn(CHIP, chipTone(values.leagueId === l.id))} style={poppins}>{l.name}</button>)}
          </div>
        </SetupRow>
        <SetupRow label={c.setEra}>
          <div className="grid grid-cols-3 gap-2">
            {eras.map(([e, label]) => <button key={e} type="button" aria-pressed={values.era === e} onClick={() => set({ era: e })} className={cn(CHIP, "px-1.5", chipTone(values.era === e))} style={poppins}>{label}</button>)}
          </div>
        </SetupRow>
        <SetupRow label={c.setFormation}>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(FORMATIONS) as FormationId[]).map((f) => (
              <button key={f} type="button" aria-pressed={values.formation === f} onClick={() => set({ formation: f })} className={cn("flex flex-col items-center gap-1.5 rounded-2xl p-2 text-xs font-black transition-colors", chipTone(values.formation === f))} style={poppins}>
                <FormationMark id={f} />{f}
              </button>
            ))}
          </div>
        </SetupRow>
        <SetupRow label={c.setMode}>
          <div className="grid grid-cols-3 gap-1.5">
            {VARIANTS.map((m) => (
              <button key={m} type="button" aria-pressed={values.variant === m} onClick={() => set({ variant: m })} className={cn("min-w-0 rounded-2xl px-2 py-2 text-left transition-colors", chipTone(values.variant === m))}>
                <span className="block text-[13px] font-black leading-tight" style={poppins}>{variantName(c, m)}</span>
                <span className="mt-0.5 block text-[11px] font-medium leading-tight text-white/70">{variantHint(c, m, values.era)}</span>
              </button>
            ))}
          </div>
        </SetupRow>
        {friends && (
          <SetupRow label={c.setPlayers}>
            <div className="grid grid-cols-5 gap-2">
              {[2, 3, 4, 5, 6].map((n) => <button key={n} type="button" aria-pressed={values.seats === n} onClick={() => set({ seats: n })} className={cn(CHIP, "px-0 tabular-nums", chipTone(values.seats === n))} style={poppins}>{n}</button>)}
            </div>
          </SetupRow>
        )}
      </div>
      {friends && <p className="mt-4 text-xs leading-snug text-white/80">{c.friendsRule}</p>}
      <div className="sticky -bottom-6 z-10 -mx-4 mt-auto bg-surface-page-alt px-4 pb-6 pt-3 lg:static lg:mx-0 lg:bg-transparent lg:px-0">
        <GreenButton onClick={onStart}>{c.start}</GreenButton>
      </div>
    </div>
  );
}

function FormationMark({ id }: { id: FormationId }) {
  return (
    <span aria-hidden className="relative block aspect-[3/4] w-full max-w-[3.25rem] overflow-hidden rounded-md bg-brand-green-deep">
      {FORMATIONS[id].map((s) => <span key={s.id} className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y}%` }} />)}
    </span>
  );
}

// ── Spin ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Two reels, slot-machine style: while spinning they roll through club names and seasons, then land with a bounce. */
export function SpinCard({ c, spin, league, spinning, armed, pool = [], tight }: { c: DraftText; spin: ClubSeason; league: League; spinning?: boolean; armed?: boolean; pool?: string[]; tight?: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!spinning) return;
    const t = setInterval(() => setTick((v) => v + 1), 70);
    return () => clearInterval(t);
  }, [spinning]);
  const rollingClub = pool.length ? pool[tick % pool.length] : "· · ·";
  const rollingSeason = `${1995 + ((tick * 7) % 31)}/${String((1996 + ((tick * 7) % 31)) % 100).padStart(2, "0")}`;
  return (
    <div className="grid grid-cols-[1fr_auto] items-stretch gap-2" aria-live="polite">
      <Reel label={c.club} value={armed ? "?" : spinning ? rollingClub : spin.club} spinning={spinning} sub={league.name} tone="blue" tight={tight} />
      <Reel label={c.season} value={armed ? "?" : spinning ? rollingSeason : spin.season} spinning={spinning} sub={!armed && spin.legend ? c.legendTag : undefined} tone="yellow" tight={tight} />
    </div>
  );
}

/** A long club name steps down a size, because one long word cannot wrap and would be cut off on a small phone. */
const reelSize = (value: string) => {
  const longestWord = Math.max(...value.split(" ").map((word) => word.length));
  return longestWord >= 13 ? "text-sm" : value.length > 20 ? "text-base" : "text-lg";
};

function Reel({ label, value, sub, spinning, tone, tight }: { label: string; value: string; sub?: string; spinning?: boolean; tone: "blue" | "yellow"; tight?: boolean }) {
  const blue = tone === "blue";
  return (
    <motion.div animate={spinning ? { y: [0, -1.5, 0] } : { y: 0, scale: [1, 1.04, 1] }} transition={spinning ? { repeat: Infinity, duration: 0.14 } : { duration: 0.35, ease: "easeOut" }}
      className={cn("relative min-w-0 overflow-hidden rounded-2xl px-3 shadow-lg", tight ? "py-1.5" : "py-2", blue ? "bg-brand-blue text-white" : "min-w-[6.25rem] bg-brand-yellow text-surface-page")}>
      <span aria-hidden className={cn("pointer-events-none absolute inset-x-0 top-0 h-1/2", blue ? "bg-white/10" : "bg-white/25")} />
      <p className={cn("relative text-[10px] font-bold uppercase tracking-[0.12em]", tight && "sr-only", blue ? "text-white/70" : "text-surface-page/70")} style={poppins}>{label}</p>
      <p className={cn("relative line-clamp-2 break-words font-black leading-tight", spinning ? "truncate text-lg blur-[0.6px]" : reelSize(value))} style={poppins}>{value}</p>
      {sub && !tight && <p className={cn("relative truncate text-[11px] font-semibold", blue ? "text-white/75" : "text-surface-page/75")}>{sub}</p>}
    </motion.div>
  );
}

// ── Pitch ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Rating tiers in brand colours: yellow stars, green good, blue the rest. */
export const tierBg = (r: number) => (r >= 85 ? "bg-brand-yellow text-surface-page" : r >= 75 ? "bg-brand-green text-white" : "bg-brand-blue text-white");

export function DraftPitch({ slots, picks, highlight = [], hideRatings, onSlot, onEmptySlot, className, academy, compact, goals, tight }: {
  slots: Slot[]; picks: (Pick | null)[]; highlight?: string[]; hideRatings?: boolean; onSlot?: (slotId: string) => void; className?: string; academy: string;
  /** Tapping an empty slot that is not highlighted (the phone picker jumps to that position). */
  onEmptySlot?: (slot: Slot) => void;
  /** Small side-by-side pitches: ratings only, no names. */
  compact?: boolean;
  /** The season view: the latest goal's minute above each scorer in the match on screen. */
  goals?: Record<string, number>;
  /** Short phones: smaller discs, names kept. */
  tight?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("relative w-full overflow-hidden rounded-2xl ring-1 ring-white/15", className ?? "aspect-[3/3.4]")}>
      {/* The Ranked 1.0 turf (the Auction pitch uses the same asset): goals top and bottom. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/stadium-green-vertical.webp" alt="" aria-hidden draggable={false} className="absolute inset-0 size-full object-fill" />
      <div aria-hidden className="absolute inset-0 bg-black/10" />
      {slots.map((slot, i) => {
        const p = picks[i];
        const lit = highlight.includes(slot.id);
        const r = p ? effective(p) : 0;
        const goal = goals?.[slot.id];
        const body = (
          <>
            {goal != null && <motion.span key={goal} initial={reduce ? false : { scale: 0.4, y: 6, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }} className="absolute inset-x-0 -top-4 z-10 mx-auto w-fit rounded-full bg-brand-green-light px-1.5 py-px text-[10px] font-black tabular-nums text-surface-page shadow" style={poppins}>{goal}&apos;</motion.span>}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={p ? p.player.id : "empty"} initial={reduce ? false : { scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 16 }}
                className={cn("mx-auto flex items-center justify-center rounded-full font-black tabular-nums shadow-[0_3px_10px_rgba(0,0,0,0.45)]", compact ? "size-7 text-[10px]" : tight ? "size-8 text-xs" : cn("size-10", !p && slot.label.length > 2 ? "text-[11px]" : "text-sm"),
                  p ? (p.academy ? "bg-white/30 text-white ring-2 ring-white/60" : cn(hideRatings ? "bg-brand-green text-white" : tierBg(r), "ring-2 ring-white"))
                    : lit ? "border-[3px] border-brand-yellow bg-brand-yellow/25 text-brand-yellow" : "border-2 border-dashed border-white/70 bg-black/25 text-white")} style={poppins}>
                {p ? (hideRatings ? "✓" : r) : slot.label}
              </motion.span>
            </AnimatePresence>
            {!compact && p && <span className={cn("mx-auto block max-w-full truncate rounded-full bg-black/60 px-1.5 py-px font-bold leading-tight text-white", tight ? "mt-0.5 text-[9px]" : "mt-1 text-[10px]")}>{p.academy ? academy : surname(p.player.name)}</span>}
          </>
        );
        const style = { left: `${slot.x}%`, top: `${slot.y}%` };
        return onSlot && lit
          ? <motion.button key={slot.id} type="button" onClick={() => onSlot(slot.id)} aria-label={slot.label} animate={reduce ? undefined : { scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}
              className="absolute z-10 w-[4.5rem] -translate-x-1/2 -translate-y-1/2 text-center" style={style}>{body}</motion.button>
          : onEmptySlot && !p
            ? <button key={slot.id} type="button" onClick={() => onEmptySlot(slot)} aria-label={slot.label} className="absolute w-[4.5rem] -translate-x-1/2 -translate-y-1/2 text-center" style={style}>{body}</button>
            : <div key={slot.id} className="absolute w-[4.5rem] -translate-x-1/2 -translate-y-1/2 text-center" style={style}>{body}</div>;
      })}
    </div>
  );
}

// ── Squad ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** What a card says about where the player would go: the slot, and the cost if it is not his position. */
function DestinationTag({ c, player, slots, picks, target }: { c: DraftText; player: DraftPlayer; slots: Slot[]; picks: (Pick | null)[]; target: string | null }) {
  const dest = destination(player, slots, picks, target);
  if (!dest) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums", dest.offPosition ? "bg-brand-yellow text-surface-page" : "bg-white/10 text-white/80")} style={poppins} title={dest.offPosition ? c.closePosition(dest.penalty) : undefined}>
      → {dest.slot.label}{dest.offPosition && ` −${dest.penalty}`}
    </span>
  );
}

const unavailable = (c: DraftText, p: DraftPlayer, picks: (Pick | null)[], by?: string) => (by ? c.takenBy(by) : inXi(p, picks) ? c.alreadyIn : c.noSlot);

function PosTabs({ c, players, slots, picks, taken, pos, onPos, maxPrice }: { c: DraftText; players: DraftPlayer[]; slots: Slot[]; picks: (Pick | null)[]; taken: { playerId: string; by: string }[]; pos: PickerTab; onPos: (p: PickerTab) => void; maxPrice: number | null }) {
  const signable = (p: DraftPlayer) => !taken.some((t) => t.playerId === p.id) && !!destination(p, slots, picks) && (maxPrice === null || priceOf(p) <= maxPrice);
  const tabs = POS_ORDER.map((at) => ({ at, open: slots.filter((x, i) => !picks[i] && x.pos === at).length, count: players.filter((p) => signable(p) && destination(p, slots, picks)?.slot.pos === at).length }));
  return (
    <div role="tablist" aria-label={c.squad} className="grid grid-cols-5 gap-1.5">
      <button type="button" role="tab" aria-selected={pos === "ALL"} onClick={() => onPos("ALL")}
        className={cn("flex h-10 items-center justify-center rounded-xl text-xs font-black transition-colors", pos === "ALL" ? "bg-white text-surface-page" : "bg-surface-card text-white/80")} style={poppins}>{c.all}</button>
      {tabs.map((t) => (
        <button key={t.at} type="button" role="tab" aria-selected={pos === t.at} onClick={() => onPos(t.at)} disabled={t.open === 0}
          className={cn("relative flex h-10 items-center justify-center gap-1 rounded-xl text-xs font-black transition-colors disabled:opacity-30", pos === t.at ? POS_CHIP[t.at] : "bg-surface-card text-white/80")} style={poppins}>
          {c.posShort[t.at]}<span className={cn("rounded-full px-1 text-[10px] tabular-nums", pos === t.at ? "bg-black/20" : "bg-white/10")}>{t.open === 0 ? "✓" : t.count}</span>
        </button>
      ))}
    </div>
  );
}

/** The tabs over one flat list: the best of every position at the top, and on a phone it scrolls inside its own box so the page stays still. */
export function SquadList({ c, players, slots, picks, taken, variant, pos, onPos, target, onSelect, onWhy, disabled, phone, shared, short, roomBelow, budget, onAcademy }: {
  c: DraftText; players: DraftPlayer[]; slots: Slot[]; picks: (Pick | null)[]; taken: { playerId: string; by: string }[]; variant: Variant;
  pos: PickerTab; onPos: (p: PickerTab) => void; target: string | null; onSelect: (id: string) => void; onWhy: (p: DraftPlayer) => void; disabled?: boolean; phone?: boolean; shared?: boolean; short?: boolean;
  /** A notice floats over the end of the phone list: the last rows must still scroll clear of it. */
  roomBelow?: boolean;
  /** Transfer budget: the seat's money, and signing a free academy kid into a chosen place. */
  budget?: number; onAcademy?: (slotId: string) => void;
}) {
  const hidden = variant === "knowledge";
  const reduce = useReducedMotion();
  const isTaken = (id: string) => taken.find((t) => t.playerId === id)?.by;
  const rated = (p: DraftPlayer) => destination(p, slots, picks, target)?.rating ?? p.rating;
  const maxPrice = variant === "budget" ? wallet(picks, budget ?? BUDGET.total).left : null;
  const openSlots = slots.filter((_, i) => !picks[i]);
  const academySlot = maxPrice === null ? null : openSlots.find((x) => x.id === target) ?? openSlots.find((x) => x.pos === pos) ?? openSlots[0] ?? null;
  const academyRow = academySlot && onAcademy && (
    <li key="academy">
      <button type="button" disabled={disabled} onClick={() => onAcademy(academySlot.id)} className={cn("flex w-full items-center gap-2.5 rounded-xl border border-dashed border-white/25 bg-surface-card/60 px-2.5 text-left hover:bg-brand-blue/25", phone ? "py-1" : "py-1.5")}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/20 text-sm font-black tabular-nums" style={poppins}>{ACADEMY_RATING}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold">{c.academyKid}</span>
        <span className="flex shrink-0 flex-col items-end gap-0.5"><span className="text-xs font-black text-brand-green-light" style={poppins}>{c.free}</span><span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-black text-white/80" style={poppins}>→ {academySlot.label}</span></span>
      </button>
    </li>
  );
  const fits = (p: DraftPlayer) => !isTaken(p.id) && !!destination(p, slots, picks);
  const tooDear = (p: DraftPlayer) => fits(p) && maxPrice !== null && priceOf(p) > maxPrice;
  const signable = (p: DraftPlayer) => fits(p) && !tooDear(p);
  const list = players.filter((p) => (pos === "ALL" ? fits(p) : (destination(p, slots, picks)?.slot.pos ?? p.pos) === pos))
    .sort((a, b) => Number(signable(b)) - Number(signable(a)) || (hidden ? a.name.localeCompare(b.name) : rated(b) - rated(a)));
  return (
    <div className={cn("space-y-2", disabled && "pointer-events-none opacity-60")}>
      <PosTabs c={c} players={players} slots={slots} picks={picks} taken={taken} pos={pos} onPos={onPos} maxPrice={maxPrice} />
      <ul key={`${pos}|${players[0]?.id ?? ""}`} className={cn("space-y-1", phone && (short ? "h-[max(9rem,calc(100dvh-31rem))]" : shared ? "h-[clamp(9rem,calc(100dvh-40.5rem),19rem)]" : "h-[clamp(9rem,calc(100dvh-38.75rem),19rem)]"), phone && roomBelow && "pb-14", phone && "overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden")}>
        {!list.some(signable) && academyRow}
        {list.map((p, i) => {
          const takenBy = isTaken(p.id);
          const open = signable(p);
          return (
            <motion.li key={p.id} initial={reduce ? false : { opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.2 }}>
              <div className={cn("flex items-center gap-2 rounded-xl px-2.5 transition-colors", phone ? "py-1" : "py-1.5", open ? "bg-surface-card/90 hover:bg-brand-blue/25" : "bg-white/[0.02] opacity-60")}>
                <button type="button" disabled={!open} onClick={() => onSelect(p.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:cursor-not-allowed">
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-black tabular-nums shadow-md", hidden ? "bg-brand-blue/40 text-white" : tierBg(rated(p)))} style={poppins}>{hidden ? "?" : rated(p)}</span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm font-bold", !open && "text-white/40 line-through decoration-white/30")}>{p.name}</span>
                    <span className="block truncate text-[11px] text-white/65">{tooDear(p) ? c.tooExpensive : !open ? unavailable(c, p, picks, takenBy) : hidden ? [p.pos, ...(p.alt ?? [])].map((x) => c.posShort[x]).join(" / ") : phone ? shortStat(c, p).join(" · ") : statLine(c, p)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    {maxPrice !== null && <span className={cn("text-xs font-black tabular-nums", tooDear(p) ? "text-brand-red-light" : "text-brand-yellow")} style={poppins}>{euros(priceOf(p))}</span>}
                    {open && <DestinationTag c={c} player={p} slots={slots} picks={picks} target={target} />}
                  </span>
                </button>
                {!hidden && <button type="button" onClick={() => onWhy(p)} aria-label={c.ratingWhy} className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/45 hover:bg-white/10 hover:text-white"><Info className="size-4" /></button>}
              </div>
            </motion.li>
          );
        })}
        {list.some(signable) && academyRow}
      </ul>
    </div>
  );
}

const csText = (c: DraftText, p: DraftPlayer) => `${p.cleanSheetsEstimated ? "≈ " : ""}${c.cs(p.cleanSheets)}`;

function shortStat(c: DraftText, p: DraftPlayer): string[] {
  if (p.pos === "GK") return [c.apps(p.apps), csText(c, p)];
  const made = p.assists === null ? [] : [c.assists(p.assists)];
  if (p.pos === "DEF") return [csText(c, p), [c.goals(p.goals), ...made].join(" · ")];
  return [c.goals(p.goals), ...made];
}

function statLine(c: DraftText, p: DraftPlayer) {
  const parts = [c.apps(p.apps)];
  if (p.pos === "GK" || p.pos === "DEF") parts.push(csText(c, p));
  if (p.pos !== "GK") { parts.push(c.goals(p.goals)); if (p.assists !== null) parts.push(c.assists(p.assists)); }
  return parts.join(" · ");
}

export function RatingSheet({ c, player, spin, teams, onClose }: { c: DraftText; player: DraftPlayer; spin: ClubSeason; teams: number; onClose: () => void }) {
  useEscape(onClose);
  const why = rateSeason({ ...player, finish: spin.finish, teams });
  const rows: [string, number][] = [[c.whyBase, why.base], [c.whyMinutes, why.minutes], [c.whyClub, why.club], [c.whyOutput, why.output]];
  if (why.legend) rows.push([c.whyLegend, why.legend]);
  const capped = why.total - (why.base + why.minutes + why.club + why.output + why.legend);
  if (capped !== 0) rows.push([c.whyCap, capped]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" role="dialog" aria-modal aria-label={c.ratingWhy} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-surface-card p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/50" style={poppins}>{c.ratingWhy}</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-brand-gold text-lg font-black text-surface-page" style={poppins}>{player.rating}</span>
          <div className="min-w-0"><p className="truncate font-black" style={poppins}>{player.name}</p><p className="text-xs text-white/70">{spin.club} · {spin.season} · {statLine(c, player)}</p></div>
        </div>
        <ul className="mt-4 space-y-1.5 text-sm">
          {rows.map(([label, v]) => <li key={label} className="flex justify-between rounded-lg bg-white/[0.05] px-3 py-2"><span className="text-white/75">{label}</span><span className="font-black tabular-nums">{label === c.whyBase ? v : v < 0 ? `−${-v}` : `+${v}`}</span></li>)}
        </ul>
        <QuietButton onClick={onClose} className="mt-4">{c.close}</QuietButton>
      </div>
    </div>
  );
}

// ── The draft board (solo, duel, room) ─────────────────────────────────────────────────────────────────────────────

export interface BoardSeat { name: string; avatar: AvatarCustomization | null; picks: (Pick | null)[]; me: boolean; active: boolean; note?: string | null }

export function DraftBoard({ locale, slots, spin, league, variant, round, seats, myPicks, taken, respins, respinCost, coins, mode, notice, spinning, armed = false, seconds, waitingFor, side, pool, feed = null, initialWhy = null, initialTeam = null, undoName = null, onUndo, onSpin, onPick, onRespin, onExit, budget = BUDGET.total, onAcademy }: {
  locale: string; slots: Slot[]; spin: ClubSeason; league: League; variant: Variant; round: number; seats: BoardSeat[]; myPicks: (Pick | null)[];
  taken: { playerId: string; by: string }[]; respins: number; respinCost: number | null; coins: number | null; mode: "daily" | "free" | "duel" | "room" | "challenge";
  notice: string | null; spinning?: boolean;
  /** Solo: the next spin is ready and waits for the player's own press. */
  armed?: boolean; onSpin?: () => void;
  seconds?: number | null; waitingFor?: string | null; side?: ReactNode;
  /** Club names the reel rolls through while spinning. */
  pool?: string[];
  /** The latest signing in a duel or room. */
  feed?: string | null;
  /** Playground only: open a state with a player's rating sheet, or a seat's team, open. */
  initialWhy?: string | null; initialTeam?: string | null;
  /** The signing that can still be taken back: the window closes when the reels land, so nobody can peek at the next squad. */
  undoName?: string | null; onUndo?: () => void;
  onPick: (playerId: string, slotId: string) => void; onRespin: (kind: "club" | "season") => void; onExit: () => void;
  budget?: number; onAcademy?: (slotId: string) => void;
}) {
  const c = draftCopy(locale);
  const hidden = variant === "knowledge";
  const [target, setTarget] = useState<string | null>(null);
  const [why, setWhy] = useState<DraftPlayer | null>(() => spin.players.find((p) => p.id === initialWhy) ?? null);
  const [pos, setPos] = useState<PickerTab>("ALL");
  const [teamSeat, setTeamSeat] = useState<string | null>(initialTeam);
  const openSeat = seats.find((x) => x.name === teamSeat) ?? null;
  // Looking at a rival must not cost the pick: the sheet shows the clock and closes itself with five seconds left.
  if (teamSeat && seconds != null && seconds <= 5) setTeamSeat(null);
  const filledCount = myPicks.filter(Boolean).length;
  const [seenKey, setSeenKey] = useState(`${spin.id}|${filledCount}`);
  if (seenKey !== `${spin.id}|${filledCount}`) { setSeenKey(`${spin.id}|${filledCount}`); setPos("ALL"); setTarget(null); }
  const shared = mode === "duel" || mode === "room";
  // The squad stays hidden until the reels land.
  const players = spinning || armed ? [] : spin.players;
  const targetSlot = slots.find((x) => x.id === target) ?? null;
  const choose = (id: string) => {
    const p = spin.players.find((x) => x.id === id);
    const dest = p && destination(p, slots, myPicks, target);
    if (dest) { onPick(id, dest.slot.id); setTarget(null); }
  };
  const money = variant === "budget" ? wallet(myPicks, budget) : null;
  const hint = armed ? c.spinHint : waitingFor ? c.rivalPicking(waitingFor) : targetSlot ? c.tapFor(targetSlot.label) : money ? c.perPlace(money.each, money.open) : c.tapPlayer;
  const short = useShortPhone();
  const purse = money;
  // On a short phone a duel or room gets one status line, so the board does not jump between turns.
  const status = short && shared ? (waitingFor ? hint : feed) : feed;
  return (
    <div className={cn("flex flex-1 flex-col", short && "-mb-3")}>
      <TopBar brand={c.brand} exitLabel={c.exit} onExit={onExit} wrap seconds={seconds ?? null}
        right={<span className="flex shrink-0 flex-col items-end text-xs font-bold leading-tight text-white/70 tabular-nums" style={poppins}>
          {purse && <span className="text-sm font-black text-brand-yellow">{euros(purse.left)}{short && <span className="ml-1 text-[10px] font-bold text-white/70">{c.eachPlace(purse.each)}</span>}</span>}
          {shared ? c.round(round + 1) : c.pickN(Math.min(XI, round + 1), XI)}
        </span>} />
      <ProgressStrip picks={myPicks} hidden={hidden} />
      {shared && (
        <>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {seats.map((x) => <SeatChip key={x.name} seat={x} slots={slots} c={c} hidden={hidden} tight={short} onOpen={() => setTeamSeat(x.name)} />)}
          </div>
          {short
            ? <p role="status" className="h-4 truncate text-center text-xs font-semibold text-brand-green-light">{status}</p>
            : status && <p role="status" className="mt-1 line-clamp-2 text-center text-xs font-semibold text-brand-green-light">{status}</p>}
        </>
      )}
      <div className="mt-2 grid grid-cols-1 gap-3 lg:mt-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-4">
        <div className="min-w-0 space-y-2.5 lg:sticky lg:top-3 lg:space-y-3">
          <SpinCard c={c} spin={spin} league={league} spinning={spinning} armed={armed} pool={pool} tight={short} />
          <DraftPitch slots={slots} picks={myPicks} highlight={target ? [target] : []} hideRatings={hidden} academy={c.academy} tight={short} className={short ? "h-[14.5rem]" : "aspect-[4/3.25] lg:aspect-[3/3.4]"}
            onSlot={() => setTarget(null)} onEmptySlot={(slot) => { setPos(slot.pos); setTarget(slot.id); }} />
          {armed && <p className="pb-20 text-center text-sm font-semibold text-white/70 lg:pb-0">{c.spinHint}</p>}
          {armed && onSpin && (
            <div className="fixed inset-x-0 bottom-4 z-30 px-4 lg:static lg:px-0">
              <GreenButton onClick={onSpin} className="flex items-center justify-center gap-2"><RefreshCw className="size-5" aria-hidden />{c.spin}</GreenButton>
            </div>
          )}
          <div className={cn("lg:hidden", armed && "hidden")}>
            <p className={cn("mb-1.5 text-center text-[11px] font-semibold text-white/70", short && "hidden")} aria-live="polite">{hint}</p>
            <SquadList phone shared={shared} short={short} roomBelow={!!notice} budget={budget} onAcademy={armed || spinning || waitingFor ? undefined : onAcademy} c={c} players={players} slots={slots} picks={myPicks} taken={taken} variant={variant} pos={pos} onPos={(at) => { setPos(at); setTarget(null); }}
              target={target} onSelect={choose} onWhy={setWhy} disabled={!!waitingFor || spinning} />
          </div>
          {!shared && !armed && (
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                {(["club", "season"] as const).map((kind) => (
                  <motion.button key={kind} type="button" aria-label={kind === "club" ? c.newClub : c.newSeason} whileTap={{ scale: 0.96 }} onClick={() => onRespin(kind)} disabled={spinning || (respins === 0 && respinCost === null)}
                    className={cn("flex min-w-0 items-center justify-center gap-1.5 rounded-full bg-brand-blue px-2 text-xs font-black uppercase text-white shadow-lg hover:bg-brand-blue/90 disabled:opacity-40", short ? "h-9" : "h-10")} style={poppins}>
                    <RefreshCw className={cn("size-3.5 shrink-0", spinning && "animate-spin")} aria-hidden /><span>{kind === "club" ? c.newClub : c.newSeason}</span>
                  </motion.button>
                ))}
              </div>
              <p className="flex flex-wrap items-center justify-center gap-x-2 text-[11px] font-semibold text-white/75">
                <span className="font-black text-white" style={poppins}>{respins > 0 ? c.respinsLeft(respins) : respinCost !== null ? c.respinCoins(respinCost) : c.respinsLeft(0)}</span>
                <span>{c.respinShared}</span>
                {coins !== null && <span className="inline-flex items-center gap-1 font-black text-brand-yellow tabular-nums" style={poppins}><Coins className="size-3.5" aria-hidden />{coins}</span>}
              </p>
            </div>
          )}
          {notice && <p role="status" className={cn("fixed inset-x-4 z-30 rounded-xl bg-surface-card px-3 py-2 text-xs font-semibold text-white shadow-xl ring-1 ring-brand-yellow/60 lg:static lg:shadow-none", shared ? "bottom-4" : "bottom-[5.5rem]")}>{notice}</p>}
          {side}
        </div>
        <div className="hidden lg:block">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-black uppercase" style={poppins}>{c.squad}</h2>
            <p className="text-xs text-white/70">{hint}</p>
          </div>
          <SquadList budget={budget} onAcademy={armed || spinning || waitingFor ? undefined : onAcademy} c={c} players={players} slots={slots} picks={myPicks} taken={taken} variant={variant} pos={pos} onPos={(at) => { setPos(at); setTarget(null); }} target={target} onSelect={choose} onWhy={setWhy} disabled={!!waitingFor || spinning} />
        </div>
      </div>
      {/* No exit animation: a button still fading out could be pressed after the next squad is on screen. */}
      {undoName && onUndo && (
        <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.15 }} className={cn("pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4", armed ? "bottom-20 lg:bottom-4" : "bottom-4")} role="status">
          <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-white py-1.5 pl-4 pr-1.5 text-sm font-bold text-surface-page shadow-xl">
            <span className="min-w-0 truncate">{c.signed(surname(undoName))}</span>
            <button type="button" onClick={onUndo} className="shrink-0 rounded-full bg-brand-blue px-3 py-1.5 text-xs font-black uppercase text-white" style={poppins}>{c.undo}</button>
          </div>
        </motion.div>
      )}
      {openSeat && <TeamSheet c={c} name={openSeat.me ? c.you : openSeat.name} slots={slots} picks={openSeat.picks} hidden={hidden} seconds={seconds} onClose={() => setTeamSeat(null)} />}
      {why && <RatingSheet c={c} player={why} spin={spin} teams={league.teams} onClose={() => setWhy(null)} />}
    </div>
  );
}

/** Eleven segments, one per pick, filled in the signing's tier colour. */
function ProgressStrip({ picks, hidden }: { picks: (Pick | null)[]; hidden: boolean }) {
  const done = picks.filter((p): p is Pick => !!p);
  return (
    <div className="mt-2 grid grid-cols-11 gap-1" aria-hidden>
      {picks.map((_, i) => {
        const p = done[i];
        return <motion.span key={i} initial={false} animate={{ scaleY: p ? 1 : 0.6 }} className={cn("h-1.5 origin-bottom rounded-full", p ? (hidden ? "bg-brand-green" : p.academy ? "bg-white/40" : tierBg(effective(p)).split(" ")[0]) : "bg-white/15")} />;
      })}
    </div>
  );
}

function SeatChip({ seat, slots, c, hidden, tight, onOpen }: { seat: BoardSeat; slots: Slot[]; c: DraftText; hidden: boolean; tight?: boolean; onOpen: () => void }) {
  const team = lines(slots, seat.picks);
  const n = seat.picks.filter(Boolean).length;
  const self = useRef<HTMLButtonElement | null>(null);
  // With six seats most chips are off screen on a phone: keep whoever is picking in view.
  useEffect(() => { if (seat.active) self.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }, [seat.active]);
  return (
    <button ref={self} type="button" onClick={onOpen} aria-label={c.teamOf(seat.me ? c.you : seat.name)} className={cn("flex min-w-[8.5rem] flex-1 items-center gap-2 rounded-2xl px-2.5 text-left", tight ? "py-1" : "py-2", seat.active ? (seat.me ? "bg-brand-green/15 ring-2 ring-brand-green" : "bg-brand-blue/25 ring-2 ring-brand-blue") : "bg-surface-card")}>
      {seat.avatar ? <DuelAvatar customization={seat.avatar} size="xs" /> : <span className="size-8 rounded-full bg-white/15" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-white/80">{seat.me ? c.you : seat.name}{seat.note ? ` · ${seat.note}` : ""}</span>
        <span className="block text-lg font-black leading-none tabular-nums" style={poppins}>{hidden ? `${n}/11` : <>{n ? Math.round(team.overall) : "–"}<span className="ml-1 text-[10px] font-bold text-white/70">{n}/11</span></>}</span>
      </span>
    </button>
  );
}

/** Anyone's XI, from a seat chip or the final table: seeing each other's teams is what starts the arguing. */
export function TeamSheet({ c, name, slots, picks, hidden, seconds, onPlay, onClose }: { c: DraftText; name: string; slots: Slot[]; picks: (Pick | null)[]; hidden?: boolean; seconds?: number | null; onPlay?: () => void; onClose: () => void }) {
  useEscape(onClose);
  const team = lines(slots, picks);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" role="dialog" aria-modal aria-label={c.teamOf(name)} onClick={onClose}>
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface-card p-4 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="min-w-0 text-sm font-black uppercase" style={poppins}>{c.teamOf(name)}</h2>
          {!hidden && picks.some(Boolean) && <span className="shrink-0 text-xs font-bold text-white/80">{c.teamRating} <span className="text-lg font-black tabular-nums text-white" style={poppins}>{Math.round(team.overall)}</span></span>}
        </div>
        {seconds != null && <p role="timer" className="mt-2 rounded-xl bg-brand-yellow px-3 py-1.5 text-center text-xs font-black text-surface-page" style={poppins}>{c.yourTurn} · {seconds} s</p>}
        <DraftPitch slots={slots} picks={picks} hideRatings={hidden} academy={c.academy} className="mt-3 aspect-[4/3.6]" />
        <ul className="mt-3 space-y-1 text-sm">
          {slots.map((slot, i) => {
            const p = picks[i];
            return p && !p.academy ? <li key={slot.id} className="flex items-baseline gap-2"><span className="w-8 shrink-0 text-xs font-black text-white/70" style={poppins}>{slot.label}</span><span className="min-w-0 flex-1 truncate font-semibold">{p.player.name}</span><span className="shrink-0 text-xs text-white/70">{p.club} {p.season}</span>{p.price != null && <span className="shrink-0 text-xs font-black text-brand-yellow tabular-nums">{euros(p.price)}</span>}</li> : null;
          })}
        </ul>
        {onPlay && <GreenButton onClick={onPlay} className="mt-3">{c.playThem}</GreenButton>}
        <QuietButton onClick={onClose} className="mt-3">{c.close}</QuietButton>
      </div>
    </div>
  );
}

/** The XI complete, before the season: a moment to look at it, take back the last signing, and press play. */
export function XiReady({ locale, slots, picks, variant, undoName, onUndo, onPlay, onExit, budget = BUDGET.total, prediction = null, notice = null }: {
  locale: string; slots: Slot[]; picks: (Pick | null)[]; variant: Variant; undoName?: string | null; onUndo?: () => void; onPlay: () => void; onExit: () => void; budget?: number;
  /** Why the XI is complete when the last squads had nobody to sign and academy kids filled it. */
  notice?: string | null;
  /** Not in Ball Knowledge: it would give the hidden ratings away. */
  prediction?: Prediction | null;
}) {
  const c = draftCopy(locale);
  const hidden = variant === "knowledge";
  const short = useShortPhone();
  return (
    <div className="flex flex-1 flex-col">
      <TopBar brand={c.brand} exitLabel={c.exit} onExit={onExit} wrap />
      <h2 className={cn("text-center font-black uppercase", short ? "mt-2 text-xl" : "mt-4 text-2xl")} style={poppins}>{c.xiReady}</h2>
      {notice && <p role="status" className="mt-2 rounded-xl bg-surface-card px-3 py-2 text-center text-xs font-semibold text-white ring-1 ring-brand-yellow/60">{notice}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <DraftPitch slots={slots} picks={picks} hideRatings={hidden} academy={c.academy} tight={short} className={short ? "h-[14.5rem]" : "aspect-[4/3.6]"} />
        {!hidden && <LineBars c={c} team={lines(slots, picks)} />}
      </div>
      {variant === "budget" && <p className="mt-3 text-center text-sm font-black text-brand-yellow" style={poppins}>{c.spent(spentOn(picks), budget)}</p>}
      {prediction && !hidden && <p className="mt-2 text-center text-sm font-semibold text-white/85">{c.forecast(prediction.position, prediction.points, prediction.titlePct)}</p>}
      <div className="mt-auto space-y-2 pt-4">
        {undoName && onUndo && <QuietButton onClick={onUndo}>{c.undo}: {surname(undoName)}</QuietButton>}
        <GreenButton onClick={onPlay}>{c.playSeason}</GreenButton>
      </div>
    </div>
  );
}

// ── Season ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const MINUTES = 90;
/** The match clock: reaches the whistle just before the match leaves the screen, so the final score can be read. */
function useMatchMinute(round: number, ms: number, final: boolean): number {
  const reduce = useReducedMotion();
  const [clock, setClock] = useState({ round, minute: 0 });
  useEffect(() => {
    if (final || reduce) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const minute = Math.min(MINUTES, Math.floor(((now - start) / (ms * 0.85)) * MINUTES));
      setClock((c) => (c.round === round && c.minute === minute ? c : { round, minute }));
      if (minute < MINUTES) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [round, ms, final, reduce]);
  if (final || reduce) return MINUTES;
  return clock.round === round ? clock.minute : 0;
}

function FormStrip({ season, played, live }: { season: SeasonResult; played: number; live: number | null }) {
  return (
    <div aria-hidden className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.ceil(season.games / 2)}, minmax(0, 1fr))` }}>
      {season.matches.map((m, i) => (
        <span key={m.round} className={cn("h-2 rounded-sm transition-colors", i < played ? (m.gf > m.ga ? "bg-brand-green" : m.gf === m.ga ? "bg-white/55" : "bg-brand-red-soft") : i === live ? "animate-pulse bg-brand-yellow" : "bg-white/10")} />
      ))}
    </div>
  );
}

export function SeasonTicker({ locale, seed, season, slots, picks, variant, upTo, matchTime, holding = false, onGoal, onSkip }: {
  locale: string; seed: string; season: SeasonResult; slots: Slot[]; picks: (Pick | null)[]; variant: Variant; upTo: number;
  /** How long the match on screen lasts. */
  matchTime: number;
  /** Stay on the match that just ended the perfect run. */
  holding?: boolean;
  onGoal?: (mine: boolean) => void;
  onSkip: () => void;
}) {
  const c = draftCopy(locale);
  const over = upTo >= season.games;
  const final = holding || over;
  const live = season.matches[final ? Math.max(0, upTo - 1) : upTo];
  const minute = useMatchMinute(live.round, matchTime, final);
  const allGoals = useMemo(() => matchGoals(seed, live, slots, picks), [seed, live, slots, picks]);
  const goals = allGoals.filter((g) => g.minute <= minute);
  const mine = goals.filter((g) => g.mine), theirs = goals.filter((g) => !g.mine);
  const heard = useRef({ round: 0, count: 0 });
  useEffect(() => {
    if (final) return;
    if (heard.current.round !== live.round) heard.current = { round: live.round, count: 0 };
    for (const g of goals.slice(heard.current.count)) onGoal?.(g.mine);
    heard.current.count = goals.length;
  }, [goals, live.round, final, onGoal]);
  const badges: Record<string, number> = {};
  for (const g of mine) if (g.slotId) badges[g.slotId] = g.minute;
  const nameOf = (slotId: string | null) => {
    const p = picks[slots.findIndex((x) => x.id === slotId)];
    return !p || p.academy ? c.academy : surname(p.player.name);
  };
  const played = season.matches.slice(0, upTo);
  const w = played.filter((m) => m.gf > m.ga).length, d = played.filter((m) => m.gf === m.ga).length, l = played.length - w - d;
  const firstDrop = season.matches.find((m) => m.gf <= m.ga);
  const dropped = firstDrop && upTo >= firstDrop.round ? firstDrop : null;
  const whistle = minute >= MINUTES;
  const race = season.race?.[Math.min(upTo, season.games) - 1];
  return (
    <div className="flex flex-1 flex-col gap-2.5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:pt-4">
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-brand-blue to-surface-card px-4 py-2">
          <p className="min-w-0 text-[11px] font-black uppercase leading-tight tracking-wide text-white/80 tabular-nums" style={poppins}>{c.matchweek(live.round, season.games)}</p>
          <div className="flex shrink-0 items-baseline gap-3 tabular-nums" style={poppins}>
            {([[w, c.w, "text-brand-green-light"], [d, c.d, "text-white"], [l, c.l, "text-brand-red-light"]] as const).map(([v, label, tone]) => (
              <span key={label} className={cn("text-2xl font-black leading-none", tone)}>{v}<span className="ml-0.5 text-[10px] font-bold text-white/60">{label}</span></span>
            ))}
            <span className="text-sm font-black text-white/80">{w * 3 + d} {c.pts}</span>
          </div>
        </div>
        <FormStrip season={season} played={upTo} live={final ? null : upTo} />
        <div aria-live="polite" className="flex min-h-6 justify-center">
          {played.length > 0 && (holding && dropped
            ? <motion.p key="ended" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-full rounded-2xl bg-brand-red-soft px-3 py-1 text-center text-xs font-black text-white" style={poppins}>{c.runEnded(dropped.round, `${dropped.gf}–${dropped.ga}`, `${dropped.home ? c.vs : "@"} ${dropped.opponent.name}`)}</motion.p>
            : !dropped
              ? <p className="max-w-full rounded-2xl bg-brand-yellow px-3 py-1 text-center text-xs font-black text-surface-page tabular-nums" style={poppins}>{c.stillPerfect(played.length)}</p>
              : race && <p className={cn("max-w-full rounded-2xl px-3 py-1 text-center text-xs font-black tabular-nums", race.position === 1 ? "bg-brand-green text-white" : "bg-surface-card text-white")} style={poppins}>{race.position === 1 ? c.raceTop(race.gap, race.leader) : c.raceOff(race.position, race.gap, race.leader)}</p>)}
        </div>
        <div className="rounded-2xl bg-surface-card px-3 py-2.5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <p className="truncate text-sm font-black" style={poppins}>{c.you}</p>
            <div className="text-center">
              <p className="text-3xl font-black leading-none tabular-nums" style={poppins}>{mine.length}–{theirs.length}</p>
              <p className={cn("mt-1 inline-block rounded px-1.5 text-[10px] font-black tabular-nums", whistle ? "bg-white/15 text-white" : "bg-brand-green-light text-surface-page")} style={poppins}>{whistle ? c.ft : `${minute}'`}</p>
            </div>
            <p className="line-clamp-2 text-right text-sm font-bold leading-tight text-white/85">{live.home ? c.vs : "@"} {live.opponent.name}</p>
          </div>
          <div className="mt-1.5 grid h-8 grid-cols-2 gap-3 overflow-hidden text-[11px] font-semibold leading-4">
            <p className="text-brand-green-light">{mine.slice(-2).map((g) => <span key={g.minute} className="block truncate tabular-nums">{g.minute}&apos; {nameOf(g.slotId)}</span>)}</p>
            <p className="text-right text-brand-red-light tabular-nums">{theirs.slice(-2).map((g) => <span key={g.minute} className="block">{g.minute}&apos;</span>)}</p>
          </div>
        </div>
        <ol className="hidden space-y-1 text-sm [@media(min-height:800px)]:block lg:block">
          {played.slice(-6).reverse().map((m, i) => <SeasonRow key={m.round} c={c} m={m} desktopOnly={i >= 2} />)}
        </ol>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 lg:flex-none">
        <DraftPitch slots={slots} picks={picks} hideRatings={variant === "knowledge"} academy={c.academy} goals={badges} className="min-h-[13rem] flex-1 lg:aspect-[3/3.4] lg:flex-none" />
        <QuietButton onClick={onSkip}>{c.skip}</QuietButton>
      </div>
    </div>
  );
}

function SeasonRow({ c, m, desktopOnly }: { c: DraftText; m: MatchResult; desktopOnly: boolean }) {
  return (
    <motion.li initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }} className={cn("items-center gap-2 rounded-xl bg-surface-card/80 px-3 py-1.5", desktopOnly ? "hidden lg:flex" : "flex")}>
      <span className={cn("flex size-5 items-center justify-center rounded text-[10px] font-black", m.gf > m.ga ? "bg-brand-green text-surface-page" : m.gf === m.ga ? "bg-white/20" : "bg-brand-red-soft text-surface-page")} style={poppins}>{m.gf > m.ga ? c.w : m.gf === m.ga ? c.d : c.l}</span>
      <span className="min-w-0 flex-1 truncate">{m.home ? c.vs : "@"} {m.opponent.name}</span>
      <span className="font-black tabular-nums" style={poppins}>{m.gf}–{m.ga}</span>
    </motion.li>
  );
}

/** Who did what in the season just watched: built from the same goals the season showed. */
function SeasonAwards({ c, seed, season, slots, picks }: { c: DraftText; seed: string; season: SeasonResult; slots: Slot[]; picks: (Pick | null)[] }) {
  const stats = useMemo(() => seasonStats(seed, season, slots, picks), [seed, season, slots, picks]);
  const nameOf = (slotId: string) => { const p = picks[slots.findIndex((x) => x.id === slotId)]; return !p || p.academy ? c.academy : p.player.name; };
  const keeper = picks[slots.findIndex((x) => x.pos === "GK")];
  const award = (label: string, who: string, value: string) => (
    <div className="min-w-0 rounded-xl bg-black/20 px-2.5 py-2">
      <p className="truncate text-[10px] font-bold uppercase tracking-wide text-brand-yellow" style={poppins}>{label}</p>
      <p className="truncate text-sm font-bold">{who}</p>
      <p className="text-xs text-white/70">{value}</p>
    </div>
  );
  const ranked = stats.players.filter((x) => x.goals + x.assists > 0).sort((a, b) => b.goals - a.goals || b.assists - a.assists);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {stats.topScorer && award(c.goldenBoot, nameOf(stats.topScorer.slotId), c.goals(stats.topScorer.goals))}
        {stats.topAssists && award(c.topAssists, nameOf(stats.topAssists.slotId), c.assists(stats.topAssists.assists))}
        {award(c.goldenGlove, !keeper || keeper.academy ? c.academy : keeper.player.name, c.cs(stats.cleanSheets))}
      </div>
      <Expandable title={c.playerStats}>
        <ol className="space-y-0.5 text-sm">
          {ranked.map((x) => (
            <li key={x.slotId} className="flex items-center gap-2 rounded-lg px-2 py-1">
              <span className="min-w-0 flex-1 truncate">{nameOf(x.slotId)}</span>
              <span className="shrink-0 text-xs text-white/80 tabular-nums">{c.goals(x.goals)} · {c.assists(x.assists)}</span>
            </li>
          ))}
        </ol>
      </Expandable>
    </div>
  );
}

/** The result of a Transfer budget draft: where the money went. */
function BudgetSummary({ c, picks, total }: { c: DraftText; picks: (Pick | null)[]; total: number }) {
  const bought = picks.filter((p): p is Pick => !!p && !p.academy && p.price != null);
  if (!bought.length) return null;
  const biggest = bought.reduce((a, b) => (b.price! > a.price! ? b : a));
  // A bargain is a good player for little money, not just the cheapest kid: only those at or above the XI's own level count.
  const level = bought.reduce((sum, p) => sum + effective(p), 0) / bought.length;
  const good = bought.filter((p) => p !== biggest && effective(p) >= level);
  const value = good.length ? good.reduce((a, b) => (b.price! < a.price! ? b : a)) : null;
  const row = (label: string, p: Pick) => (
    <p className="mt-1 flex items-baseline gap-2 text-sm"><span className="w-24 shrink-0 text-xs font-bold text-white/70">{label}</span><span className="min-w-0 flex-1 truncate font-bold">{p.player.name} {effective(p)}</span><span className="shrink-0 font-black text-brand-yellow tabular-nums" style={poppins}>{euros(p.price!)}</span></p>
  );
  return (
    <div className="rounded-2xl bg-surface-card px-4 py-3">
      <p className="text-sm font-black text-brand-yellow" style={poppins}>{c.spent(spentOn(picks), total)}</p>
      {row(c.biggestBuy, biggest)}
      {value && row(c.bestValue, value)}
    </div>
  );
}

export const beatsTarget = (season: SeasonResult, t: ChallengeTarget) => season.points - t.points || (season.gf - season.ga) - (t.gf - t.ga) || season.gf - t.gf;

export function SeasonResultView({ locale, number, season, slots, picks, league, variant, coinsEarned, ranked, leaderboard, shareLink, challenge, newBest, nextDaily, initialShare = false, onPlayTarget, seed, prediction = null, budget = BUDGET.total, onShare, onAgain, onFriends, onChallenge, onExit }: {
  locale: string; number: number; season: SeasonResult; slots: Slot[]; picks: (Pick | null)[]; league: League; variant: Variant; coinsEarned: number; ranked: boolean;
  leaderboard?: ReactNode; shareLink: string; challenge?: ChallengeTarget | null; newBest?: boolean; nextDaily?: string | null; initialShare?: boolean; onPlayTarget?: () => void; seed?: string; prediction?: Prediction | null; budget?: number; onShare: (text: string) => void; onAgain: () => void; onFriends: () => void; onChallenge?: () => void; onExit: () => void;
}) {
  const c = draftCopy(locale);
  const team = lines(slots, picks);
  const losses = season.matches.filter((m) => m.reason).slice(0, 4);
  const perfect = season.finish === "perfect";
  const modeName = variantName(c, variant);
  const versus = challenge ? beatsTarget(season, challenge) : 0;
  const targetRecord = challenge ? `${challenge.w}–${challenge.d}–${challenge.l}` : "";
  const [sharing, setSharing] = useState(initialShare);
  const shareText = c.shareText(number, record(season), shareSquares(picks), c.finish[season.finish], modeName, shareLink);
  return (
    <div className="flex flex-1 flex-col">
      <TopBar brand={c.brand} exitLabel={c.exit} onExit={onExit} wrap />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          {challenge && (
            <p role="status" className={cn("rounded-2xl px-4 py-3 text-center text-sm font-black", versus > 0 ? "bg-brand-green text-white" : versus < 0 ? "bg-surface-card text-white ring-1 ring-brand-red-soft" : "bg-brand-yellow text-surface-page")} style={poppins}>
              {versus > 0 ? c.challengeWon(challenge.from, targetRecord) : versus < 0 ? c.challengeLost(challenge.from, targetRecord) : c.challengeLevel(challenge.from, targetRecord)}
            </p>
          )}
          <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className={cn("relative overflow-hidden rounded-3xl px-5 py-5 text-center shadow-xl", perfect ? "bg-brand-yellow text-surface-page" : "bg-gradient-to-br from-brand-blue to-surface-card text-white")}>
            {(perfect || season.finish === "champions") && <Confetti />}
            <p className={cn("text-xs font-bold uppercase tracking-[0.12em]", perfect ? "text-surface-page/70" : "text-white/70")} style={poppins}>{league.name} · {c.record}</p>
            <p className="mt-1 flex items-baseline justify-center gap-1 text-6xl font-black tabular-nums leading-none" style={poppins}>
              <CountUp to={season.w} className={perfect ? "" : "text-brand-green-light"} /><span className="opacity-50">–</span><CountUp to={season.d} /><span className="opacity-50">–</span><CountUp to={season.l} className={perfect ? "" : "text-brand-red-light"} />
            </p>
            <p className={cn("mt-1 text-[11px] font-bold", perfect ? "text-surface-page/60" : "text-white/70")}>{c.w} · {c.d} · {c.l} · {season.points} {c.pts}</p>
            <motion.p initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.9 }}
              className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black", perfect ? "bg-surface-page text-brand-yellow" : season.finish === "champions" ? "bg-brand-yellow text-surface-page" : season.finish === "relegation" ? "bg-brand-red-soft text-white" : season.finish === "europe" ? "bg-brand-green text-white" : "bg-white/15")} style={poppins}>
              {(perfect || season.finish === "champions") && <Crown className="size-4" aria-hidden />}{c.finish[season.finish]} · {c.position(season.position)}
            </motion.p>
            {coinsEarned > 0 && <motion.p initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.2, type: "spring" }} className={cn("mt-3 flex items-center justify-center gap-1.5 text-sm font-black", perfect ? "text-surface-page" : "text-brand-yellow")} style={poppins}><Coins className="size-4" aria-hidden />{c.coinsEarned(coinsEarned)}</motion.p>}
            {newBest && <p className={cn("mt-2 text-sm font-black", perfect ? "text-surface-page" : "text-brand-green-light")} style={poppins}>{c.newBest}</p>}
            {nextDaily && <p className={cn("mt-1 text-xs font-semibold", perfect ? "text-surface-page/70" : "text-white/70")}>{c.nextDaily(nextDaily)}</p>}
          </motion.div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <GreenButton onClick={() => setSharing(true)} className="flex items-center justify-center gap-2"><Share2 className="size-4" aria-hidden />{c.share}</GreenButton>
              <QuietButton onClick={onAgain} className="h-14">{c.again}</QuietButton>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {onChallenge && <QuietButton onClick={onChallenge}>{c.challengeFriend}</QuietButton>}
              <QuietButton onClick={onFriends} className={onChallenge ? undefined : "col-span-2"}>{c.withFriends}</QuietButton>
            </div>
          </div>
          {variant === "knowledge" && <PicksReveal c={c} slots={slots} picks={picks} />}
          {variant === "budget" && <BudgetSummary c={c} picks={picks} total={budget} />}
          {prediction && (
            <div className="rounded-2xl bg-surface-card px-4 py-3 text-sm">
              <p className="font-semibold text-white/85">{c.forecast(prediction.position, prediction.points, prediction.titlePct)}</p>
              <p className={cn("mt-0.5 font-black", season.points >= prediction.points ? "text-brand-green-light" : "text-brand-red-light")} style={poppins}>{c.againstForecast(season.points - prediction.points)}</p>
            </div>
          )}
          {seed && <SeasonAwards c={c} seed={seed} season={season} slots={slots} picks={picks} />}
          {challenge && onPlayTarget && <GreenButton onClick={onPlayTarget}>{c.playMatch}</GreenButton>}
          {season.weak && (
            <div className="rounded-2xl bg-surface-card px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-red-light" style={poppins}>{c.weakLink}</p>
              <p className="mt-0.5 text-sm">{c.weakLinkLine(season.weak)}</p>
            </div>
          )}
          {losses.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/70" style={poppins}>{c.losses}</p>
              <ul className="space-y-1.5">
                {losses.map((m) => (
                  <li key={m.round} className="rounded-xl bg-surface-card px-3 py-2 text-sm">
                    <span className="font-black tabular-nums" style={poppins}>{m.gf}–{m.ga}</span> <span className="text-white/70">{m.home ? c.vs : "@"} {m.opponent.name}</span>
                    <span className="block text-xs text-white/75">{m.reason && c.reason(m.reason, m.opponent.name)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <LineBars c={c} team={team} />
          <SeasonDetails c={c} season={season} />
        </div>
        <div className="min-w-0 space-y-4">
          <DraftPitch slots={slots} picks={picks} academy={c.academy} />
          {challenge && <ChallengeCompare c={c} slots={slots} mine={picks} target={challenge} />}
          {ranked && leaderboard}
        </div>
      </div>
      {sharing && (
        <ShareSheet c={c} text={shareText} defaultNames={!ranked && !onChallenge} onClose={() => setSharing(false)} onDone={() => onShare(shareText)}
          data={{ brand: c.brand, number, league: league.name, mode: modeName, record: record(season), finish: c.finish[season.finish], position: c.position(season.position), perfect, slots, picks, academy: c.academy, cta: c.shareCta, link: shareLink }} />
      )}
    </div>
  );
}

function Expandable({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl bg-surface-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-black uppercase [&::-webkit-details-marker]:hidden" style={poppins}>
        {title}<ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-3 pb-3">{children}</div>
    </details>
  );
}

/** Where everyone finished, and every game. */
function SeasonDetails({ c, season }: { c: DraftText; season: SeasonResult }) {
  const rows = season.table.map((r) => ({ name: r.me ? c.you : r.name, points: r.points, me: r.me, gd: r.gf - r.ga }));
  return (
    <div className="space-y-2">
      <Expandable title={c.table}>
        <ol className="space-y-0.5 text-sm">
          {rows.map((r, i) => (
            <li key={r.name} className={cn("flex items-center gap-2 rounded-lg px-2 py-1", r.me && "bg-brand-green/20 font-black")}>
              <span className="w-6 shrink-0 text-right text-xs font-bold tabular-nums text-white/70">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              <span className="shrink-0 text-xs text-white/70 tabular-nums">{r.gd > 0 ? `+${r.gd}` : r.gd}</span>
              <span className="w-14 shrink-0 text-right font-bold tabular-nums">{r.points} {c.pts}</span>
            </li>
          ))}
        </ol>
      </Expandable>
      <Expandable title={c.allResults}>
        <ol className="space-y-0.5 text-sm">
          {season.matches.map((m) => (
            <li key={m.round} className="flex items-center gap-2 rounded-lg px-2 py-1">
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-black", m.gf > m.ga ? "bg-brand-green text-white" : m.gf === m.ga ? "bg-white/20 text-white" : "bg-brand-red-soft text-white")} style={poppins}>{m.gf > m.ga ? c.w : m.gf === m.ga ? c.d : c.l}</span>
              <span className="min-w-0 flex-1 truncate">{m.home ? c.vs : "@"} {m.opponent.name}</span>
              <span className="shrink-0 font-black tabular-nums" style={poppins}>{m.gf}–{m.ga}</span>
            </li>
          ))}
        </ol>
      </Expandable>
    </div>
  );
}

/** After a challenge: both XIs, then the same spins side by side, which is where the arguing starts. */
function ChallengeCompare({ c, slots, mine, target }: { c: DraftText; slots: Slot[]; mine: (Pick | null)[]; target: ChallengeTarget }) {
  const inRound = (picks: (Pick | null)[], round: number) => picks.find((p) => p?.round === round) ?? null;
  const rounds = Array.from({ length: XI }, (_, r) => r).filter((r) => inRound(mine, r) || inRound(target.picks, r));
  const label = (p: Pick | null) => (p ? (p.academy ? c.academy : surname(p.player.name)) : "–");
  return (
    <section className="rounded-2xl bg-surface-card p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0"><p className="mb-1 text-center text-xs font-bold text-white/80">{c.you}</p><DraftPitch slots={slots} picks={mine} academy={c.academy} compact /></div>
        <div className="min-w-0"><p className="mb-1 truncate text-center text-xs font-bold text-white/80">{target.from}</p><DraftPitch slots={slots} picks={target.picks} academy={c.academy} compact /></div>
      </div>
      <h3 className="mb-1.5 mt-3 text-sm font-black uppercase" style={poppins}>{c.compareTitle}</h3>
      <ol className="space-y-1.5">
        {rounds.map((r) => {
          const a = inRound(mine, r), b = inRound(target.picks, r);
          const ra = a ? effective(a) : 0, rb = b ? effective(b) : 0;
          const same = a && b && a.club === b.club && a.season === b.season;
          return (
            <li key={r} className="rounded-xl bg-black/20 px-2.5 py-1.5">
              <p className="truncate text-[11px] font-semibold text-white/70">{same ? `${a!.club} ${a!.season}` : c.compareRespun}</p>
              <div className="mt-0.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-sm">
                <span className={cn("truncate font-bold", ra > rb && "text-brand-green-light")}>{label(a)} <span className="tabular-nums">{a ? ra : ""}</span></span>
                <span className="text-xs text-white/50">{c.vs}</span>
                <span className={cn("truncate text-right font-bold", rb > ra && "text-brand-green-light")}><span className="tabular-nums">{b ? rb : ""}</span> {label(b)}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** After a Ball Knowledge draft: what each pick was really rated, and who was the best on offer from that squad. */
function PicksReveal({ c, slots, picks }: { c: DraftText; slots: Slot[]; picks: (Pick | null)[] }) {
  return (
    <section className="rounded-2xl bg-surface-card p-3">
      <h3 className="mb-2 text-sm font-black uppercase" style={poppins}>{c.revealTitle}</h3>
      <ul className="space-y-1.5">
        {slots.map((slot, i) => {
          const p = picks[i];
          if (!p) return null;
          const r = effective(p);
          const missed = !p.academy && p.best && p.best.rating > r;
          return (
            <li key={slot.id} className="flex items-start gap-2.5 text-sm">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-black tabular-nums", p.academy ? "bg-white/20 text-white" : tierBg(r))} style={poppins}>{r}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{slot.label} · {p.academy ? c.academy : p.player.name}</span>
                {!p.academy && <span className="block text-xs text-white/70">{p.club} {p.season} · {missed ? c.revealBest(p.best!.name, p.best!.rating) : c.revealTop}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** What a friend sees when they open a "Beat my draft" link. */
export function ChallengeIntro({ locale, target, league, onStart, onExit }: { locale: string; target: ChallengeTarget; league: League; onStart: () => void; onExit: () => void }) {
  const c = draftCopy(locale);
  const rec = `${target.w}–${target.d}–${target.l}`;
  return (
    <div className="flex flex-1 flex-col">
      <TopBar brand={c.brand} exitLabel={c.exit} onExit={onExit} wrap />
      <div className="my-auto rounded-3xl bg-gradient-to-br from-brand-blue to-surface-card px-5 py-8 text-center shadow-xl">
        <p className="text-sm font-black uppercase tracking-[0.08em] text-white/80" style={poppins}>{c.challengeTitle(target.from)}</p>
        <p className="mt-3 text-6xl font-black tabular-nums leading-none" style={poppins}>{rec}</p>
        <p className="mx-auto mt-4 max-w-xs text-sm text-white/85">{c.challengeBody(rec, league.name, variantName(c, target.variant))}</p>
      </div>
      <GreenButton onClick={onStart}>{c.challengeStart}</GreenButton>
    </div>
  );
}

/** A number that counts up from 0 (skipped with reduced motion). */
function CountUp({ to, className }: { to: number; className?: string }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let v = 0;
    const step = Math.max(1, Math.ceil(to / 18));
    const t = setInterval(() => { v = Math.min(to, v + step); setN(v); if (v >= to) clearInterval(t); }, 40);
    return () => clearInterval(t);
  }, [to, reduce]);
  return <span className={className}>{reduce ? to : n}</span>;
}

const CONFETTI = ["bg-brand-yellow", "bg-brand-green-light", "bg-brand-blue", "bg-white", "bg-brand-red-soft"];
function Confetti() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {Array.from({ length: 28 }, (_, i) => (
        <motion.span key={i} className={cn("absolute top-0 h-2.5 w-1.5 rounded-sm", CONFETTI[i % CONFETTI.length])} style={{ left: `${(i * 37) % 100}%` }}
          initial={{ y: -20, rotate: 0, opacity: 1 }} animate={{ y: 260, rotate: 360 + i * 25, opacity: [1, 1, 0] }} transition={{ duration: 1.6 + (i % 5) * 0.25, delay: (i % 7) * 0.08, ease: "easeIn" }} />
      ))}
    </span>
  );
}

function LineBars({ c, team }: { c: DraftText; team: Lines }) {
  const rows: [string, number][] = [[c.lineNames.att, team.att], [c.lineNames.mid, team.mid], [c.lineNames.def, team.def], [c.lineNames.gk, team.gk]];
  return (
    <div className="rounded-2xl bg-surface-card px-4 py-3">
      <div className="mb-2 flex items-baseline justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/70" style={poppins}>{c.teamRating}</span><span className="text-2xl font-black tabular-nums" style={poppins}>{Math.round(team.overall)}</span></div>
      <ul className="space-y-1.5">
        {rows.map(([label, v]) => (
          <li key={label} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2 text-xs">
            <span className="truncate text-white/80">{label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-black/30"><span className={cn("block h-full rounded-full", v >= 85 ? "bg-brand-gold" : v >= 75 ? "bg-brand-green" : "bg-white/40")} style={{ width: `${Math.max(0, Math.min(1, (v - 50) / 47)) * 100}%` }} /></span>
            <span className="text-right font-black tabular-nums" style={poppins}>{Math.round(v)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Match day (duel) ───────────────────────────────────────────────────────────────────────────────────────────────

const LEG_REVEAL_MS = 8000;
const LEG_BEAT_MS = 1200;

export function MatchDayView({ locale, match, me, rival, slots, seed, reveal = false, onFinish, onGoal, onBack, backLabel, onAgain, onExit, resultNote }: {
  locale: string; match: MatchDay; me: BoardSeat; rival: BoardSeat; slots: Slot[];
  /** Names the scorers; the same pairing always shows the same goals. */
  seed?: string;
  /** Play both legs out on a clock before showing the result. */
  reveal?: boolean; onFinish?: (won: boolean) => void; onGoal?: (mine: boolean) => void;
  /** A head-to-head from the result screen returns there instead of starting a new draft. */
  onBack?: () => void; backLabel?: string; onAgain?: () => void; onExit: () => void;
  /** When the result is not the score's: the other side left. */
  resultNote?: string | null;
}) {
  const c = draftCopy(locale);
  const won = match.winner === 0;
  const label = { attack: c.attack, midfield: c.midfield, defence: c.defence } as const;
  const [skipped, setSkipped] = useState(!reveal);
  const [leg, setLeg] = useState<0 | 1>(0);
  const minute = useMatchMinute(leg, LEG_REVEAL_MS, skipped);
  const legOver = minute >= MINUTES;
  const over = skipped || (leg === 1 && legOver);
  useEffect(() => {
    if (skipped || leg !== 0 || !legOver) return;
    const t = setTimeout(() => setLeg(1), LEG_BEAT_MS);
    return () => clearTimeout(t);
  }, [skipped, leg, legOver]);
  const finished = useRef(false);
  useEffect(() => {
    if (!over || finished.current) return;
    finished.current = true;
    onFinish?.(won);
  }, [over, won, onFinish]);
  const legGoals = useMemo(() => (seed ? match.legs.map((score, i) => matchDayGoals(`${seed}|${i}`, score, slots, me.picks, rival.picks)) : [[], []]), [seed, match.legs, slots, me.picks, rival.picks]);
  // Each leg's score so far; a finished leg counts in full.
  const sofar = (i: 0 | 1): [number, number] => {
    if (over || i < leg) return match.legs[i];
    if (i > leg) return [0, 0];
    const shownNow = legGoals[i].filter((g) => g.minute <= minute);
    return [shownNow.filter((g) => g.side === 0).length, shownNow.filter((g) => g.side === 1).length];
  };
  const first = sofar(0), second = sofar(1);
  const score = [first[0] + second[0], first[1] + second[1]];
  const shown = (over ? legGoals[1] : legGoals[leg]).filter((g) => over || g.minute <= minute);
  const heard = useRef({ leg: -1, count: 0 });
  useEffect(() => {
    if (over || !onGoal) return;
    if (heard.current.leg !== leg) heard.current = { leg, count: 0 };
    for (const g of shown.slice(heard.current.count)) onGoal(g.side === 0);
    heard.current.count = shown.length;
  }, [shown, leg, over, onGoal]);
  const nameOf = (g: { side: 0 | 1; slotId: string | null }) => {
    const p = (g.side === 0 ? me.picks : rival.picks)[slots.findIndex((x) => x.id === g.slotId)];
    return !p || p.academy ? c.academy : surname(p.player.name);
  };
  const legRow = (i: 0 | 1, s: [number, number]) => (
    <div className={cn("rounded-xl px-2 py-1.5 text-center", !over && i === leg ? "bg-brand-blue" : "bg-surface-card")}>
      <p className="text-[11px] font-bold leading-tight text-white/75">{c.legN(i + 1)} · {i === 0 ? c.legHome : c.legAway}</p>
      <p className={cn("text-xl font-black tabular-nums leading-tight", !over && i > leg && "text-white/30")} style={poppins}>{s[0]}–{s[1]}</p>
    </div>
  );
  const pitches = (
    <div className="mt-5 grid grid-cols-2 gap-3">
      <div><p className="mb-1 text-center text-xs font-bold text-white/60">{c.you}</p><DraftPitch slots={slots} picks={me.picks} academy={c.academy} compact /></div>
      <div><p className="mb-1 truncate text-center text-xs font-bold text-white/60">{rival.name}</p><DraftPitch slots={slots} picks={rival.picks} academy={c.academy} compact /></div>
    </div>
  );
  return (
    <div className="flex flex-1 flex-col">
      <TopBar brand={c.brand} exitLabel={c.exit} onExit={onExit} wrap />
      <p className="mt-5 text-center text-xs font-bold uppercase tracking-[0.12em] text-white/55" style={poppins}>{c.matchDay}</p>
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <SeatHead seat={me} c={c} />
        <div className="text-center">
          <motion.p initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl font-black tabular-nums" style={poppins}>{score[0]}–{score[1]}</motion.p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/60" style={poppins}>{c.onTotal}</p>
          {!over && <p className={cn("mt-1 inline-block rounded px-1.5 text-[10px] font-black tabular-nums", legOver ? "bg-white/15 text-white" : "bg-brand-green-light text-surface-page")} style={poppins}>{legOver ? c.ft : `${minute}'`}</p>}
        </div>
        <SeatHead seat={rival} c={c} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">{legRow(0, first)}{legRow(1, second)}</div>
      {seed && !over && (
        <div className="mt-2 grid min-h-8 grid-cols-2 gap-3 text-xs font-semibold leading-4">
          <p className="min-w-0 text-brand-green-light">{shown.filter((g) => g.side === 0).map((g) => <span key={g.minute} className="block truncate tabular-nums">{g.minute}&apos; {nameOf(g)}</span>)}</p>
          <p className="min-w-0 text-right text-brand-red-light">{shown.filter((g) => g.side === 1).map((g) => <span key={g.minute} className="block truncate tabular-nums">{nameOf(g)} {g.minute}&apos;</span>)}</p>
        </div>
      )}
      {!over ? (
        <>
          {pitches}
          <QuietButton onClick={() => setSkipped(true)} className="mt-auto">{c.skip}</QuietButton>
        </>
      ) : (
        <>
          {match.penalties && <p className="mt-1 text-center text-sm font-bold text-white/80">{c.penalties(match.penalties[0], match.penalties[1])}<span className="block text-xs font-medium text-white/65">{c.penaltiesNote}</span></p>}
          <motion.p initial={reveal ? { scale: 0.7, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} className={cn("mt-3 text-center text-2xl font-black uppercase", won ? "text-brand-green-light" : "text-brand-red-light")} style={poppins}>{won ? c.youWin : c.youLose}</motion.p>
          {resultNote && <p className="mt-1 text-center text-sm font-semibold text-white/80">{resultNote}</p>}
          <ul className="mt-5 space-y-2">
            {match.battles.map((b) => (
              <li key={b.key} className="rounded-2xl bg-surface-card px-4 py-3">
                <p className="text-xs font-bold text-white/75">{label[b.key]}</p>
                <div className="mt-1.5 grid grid-cols-[3rem_1fr_3rem] items-center gap-2">
                  <span className={cn("text-xl font-black tabular-nums", b.winner === 0 ? "text-brand-green-light" : "text-white/70")} style={poppins}>{Math.round(b.mine)}</span>
                  <span className="relative h-2 overflow-hidden rounded-full bg-brand-blue/50"><span className="absolute inset-y-0 left-0 rounded-full bg-brand-green" style={{ width: `${(b.mine / (b.mine + b.theirs)) * 100}%` }} /></span>
                  <span className={cn("text-right text-xl font-black tabular-nums", b.winner === 1 ? "text-white" : "text-white/70")} style={poppins}>{Math.round(b.theirs)}</span>
                </div>
              </li>
            ))}
          </ul>
          {pitches}
          {onBack && <GreenButton onClick={onBack} className="mt-5">{backLabel ?? c.backToResult}</GreenButton>}
          {onAgain && <GreenButton onClick={onAgain} className="mt-5">{c.again}</GreenButton>}
        </>
      )}
    </div>
  );
}

function SeatHead({ seat, c }: { seat: BoardSeat; c: DraftText }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      {seat.avatar ? <DuelAvatar customization={seat.avatar} size="sm" /> : <span className="size-12 rounded-full bg-white/15" />}
      <p className="w-full truncate text-center text-xs font-bold">{seat.me ? c.you : seat.name}</p>
    </div>
  );
}

// ── Room results ───────────────────────────────────────────────────────────────────────────────────────────────────

export function RoomTable({ locale, rows, slots, initialTeam = null, againLabel, onAgain, onExit }: {
  locale: string; rows: { seat: BoardSeat; season: SeasonResult; team: number }[]; slots: Slot[]; initialTeam?: string | null; againLabel?: string; onAgain: () => void; onExit: () => void;
}) {
  const c = draftCopy(locale);
  const [teamSeat, setTeamSeat] = useState<string | null>(initialTeam);
  const open = rows.find((r) => r.seat.name === teamSeat)?.seat ?? null;
  const medal = ["bg-brand-gold text-surface-page", "bg-brand-silver text-surface-page", "bg-brand-bronze text-surface-page"];
  return (
    <div className="flex flex-1 flex-col">
      <TopBar brand={c.brand} exitLabel={c.exit} onExit={onExit} wrap />
      <h2 className="mt-5 text-center text-xl font-black uppercase" style={poppins}>{c.finalTable}</h2>
      <ol className="mt-4 space-y-2">
        {rows.map((r, i) => (
          <li key={r.seat.name}>
           <button type="button" onClick={() => setTeamSeat(r.seat.name)} aria-label={c.teamOf(r.seat.me ? c.you : r.seat.name)} className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left", r.seat.me ? "bg-brand-green/15 ring-1 ring-brand-green" : "bg-surface-card")}>
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-black", medal[i] ?? "bg-white/10")} style={poppins}>{i + 1}</span>
            {r.seat.avatar ? <DuelAvatar customization={r.seat.avatar} size="xs" /> : <span className="size-8 rounded-full bg-white/15" />}
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{r.seat.me ? c.you : r.seat.name}</p><p className="text-[11px] text-white/70">{c.teamRating} {Math.round(r.team)} · {c.finish[r.season.finish]}</p></div>
            <div className="text-right"><p className="text-lg font-black tabular-nums" style={poppins}>{record(r.season)}</p><p className="text-[11px] text-white/70 tabular-nums">{r.season.points} {c.pts}</p></div>
           </button>
          </li>
        ))}
      </ol>
      <GreenButton onClick={onAgain} className="mt-auto">{againLabel ?? c.again}</GreenButton>
      {open && <TeamSheet c={c} name={open.me ? c.you : open.name} slots={slots} picks={open.picks} onClose={() => setTeamSeat(null)} />}
    </div>
  );
}

// ── Leaderboard (main board tab + public page mirror) ──────────────────────────────────────────────────────────────

export interface BoardRow { userId?: string; rank: number; name: string; avatar: AvatarCustomization | null; season: { w: number; d: number; l: number; points: number }; me?: boolean; picks?: (Pick | null)[] }

export function DraftLeaderboard({ locale, rows, variant, onVariant, title, compact, onOpen }: {
  locale: string; rows: BoardRow[]; variant: Variant; onVariant: (v: Variant) => void; title?: string; compact?: boolean;
  /** Only once you have played: today's teams would give away today's draw. */
  onOpen?: (row: BoardRow) => void;
}) {
  const c = draftCopy(locale);
  return (
    <section className="min-w-0 rounded-2xl bg-surface-card p-3">
      <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <Shield className="size-4 text-brand-green-light" aria-hidden />
        <h3 className="min-w-0 flex-1 basis-40 text-sm font-black uppercase" style={poppins}>{title ?? c.board}</h3>
        <div className="flex rounded-full bg-black/25 p-0.5 text-[11px] font-bold">
          {VARIANTS.map((v) => (
            <button key={v} type="button" onClick={() => onVariant(v)} aria-pressed={variant === v} className={cn("rounded-full px-2 py-1", variant === v ? "bg-white/15 text-white" : "text-white/55")}>{variantName(c, v)}</button>
          ))}
        </div>
      </div>
      <ol className="space-y-1">
        {[...rows.slice(0, compact ? 5 : 10), ...rows.slice(compact ? 5 : 10).filter((r) => r.me)].map((r) => (
          <li key={`${r.rank}-${r.name}`}>
            {(() => {
              const body = (<>
            <span className={cn("text-center font-black tabular-nums", r.rank === 1 ? "text-brand-gold" : r.rank === 2 ? "text-brand-silver" : r.rank === 3 ? "text-brand-bronze" : "text-white/55")} style={poppins}>{r.rank}</span>
            {r.avatar ? <DuelAvatar customization={r.avatar} size="xs" /> : <span className="size-8 rounded-full bg-white/15" />}
            <span className="min-w-0 truncate font-bold">{r.me ? `${r.name} (${c.boardYou})` : r.name}</span>
            <span className="font-black tabular-nums" style={poppins}>{r.season.w}–{r.season.d}–{r.season.l}</span>
            <span className="w-14 text-right text-xs text-white/70 tabular-nums">{r.season.points} {c.pts}</span>
          </>);
              const row = cn("grid w-full grid-cols-[2rem_auto_1fr_auto_auto] items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm", r.me ? "bg-brand-green/15" : "");
              return onOpen && (r.picks || r.userId) && !r.me
                ? <button type="button" onClick={() => onOpen(r)} aria-label={c.teamOf(r.name)} className={cn(row, "transition-colors hover:bg-white/10")}>{body}</button>
                : <div className={row}>{body}</div>;
            })()}
          </li>
        ))}
      </ol>
      {onOpen && <p className="mt-2 text-center text-xs font-semibold text-brand-green-light">{c.boardTap}</p>}
    </section>
  );
}

