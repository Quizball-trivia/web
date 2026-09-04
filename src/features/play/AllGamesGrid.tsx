"use client";

/**
 * Curated game sections for the Play page — two hand-picked, ordered rows
 * ("Daily Challenges" and "Play with coins") in a horizontal scroller, each an
 * artwork card reusing the /demos hub illustration (DemoModeArt). The order and
 * membership are owner-defined (see the slug arrays below); any mode not listed
 * is intentionally off the Play screen for now.
 *
 * A completed daily challenge shows a done state + an "unlocks in Hh Mm" timer
 * and sinks to the end of the row. Auction and Tic-Tac-Toe keep their own
 * bespoke cards above these sections.
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Play, User, Users } from "lucide-react";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import { ALL_DEMO_MODES, type DemoModeCard } from "@/features/demos/demoModes";
import { useDailyChallenges } from "@/lib/queries/dailyChallenges.queries";
import { useAuthStore } from "@/stores/auth.store";
import { useLocale } from "@/contexts/LocaleContext";

/** Real in-app destinations for the modes that have shipped a page. */
const REAL_ROUTES: Record<string, string> = {
  "mini-final-third": "/free-kicks",
  "mini-road-to-goal": "/road-to-goal",
  "mini-guess-the-goal": "/guess-the-goal",
};

/** Where a card links: the daily route, a real game, or the demo fallback.
 *  Guests always get the /demos preview — no coins earned, no coins staked,
 *  no online opponents. */
function hrefFor(mode: DemoModeCard, guest: boolean): string {
  if (guest) return `/demos/${mode.slug}?from=/play`;
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

// Owner-curated order. Every slug resolves against ALL_DEMO_MODES; unknown
// slugs are simply skipped, so a rename can't crash the Play screen.
const DAILY_CHALLENGE_SLUGS = [
  "daily-moneyDrop",
  "daily-countdown",
  "daily-trueFalse",
  "daily-clues",
  "daily-imposter",
  "daily-careerPath",
  "daily-highLow",
  "daily-footballLogic",
  "daily-fifaCards",
  "lab-missing-xi",
  "mini-pass-chain",
  "mini-guess-the-goal",
  "mini-stat-sniper",
];
const PLAY_WITH_COINS_SLUGS = [
  "mini-trivia-mines",
  "mini-final-third",
  "mini-road-to-goal",
  "mini-squad-spin",
  "mini-cash-out-ladder",
  "mini-hi-lo-ride",
];

const MODE_BY_SLUG = new Map(ALL_DEMO_MODES.map((mode) => [mode.slug, mode]));
const resolveModes = (slugs: string[]): DemoModeCard[] =>
  slugs
    .map((slug) => MODE_BY_SLUG.get(slug))
    .filter((mode): mode is DemoModeCard => Boolean(mode));

const DAILY_CHALLENGE_MODES = resolveModes(DAILY_CHALLENGE_SLUGS);
const PLAY_WITH_COINS_MODES = resolveModes(PLAY_WITH_COINS_SLUGS);

const CARD_WIDTH =
  "w-[calc((100%_-_1.25rem)/3)] shrink-0 snap-start md:w-[calc((100%_-_2rem)/3)]";

/** ms until the next 00:00 UTC — the daily-challenge reset boundary. */
function msUntilUtcReset(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Coarse "7h 23m" label until the daily reset, refreshed every 30s (drives the
 *  per-card "unlocks in" text; minute precision is plenty). Empty until mount. */
function useUnlockInLabel(): string {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilUtcReset());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  if (ms == null) return "";
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Live HH:MM:SS to the daily reset, next to the Daily Challenges header. Own
 *  state/interval so its per-second re-render never touches the card list;
 *  renders nothing until mount (avoids a hydration mismatch). */
function DailyResetTimer() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setText(formatCountdown(msUntilUtcReset()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1 font-poppins text-[10px] font-bold uppercase leading-none tracking-wide tabular-nums text-white/80 md:text-xs">
      <Clock3 className="size-3 text-brand-yellow" />
      {text}
    </span>
  );
}

function GameCard({
  mode,
  index,
  completed = false,
  unlockLabel = "",
}: {
  mode: DemoModeCard;
  index: number;
  completed?: boolean;
  unlockLabel?: string;
}) {
  const { t, locale } = useLocale();
  const isGuest = useAuthStore((state) => state.status) === "anonymous";
  const title = locale === "ka" ? mode.title.ka : mode.title.en;
  const description = locale === "ka" ? mode.description.ka : mode.description.en;
  const online = ONLINE_SLUGS.has(mode.slug);

  // Completed daily: a done state + reset timer, not tappable until it unlocks.
  if (completed) {
    return (
      <div
        className={`flex ${CARD_WIDTH} flex-col overflow-hidden rounded-xl bg-brand-blue/50`}
        aria-label={`${title} — ${t("play.completed")}`}
      >
        <div className="relative aspect-video w-full overflow-hidden">
          <DemoModeArt slug={mode.slug} className="size-full opacity-25" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 text-center">
            <CheckCircle2 className="size-6 text-brand-green-light md:size-7" />
            <span className="font-poppins text-[9px] font-bold uppercase tracking-wide text-white md:text-[11px]">
              {t("play.completed")}
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-2.5 md:p-3">
          <h3 className="truncate font-poppins text-[12px] font-semibold uppercase text-white/70 md:text-[15px]">
            {title}
          </h3>
          {unlockLabel && (
            <p className="mt-2 flex items-center gap-1 font-poppins text-[9px] uppercase tracking-wide text-brand-yellow md:text-[10px]">
              <Clock3 className="size-2.5" /> {t("play.unlocksIn", { time: unlockLabel })}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Link
      href={hrefFor(mode, isGuest)}
      className={`group flex ${CARD_WIDTH} animate-in fade-in slide-in-from-bottom-2 flex-col overflow-hidden rounded-xl bg-brand-blue duration-300 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
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

function GameSection({
  title,
  hint,
  modes,
  headerRight,
  isCompleted,
  unlockLabel = "",
}: {
  title: string;
  /** Muted coin-flavoured hint next to the title ("Earn coins", …). */
  hint?: string;
  modes: DemoModeCard[];
  headerRight?: React.ReactNode;
  isCompleted?: (mode: DemoModeCard) => boolean;
  unlockLabel?: string;
}) {
  if (modes.length === 0) return null;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3 md:mb-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-0.5">
          <h2 className="font-poppins text-[16px] font-semibold uppercase leading-tight text-white md:text-[24px]">
            {title}
          </h2>
          {hint && (
            <span className="inline-flex items-center gap-1 font-poppins text-[10px] font-bold uppercase tracking-wide text-white/50 md:text-xs">
              <Image
                src="/assets/coin-1.png?v=2"
                alt=""
                width={16}
                height={16}
                className="size-3.5 object-contain md:size-4"
              />
              {hint}
            </span>
          )}
        </div>
        {headerRight && <div className="flex shrink-0 items-center gap-2">{headerRight}</div>}
      </div>
      {/* Horizontal scroller — bleeds to the screen edges (-mx-4 px-4) so a card
          peeks past the viewport and invites the swipe; 3 cards fit per row. */}
      <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-1 md:gap-4">
        {modes.map((mode, index) => (
          <GameCard
            key={mode.slug}
            mode={mode}
            index={index}
            completed={isCompleted?.(mode) ?? false}
            unlockLabel={unlockLabel}
          />
        ))}
      </div>
    </div>
  );
}

/** Named AllGamesGrid for backwards-compat with its single import; renders the
 *  two curated horizontal-scroll sections rather than a searchable grid. */
export function AllGamesGrid() {
  const { t } = useLocale();
  const isGuest = useAuthStore((state) => state.status) === "anonymous";
  const { data: dailyChallenges = [] } = useDailyChallenges();
  const unlockLabel = useUnlockInLabel();

  const completedByType = new Map(
    dailyChallenges.map((challenge) => [challenge.challengeType, challenge.completedToday]),
  );
  const isDailyCompleted = (mode: DemoModeCard): boolean =>
    mode.dailyType ? (completedByType.get(mode.dailyType) ?? false) : false;

  // Completion is over the cards actually shown in this row, not the backend's
  // active-challenge count (which is smaller — e.g. inactive/hidden types).
  // Completed cards keep their curated position (owner call — no re-sort).
  const dailyTotal = DAILY_CHALLENGE_MODES.length;
  const dailyDone = DAILY_CHALLENGE_MODES.filter(isDailyCompleted).length;

  return (
    <div className="space-y-6 md:space-y-8">
      <GameSection
        title={t("play.sectionDailyChallenges")}
        hint={t("play.sectionDailyChallengesHint")}
        modes={DAILY_CHALLENGE_MODES}
        isCompleted={isDailyCompleted}
        unlockLabel={unlockLabel}
        headerRight={
          <>
            <DailyResetTimer />
            {/* Completion is an account concept — guests just see the timer. */}
            {!isGuest && dailyTotal > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1 font-poppins text-[10px] font-bold uppercase leading-none tracking-wide tabular-nums text-white/80 md:text-xs">
                <CheckCircle2 className="size-3 text-brand-green-light" />
                {dailyDone}/{dailyTotal}
              </span>
            )}
          </>
        }
      />
      <GameSection
        title={t("play.sectionPlayCoins")}
        hint={t("play.sectionPlayCoinsHint")}
        modes={PLAY_WITH_COINS_MODES}
      />
    </div>
  );
}
