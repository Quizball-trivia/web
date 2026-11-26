"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, ArrowUp, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Euro, Flag, Layers, List, Lock, Play, Search,
  Shuffle, SlidersHorizontal, Sparkles, Star, Trophy, Users, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveClubCrestByName } from "@/lib/clubs";
import { footballGridAssetUrl } from "@/lib/football-grid/assets";
import { Brand, GreenButton, poppins } from "@/features/wordgames/ui";
import { wordDailyCopy } from "@/features/wordgames/copy";
import { DailySignIn } from "@/features/wordgames/daily/WordDailySignIn";
import type { WordDailyGame } from "@/features/wordgames/daily/wordDaily.games";
import { d501UnitLabel } from "./d501.copy";
import { d501DaysCopy, type D501DaysCopy } from "./d501.days.copy";
import { darts501CalendarApi, type D501BoardKind, type D501Days as DaysIndex, type D501MyDay } from "./d501.api";
import {
  addDays, addMonths, buildModel, daysBetween, groupByMonth, isDone, isFiltering, matchesFilter, monthOf, nextDrop, NO_FILTER, playerStats,
  type CalDay, type CalModel, type DayFilter, type MyResult,
} from "./d501.days.model";

const KIND_DOT: Record<D501BoardKind, string> = {
  apps: "bg-brand-cyan", goals: "bg-brand-green-light", cl: "bg-brand-blue", nt: "bg-brand-yellow",
  combined: "bg-brand-purple", value: "bg-brand-orange", minus: "bg-brand-red-light",
};
const KIND_ORDER: D501BoardKind[] = ["apps", "goals", "cl", "nt", "combined", "value", "minus"];
/** Competition codes a card may carry; anything else is shown as written. */
const COMPETITIONS: Record<string, string> = {
  GB1: "Premier League", ES1: "LaLiga", IT1: "Serie A", L1: "Bundesliga", FR1: "Ligue 1", TR1: "Süper Lig", NL1: "Eredivisie", PO1: "Liga Portugal",
};
const competitionName = (code: string | null, kind: D501BoardKind | null, c: D501DaysCopy) =>
  code === null ? null : code === "NT" ? c.kinds.nt : code === "CL" || code === "CLN" ? c.kinds.cl : COMPETITIONS[code] ?? code;

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);
const intl = (locale: string, opts: Intl.DateTimeFormatOptions) => {
  try { return new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }); } catch { return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }); }
};
function useFormats(locale: string) {
  return useMemo(() => {
    const short = intl(locale, { weekday: "short", day: "numeric", month: "short" });
    const long = intl(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const month = intl(locale, { month: "long", year: "numeric" });
    const monthShort = intl(locale, { month: "short" });
    const weekday = intl(locale, { weekday: "narrow" });
    // 2024-01-01 was a Monday.
    const weekdays = Array.from({ length: 7 }, (_, i) => weekday.format(asDate(addDays("2024-01-01", i))));
    let time: Intl.DateTimeFormat;
    try { time = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }); } catch { time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }); }
    return {
      short: (d: string) => short.format(asDate(d)), long: (d: string) => long.format(asDate(d)), month: (m: string) => month.format(asDate(`${m}-01`)),
      monthShort: (m: string) => monthShort.format(asDate(`${m}-01`)), weekdays, time: (at: Date) => time.format(at),
    };
  }, [locale]);
}
type Formats = ReturnType<typeof useFormats>;

const labelsOf = (d: CalDay, f: Formats, c: D501DaysCopy) => [f.short(d.day), f.month(monthOf(d.day)), competitionName(d.competition, d.kind, c) ?? ""];

function useCountdown(f: Formats) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, []);
  const { at, inMs } = nextDrop(now);
  const h = Math.floor(inMs / 3_600_000);
  const m = Math.floor((inMs % 3_600_000) / 60_000);
  return { label: h > 0 ? `${h}h ${m}m` : `${m}m`, at: f.time(at) };
}

/* ───────────── pictures ───────────── */

function Crest({ name, className }: { name: string; className?: string }) {
  const crest = resolveClubCrestByName(name);
  if (!crest) return <span className={cn("flex items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-white/70", className)} style={poppins}>{name.slice(0, 2).toUpperCase()}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={crest.logo} alt="" loading="lazy" draggable={false} className={cn("object-contain", className)} />;
}

function FlagImg({ code, className }: { code: string; className?: string }) {
  const src = footballGridAssetUrl(`/assets/football-grid/flags/${code}.svg`);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" draggable={false} className={cn("rounded-[3px] object-cover shadow-[0_1px_3px_rgba(0,0,0,0.4)]", className)} />;
}

function BoardArt({ day, size = "md" }: { day: CalDay; size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "size-16 rounded-2xl" : size === "sm" ? "size-9 rounded-xl" : "size-11 rounded-xl";
  const img = size === "lg" ? "size-11" : size === "sm" ? "size-6" : "size-8";
  const flag = size === "lg" ? "h-8 w-11" : size === "sm" ? "h-4 w-6" : "h-5 w-7";
  const icon = size === "lg" ? "size-8" : "size-5";
  let art: ReactNode;
  if (!day.closed) art = <span className={cn("font-black text-white/50", size === "lg" ? "text-2xl" : "text-base")} style={poppins}>?</span>;
  else if (day.crests?.length) art = (
    <span className="relative flex items-center">
      {day.crests.map((c, i) => <span key={c} className={cn(i > 0 && "-ml-2.5")}><Crest name={c} className={size === "lg" ? "size-7" : "size-[18px]"} /></span>)}
    </span>
  );
  else if (day.flag) art = <FlagImg code={day.flag} className={flag} />;
  else if (day.crest) art = <Crest name={day.crest} className={img} />;
  else if (day.kind === "value") art = <Euro className={cn("text-brand-orange", icon)} />;
  else if (day.kind === "cl") art = <Star className={cn("fill-brand-blue text-brand-blue", icon)} />;
  else art = <Layers className={cn("text-white/60", icon)} />;
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center bg-white/[0.06]", box)}>
      {art}
      {day.closed && day.kind === "cl" && day.crest && size !== "sm" && <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-brand-blue text-[8px] font-black">★</span>}
    </span>
  );
}

function CellArt({ day }: { day: CalDay }) {
  const crest = "size-6 lg:size-8";
  if (!day.closed) return <span className="text-base font-black text-white/60" style={poppins}>?</span>;
  if (day.crests?.length) return <Crest name={day.crests[0]} className={crest} />;
  if (day.flag) return <FlagImg code={day.flag} className="h-4 w-6 lg:h-5 lg:w-7" />;
  if (day.crest) return <Crest name={day.crest} className={crest} />;
  if (day.kind === "value") return <Euro className="size-5 text-brand-orange" />;
  if (day.kind === "cl") return <Star className="size-5 fill-brand-blue text-brand-blue" />;
  return <Layers className="size-5 text-white/50" />;
}

function TierBars({ tier, label }: { tier: CalDay["tier"]; label: string }) {
  const n = tier === "easy" ? 1 : tier === "medium" ? 2 : 3;
  return (
    <span className="inline-flex items-end gap-[2px]" aria-label={label} title={label}>
      {[0, 1, 2].map((i) => <span key={i} className={cn("w-[3px] rounded-sm", i < n ? "bg-white/60" : "bg-white/15")} style={{ height: 5 + i * 2.5 }} />)}
    </span>
  );
}

function ResultPill({ mine, c, compact = false }: { mine: MyResult; c: D501DaysCopy; compact?: boolean }) {
  const base = cn("flex shrink-0 flex-col items-center justify-center rounded-xl leading-none", compact ? "w-[58px] py-1" : "w-[68px] py-1.5");
  const big = compact ? "text-base" : "text-lg";
  if (mine.state === "out") return (
    <span className={cn(base, "bg-brand-green/15 text-brand-green-light")}>
      <span className={cn("flex items-center gap-1 font-black tabular-nums", big)} style={poppins}><Check className="size-3.5" strokeWidth={3.5} />{mine.darts}</span>
      <span className="mt-0.5 text-[10px] font-bold text-brand-green-light/80">{c.pillDarts}</span>
    </span>
  );
  if (mine.state === "left") return (
    <span className={cn(base, "bg-white/[0.07] text-white")}>
      <span className={cn("font-black tabular-nums", big)} style={poppins}>{mine.left}</span>
      <span className="mt-0.5 text-[10px] font-bold text-white/55">{c.pillLeft}</span>
    </span>
  );
  if (mine.state === "gaveUp") return <span className={cn(base, "text-center text-[11px] font-bold text-white/40")}>{c.pillGaveUp}</span>;
  if (mine.state === "unknown") return <span className={cn(base, "bg-white/[0.04] text-white/30")}>…</span>;
  if (mine.state === "started") return (
    <span className={cn(base, "bg-brand-yellow/15 text-brand-yellow")}>
      <span className="text-[11px] font-black uppercase" style={poppins}>{c.pillResume}</span>
      <span className="mt-1 text-[10px] font-bold tabular-nums text-brand-yellow/75">{mine.left} {c.pillLeft}</span>
    </span>
  );
  return (
    <span className={cn(base, "border border-white/15 text-white/80 group-hover:border-brand-green group-hover:text-brand-green-light")}>
      <Play className="size-4 fill-current" /><span className="mt-1 text-[10px] font-black uppercase" style={poppins}>{c.pillPlay}</span>
    </span>
  );
}

/* ───────────── top: today + stats ───────────── */

function TodayRow({ model, c, f, guest, game, onSelect, onPlay, onRandom }: {
  model: CalModel; c: D501DaysCopy; f: Formats; guest: boolean; game: WordDailyGame;
  onSelect: (d: CalDay) => void; onPlay: (d: CalDay) => void; onRandom: () => void;
}) {
  const cd = useCountdown(f);
  const day = model.days[0];
  if (model.todayMissing || !day || day.day !== model.today) return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/[0.03] px-3 py-2">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]"><Sparkles className="size-4 text-brand-yellow" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-black" style={poppins}>{c.noBoardToday}</span>
        <span className="block truncate text-[11px] text-white/55">{model.tomorrowSeeded && day ? c.nextAt(day.number + daysBetween(day.day, addDays(model.today, 1)), cd.at) : c.pastOpen}</span>
      </span>
      {model.history === "ready" && model.days.some((d) => d.day !== model.today && d.mine.state === "none") && <button type="button" onClick={onRandom} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[11px] font-black uppercase hover:bg-white/15" style={poppins}><Shuffle className="size-3.5" />{c.random}</button>}
    </div>
  );
  const done = isDone(day.mine);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand-blue/70 bg-brand-blue/10 px-3 py-2">
      <button type="button" onClick={() => onSelect(day)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <BoardArt day={day} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide" style={poppins}>
            <span className="rounded bg-brand-blue px-1.5 py-0.5 text-white">{c.today}</span>
            <span className="truncate text-white/80">#{day.number}</span>
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-white/55">
            {c.closesIn(cd.label)} · {model.tomorrowSeeded ? c.nextAt(day.number + 1, cd.at) : c.newOnWay}
          </span>
        </span>
      </button>
      {done ? <button type="button" onClick={() => onPlay(day)}><ResultPill mine={day.mine} c={c} compact /></button>
        : guest ? <DailySignIn game={game} placement="days_today" className="shrink-0 rounded-full bg-brand-yellow px-3 py-2 text-[11px] font-black uppercase text-black">{c.signUp}</DailySignIn>
        : (
          <button type="button" onClick={() => onPlay(day)} className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand-green px-4 text-xs font-black uppercase text-white hover:bg-brand-green-deep" style={poppins}>
            <Play className="size-3.5 fill-current" />{c.play(day.number)}
          </button>
        )}
    </div>
  );
}

function StatsBar({ model, c, retryLabel, onRetry, open, onToggle }: { model: CalModel; c: D501DaysCopy; retryLabel: string; onRetry: () => void; open: boolean; onToggle: () => void }) {
  if (model.history === "loading") return <div className="h-8 w-48 animate-pulse rounded-full bg-white/[0.07]" />;
  if (model.history === "failed") return (
    <button type="button" onClick={onRetry} className="flex h-8 items-center gap-1.5 rounded-full bg-white/[0.07] px-3 text-[11px] font-bold text-white/75 hover:bg-white/[0.11]">
      {c.historyFailed} · <span className="underline">{retryLabel}</span>
    </button>
  );
  const s = playerStats(model.days, model.today);
  const tiles: Array<[string, string]> = [
    [`${s.played}/${s.total}`, c.statPlayed], [`${s.outs}`, c.statCheckouts], [s.bestDarts != null ? `${s.bestDarts}` : "—", c.statBest], [`${s.streak}`, c.statStreak],
  ];
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={open}
        className="flex h-8 items-center gap-1.5 rounded-full bg-white/[0.07] px-3 text-[11px] font-bold text-white/75 hover:bg-white/[0.11] lg:hidden">
        <Trophy className="size-3.5 text-brand-yellow" />{c.statsChip(s.played, s.total, s.streak)}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden lg:hidden">
            <div className="grid grid-cols-4 gap-1.5 pt-2">
              {tiles.map(([v, l]) => (
                <div key={l} className="rounded-xl bg-white/[0.05] py-1.5 text-center">
                  <p className="text-sm font-black tabular-nums leading-none" style={poppins}>{v}</p>
                  <p className="mt-1 truncate px-1 text-[10px] font-semibold text-white/50">{l}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="hidden gap-2 lg:flex">
        {tiles.map(([v, l]) => (
          <span key={l} className="flex items-baseline gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-white/55">
            <b className="text-sm font-black tabular-nums text-white" style={poppins}>{v}</b>{l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────── calendar ───────────── */

function MonthGrid({ month, model, selected, filter, c, f, onSelect, guard }: {
  month: string; model: CalModel; selected: string | null; filter: DayFilter; c: D501DaysCopy; f: Formats; onSelect: (d: CalDay) => void; guard: RefObject<boolean>;
}) {
  const byDay = useMemo(() => new Map(model.days.map((d) => [d.day, d])), [model]);
  const first = asDate(`${month}-01`);
  const lead = (first.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const filtering = isFiltering(filter);
  const tomorrow = addDays(model.today, 1);
  return (
    <div className="grid grid-cols-7 gap-1 lg:gap-1.5">
      {Array.from({ length: lead }, (_, i) => <span key={`l${i}`} />)}
      {Array.from({ length: count }, (_, i) => {
        const id = `${month}-${String(i + 1).padStart(2, "0")}`;
        const d = byDay.get(id);
        const isToday = id === model.today;
        if (!d) {
          const seededAhead = id > model.today && id <= model.lastSeeded;
          return (
            <span key={id} className={cn("relative flex aspect-square items-center justify-center rounded-xl lg:aspect-[5/4]",
              seededAhead && "border border-dashed border-white/15", isToday && "ring-2 ring-brand-blue/60")}>
              <span className={cn("absolute left-1 top-0.5 text-[9px] font-bold tabular-nums lg:left-1.5 lg:top-1 lg:text-[11px]", seededAhead ? "text-white/30" : "text-white/15")}>{i + 1}</span>
              {seededAhead && id === tomorrow && <Lock className="size-4 text-white/45" />}
              {isToday && model.todayMissing && <Sparkles className="size-4 text-brand-yellow/70" />}
            </span>
          );
        }
        const dim = filtering && !matchesFilter(d, filter, labelsOf(d, f, c));
        return (
          <button key={id} type="button" data-day={id} aria-label={`#${d.number} · ${f.long(id)}`}
            onClick={() => { if (!guard.current) onSelect(d); }}
            className={cn("relative flex aspect-square flex-col items-center justify-center rounded-xl transition-[opacity,background-color] lg:aspect-[5/4]",
              d.mine.state === "out" ? "bg-brand-green/20 hover:bg-brand-green/30" : isDone(d.mine) ? "bg-white/[0.08] hover:bg-white/[0.12]" : d.mine.state === "started" ? "bg-brand-yellow/10" : d.mine.state === "unknown" ? "bg-white/[0.04] hover:bg-white/[0.08]" : "border border-white/12 hover:bg-white/[0.06]",
              isToday ? "ring-2 ring-brand-blue" : selected === id && "ring-2 ring-white",
              dim && "opacity-20 grayscale")}>
            <span className={cn("absolute left-1 top-0.5 text-[9px] font-bold tabular-nums lg:left-1.5 lg:top-1 lg:text-[11px]", isToday ? "text-white" : "text-white/45")}>{i + 1}</span>
            <span className={cn("mt-1.5 flex items-center justify-center", d.mine.state === "gaveUp" && "opacity-40")}><CellArt day={d} /></span>
            {d.mine.state === "out" && <span className="absolute bottom-0.5 right-1 text-[10px] font-black tabular-nums text-brand-green-light lg:bottom-1 lg:right-1.5 lg:text-xs">{d.mine.darts}</span>}
            {d.mine.state === "left" && <span className="absolute bottom-0.5 right-1 text-[9px] font-bold tabular-nums text-white/60 lg:bottom-1 lg:right-1.5 lg:text-[11px]">{d.mine.left}</span>}
            {d.mine.state === "gaveUp" && <X className="absolute bottom-0.5 right-0.5 size-3 text-white/45 lg:bottom-1 lg:right-1" strokeWidth={3} />}
            {d.mine.state === "started" && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-brand-yellow" />}
          </button>
        );
      })}
    </div>
  );
}

function MonthPicker({ model, month, firstMonth, lastMonth, c, f, onPick, onClose }: {
  model: CalModel; month: string; firstMonth: string; lastMonth: string; c: D501DaysCopy; f: Formats; onPick: (m: string) => void; onClose: () => void;
}) {
  const byMonth = useMemo(() => {
    const map = new Map<string, { played: number; total: number }>();
    for (const d of model.days) {
      const k = monthOf(d.day);
      const v = map.get(k) ?? { played: 0, total: 0 };
      v.total += 1;
      if (isDone(d.mine)) v.played += 1;
      map.set(k, v);
    }
    return map;
  }, [model]);
  const years: number[] = [];
  for (let y = Number(lastMonth.slice(0, 4)); y >= Number(firstMonth.slice(0, 4)); y -= 1) years.push(y);
  const current = monthOf(model.today);
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
      className="absolute inset-x-0 top-full z-30 mt-2 max-h-[min(70dvh,560px)] overflow-y-auto rounded-3xl border border-white/10 bg-surface-page-alt/98 p-3 shadow-2xl shadow-black/60 backdrop-blur">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white/55" style={poppins}>{c.jumpToMonth}</span>
        <button type="button" onClick={onClose} aria-label={c.close} className="flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>
      </div>
      {years.map((y) => (
        <div key={y} className="mt-2">
          <p className="px-1 pb-1.5 text-sm font-black" style={poppins}>{y}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }, (_, m) => {
              const key = `${y}-${String(m + 1).padStart(2, "0")}`;
              const inRange = key >= firstMonth && key <= lastMonth;
              const s = byMonth.get(key);
              return (
                <button key={key} type="button" disabled={!inRange} onClick={() => onPick(key)}
                  className={cn("flex h-14 flex-col items-center justify-center rounded-xl text-xs font-bold transition-colors",
                    key === month ? "bg-white text-black" : inRange ? "bg-white/[0.06] hover:bg-white/[0.12]" : "text-white/15",
                    key === current && key !== month && "ring-2 ring-brand-blue")}>
                  <span style={poppins} className="font-black capitalize">{f.monthShort(key)}</span>
                  {inRange && <span className={cn("mt-0.5 text-[10px] tabular-nums", key === month ? "text-black/60" : "text-white/45")}>{s ? (model.history === "ready" ? `${s.played}/${s.total}` : s.total) : c.soon}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function Legend({ className, children }: { className: string; children: ReactNode }) {
  return <span className="inline-flex items-center gap-1"><span className={cn("size-2.5 rounded-[3px]", className)} />{children}</span>;
}

function filterSummary(filter: DayFilter, c: D501DaysCopy) {
  return [filter.kind !== "all" && c.kinds[filter.kind], filter.status === "todo" && c.statusTodo, filter.status === "done" && c.statusDone, filter.query.trim() && `“${filter.query.trim()}”`].filter(Boolean).join(" · ");
}

function CalendarPane({ model, month, dir, navigate, firstMonth, lastMonth, selected, filter, c, f, onSelect, pickerOpen, setPickerOpen, onClearFilter }: {
  model: CalModel; month: string; dir: number; navigate: (m: string, dir: number) => void; firstMonth: string; lastMonth: string; selected: string | null; filter: DayFilter;
  c: D501DaysCopy; f: Formats; onSelect: (d: CalDay) => void; pickerOpen: boolean; setPickerOpen: (v: boolean) => void; onClearFilter: () => void;
}) {
  const guard = useRef(false);
  const down = useRef<number | null>(null);
  const canPrev = month > firstMonth;
  const canNext = month < lastMonth;
  const go = useCallback((delta: number) => {
    const next = addMonths(month, delta);
    if (next < firstMonth || next > lastMonth) return;
    navigate(next, delta);
  }, [month, firstMonth, lastMonth, navigate]);
  const currentMonth = monthOf(model.today);
  const days = model.days.filter((d) => monthOf(d.day) === month);
  const played = days.filter((d) => isDone(d.mine)).length;
  const outs = days.flatMap((d) => (d.mine.state === "out" ? [d.mine.darts] : []));
  const best = outs.length ? Math.min(...outs) : null;
  const filtering = isFiltering(filter);
  const matching = filtering ? days.filter((d) => matchesFilter(d, filter, labelsOf(d, f, c))).length : 0;
  const known = model.history === "ready";

  return (
    <div>
      <div className="relative flex items-center gap-2">
        <button type="button" onClick={() => go(-1)} disabled={!canPrev} aria-label={c.prevMonth}
          className="flex size-9 items-center justify-center rounded-full bg-white/[0.07] hover:bg-white/[0.13] disabled:opacity-25 disabled:hover:bg-white/[0.07]"><ChevronLeft className="size-5" /></button>
        <button type="button" onClick={() => setPickerOpen(!pickerOpen)} aria-expanded={pickerOpen}
          className="flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[15px] font-black uppercase tracking-wide hover:bg-white/[0.06]" style={poppins}>
          <span className="truncate">{f.month(month)}</span><ChevronDown className={cn("size-4 shrink-0 text-white/55 transition-transform", pickerOpen && "rotate-180")} />
        </button>
        <button type="button" onClick={() => go(1)} disabled={!canNext} aria-label={c.nextMonth}
          className="flex size-9 items-center justify-center rounded-full bg-white/[0.07] hover:bg-white/[0.13] disabled:opacity-25 disabled:hover:bg-white/[0.07]"><ChevronRight className="size-5" /></button>
        <AnimatePresence>
          {pickerOpen && <MonthPicker model={model} month={month} firstMonth={firstMonth} lastMonth={lastMonth} c={c} f={f} onPick={(m) => { navigate(m, m > month ? 1 : -1); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />}
        </AnimatePresence>
      </div>

      <div className="mt-1.5 flex h-7 items-center justify-center gap-2">
        {month !== currentMonth && (
          <button type="button" onClick={() => navigate(currentMonth, month < currentMonth ? 1 : -1)}
            className="flex h-7 items-center gap-1 rounded-full bg-brand-blue px-3 text-[11px] font-black uppercase text-white" style={poppins}>
            {month < currentMonth ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}{c.today}
          </button>
        )}
        {filtering && (
          <button type="button" onClick={onClearFilter} className="flex h-7 max-w-full items-center gap-1 rounded-full bg-white px-3 text-[11px] font-bold text-black">
            <SlidersHorizontal className="size-3 shrink-0" /><span className="truncate">{filterSummary(filter, c)}</span><X className="size-3.5 shrink-0" />
          </button>
        )}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-white/35 lg:gap-1.5 lg:text-[11px]">
        {f.weekdays.map((w, i) => <span key={i} className="pb-1">{w}</span>)}
      </div>
      <div className="relative overflow-hidden"
        onPointerDown={(e) => { down.current = e.clientX; }}
        onClickCapture={(e) => {
          const from = down.current;
          down.current = null;
          // e.detail 0: Enter or Space, never a swipe.
          if (e.detail !== 0 && from !== null && Math.abs(e.clientX - from) > 8) { e.stopPropagation(); e.preventDefault(); }
        }}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div key={month} custom={dir}
            variants={{ enter: (d: number) => ({ x: d > 0 ? "100%" : d < 0 ? "-100%" : 0, opacity: 0.3 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0.3 }) }}
            initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 360, damping: 36 }}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragMomentum={false}
            dragElastic={{ left: canNext ? 0.45 : 0.06, right: canPrev ? 0.45 : 0.06 }}
            onDragStart={() => { guard.current = true; }}
            onDragEnd={(_, info) => {
              // A drag is not a tap: the cell under the finger must not open.
              window.setTimeout(() => { guard.current = false; }, 80);
              if (info.offset.x < -60 || info.velocity.x < -450) go(1);
              else if (info.offset.x > 60 || info.velocity.x > 450) go(-1);
            }}
            className="touch-pan-y select-none">
            <MonthGrid month={month} model={model} selected={selected} filter={filter} c={c} f={f} onSelect={onSelect} guard={guard} />
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-3 text-center text-xs font-bold text-white/70">
        {filtering ? <>{c.matching(matching, days.length)}<span className="text-white/40"> · {c.othersDimmed}</span></>
          : days.length === 0 ? (month > currentMonth ? c.aheadMonth : c.noBoardsMonth)
          : !known ? c.boardsN(days.length)
          : <>{c.monthSummary(played, days.length)} · <span className="text-brand-green-light">{c.checkoutsN(outs.length)}</span>{best != null && <> · {c.bestN(best)}</>}</>}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] font-semibold text-white/45">
        <Legend className="bg-brand-green/40">{c.legendCheckout}</Legend>
        <Legend className="bg-white/20">{c.legendLeft}</Legend>
        <span className="inline-flex items-center gap-1"><X className="size-3" strokeWidth={3} />{c.legendGaveUp}</span>
        <Legend className="border border-white/25">{c.legendToPlay}</Legend>
        <span className="inline-flex items-center gap-1"><Lock className="size-3" />{c.legendNext}</span>
      </div>
    </div>
  );
}

/* ───────────── list ───────────── */

function DayRow({ day, c, f, locale, selected, onSelect }: { day: CalDay; c: D501DaysCopy; f: Formats; locale: string; selected: boolean; onSelect: (d: CalDay) => void }) {
  const competition = competitionName(day.competition, day.kind, c);
  const unit = day.unit ? c.units[day.unit] ?? d501UnitLabel(day.unit, locale) ?? day.unit : null;
  return (
    <button type="button" onClick={() => onSelect(day)} data-day={day.day}
      className={cn("group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_68px]",
        selected ? "bg-white/[0.12] ring-1 ring-white/30" : "bg-white/[0.05] hover:bg-white/[0.09]")}>
      <BoardArt day={day} />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold tabular-nums text-white/45">#{day.number} · {f.short(day.day)}</span>
        <span className="block truncate text-[15px] font-black leading-tight" style={poppins}>{day.closed ? day.subject ?? day.title : c.todayBoard}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-white/55">
          {day.kind && <span className={cn("size-1.5 shrink-0 rounded-full", KIND_DOT[day.kind])} />}
          <span className="truncate">{[competition, unit].filter(Boolean).join(" · ")}</span>
          <TierBars tier={day.tier} label={c.tiers[day.tier]} />
        </span>
      </span>
      <ResultPill mine={day.mine} c={c} />
    </button>
  );
}

function MonthStrip({ days }: { days: CalDay[] }) {
  return (
    <span className="mt-2 flex flex-wrap gap-[3px]" aria-hidden>
      {[...days].reverse().map((d) => (
        <span key={d.day} className={cn("size-2 rounded-[2px]",
          d.mine.state === "out" ? "bg-brand-green-light" : isDone(d.mine) ? "bg-white/45" : d.mine.state === "started" ? "bg-brand-yellow" : "bg-white/10")} />
      ))}
    </span>
  );
}

function ListPane({ model, c, f, locale, filter, selected, onSelect, onClearFilter }: {
  model: CalModel; c: D501DaysCopy; f: Formats; locale: string; filter: DayFilter; selected: string | null; onSelect: (d: CalDay) => void; onClearFilter: () => void;
}) {
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});
  const filtering = isFiltering(filter);
  const past = useMemo(() => model.days.filter((d) => d.day !== model.today), [model]);
  const filtered = useMemo(() => past.filter((d) => matchesFilter(d, filter, labelsOf(d, f, c))), [past, filter, f, c]);
  const months = useMemo(() => groupByMonth(filtered), [filtered]);
  return (
    <div>
      {filtering && <p className="px-1 pb-1 text-[11px] font-bold text-white/50">{c.boardsN(filtered.length)} · <button type="button" className="underline" onClick={onClearFilter}>{c.clearFilter}</button></p>}
      {months.map((m, i) => {
        const isOpen = filtering || (openMonths[m.key] ?? i < 2);
        const played = m.days.filter((d) => isDone(d.mine)).length;
        const outs = m.days.filter((d) => d.mine.state === "out").length;
        return (
          <section key={m.key}>
            <button type="button" onClick={() => setOpenMonths((o) => ({ ...o, [m.key]: !isOpen }))} aria-expanded={isOpen}
              className={cn("flex w-full flex-col px-1 py-2.5 text-left", isOpen && "sticky top-0 z-20 -mx-4 w-[calc(100%+2rem)] bg-surface-page-alt/95 px-5 backdrop-blur lg:-mx-2 lg:w-[calc(100%+1rem)] lg:px-3")}>
              <span className="flex w-full items-center gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-white/85" style={poppins}>{f.month(m.key)}</span>
                <span className="hidden text-[11px] font-semibold text-white/45 sm:inline">{c.boardsN(m.days.length)}</span>
                <span className="flex-1" />
                {model.history === "ready" && <span className="whitespace-nowrap text-[11px] font-bold tabular-nums text-white/60">{played}/{m.days.length}<span className="hidden sm:inline"> {c.playedWord}</span>{outs > 0 && <span className="text-brand-green-light"> · {outs}<Check className="ml-0.5 inline size-3" strokeWidth={3.5} /></span>}</span>}
                <ChevronDown className={cn("size-4 text-white/50 transition-transform", isOpen && "rotate-180")} />
              </span>
              {!isOpen && <MonthStrip days={m.days} />}
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="space-y-1.5 overflow-hidden pb-3">
                  {m.days.map((d) => <li key={d.day}><DayRow day={d} c={c} f={f} locale={locale} selected={selected === d.day} onSelect={onSelect} /></li>)}
                </motion.ul>
              )}
            </AnimatePresence>
          </section>
        );
      })}
      {filtered.length === 0 && <p className="py-10 text-center text-sm text-white/55">{c.noMatch} <button type="button" className="font-bold underline" onClick={onClearFilter}>{c.clearFilters}</button></p>}
      {!filtering && past.length > 0 && (
        <p className="mt-4 flex items-center justify-center gap-2 py-4 text-[11px] font-bold text-white/40"><Flag className="size-3.5" />{c.firstBoard(f.long(past[past.length - 1].day))}</p>
      )}
    </div>
  );
}

/* ───────────── sheets ───────────── */

/**
 * A bottom sheet (a centred panel on desktop), portaled to the body: the game layer then treats it as the dialog on top,
 * so Escape and Tab stay in the sheet instead of leaving the game.
 */
function Sheet({ open, onClose, children, title, closeLabel, desktop = false }: { open: boolean; onClose: () => void; children: ReactNode; title: string; closeLabel: string; desktop?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      // Tab stays in the sheet (on the plain game page as well as inside the public game layer).
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter((el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0);
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const inside = panel.current.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || document.activeElement === last)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("keydown", onKey, true); opener?.focus?.({ preventScroll: true }); };
  }, [open, onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className={cn("fixed inset-0 z-[90] text-white", !desktop && "lg:hidden")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label={closeLabel} tabIndex={-1} className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-surface-page-alt px-4 pb-8 pt-3 outline-none lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-24 lg:w-[480px] lg:-translate-x-1/2 lg:rounded-3xl lg:border lg:pb-5">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 lg:hidden" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Segmented<T extends string>({ value, options, onChange, disabled = [] }: { value: T; options: Array<[T, ReactNode, string]>; onChange: (v: T) => void; disabled?: readonly T[] }) {
  return (
    <div className="flex w-fit shrink-0 rounded-full bg-white/[0.07] p-0.5">
      {options.map(([v, label, aria]) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-label={aria} aria-pressed={value === v} disabled={disabled.includes(v)}
          className={cn("flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-black uppercase tracking-wide transition-colors disabled:opacity-30", value === v ? "bg-white text-black" : "text-white/65 hover:text-white")} style={poppins}>
          {label}
        </button>
      ))}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={cn("flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors", active ? "bg-white text-black" : "bg-white/[0.07] text-white/75 hover:bg-white/[0.12]")}>
      {children}
    </button>
  );
}

function FilterPanel({ filter, setFilter, kinds, count, statusReady, c, onDone }: { filter: DayFilter; setFilter: (f: DayFilter) => void; kinds: D501BoardKind[]; count: number; statusReady: boolean; c: D501DaysCopy; onDone: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black uppercase" style={poppins}>{c.findBoard}</h2>
        <button type="button" onClick={onDone} aria-label={c.close} className="flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>
      </div>
      <label className="flex h-11 items-center gap-2 rounded-full bg-white/[0.07] px-4 focus-within:ring-2 focus-within:ring-white/30">
        <Search className="size-4 shrink-0 text-white/45" />
        <input value={filter.query} onChange={(e) => setFilter({ ...filter, query: e.target.value })} placeholder={c.searchPlaceholder} maxLength={60}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold placeholder:text-white/35 focus:outline-none" />
        {filter.query && <button type="button" onClick={() => setFilter({ ...filter, query: "" })} aria-label={c.clearSearch}><X className="size-4 text-white/50" /></button>}
      </label>
      <div>
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/50" style={poppins}>{c.show}</p>
        <Segmented value={statusReady ? filter.status : "all"} disabled={statusReady ? [] : ["todo", "done"]} onChange={(status) => setFilter({ ...filter, status })} options={[["all", c.statusAll, c.statusAllAria], ["todo", c.statusTodo, c.statusTodoAria], ["done", c.statusDone, c.statusDone]]} />
      </div>
      {kinds.length > 1 && (
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/50" style={poppins}>{c.boardType}</p>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={filter.kind === "all"} onClick={() => setFilter({ ...filter, kind: "all" })}>{c.allTypes}</FilterChip>
            {kinds.map((k) => (
              <FilterChip key={k} active={filter.kind === k} onClick={() => setFilter({ ...filter, kind: filter.kind === k ? "all" : k })}><span className={cn("size-1.5 rounded-full", KIND_DOT[k])} />{c.kinds[k]}</FilterChip>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={() => setFilter(NO_FILTER)} className="h-12 flex-1 rounded-full bg-white/10 text-sm font-bold uppercase hover:bg-white/15" style={poppins}>{c.clear}</button>
        <button type="button" onClick={onDone} className="h-12 flex-[2] rounded-full bg-brand-green text-sm font-black uppercase text-white hover:bg-brand-green-deep" style={poppins}>{c.showN(count)}</button>
      </div>
    </div>
  );
}

function Tile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/[0.05] px-2 py-2">
      <p className="flex items-center justify-center gap-1 text-base font-black tabular-nums" style={poppins}><span className="text-white/50">{icon}</span>{value}</p>
      <p className="truncate text-[10px] font-semibold text-white/50">{label}</p>
    </div>
  );
}

function DayDetail({ day, model, c, f, locale, guest, game, onPlay, onClose }: {
  day: CalDay; model: CalModel; c: D501DaysCopy; f: Formats; locale: string; guest: boolean; game: WordDailyGame; onPlay: (d: CalDay) => void; onClose?: () => void;
}) {
  const isToday = day.day === model.today;
  const m = day.mine;
  const [copied, setCopied] = useState(false);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}${window.location.pathname}?dia=${day.day}&jugar=1`;
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); window.setTimeout(() => setCopied(false), 2_000); } catch { /* no clipboard: nothing to say */ }
  };
  const rate = day.stats && day.stats.players > 0 ? Math.round((day.stats.checkouts / day.stats.players) * 100) : null;
  const unit = day.unit ? c.units[day.unit] ?? d501UnitLabel(day.unit, locale) ?? day.unit : null;
  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-3">
        <BoardArt day={day} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-white/50">#{day.number} · {f.long(day.day)}</p>
          <h2 className="mt-0.5 text-2xl font-black leading-tight" style={poppins}>{day.closed ? day.subject ?? day.title : c.todayBoard}</h2>
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label={c.close} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>}
      </div>
      {day.closed ? (day.subject && <p className="mt-3 text-sm text-white/75">{day.title}</p>) : <p className="mt-3 text-sm text-white/60">{c.hiddenNote}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {day.kind && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-white/80">
            <span className={cn("size-1.5 rounded-full", KIND_DOT[day.kind])} />{c.kinds[day.kind]}
          </span>
        )}
        {unit && <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-white/70">{unit}</span>}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11px] font-bold text-white/70"><TierBars tier={day.tier} label={c.tiers[day.tier]} />{c.tiers[day.tier]}</span>
        {isToday && <span className="rounded-full bg-brand-blue px-2.5 py-1 text-[11px] font-black text-white">{c.rankedToday}</span>}
      </div>

      <div className={cn("mt-4 rounded-2xl px-4 py-3", m.state === "out" ? "bg-brand-green text-black" : m.state === "left" || m.state === "gaveUp" ? "bg-brand-blue" : "bg-white/[0.05]")}>
        <p className={cn("text-[10px] font-black uppercase tracking-[0.18em]", m.state === "out" ? "text-black/65" : "text-white/60")} style={poppins}>{c.yourResult}</p>
        {m.state === "out" && <p className="mt-1 text-2xl font-black tabular-nums" style={poppins}>{c.resultOut(m.darts)}</p>}
        {m.state === "left" && <p className="mt-1 text-2xl font-black tabular-nums" style={poppins}>{c.resultLeft(m.left)}</p>}
        {m.state === "gaveUp" && <p className="mt-1 text-xl font-black" style={poppins}>{c.resultGaveUp(m.left)}</p>}
        {m.state === "started" && <p className="mt-1 text-lg font-black text-brand-yellow" style={poppins}>{c.resultStarted(m.left, m.darts)}</p>}
        {m.state === "unknown" && <p className="mt-1 text-base font-bold text-white/80">{model.history === "failed" ? c.historyFailed : "…"}</p>}
        {m.state === "none" && <p className="mt-1 text-base font-bold text-white/80">{isToday ? c.notThrownToday : c.notPlayed}</p>}
        {day.stale && <p className={cn("mt-1 text-[11px]", m.state === "out" ? "text-black/65" : "text-white/60")}>{c.staleNote}</p>}
      </div>

      {day.stats && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Tile icon={<Users className="size-3.5" />} value={String(day.stats.players)} label={c.statPlayers} />
          <Tile icon={<Check className="size-3.5" />} value={rate != null ? `${rate}%` : "—"} label={c.statCheckedOut} />
          <Tile icon={<Trophy className="size-3.5" />} value={day.stats.bestDarts != null ? String(day.stats.bestDarts) : "—"} label={c.statBest} />
        </div>
      )}

      <div className="mt-5 space-y-2">
        {isToday && guest && !isDone(m)
          ? <DailySignIn game={game} placement="days_detail" className="flex h-12 w-full items-center justify-center rounded-full bg-brand-yellow text-sm font-black uppercase text-black hover:bg-brand-yellow-deep">{c.signUpToday}</DailySignIn>
          : <GreenButton className="h-12 text-sm" onClick={() => onPlay(day)}>{m.state === "started" ? c.continueRun : isDone(m) ? c.seeResult : m.state === "unknown" ? c.pillPlay : c.play(day.number)}</GreenButton>}
        {!isToday && <p className="text-center text-[11px] text-white/45">{c.practiceNote}</p>}
      </div>
      <button type="button" onClick={() => { void copyLink(); }} className="mt-4 flex items-center gap-1.5 truncate rounded-xl bg-white/[0.04] px-3 py-2 text-left text-[11px] text-white/45 hover:bg-white/[0.08]" aria-label={c.copyLink}>
        {copied ? <Check className="size-3 shrink-0 text-brand-green-light" /> : <Copy className="size-3 shrink-0" />}<span className="truncate">{copied ? c.copied : link.replace(/^https?:\/\//, "")}</span>
      </button>
    </div>
  );
}

/* ───────────── data ───────────── */

/** The day index (public) and the player's own results, refetched when the player or the Argentine day changes. */
function useCalendar(locale: string, owner: string, today: string) {
  const [index, setIndex] = useState<{ key: string; value: DaysIndex | null } | null>(null);
  const [mine, setMine] = useState<{ key: string; value: Record<string, D501MyDay> | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [lateBy, setLate] = useState<{ day: string; n: number }>({ day: today, n: 0 });
  const late = lateBy.day === today ? lateBy.n : 0;
  const key = `${locale}:${today}:${attempt}:${late}`;
  const mineKey = `${owner}:${today}:${attempt}`;
  useEffect(() => {
    let cancelled = false;
    darts501CalendarApi.days(locale).then((value) => { if (!cancelled) setIndex({ key, value }); }, () => { if (!cancelled) setIndex({ key, value: null }); });
    return () => { cancelled = true; };
  }, [locale, key]);
  useEffect(() => {
    let cancelled = false;
    darts501CalendarApi.myDays(locale).then((value) => { if (!cancelled) setMine({ key: mineKey, value: value.days }); }, () => { if (!cancelled) setMine({ key: mineKey, value: null }); });
    return () => { cancelled = true; };
  }, [locale, mineKey]);
  const loaded = index?.key === key ? index.value : undefined;
  // A copy from before midnight (a cache, or a server still on yesterday): asked again shortly, a few times.
  useEffect(() => {
    if (!loaded || loaded.today >= today || late >= 6) return;
    const t = window.setTimeout(() => setLate({ day: today, n: late + 1 }), 30_000);
    return () => window.clearTimeout(t);
  }, [loaded, today, late]);
  // Results belong to the player and day they were fetched for: until those arrive they are "loading", never "none".
  const own = mine?.key === mineKey ? mine.value : undefined;
  // The server's day is the one shown: a cached copy never outlives its day (its max-age ends at that midnight), so an
  // earlier day here means this device's clock is ahead, and blocking the page would lock the player out.
  const model = useMemo(() => (loaded ? buildModel(loaded, own) : loaded), [loaded, own]);
  return { model, retry: () => setAttempt((n) => n + 1) };
}

/* ───────────── page ───────────── */

/**
 * Football Darts 501's days calendar: one month at a time (swipe or arrows), a list as the second view, the player's own
 * results on every day, and today's board kept secret until its day closes.
 */
export function D501Days({ game, locale, today, owner, onBack, onOpenDay }: {
  game: WordDailyGame; locale: string; today: string; owner: string; onBack: () => void; onOpenDay: (day: string) => void;
}) {
  const c = d501DaysCopy(locale);
  const w = wordDailyCopy(locale);
  const f = useFormats(locale);
  const guest = owner === "guest";
  const { model, retry } = useCalendar(locale, owner, today);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [chosenFilter, setFilter] = useState<DayFilter>(NO_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [month, setMonth] = useState<string | null>(null);
  const [dir, setDir] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // "To play" / "Played" mean nothing until the player's results are in.
  const ready = model?.history === "ready";
  const filter = useMemo(() => (model && !ready && chosenFilter.status !== "all" ? { ...chosenFilter, status: "all" as const } : chosenFilter), [model, ready, chosenFilter]);
  const filtering = isFiltering(filter);
  const firstMonth = model && model.days.length ? monthOf(model.days[model.days.length - 1].day) : monthOf(today);
  const lastMonth = model ? monthOf(model.lastSeeded > model.today ? model.lastSeeded : model.today) : monthOf(today);
  const shownMonth = month ?? (model ? monthOf(model.today) : monthOf(today));
  const past = useMemo(() => (model ? model.days.filter((d) => d.day !== model.today) : []), [model]);
  const kindsPresent = useMemo(() => KIND_ORDER.filter((k) => past.some((d) => d.kind === k)), [past]);
  // The list leaves today to the row on top; the calendar shows it in its cell.
  const matchCount = useMemo(() => (view === "list" ? past : model?.days ?? []).filter((d) => matchesFilter(d, filter, labelsOf(d, f, c))).length, [view, past, model, filter, f, c]);
  const todayDay = model?.days[0]?.day === model?.today ? model?.days[0] ?? null : null;
  const selectedDay = model?.days.find((d) => d.day === selected) ?? todayDay ?? model?.days[0] ?? null;
  const navigate = useCallback((m: string, d: number) => { setDir(d); setMonth(m); }, []);
  const closeSheet = useCallback(() => setSheet(false), []);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const onChange = () => { if (wide.matches) setSheet(false); };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, []);
  const closeFilter = useCallback(() => setFilterOpen(false), []);
  const select = useCallback((d: CalDay) => {
    setSelected(d.day);
    if (monthOf(d.day) !== shownMonth) navigate(monthOf(d.day), monthOf(d.day) > shownMonth ? 1 : -1);
    if (window.matchMedia("(max-width: 1023px)").matches) setSheet(true);
  }, [shownMonth, navigate]);
  const play = useCallback((d: CalDay) => onOpenDay(d.day), [onOpenDay]);
  const randomUnplayed = () => {
    const pool = past.filter((d) => d.mine.state === "none");
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    navigate(monthOf(pick.day), monthOf(pick.day) > shownMonth ? 1 : -1);
    select(pick);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== "calendar" || sheet || filterOpen || pickerOpen) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const next = addMonths(shownMonth, e.key === "ArrowRight" ? 1 : -1);
      if (next < firstMonth || next > lastMonth) return;
      e.preventDefault();
      navigate(next, e.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, sheet, filterOpen, pickerOpen, navigate, shownMonth, firstMonth, lastMonth]);

  const header = (
    <header className="shrink-0 bg-surface-page-alt/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-md items-center gap-2 px-4 lg:max-w-6xl lg:px-8">
        <button type="button" onClick={onBack} aria-label={c.back} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
        <div className="min-w-0 flex-1">
          <Brand words={game.brand} className="truncate text-[13px] leading-none" />
          {model && <p className="mt-1 truncate text-[11px] font-bold text-white/50">{c.allDays(model.days.length)}</p>}
        </div>
        {model && (
          <>
            <button type="button" onClick={() => setFilterOpen(true)} aria-label={c.searchFilter}
              className={cn("relative flex size-9 shrink-0 items-center justify-center rounded-full", filtering ? "bg-white text-black" : "bg-white/10 hover:bg-white/20")}>
              <SlidersHorizontal className="size-4" />
              {filtering && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-brand-green-light ring-2 ring-surface-page-alt" />}
            </button>
            <Segmented value={view} onChange={setView} options={[["calendar", <CalendarDays key="c" className="size-4" />, c.calendar], ["list", <List key="l" className="size-4" />, c.list]]} />
          </>
        )}
      </div>
    </header>
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center text-white" lang={locale}>
      {header}
      {model === undefined ? (
        <div className="flex flex-1 items-center justify-center"><p className="animate-pulse text-sm text-white/70">{w.loading}</p></div>
      ) : model === null ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <p className="text-center text-sm text-white/80">{w.loadError}</p>
          <button type="button" onClick={retry} className="mt-4 h-11 rounded-full bg-brand-yellow px-6 text-sm font-black uppercase text-black" style={poppins}>{w.retry}</button>
        </div>
      ) : (
        <>
          <div ref={scroller} onScroll={(e) => setScrolled((e.target as HTMLDivElement).scrollTop > 700)} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-md px-4 pb-6 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 lg:px-8">
              <main className="min-w-0 space-y-2.5 pt-2">
                <TodayRow model={model} c={c} f={f} guest={guest} game={game} onSelect={select} onPlay={play} onRandom={randomUnplayed} />
                <StatsBar model={model} c={c} retryLabel={w.retry} onRetry={retry} open={statsOpen} onToggle={() => setStatsOpen((v) => !v)} />
                <div className="pt-1.5">
                  {view === "calendar" ? (
                    <CalendarPane model={model} month={shownMonth} dir={dir} navigate={navigate} firstMonth={firstMonth} lastMonth={lastMonth}
                      selected={selectedDay?.day ?? null} filter={filter} c={c} f={f} onSelect={select} pickerOpen={pickerOpen} setPickerOpen={setPickerOpen} onClearFilter={() => setFilter(NO_FILTER)} />
                  ) : (
                    <ListPane model={model} c={c} f={f} locale={locale} filter={filter} selected={selectedDay?.day ?? null} onSelect={select} onClearFilter={() => setFilter(NO_FILTER)} />
                  )}
                </div>
              </main>
              <aside className="hidden lg:block">
                <div className="sticky top-2 mt-2 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  {selectedDay && <DayDetail day={selectedDay} model={model} c={c} f={f} locale={locale} guest={guest} game={game} onPlay={play} />}
                </div>
              </aside>
            </div>
          </div>

          <AnimatePresence>
            {scrolled && view === "list" && (
              <motion.button type="button" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                onClick={() => scroller.current?.scrollTo({ top: 0, behavior: "smooth" })}
                className="fixed bottom-5 left-1/2 z-40 flex h-10 -translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-4 text-xs font-black uppercase text-black shadow-lg shadow-black/40" style={poppins}>
                <ArrowUp className="size-4" />{c.today}
              </motion.button>
            )}
          </AnimatePresence>

          <Sheet open={sheet && !!selectedDay} onClose={closeSheet} title={selectedDay ? `#${selectedDay.number}` : c.todayBoard} closeLabel={c.close}>
            {selectedDay && <DayDetail day={selectedDay} model={model} c={c} f={f} locale={locale} guest={guest} game={game} onPlay={play} onClose={closeSheet} />}
          </Sheet>
          <Sheet open={filterOpen} onClose={closeFilter} title={c.findBoard} closeLabel={c.close} desktop>
            <FilterPanel filter={chosenFilter} setFilter={setFilter} kinds={kindsPresent} count={matchCount} statusReady={ready} c={c} onDone={closeFilter} />
          </Sheet>
        </>
      )}
    </div>
  );
}
