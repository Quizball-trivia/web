"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Play } from "lucide-react";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import { ALL_DEMO_MODES, demoText, type DemoModeCard } from "@/features/demos/demoModes";
import { useQueryClient } from "@tanstack/react-query";
import { useDailyChallenges } from "@/lib/queries/dailyChallenges.queries";
import { useLocale } from "@/contexts/LocaleContext";
import { dailyChallengePlayPath } from "@/lib/domain/dailyChallengeSlugs";

/** Curated pool the "up next" row draws from, in preference order. */
const NEXT_UP_SLUGS = [
  "daily-moneyDrop",
  "daily-trueFalse",
  "daily-countdown",
  "daily-clues",
  "daily-careerPath",
  "daily-imposter",
  "daily-highLow",
  "daily-footballLogic",
  "mini-guess-the-goal",
  "mini-final-third",
  "mini-road-to-goal",
];

const MODE_BY_SLUG = new Map(ALL_DEMO_MODES.map((mode) => [mode.slug, mode]));

function hrefFor(mode: DemoModeCard): string {
  if (mode.dailyType) return dailyChallengePlayPath(mode.dailyType);
  const real: Record<string, string> = {
    "mini-final-third": "/free-kicks",
    "mini-road-to-goal": "/road-to-goal",
    "mini-guess-the-goal": "/guess-the-goal",
  };
  return real[mode.slug] ?? `/demos/${mode.slug}?from=/play`;
}

/**
 * "Up next" strip under the completion card — the streaming-service move: when
 * one game ends, offer the next one instead of a dead end. Daily challenges the
 * player has already finished today are filtered out, and the challenge they
 * just played never appears.
 */
export function DailyNextUpRow({
  excludeDailyType,
  limit = 3,
  onSelect,
}: {
  /** The challenge just completed — never recommend it back. */
  excludeDailyType?: string;
  limit?: number;
  /** Completion-aware navigation: the modal saves the finished game before following the link. */
  onSelect?: (href: string) => void;
}) {
  // Rendered inside modals that some unit tests mount without a
  // QueryClientProvider; render nothing there rather than throwing.
  const hasQueryClient = useHasQueryClient();
  if (!hasQueryClient) return null;
  return <NextUpSuggestions excludeDailyType={excludeDailyType} limit={limit} onSelect={onSelect} />;
}

function useHasQueryClient(): boolean {
  try {
    useQueryClient();
    return true;
  } catch {
    return false;
  }
}

function NextUpSuggestions({
  excludeDailyType,
  limit, onSelect }: {
  excludeDailyType?: string;
  limit: number; onSelect?: (href: string) => void }) {
  const { t, locale } = useLocale();
  const { data: dailyChallenges = [] } = useDailyChallenges();

  const completedTypes = useMemo(
    () =>
      new Set(
        dailyChallenges.filter((challenge) => challenge.completedToday).map((c) => c.challengeType),
      ),
    [dailyChallenges],
  );

  const suggestions = useMemo(
    () =>
      NEXT_UP_SLUGS.map((slug) => MODE_BY_SLUG.get(slug))
        .filter((mode): mode is DemoModeCard => Boolean(mode))
        // Never recommend the challenge just played, or anything already
        // finished today — every card here must be startable right now.
        .filter((mode) => mode.dailyType !== excludeDailyType)
        .filter((mode) => !(mode.dailyType && completedTypes.has(mode.dailyType)))
        .slice(0, limit),
    [completedTypes, excludeDailyType, limit],
  );

  if (suggestions.length === 0) return null;

  return (
    <div className="w-full">
      <h3 className="mb-2 font-poppins text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
        {t("dailyGames.nextUpTitle")}
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {suggestions.map((mode) => (
          <Link
            key={mode.slug}
            href={hrefFor(mode)}
            onClick={(event) => { if (onSelect) { event.preventDefault(); onSelect(hrefFor(mode)); } }}
            className="group flex flex-col overflow-hidden rounded-xl bg-brand-blue transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <div className="relative aspect-video w-full overflow-hidden">
              <DemoModeArt
                slug={mode.slug}
                className="size-full transition-transform duration-300 group-hover:scale-[1.05]"
              />
              <span className="absolute bottom-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-brand-yellow text-black">
                <Play className="size-3.5" />
              </span>
            </div>
            <p className="truncate p-2.5 font-poppins text-[13px] font-semibold uppercase text-white md:text-sm">
              {demoText(mode.title, locale)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
