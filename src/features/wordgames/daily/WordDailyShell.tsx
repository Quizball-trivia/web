"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { LeaderboardTable } from "@/features/leaderboard/components/LeaderboardTable";
import { SignInLink } from "@/features/marketing/public/PublicLinks";
import { GUEST_LOBBIES_ENABLED, ROOM_GAMES_ENABLED } from "@/lib/config";
import type { LeaderboardEntry } from "@/lib/domain/leaderboard";
import type { RoomGameId } from "@/lib/realtime/socket.types";
import { cn } from "@/lib/utils";
import { STORAGE_KEYS, storage } from "@/utils/storage";
import { useAuthStore } from "@/stores/auth.store";
import { wordDailyCopy } from "../copy";
import { Brand, Frame, GreenButton, poppins } from "../ui";
import type { WordBoard, WordBoardRow } from "./wordDaily.api";
import { latestDay, puzzleNumber, releaseDay, type WordDailyCalendar } from "./wordDaily.logic";
import type { WordDailyNotice } from "./useWordDaily";

/** What the shared daily screens need to know about one game. */
export interface WordDailyGame {
  /** Analytics / sign-in id and the app route the game lives on. */
  modeId: string;
  route: string;
  roomGame: RoomGameId;
  brand: readonly [string, string];
  hero: string;
  calendar: WordDailyCalendar;
  tag: string;
  lines: readonly string[];
}

export function Centered({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center">{children}</div>;
}

export function ExitLink({ label, onExit }: { label: string; onExit: () => void }) {
  return <button type="button" onClick={onExit} className="mt-4 min-h-9 text-sm font-bold text-white/60 underline-offset-4 hover:text-white hover:underline">{label}</button>;
}

const YELLOW_PILL = "inline-flex h-10 items-center rounded-full bg-brand-yellow px-5 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep";

export function DailySignIn({ game, placement, className = YELLOW_PILL, children }: { game: WordDailyGame; placement: string; className?: string; children: ReactNode }) {
  return <SignInLink placement={`${game.modeId}_${placement}`} modeId={game.modeId} returnTo={game.route} className={className}>{children}</SignInLink>;
}

/**
 * The daily's way into a friend room of the same game: a plain link, so it works on the public game pages too (they
 * have no socket); the room page creates the room, guests included.
 */
export function PlayRoomWithFriends({ game, locale, className }: { game: WordDailyGame; locale: string; className?: string }) {
  const authStatus = useAuthStore((state) => state.status);
  const c = wordDailyCopy(locale);
  // Without guest rooms a signed-out player would only be bounced off the room page.
  if (!ROOM_GAMES_ENABLED.includes(game.roomGame) || (!GUEST_LOBBIES_ENABLED && authStatus !== "authenticated")) return null;
  return (
    // App routes read the stored language, not the SEO page's URL: keep the room in the language the player is reading.
    <Link href={`/friend/room/new?room=${game.roomGame}`} prefetch={false} onClick={() => storage.set(STORAGE_KEYS.LOCALE, locale)} data-word-friends={game.roomGame}
      className={cn("flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-blue text-sm font-black uppercase tracking-wide text-white hover:bg-brand-blue/90", className)} style={poppins}>
      <Users className="size-4" aria-hidden />{c.friends}
    </Link>
  );
}

export function DailyIntro({ game, locale, number, status, busy, notice, guestOnPastBoard, guestLockedOut, onStart, onArchive, onExit }: {
  game: WordDailyGame; locale: string; number: number; status: "new" | "started" | "done"; busy: boolean; notice: WordDailyNotice | null;
  guestOnPastBoard: boolean; guestLockedOut: boolean; onStart: () => void; onArchive: () => void; onExit?: () => void;
}) {
  const c = wordDailyCopy(locale);
  return (
    <div className="flex flex-1 flex-col">
      {onExit && (
        <header className="mb-4 flex h-10 items-center">
          <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
        </header>
      )}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-game-art-night" aria-hidden>
        <Image src={game.hero} alt="" fill sizes="(max-width: 480px) 100vw, 448px" className="object-cover" priority />
      </div>
      <Brand words={game.brand} className="mt-5 text-3xl leading-none" />
      <p className="mt-2 text-sm font-bold text-white/60" style={poppins}>#{number} · {game.tag}</p>
      <ul className="mt-4 space-y-2 text-sm leading-snug text-white/85">
        {game.lines.map((line) => <li key={line} className="flex gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-green-light" />{line}</li>)}
      </ul>
      {guestOnPastBoard && (
        <div className="mt-4 rounded-2xl border border-brand-yellow/60 bg-brand-yellow/10 px-4 py-3">
          <p className="text-sm text-white/90">{guestLockedOut ? c.guestToday : c.guestPast}</p>
          <DailySignIn game={game} placement="intro" className={cn(YELLOW_PILL, "mt-2 h-9 px-4")}>{c.playToday}</DailySignIn>
        </div>
      )}
      {notice && <p role="alert" className="mt-4 rounded-2xl bg-brand-red-soft/15 px-4 py-3 text-sm font-semibold text-brand-red-light">{c.notices[notice]}</p>}
      <div className="flex-1" />
      <GreenButton className="mt-6" disabled={busy} onClick={onStart}>{status === "done" ? c.seeResult : status === "started" ? c.resume : c.play}</GreenButton>
      <PlayRoomWithFriends game={game} locale={locale} className="mt-3" />
      <button type="button" onClick={onArchive} className="mx-auto mt-3 min-h-9 text-sm font-bold text-white/60 underline-offset-4 hover:text-white hover:underline">{c.archive}</button>
    </div>
  );
}

export function DailyArchive({ game, locale, days, today, current, onBack, onOpen }: { game: WordDailyGame; locale: string; days: string[]; today: string; current: string; onBack: () => void; onOpen: (day: string) => void }) {
  const c = wordDailyCopy(locale);
  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-5 flex h-10 items-center gap-3">
        <button type="button" onClick={onBack} aria-label={c.back} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
        <h1 className="text-lg font-black uppercase" style={poppins}>{c.archiveTitle}</h1>
      </header>
      <ul className="space-y-2">
        {days.map((d) => (
          <li key={d}>
            <button type="button" onClick={() => onOpen(d)} className={cn("flex h-12 w-full items-center justify-between rounded-2xl px-4 text-sm font-bold", d === current ? "bg-brand-blue" : "bg-white/[0.07] hover:bg-white/10")}>
              <span style={poppins}>#{puzzleNumber(game.calendar, d)}</span>
              <span className="text-xs text-white/70">{d === today ? c.today : d}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const toEntry = (row: WordBoardRow, myId: string | undefined): LeaderboardEntry => ({
  id: row.userId, rank: row.rank, username: row.username, avatar: row.avatarUrl || row.userId, avatarCustomization: row.avatarCustomization,
  country: row.country, tier: row.tier ?? "", rankPoints: row.score, isCurrentUser: row.userId === myId, trend: "same", trendValue: 0,
});

/** The day's top scores in the shared leaderboard rows. `refreshKey` refetches after the viewer finishes a ranked run. */
export function WordDailyLeaderboard({ game, locale, load, day, refreshKey = 0, limit = 10, placement = "page", className }: {
  game: WordDailyGame; locale: string; load: (day: string, locale: string) => Promise<WordBoard>; day?: string; refreshKey?: number; limit?: number; placement?: "page" | "end"; className?: string;
}) {
  const c = wordDailyCopy(locale).board;
  // Follows the Argentine day while the page stays open, unless a specific day is asked for.
  const [today, setToday] = useState(() => releaseDay());
  useEffect(() => {
    if (day) return;
    const check = () => setToday(releaseDay());
    const timer = window.setInterval(check, 60_000);
    window.addEventListener("focus", check);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", check); };
  }, [day]);
  const boardDay = day ?? latestDay(game.calendar, today);
  const [loaded, setLoaded] = useState<{ day: string; board: WordBoard | null } | null>(null);
  const authStatus = useAuthStore((s) => s.status);
  const myId = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    if (authStatus === "loading" || !boardDay) return;
    let cancelled = false;
    load(boardDay, locale).then((data) => { if (!cancelled) setLoaded({ day: boardDay, board: data }); }).catch(() => { if (!cancelled) setLoaded({ day: boardDay, board: null }); });
    return () => { cancelled = true; };
  }, [boardDay, refreshKey, authStatus, myId, locale, load]);

  // Rows fetched for another day are never shown under this day's heading.
  const board = loaded && loaded.day === boardDay ? loaded.board : undefined;
  if (board === null || !boardDay) return null;
  const entries = board?.top.slice(0, limit).map((row) => toEntry(row, myId)) ?? [];
  const meOutside = board?.me && !entries.some((entry) => entry.isCurrentUser) ? toEntry(board.me, myId) : null;
  return (
    <section aria-label={c.title} className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold uppercase">{c.title} <span className="text-white/60">#{puzzleNumber(game.calendar, boardDay)}</span></h2>
        {board && board.players > 0 && <span className="text-xs text-white/60">{c.players(board.players)}</span>}
      </div>
      {board === undefined ? (
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      ) : entries.length === 0 ? (
        <p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-white/75">{c.empty}</p>
      ) : (
        <LeaderboardTable entries={meOutside ? [...entries, meOutside] : entries} currentUserId={myId} pointsLabel={wordDailyCopy(locale).points} compact />
      )}
      {authStatus !== "authenticated" && authStatus !== "loading" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-blue px-4 py-3">
          <p className="text-sm font-semibold text-white/90">{c.join}</p>
          <DailySignIn game={game} placement={`leaderboard_${placement}`}>{c.joinButton}</DailySignIn>
        </div>
      )}
    </section>
  );
}

/** The end of a run: the game's own result card, then share, friends, archive and the day's ranking. */
export function DailyEnd({ game, locale, day, shareText, guestOnPastBoard, ranked, rank, children, leaderboard, onArchive, onExit }: {
  game: WordDailyGame; locale: string; day: string; shareText: string; guestOnPastBoard: boolean; ranked: boolean; rank?: number;
  children: ReactNode; leaderboard: ReactNode; onArchive: () => void; onExit?: () => void;
}) {
  const c = wordDailyCopy(locale);
  const [copied, setCopied] = useState(false);
  // The link names the day that was played: whoever opens it gets that puzzle, not whichever day is newest for them.
  const url = typeof window === "undefined" ? "" : `${window.location.origin}${window.location.pathname}?dia=${day}`;
  const text = `${shareText}\n${url}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 2_000); } catch { /* the clipboard is not available: nothing to say */ }
  };
  const share = async () => {
    try {
      if (typeof navigator.share === "function") await navigator.share({ text });
      else await copy();
    } catch { /* the player closed the share sheet */ }
  };
  return (
    <div className="flex flex-1 flex-col">
      {onExit && (
        <header className="mb-2 flex h-10 items-center">
          <button type="button" onClick={onExit} aria-label={c.exit} className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><ArrowLeft className="size-5" /></button>
        </header>
      )}
      {children}
      {ranked && rank !== undefined && <p className="mx-auto mt-3 w-fit rounded-full bg-brand-yellow px-4 py-1 text-sm font-black text-black" style={poppins}>{c.rank(rank)}</p>}
      {!ranked && <p className="mt-3 text-center text-xs text-white/60">{guestOnPastBoard ? c.guestPast : c.practice}</p>}
      {guestOnPastBoard && <div className="mt-3 text-center"><DailySignIn game={game} placement="end">{c.playToday}</DailySignIn></div>}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => void share()} className="h-12 rounded-full bg-brand-green text-sm font-black uppercase tracking-wide text-white hover:bg-brand-green-deep" style={poppins}>{c.share}</button>
        <button type="button" onClick={() => void copy()} className="h-12 rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15" style={poppins} aria-live="polite">{copied ? c.copied : c.copy}</button>
      </div>
      <PlayRoomWithFriends game={game} locale={locale} className="mt-3" />
      <button type="button" onClick={onArchive} className="mx-auto mt-3 min-h-9 text-sm font-bold text-white/60 underline-offset-4 hover:text-white hover:underline">{c.archive}</button>
      {leaderboard}
    </div>
  );
}

/** The states every word-game daily shares around its play and end screens. */
export function WordDailyScreen({ game, locale, daily, status, onStart, onExit, play, end }: {
  game: WordDailyGame; locale: string;
  daily: {
    versions: Record<string, number> | null | undefined; authReady: boolean; day: string | null; days: string[]; today: string; view: "intro" | "play" | "end" | "archive";
    setView: (view: "intro" | "play" | "end" | "archive") => void; pending: string | null; notice: WordDailyNotice | null; guestLockedOut: boolean; guestOnPastBoard: boolean;
    openDay: (day: string) => void; reload: () => void;
  };
  status: "new" | "started" | "done";
  onStart: () => void; onExit?: () => void;
  /** The play screen, or null when there is no run to play. */
  play: ReactNode | null;
  /** The end screen, or null until the run is finished. */
  end: ReactNode | null;
}) {
  const c = wordDailyCopy(locale);
  const { day } = daily;
  let body: ReactNode;
  if (daily.versions === null) {
    body = (
      <Centered>
        <p className="text-center text-sm text-white/80">{c.loadError}</p>
        <button type="button" onClick={daily.reload} className="mt-4 h-11 rounded-full bg-brand-yellow px-6 text-sm font-black uppercase text-black" style={poppins}>{c.retry}</button>
        {onExit && <ExitLink label={c.exit} onExit={onExit} />}
      </Centered>
    );
  } else if (daily.versions === undefined || !daily.authReady) {
    body = <Centered><p className="animate-pulse text-sm text-white/70">{c.loading}</p></Centered>;
  } else if (!day) {
    body = (
      <Centered>
        <Brand words={game.brand} className="text-3xl" />
        <p className="mt-3 text-center text-sm text-white/75">{daily.guestLockedOut ? c.guestToday : c.soon}</p>
        {daily.guestLockedOut && <div className="mt-4"><DailySignIn game={game} placement="intro">{c.playToday}</DailySignIn></div>}
        {onExit && <ExitLink label={c.exit} onExit={onExit} />}
      </Centered>
    );
  } else if (daily.view === "archive") {
    body = <DailyArchive game={game} locale={locale} days={daily.days} today={daily.today} current={day} onBack={() => daily.setView(status === "done" ? "end" : "intro")} onOpen={daily.openDay} />;
  } else if (daily.view === "end" && end) {
    body = end;
  } else if (daily.view === "play" && play) {
    body = play;
  } else {
    body = (
      <DailyIntro game={game} locale={locale} number={puzzleNumber(game.calendar, day)} status={status} busy={daily.pending !== null} notice={daily.notice}
        guestOnPastBoard={daily.guestOnPastBoard} guestLockedOut={daily.guestLockedOut} onStart={onStart} onArchive={() => daily.setView("archive")} onExit={onExit} />
    );
  }
  return <Frame lang={locale}>{body}</Frame>;
}
