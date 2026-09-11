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
import { trackPlayCardClicked } from "@/lib/analytics/game-events";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Play, RotateCcw, Search, User, Users, Wifi, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import { ALL_DEMO_MODES, type DemoModeCard, demoText } from "@/features/demos/demoModes";
import { useDailyChallenges, useResetDailyChallengeDev } from "@/lib/queries/dailyChallenges.queries";
import { queryKeys } from "@/lib/queries/queryKeys";
import type { DailyChallengeType } from "@/lib/domain/dailyChallenge";
import { useAuthStore } from "@/stores/auth.store";
import { useAuthPromptStore } from "@/stores/authPrompt.store";
import { dailyChallengePlayPath } from "@/lib/domain/dailyChallengeSlugs";
import { useLocale } from "@/contexts/LocaleContext";
import { useRouter } from "next/navigation";
import { MissingXiModeModal } from "@/features/missing-xi/components/MissingXiModeModal";
import { CoinIcon } from "@/features/store/components/CoinIcon";
import type { Locale } from "@/lib/i18n/messages";

/** Real in-app destinations for the modes that have shipped a page. */
const REAL_ROUTES: Record<string, string> = {
  "mini-final-third": "/free-kicks",
  "mini-road-to-goal": "/road-to-goal",
  "mini-guess-the-goal": "/guess-the-goal",
  "mini-trivia-mines": "/trivia-mines",
  "mini-squad-spin": "/squad-spin",
};

/** Where a card links: the real daily route or game route. Only concept
 *  prototypes that have no shipped page fall back to their /demos preview.
 *  Guests get the same links; the click handler opens the sign-in dialog
 *  for anything that needs an account instead of detouring through demos. */
function hrefFor(mode: DemoModeCard): string {
  if (mode.dailyType) return dailyChallengePlayPath(mode.dailyType);
  return REAL_ROUTES[mode.slug] ?? `/demos/${mode.slug}?from=/play`;
}

/** True when the destination is a shipped game (which also needs an account). */
function hasRealRoute(mode: DemoModeCard): boolean {
  return Boolean(mode.dailyType) || mode.slug in REAL_ROUTES;
}

/** Live matchmaking against a real opponent — the "online" badge (orange). */
const LIVE_ONLINE_SLUGS = new Set(["match", "auction", "mini-football-grid", "weekend-league"]);

/** Format badge: solo (yellow) / multiplayer with friends (green) / online (orange). */
type PlayFormat = "solo" | "multiplayer" | "online";
const FORMAT_LABEL: Record<PlayFormat, Record<string, string>> = {
  solo: { en: "Solo", ka: "სოლო", es: "Solo", tr: "Tek kişilik" },
  multiplayer: { en: "Multiplayer", ka: "მულტიპლეიერი", es: "Multijugador", tr: "Çok oyunculu" },
  online: { en: "Online 1v1", ka: "ონლაინ 1v1", es: "Online 1v1", tr: "Online 1v1" },
};
const FORMAT_STYLE: Record<PlayFormat, string> = {
  solo: "bg-brand-yellow text-black",
  multiplayer: "bg-brand-green text-white",
  online: "bg-brand-orange text-white",
};
function formatOf(slug: string): PlayFormat {
  if (LIVE_ONLINE_SLUGS.has(slug)) return "online";
  if (ONLINE_SLUGS.has(slug)) return "multiplayer";
  return "solo";
}

/** Games playable with other people (live or party-style); everything else is solo. */
/** Second format a mode also ships in (Missing XI: solo now, multiplayer coming). */
const EXTRA_FORMATS: Record<string, PlayFormat[]> = { "lab-missing-xi": ["multiplayer"] };

const ONLINE_SLUGS = new Set([
  "lab-own-goal",
  "lab-say-it-with-memes",
  "lab-top-10-knockout",
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
  "daily-cardDetective",
  "lab-missing-xi",
  "daily-passChain",
  "mini-guess-the-goal",
  "daily-statSniper",
];
const PLAY_WITH_COINS_SLUGS = [
  "mini-trivia-mines",
  "mini-final-third",
  "mini-road-to-goal",
  "mini-squad-spin",
];

const MODE_BY_SLUG = new Map(ALL_DEMO_MODES.map((mode) => [mode.slug, mode]));
const resolveModes = (slugs: string[]): DemoModeCard[] =>
  slugs
    .map((slug) => MODE_BY_SLUG.get(slug))
    .filter((mode): mode is DemoModeCard => Boolean(mode));

// Prototype modes (no shipped route yet) stay listed — they are being turned
// into real games — and open their /demos preview until their route lands.
const DAILY_CHALLENGE_MODES = resolveModes(DAILY_CHALLENGE_SLUGS);
const PLAY_WITH_COINS_MODES = resolveModes(PLAY_WITH_COINS_SLUGS);

// Phones: two cards per row (three crammed the art and titles); tablets up: three.
const MODAL_SLUGS = new Set(["lab-missing-xi"]);

const CARD_WIDTH =
  "w-[calc((100%_-_0.625rem)/2)] shrink-0 snap-start md:w-[calc((100%_-_2rem)/3)]";

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

/** Admin-only "play it again" control, restored from the retired daily hub
 *  (PR #488 replaced that page with a redirect and the button went with it).
 *  Clears today's completion so the challenge can be replayed immediately. */
function DailyDevResetButton({ challengeType, title }: { challengeType: DailyChallengeType; title: string }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const resetMutation = useResetDailyChallengeDev(challengeType);

  const handleReset = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // The card is a Link; never navigate when the reset is tapped.
    event.preventDefault();
    event.stopPropagation();
    try {
      await resetMutation.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: queryKeys.dailyChallenges.all });
      toast.success(t("dailyGames.hubResetSuccess", { title }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("dailyGames.hubResetError"));
    }
  };

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={resetMutation.isPending}
      className="absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 font-poppins text-[8px] font-black uppercase tracking-wide text-white transition-colors hover:bg-black/80 disabled:opacity-50 md:right-2 md:top-2 md:rounded-lg md:px-2 md:py-1 md:text-[10px]"
    >
      <RotateCcw className="size-2.5 md:size-3" />
      {resetMutation.isPending ? "…" : t("dailyGames.hubResetButton")}
    </button>
  );
}

function GameCard({
  mode,
  index,
  completed = false,
  unlockLabel = "",
  showDevReset = false,
  onOpenMode,
}: {
  mode: DemoModeCard;
  index: number;
  completed?: boolean;
  unlockLabel?: string;
  showDevReset?: boolean;
  /** Modes with their own entry dialog (Missing XI) open it instead of navigating. */
  onOpenMode?: (slug: string) => void;
}) {
  const { t, locale } = useLocale();
  const isGuest = useAuthStore((state) => state.status) === "anonymous";
  const openAuthPrompt = useAuthPromptStore((state) => state.open);
  const devReset = showDevReset && mode.dailyType
    ? <DailyDevResetButton challengeType={mode.dailyType as DailyChallengeType} title={demoText(mode.title, locale)} />
    : null;
  const title = demoText(mode.title, locale);
  const description = demoText(mode.description, locale);
  const format = formatOf(mode.slug);

  // Completed daily: a done state + reset timer, not tappable until it unlocks.
  if (completed) {
    return (
      <div
        className={`relative flex ${CARD_WIDTH} flex-col overflow-hidden rounded-xl bg-brand-blue/50`}
        aria-label={`${title} — ${t("play.completed")}`}
      >
        {devReset}
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
    <div className={`relative flex ${CARD_WIDTH} shrink-0`}>
    {devReset}
    <Link
      href={hrefFor(mode)}
      onClick={(event) => {
        const group = PLAY_WITH_COINS_SLUGS.includes(mode.slug) ? "coins" : mode.slug.startsWith("daily-") || mode.slug.startsWith("lab-") ? "daily" : "other";
        if (onOpenMode) {
          event.preventDefault();
          // The modal's Solo route is behind the auth gate; a guest gets the sign-in prompt here instead of a bounce back to Play.
          if (isGuest) {
            trackPlayCardClicked({ slug: mode.slug, group, destination: "auth" });
            openAuthPrompt();
            return;
          }
          trackPlayCardClicked({ slug: mode.slug, group, destination: "modal" });
          onOpenMode(mode.slug);
          return;
        }
        if (isGuest && hasRealRoute(mode)) {
          event.preventDefault();
          trackPlayCardClicked({ slug: mode.slug, group, destination: "auth" });
          openAuthPrompt();
          return;
        }
        trackPlayCardClicked({ slug: mode.slug, group, destination: hasRealRoute(mode) ? "route" : "demo" });
      }}
      className={`group flex w-full animate-in fade-in slide-in-from-bottom-2 flex-col overflow-hidden rounded-xl bg-brand-blue duration-300 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60`}
      style={{ animationDelay: `${Math.min(index * 30, 420)}ms`, animationFillMode: "backwards" }}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <DemoModeArt
          slug={mode.slug}
          className="size-full transition-transform duration-300 group-hover:scale-[1.05]"
        />

        {/* Format badges — same pill as NEW, colour-coded so the three formats
            read at a glance: yellow solo, green multiplayer, orange online.
            Modes that ship in more than one format (Missing XI) show each. */}
        {PLAY_WITH_COINS_SLUGS.includes(mode.slug) && (
          <span className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-brand-yellow shadow-md shadow-black/30 md:size-auto md:gap-1 md:px-2.5 md:py-1" title={t("play.coinsBadge")} aria-label={t("play.coinsBadge")}>
            <CoinIcon size={16} />
            <span className="hidden font-poppins text-[11px] font-bold uppercase leading-none tracking-wide text-black md:inline">{t("play.coinsBadge")}</span>
          </span>
        )}
        <span className="absolute left-2 top-2 flex items-center gap-1">
          {[format, ...(EXTRA_FORMATS[mode.slug] ?? [])].map((entry) => (
            <span
              key={entry}
              title={FORMAT_LABEL[entry][locale] ?? FORMAT_LABEL[entry].en}
              aria-label={FORMAT_LABEL[entry][locale] ?? FORMAT_LABEL[entry].en}
              className={`inline-flex items-center justify-center gap-1 rounded-full font-poppins text-[11px] font-bold uppercase leading-none tracking-wide shadow-md shadow-black/30 size-7 md:size-auto md:px-2.5 md:py-1 ${FORMAT_STYLE[entry]}`}
            >
              {entry === "online" ? <Wifi className="size-3.5 md:size-3" /> : entry === "multiplayer" ? <Users className="size-3.5 md:size-3" /> : <User className="size-3.5 md:size-3" />}
              {/* Phones: icon only — the text pill swamped the small cards. */}
              <span className="hidden md:inline">{FORMAT_LABEL[entry][locale] ?? FORMAT_LABEL[entry].en}</span>
            </span>
          ))}
        </span>

        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 font-poppins text-[11px] font-bold uppercase text-black md:text-xs">
            <Play className="size-3 fill-current" />
            {locale === "ka" ? "თამაში" : locale === "es" ? "Jugar" : "Play"}
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
    </div>
  );
}

/** Horizontal card row with desktop arrow controls — a mouse has no swipe, so
 *  without these the cards past the fold were unreachable on the web. Arrows
 *  appear only when there is something to scroll to, and only on pointer
 *  devices (touch keeps the clean swipe surface). */
function CardScroller({ children }: { children: React.ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const syncArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncArrows();
    const observer = new ResizeObserver(syncArrows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncArrows]);
  // Filtering changes scrollWidth without resizing the scroller; re-check after every render.
  useEffect(syncArrows);

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // One "page" is just under a viewport width so a card always peeks through.
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  const arrowBase =
    "absolute top-1/2 z-20 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-brand-yellow text-black shadow-lg transition-colors hover:bg-brand-yellow/90 md:grid";

  return (
    <div className="relative">
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByPage(-1)}
          className={`${arrowBase} left-0 -translate-x-1/2`}
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      <div
        ref={scrollerRef}
        onScroll={syncArrows}
        className="-mx-4 flex snap-x gap-2.5 overflow-x-auto scrollbar-hide px-4 pb-1 md:gap-4"
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByPage(1)}
          className={`${arrowBase} right-0 translate-x-1/2`}
        >
          <ChevronRight className="size-5" />
        </button>
      )}
    </div>
  );
}

function GameSection({
  title,
  hint,
  modes,
  headerRight,
  isCompleted,
  unlockLabel = "",
  showDevReset = false,
  onOpenMode,
}: {
  title: string;
  /** Muted coin-flavoured hint next to the title ("Earn coins", …). */
  hint?: string;
  modes: DemoModeCard[];
  headerRight?: React.ReactNode;
  isCompleted?: (mode: DemoModeCard) => boolean;
  unlockLabel?: string;
  showDevReset?: boolean;
  onOpenMode?: (slug: string) => void;
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
      <CardScroller>
        {modes.map((mode, index) => (
          <GameCard
            key={mode.slug}
            mode={mode}
            index={index}
            completed={isCompleted?.(mode) ?? false}
            unlockLabel={unlockLabel}
            showDevReset={showDevReset}
            onOpenMode={MODAL_SLUGS.has(mode.slug) ? onOpenMode : undefined}
          />
        ))}
      </CardScroller>
    </div>
  );
}


type FinderFilter = "all" | "daily" | "coins" | "solo" | "multiplayer" | "online";
const FINDER_FILTERS: Array<{ id: FinderFilter } & Record<Locale, string>> = [
  { id: "all", en: "All", ka: "ყველა", es: "Todos", tr: "Tümü" },
  { id: "daily", en: "Daily", ka: "დღიური", es: "Diarios", tr: "Günlük" },
  { id: "coins", en: "Coins", ka: "მონეტები", es: "Monedas", tr: "Jeton" },
  { id: "solo", en: "Solo", ka: "სოლო", es: "Solo", tr: "Tek kişilik" },
  { id: "multiplayer", en: "Multiplayer", ka: "მრავალმოთამაშიანი", es: "Multijugador", tr: "Çok oyunculu" },
  { id: "online", en: "Online", ka: "ონლაინ", es: "En línea", tr: "Online" },
];

function matchesFilter(mode: DemoModeCard, section: "daily" | "coins", filter: FinderFilter): boolean {
  if (filter === "all") return true;
  if (filter === "daily" || filter === "coins") return section === filter;
  return formatOf(mode.slug) === filter;
}

function matchesQuery(mode: DemoModeCard, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [mode.title, mode.description].flatMap((text) => [text.en, text.ka, text.es ?? "", text.tr ?? ""]).concat(mode.slug)
    .some((text) => text.toLowerCase().includes(q));
}

/** Search icon that slides open into a field, plus the filter pills. */
function GamesFinder({
  query,
  onQuery,
  filter,
  onFilter,
  counts,
}: {
  query: string;
  onQuery: (value: string) => void;
  filter: FinderFilter;
  onFilter: (value: FinderFilter) => void;
  counts: Record<FinderFilter, number>;
}) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const label = locale === "ka" ? "მოძებნე თამაში" : locale === "es" ? "Buscar juegos" : "Search games";
  const close = () => {
    onQuery("");
    setOpen(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => {
            if (open) close();
            else {
              setOpen(true);
              requestAnimationFrame(() => inputRef.current?.focus());
            }
          }}
          aria-label={label}
          aria-expanded={open}
          className={`relative z-10 flex size-9 items-center justify-center rounded-full transition-colors ${
            open ? "bg-brand-yellow text-black" : "bg-white/[0.07] text-white/70 hover:bg-white/[0.12]"
          }`}
        >
          {open ? <X className="size-4" /> : <Search className="size-4" />}
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="finder-field"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "min(260px, 60vw)", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
              className="overflow-hidden"
            >
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => onQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") close();
                }}
                placeholder={label}
                aria-label={label}
                className="font-poppins ml-2 h-9 w-full rounded-full border-none bg-brand-blue px-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-white outline-none placeholder:text-white/55 focus:outline-none"
                style={{ boxShadow: "0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)" }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {FINDER_FILTERS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onFilter(entry.id)}
          aria-pressed={filter === entry.id}
          className={`font-poppins inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors md:text-xs ${
            filter === entry.id ? "bg-brand-yellow text-black" : "bg-white/[0.07] text-white/60 hover:bg-white/[0.12]"
          }`}
        >
          {entry[locale] ?? entry.en}
          <span className={filter === entry.id ? "text-black/50" : "text-white/35"}>{counts[entry.id]}</span>
        </button>
      ))}
    </div>
  );
}

/** Named AllGamesGrid for backwards-compat with its single import; renders the
 *  two curated horizontal-scroll sections rather than a searchable grid. */
export function AllGamesGrid() {
  const { t } = useLocale();
  const isGuest = useAuthStore((state) => state.status) === "anonymous";
  // Admin-only replay control (hidden for everyone else, including in prod).
  const canUseDevReset = useAuthStore((state) => state.user?.role) === "admin";
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

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FinderFilter>("all");
  const router = useRouter();
  const [missingXiOpen, setMissingXiOpen] = useState(false);
  const openMode = useCallback((slug: string) => {
    if (slug === "lab-missing-xi") setMissingXiOpen(true);
  }, []);
  const visibleDaily = useMemo(
    () => DAILY_CHALLENGE_MODES.filter((mode) => matchesFilter(mode, "daily", filter) && matchesQuery(mode, query)),
    [filter, query],
  );
  const visibleCoins = useMemo(
    () => PLAY_WITH_COINS_MODES.filter((mode) => matchesFilter(mode, "coins", filter) && matchesQuery(mode, query)),
    [filter, query],
  );
  const counts = useMemo(() => {
    const all = [...DAILY_CHALLENGE_MODES.map((mode) => ({ mode, section: "daily" as const })), ...PLAY_WITH_COINS_MODES.map((mode) => ({ mode, section: "coins" as const }))]
      .filter(({ mode }) => matchesQuery(mode, query));
    const count = (id: FinderFilter) => all.filter(({ mode, section }) => matchesFilter(mode, section, id)).length;
    return { all: all.length, daily: count("daily"), coins: count("coins"), solo: count("solo"), multiplayer: count("multiplayer"), online: count("online") };
  }, [query]);
  const nothing = visibleDaily.length === 0 && visibleCoins.length === 0;

  return (
    <div className="space-y-6 md:space-y-8">
      <GamesFinder query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} counts={counts} />
      <MissingXiModeModal
        isOpen={missingXiOpen}
        onOpenChange={setMissingXiOpen}
        onPlaySolo={() => {
          setMissingXiOpen(false);
          // Solo runs on the prototype until the real route ships.
          router.push(dailyChallengePlayPath("missingXi"));
        }}
      />
      {nothing && (
        <p className="font-poppins text-sm text-white/55">{t("play.finderNoMatches")}</p>
      )}
      {visibleDaily.length > 0 && (
      <GameSection
        title={t("play.sectionDailyChallenges")}
        hint={t("play.sectionDailyChallengesHint")}
        modes={visibleDaily}
        onOpenMode={openMode}
        isCompleted={isDailyCompleted}
        unlockLabel={unlockLabel}
        showDevReset={canUseDevReset}
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
      )}
      {visibleCoins.length > 0 && (
      <GameSection
        title={t("play.sectionPlayCoins")}
        hint={t("play.sectionPlayCoinsHint")}
        modes={visibleCoins}
        onOpenMode={openMode}
      />
      )}
    </div>
  );
}
