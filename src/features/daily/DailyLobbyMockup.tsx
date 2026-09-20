"use client";

/**
 * LOCAL MOCKUP — the Daily Challenges tab as a Netflix-style browse surface:
 * a hero for today's headline game, then horizontally-scrolling shelves
 * (Continue / Today's challenges / Quick games / New). Deliberately NOT a
 * dense casino grid — shelves read as curated content and keep the daily
 * habit loop at the top.
 *
 * Also mocks the "up next" chain: finish a game and the next one is offered
 * with a countdown, Netflix post-play style (see NextUpOverlay).
 *
 * Auction and Weekend League are excluded — flagship events, not shelf items.
 *
 * Preview it two ways:
 *   - /dev/mini-games-tab (always available in dev), or
 *   - set NEXT_PUBLIC_DAILY_LOBBY_MOCKUP=true in .env.local, which makes
 *     /daily/challenges render this instead of the real page.
 *
 * Nothing is wired to the backend: tiles link to their /demos routes and the
 * "completed" state is faked. Delete this file, the dev route and the flag
 * branch in app/(app)/daily/challenges/page.tsx to remove it entirely.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Clock3, Play, X } from "lucide-react";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import {
  DAILY_DEMO_MODES,
  LAB_DEMO_MODES,
  MINI_GAME_DEMO_MODES,
  type DemoModeCard,
} from "@/features/demos/demoModes";

/** Faked per-game state so the mockup can show a real-looking browse surface. */
const COMPLETED = new Set(["daily-trueFalse", "daily-countdown"]);
const IN_PROGRESS = new Set(["daily-moneyDrop"]);

interface Shelf {
  id: string;
  title: string;
  subtitle?: string;
  modes: DemoModeCard[];
  /** Bigger tiles for the lead shelf. */
  large?: boolean;
}

// ── Tile ──────────────────────────────────────────────────────────────────────
function GameTile({
  mode,
  large = false,
  onPlay,
}: {
  mode: DemoModeCard;
  large?: boolean;
  onPlay: (mode: DemoModeCard) => void;
}) {
  const done = COMPLETED.has(mode.slug);
  const resuming = IN_PROGRESS.has(mode.slug);

  return (
    <div className={large ? "w-[190px] shrink-0 md:w-[280px]" : "w-[132px] shrink-0 md:w-[190px]"}>
      <button
        type="button"
        onClick={() => onPlay(mode)}
        className="group relative block w-full overflow-hidden rounded-xl bg-surface-card-deeper text-left transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <div className="relative aspect-video w-full overflow-hidden">
          <DemoModeArt slug={mode.slug} className="size-full" />
          {done ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-green px-2.5 py-1 font-poppins text-[10px] font-bold uppercase text-white">
                <Check className="size-3" /> Done
              </span>
            </div>
          ) : null}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-poppins text-[11px] font-bold uppercase text-black">
              <Play className="size-3 fill-current" /> {resuming ? "Resume" : "Play"}
            </span>
          </div>
          {resuming ? (
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
              <div className="h-full w-2/5 bg-brand-red" />
            </div>
          ) : null}
        </div>
        <div className="px-2 py-2">
          <p className="truncate font-poppins text-[11px] font-semibold text-white md:text-[13px]">
            {mode.title.en}
          </p>
          <p className="mt-0.5 flex items-center gap-1 font-poppins text-[9px] text-white/45 md:text-[10px]">
            <Clock3 className="size-2.5" /> 1–2 min
          </p>
        </div>
      </button>
    </div>
  );
}

// ── Shelf ─────────────────────────────────────────────────────────────────────
function ShelfRow({ shelf, onPlay }: { shelf: Shelf; onPlay: (mode: DemoModeCard) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
  }, [sync]);

  const nudge = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  };

  if (shelf.modes.length === 0) return null;

  return (
    <section className="group/shelf relative mt-7 md:mt-9">
      <div className="mb-2.5 flex items-baseline gap-3 px-4 md:px-8">
        <h2 className="font-poppins text-[15px] font-semibold text-white md:text-[20px]">
          {shelf.title}
        </h2>
        {shelf.subtitle ? (
          <span className="font-poppins text-[10px] uppercase tracking-wide text-white/40 md:text-xs">
            {shelf.subtitle}
          </span>
        ) : null}
      </div>

      <div className="relative">
        {!atStart ? (
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => nudge(-1)}
            className="absolute left-0 top-0 z-10 hidden h-full w-10 items-center justify-center bg-gradient-to-r from-black/70 to-transparent text-white opacity-0 transition-opacity group-hover/shelf:opacity-100 md:flex"
          >
            <ChevronLeft className="size-6" />
          </button>
        ) : null}

        <div
          ref={scroller}
          onScroll={sync}
          className="scrollbar-hide flex gap-2.5 overflow-x-auto scroll-smooth px-4 pb-1 md:gap-3 md:px-8"
        >
          {shelf.modes.map((mode) => (
            <GameTile key={mode.slug} mode={mode} large={shelf.large} onPlay={onPlay} />
          ))}
        </div>

        {!atEnd ? (
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => nudge(1)}
            className="absolute right-0 top-0 z-10 hidden h-full w-10 items-center justify-center bg-gradient-to-l from-black/70 to-transparent text-white opacity-0 transition-opacity group-hover/shelf:opacity-100 md:flex"
          >
            <ChevronRight className="size-6" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

// ── Post-play "Up next" (Netflix autoplay countdown) ──────────────────────────
function NextUpOverlay({
  justFinished,
  next,
  onDismiss,
}: {
  justFinished: DemoModeCard;
  next: DemoModeCard;
  onDismiss: () => void;
}) {
  const [seconds, setSeconds] = useState(8);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [seconds]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-surface-deep"
      >
        <div className="border-b border-white/5 px-5 py-4 text-center">
          <p className="font-poppins text-[11px] font-bold uppercase tracking-wide text-brand-green-light">
            {justFinished.title.en} complete
          </p>
          <p className="mt-1 font-poppins text-2xl font-extrabold text-white">+120 coins</p>
        </div>

        <div className="p-5">
          <p className="font-poppins text-[11px] font-semibold uppercase tracking-wide text-white/45">
            Up next
          </p>
          <div className="mt-2 flex gap-3">
            <div className="w-28 shrink-0 overflow-hidden rounded-lg">
              <DemoModeArt slug={next.slug} className="aspect-video w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-poppins text-sm font-bold text-white">{next.title.en}</p>
              <p className="mt-0.5 line-clamp-2 font-poppins text-[11px] leading-snug text-white/50">
                {next.description.en}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Link
              href={`/demos/${next.slug}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 font-poppins text-sm font-bold text-black transition-colors hover:bg-white/90"
            >
              <Play className="size-4 fill-current" />
              Play {seconds > 0 ? `(${seconds})` : "now"}
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-xl border border-white/15 px-4 py-2.5 font-poppins text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.06]"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-center font-poppins text-[10px] text-white/30">
            Mockup — autoplay countdown, no navigation
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export function DailyLobbyMockup() {
  const [finished, setFinished] = useState<DemoModeCard | null>(null);

  const dailyRemaining = useMemo(
    () => DAILY_DEMO_MODES.filter((m) => !COMPLETED.has(m.slug)),
    [],
  );
  const hero = dailyRemaining[0] ?? DAILY_DEMO_MODES[0];

  const shelves: Shelf[] = useMemo(() => {
    const continueRow = [...DAILY_DEMO_MODES, ...MINI_GAME_DEMO_MODES].filter(
      (m) => IN_PROGRESS.has(m.slug) || COMPLETED.has(m.slug),
    );
    return [
      {
        id: "continue",
        title: "Continue playing",
        modes: continueRow,
      },
      {
        id: "daily",
        title: "Today's challenges",
        subtitle: `${COMPLETED.size}/${DAILY_DEMO_MODES.length} done · resets 04:00`,
        modes: DAILY_DEMO_MODES,
        large: true,
      },
      { id: "quick", title: "Quick games", subtitle: "1–2 min", modes: MINI_GAME_DEMO_MODES },
      { id: "new", title: "New this week", modes: LAB_DEMO_MODES },
    ];
  }, []);

  /** Mock a completion: the tile you click "finishes" and offers the next game. */
  const handlePlay = (mode: DemoModeCard) => setFinished(mode);

  const nextUp = useMemo(() => {
    if (!finished) return null;
    const pool = [...dailyRemaining, ...MINI_GAME_DEMO_MODES, ...LAB_DEMO_MODES];
    return pool.find((m) => m.slug !== finished.slug) ?? null;
  }, [finished, dailyRemaining]);

  return (
    <div className="relative min-h-screen font-fun">
      {/* Same fixed page background as the app shell (/play, daily, etc.). */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />

      <div className="relative pb-14">
        {/* Hero — today's headline challenge */}
        <section className="relative mx-4 mt-5 overflow-hidden rounded-2xl md:mx-8 md:mt-8">
          <div className="relative aspect-[16/7] w-full md:aspect-[21/6]">
            <DemoModeArt slug={hero.slug} className="size-full" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
            <div className="absolute inset-y-0 left-0 flex max-w-[80%] flex-col justify-center gap-2 p-5 md:max-w-[55%] md:p-9">
              <span className="w-fit rounded-full bg-brand-orange px-2.5 py-1 font-poppins text-[9px] font-bold uppercase tracking-wide text-black md:text-[11px]">
                Today&apos;s challenge
              </span>
              <h1 className="font-poppins text-[22px] font-extrabold leading-tight text-white md:text-[40px]">
                {hero.title.en}
              </h1>
              <p className="line-clamp-2 max-w-md font-poppins text-[11px] leading-snug text-white/70 md:text-[15px]">
                {hero.description.en}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePlay(hero)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-poppins text-[12px] font-bold uppercase text-black transition-colors hover:bg-white/90 md:px-6 md:py-2.5 md:text-sm"
                >
                  <Play className="size-4 fill-current" /> Play
                </button>
                <span className="font-poppins text-[10px] font-semibold text-white/55 md:text-xs">
                  +120 coins · 1–2 min
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Daily progress strip — keeps the habit loop visible */}
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 md:mx-8">
          <span className="font-poppins text-[11px] font-bold uppercase tracking-wide text-brand-yellow md:text-xs">
            Today
          </span>
          <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-brand-gold-fill-deep">
            <div
              className="h-full rounded-full bg-brand-yellow transition-all"
              style={{ width: `${(COMPLETED.size / DAILY_DEMO_MODES.length) * 100}%` }}
            />
          </div>
          <span className="font-poppins text-[11px] font-semibold text-white/55 md:text-xs">
            {COMPLETED.size}/{DAILY_DEMO_MODES.length} · 320 coins
          </span>
        </div>

        {shelves.map((shelf) => (
          <ShelfRow key={shelf.id} shelf={shelf} onPlay={handlePlay} />
        ))}

        <p className="mt-10 text-center text-[10px] text-white/30">
          Local mockup — click any tile to preview the “up next” chain.
        </p>
      </div>

      <AnimatePresence>
        {finished && nextUp ? (
          <NextUpOverlay
            justFinished={finished}
            next={nextUp}
            onDismiss={() => setFinished(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
