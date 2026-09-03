"use client";

/**
 * "All Games" grid for the Play page — every game mode as an artwork card,
 * 3 per row on desktop and 2 on mobile, reusing the /demos hub artwork
 * (DemoModeArt: the real illustration when a game has one, its gradient +
 * glyph tile otherwise).
 *
 * Auction and Tic-Tac-Toe are excluded — they keep their own bespoke cards
 * above this grid.
 *
 * Not yet wired to real sessions: cards link to their /demos routes.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { Clock3, Play, Search, User, Users, X } from "lucide-react";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import {
  ALL_DAILY_DEMO_MODES,
  LAB_DEMO_MODES,
  MINI_GAME_DEMO_MODES,
  type DemoModeCard,
} from "@/features/demos/demoModes";
import { useLocale } from "@/contexts/LocaleContext";

type Category = "all" | "daily" | "quick" | "new";

const FILTERS: Array<{ id: Category; en: string; ka: string }> = [
  { id: "all", en: "All", ka: "ყველა" },
  { id: "daily", en: "Daily", ka: "დღიური" },
  { id: "quick", en: "Quick play", ka: "სწრაფი" },
  { id: "new", en: "New", ka: "ახალი" },
];

/**
 * Real in-app destinations. Daily challenges resolve to their own route from
 * the slug; these are the mini-games that have shipped a real page. Anything
 * without a real route yet falls back to its /demos preview.
 */
const REAL_ROUTES: Record<string, string> = {
  "mini-final-third": "/free-kicks",
  "mini-road-to-goal": "/road-to-goal",
  "mini-guess-the-goal": "/guess-the-goal",
};

/** Where a card should link: the real game when it exists, else the demo. */
function hrefFor(mode: DemoModeCard): string {
  if (mode.dailyType) return `/daily/challenges/${mode.dailyType}`;
  return REAL_ROUTES[mode.slug] ?? `/demos/${mode.slug}?from=/play`;
}

/** Games playable against a live opponent; everything else is solo. */
const ONLINE_SLUGS = new Set([
  "lab-own-goal",
  "lab-say-it-with-memes",
  "lab-top-10-knockout",
  "lab-missing-xi",
  "lab-ball-knowledge",
  "lab-bingo-battle",
  "lab-connections-race",
  "lab-stat-501",
  "mini-golden-goal",
  "mini-career-race",
  "mini-quiz-board",
  "mini-last-one-standing",
  "mini-football-grid",
]);

interface Entry {
  mode: DemoModeCard;
  category: Exclude<Category, "all">;
  isNew?: boolean;
}

function GameCard({ entry, index, locale }: { entry: Entry; index: number; locale: string }) {
  const { mode, isNew } = entry;
  const title = locale === "ka" ? mode.title.ka : mode.title.en;
  const description = locale === "ka" ? mode.description.ka : mode.description.en;
  const online = ONLINE_SLUGS.has(mode.slug);

  return (
    <Link
      href={hrefFor(mode)}
      className="group flex animate-in fade-in slide-in-from-bottom-2 flex-col overflow-hidden rounded-xl bg-brand-blue duration-300 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      style={{ animationDelay: `${Math.min(index * 30, 420)}ms`, animationFillMode: "backwards" }}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <DemoModeArt
          slug={mode.slug}
          className="size-full transition-transform duration-300 group-hover:scale-[1.05]"
        />

        {/* Solo / Online badge — the mode's format at a glance. */}
        <span
          className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-poppins text-[9px] font-bold uppercase leading-none tracking-wide md:text-[10px] ${
            online ? "bg-brand-green text-white" : "bg-black/65 text-white"
          }`}
        >
          {online ? <Users className="size-2.5" /> : <User className="size-2.5" />}
          {online
            ? locale === "ka"
              ? "ონლაინ"
              : "Online"
            : locale === "ka"
              ? "სოლო"
              : "Solo"}
        </span>

        {isNew ? (
          <span className="absolute right-2 top-2 rounded-md bg-brand-yellow px-1.5 py-0.5 font-poppins text-[9px] font-bold uppercase leading-none tracking-wide text-black md:text-[10px]">
            {locale === "ka" ? "ახალი" : "New"}
          </span>
        ) : null}

        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 font-poppins text-[11px] font-bold uppercase text-black md:text-xs">
            <Play className="size-3 fill-current" />
            {locale === "ka" ? "თამაში" : "Play"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-2.5 md:p-3">
        <h3 className="truncate font-poppins text-[12px] font-semibold uppercase text-white md:text-[15px]">
          {title}
        </h3>
        <p className="mt-1 line-clamp-2 font-poppins text-[10px] leading-snug text-white/70 md:text-[12px]">
          {description}
        </p>
        <p className="mt-2 flex items-center gap-1 font-poppins text-[9px] text-white/55 md:text-[10px]">
          <Clock3 className="size-2.5" /> 1–2 min
        </p>
      </div>
    </Link>
  );
}

export function AllGamesGrid() {
  const { locale } = useLocale();
  const [filter, setFilter] = useState<Category>("all");
  const [query, setQuery] = useState("");

  const entries: Entry[] = useMemo(
    () => [
      // Every daily challenge, including the two hidden from the demos hub.
      ...ALL_DAILY_DEMO_MODES.map((mode) => ({ mode, category: "daily" as const })),
      ...LAB_DEMO_MODES.map((mode) => ({ mode, category: "new" as const, isNew: true })),
      ...MINI_GAME_DEMO_MODES.map((mode) => ({ mode, category: "quick" as const })),
    ],
    [],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter !== "all" && e.category !== filter) return false;
      if (!q) return true;
      const haystack = [
        e.mode.title.en,
        e.mode.title.ka,
        e.mode.description.en,
        e.mode.description.ka,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, filter, query]);

  const counts = useMemo(
    () => ({
      all: entries.length,
      daily: entries.filter((e) => e.category === "daily").length,
      quick: entries.filter((e) => e.category === "quick").length,
      new: entries.filter((e) => e.category === "new").length,
    }),
    [entries],
  );

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3 md:mb-4">
        <h2 className="font-poppins text-[16px] font-semibold uppercase leading-tight text-white md:text-[24px]">
          {locale === "ka" ? "ყველა თამაში" : "All Games"}
        </h2>
        <span className="font-poppins text-[10px] uppercase tracking-wide text-white/40 md:text-xs">
          {counts.all} {locale === "ka" ? "თამაში" : "games"}
        </span>
      </div>

      <div className="mb-3 md:mb-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/55" />
          {/* Same flat blue Figma pill as the ranked Who Am I / Countdown
              answer field (live-special panels). A plain <input>, not the
              shared Input component: that applies a `dark:bg-input/30`
              default which overrides bg-brand-blue on dark-mode desktop
              while letting it through on iOS, so the pill would render
              differently across platforms. */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={locale === "ka" ? "მოძებნე თამაში" : "Search games"}
            aria-label={locale === "ka" ? "მოძებნე თამაში" : "Search games"}
            className="font-poppins h-14 w-full rounded-[14px] border-none bg-brand-blue px-5 pl-12 pr-12 text-center text-base uppercase text-white outline-none placeholder:uppercase placeholder:tracking-[0.08em] placeholder:text-white/55 focus:outline-none disabled:opacity-50"
            style={{
              fontWeight: 600,
              letterSpacing: "0.08em",
              boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)",
            }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={locale === "ka" ? "გასუფთავება" : "Clear search"}
              className="absolute right-4 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2 md:mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`font-poppins inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors md:text-xs ${
              filter === f.id
                ? "bg-brand-yellow text-black"
                : "bg-white/[0.07] text-white/60 hover:bg-white/[0.12]"
            }`}
          >
            {locale === "ka" ? f.ka : f.en}
            <span className={filter === f.id ? "text-black/50" : "text-white/35"}>
              {counts[f.id]}
            </span>
          </button>
        ))}
      </div>

      {/* 2 across on mobile, 3 from md up (owner call). */}
      {visible.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4">
          {visible.map((entry, i) => (
            <GameCard key={entry.mode.slug} entry={entry} index={i} locale={locale} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center font-poppins text-[13px] text-white/40">
          {locale === "ka"
            ? `ვერაფერი მოიძებნა „${query}“-ზე`
            : `No games match “${query}”`}
        </p>
      )}
    </div>
  );
}
