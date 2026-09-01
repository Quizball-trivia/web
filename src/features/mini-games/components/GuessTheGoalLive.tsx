'use client';

/**
 * GUESS THE GOAL — LIVE. Server-authoritative version of the tactics-board
 * quiz: sessions, options, scoring and rewards all come from the backend; this
 * screen never knows the answer until the server reveals it. The replay clock
 * is derived from the SERVER clock (server_now offset), so the displayed
 * potential always matches what the backend will actually score — including
 * after a resume, and it keeps decaying while the tab is hidden.
 *
 * Deliberately does NOT import the demo component or its bundled goal data:
 * the demo's client-side answers must never enter this route's module graph.
 *
 * Framed as a NATIVE app page (transparent background, hub-style header) —
 * not the MiniGameShell, whose painted backdrop made the game read as a
 * separate window inside the app shell.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, Clapperboard, LayoutGrid, Play, RotateCcw, Star, WifiOff, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { TacticsBoard2D, BOARD_VIEW_W, BOARD_VIEW_H } from './TacticsBoard2D';
import { GgtActionGlyph, GgtLegend, GGT_ACTION_META, GGT_OPTION_CLASS, ggtOptionStyle, type GgtOptionState } from './guessTheGoalUi';
import { buildTimeline, type TacticsGoalDef, type TacticsStepKind } from '../lib/tacticsEngine';
import { useMiniLocale, useMiniT } from '../lib/i18n';
import { queryKeys } from '@/lib/queries/queryKeys';
import { trackEvent } from '@/lib/posthog';
import { usePlayer } from '@/contexts/PlayerContext';
import { CoinIcon } from '@/features/store/components/CoinIcon';
import {
  guessTheGoalApi,
  GuessTheGoalApiError,
  type GgtGuessOutcome,
  type GgtBonusOutcome,
  type GgtGallery,
  type GgtI18nText,
  type GgtSession,
} from '@/lib/repositories/guessTheGoal.repo';

type Phase =
  | 'loading'
  | 'load_error'
  | 'idle'
  | 'starting'
  | 'watch'
  | 'reveal'
  | 'bonus'
  | 'bonus_done'
  | 'disabled';

const LOOP_HOLD = 1.6;
/** Display-clock pad: the server_now offset lags by response transit, and the
 *  guess itself takes a request to arrive — bias the shown clock FORWARD so
 *  the displayed potential can only understate what the server will score. */
const SKEW_PAD_MS = 400;

/** watch?v=, youtu.be/, shorts/, embed/ → bare video id (null if unparseable). */
const DIFF_META: Record<string, { label: { en: string; ka: string }; color: string }> = {
  easy: { label: { en: 'Easy', ka: 'მარტივი' }, color: '#38B60E' },
  medium: { label: { en: 'Medium', ka: 'საშუალო' }, color: '#FFE500' },
  hard: { label: { en: 'Hard', ka: 'რთული' }, color: '#FB3101' },
};

function GgtGalleryPanel({
  gallery,
  locale,
  t,
  pick,
  onClose,
}: {
  gallery: GgtGallery;
  locale: 'en' | 'ka';
  t: (key: string, vars?: Record<string, string | number>) => string;
  pick: (text: GgtI18nText | null | undefined) => string;
  onClose?: () => void;
}) {
  const pct = gallery.total > 0 ? Math.round((gallery.solved / gallery.total) * 100) : 0;
  const rank: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
  // Solved cards then locked placeholders, grouped easy -> medium -> hard.
  // Unsolved goals arrive as counts only — the server never enumerates them.
  const difficulties = [
    ...new Set([...gallery.goals.map((g) => g.difficulty), ...Object.keys(gallery.locked)]),
  ].sort((a, b) => (rank[a] ?? 3) - (rank[b] ?? 3));
  const ordered = difficulties.flatMap((difficulty) => [
    ...gallery.goals
      .filter((g) => g.difficulty === difficulty)
      .map((goal) => ({ kind: 'solved' as const, difficulty, goal })),
    ...Array.from({ length: gallery.locked[difficulty] ?? 0 }, () => ({
      kind: 'locked' as const,
      difficulty,
      goal: null,
    })),
  ]);
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="font-poppins text-[12px] font-black uppercase tracking-wider text-white/60">
          {t('Your collection')}
        </p>
        <div className="flex items-center gap-3">
          <p className="font-poppins text-[12px] font-black uppercase tracking-wider text-white">
            {gallery.solved}
            <span className="text-white/40">/{gallery.total}</span>
          </p>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label={t('Back')}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white transition-all hover:brightness-110 active:translate-y-[1px]"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-brand-green-bright transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-4 px-1">
        <span className="flex items-center gap-1.5 font-poppins text-[12px] font-black uppercase text-brand-green-bright">
          <CoinIcon className="size-4" /> {gallery.coins_earned}
        </span>
        <span className="font-poppins text-[12px] font-black uppercase text-white/70">
          {gallery.xp_earned} XP
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
        {ordered.map((entry, i) =>
          entry.kind === 'solved' ? (
            <div
              key={`s-${i}`}
              className="flex min-h-[92px] flex-col items-center justify-between gap-2 rounded-xl bg-brand-green-bright p-3 text-center"
            >
              <p className="font-poppins text-[11px] font-black uppercase leading-snug text-black">
                {pick(entry.goal.title)}
              </p>
              <div className="flex w-full items-center justify-between gap-1">
                <span className="font-poppins text-[10px] font-black uppercase text-black">
                  +{entry.goal.points}
                </span>
                <span className="flex items-center gap-1.5">
                  {entry.goal.bonus_correct && <Star className="size-3 fill-black text-black" />}
                  {entry.goal.video_url && <Clapperboard className="size-3 text-black/60" />}
                  <span className="font-poppins text-[10px] font-black text-black/60">
                    {entry.goal.year}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <div
              key={`u-${i}`}
              className="flex min-h-[92px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 p-3"
            >
              <span className="font-poppins text-lg font-black text-white/25">???</span>
              <span
                className="rounded-full px-2 py-0.5 font-poppins text-[9px] font-black uppercase tracking-wide"
                style={{
                  color: DIFF_META[entry.difficulty]?.color ?? '#ffffff',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                }}
              >
                {DIFF_META[entry.difficulty]?.label[locale] ?? entry.difficulty}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function youtubeEmbed(url: string, clipEndS?: number | null): { id: string; start: number; end?: number } | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/
  );
  if (!m) return null;
  const t = url.match(/[?&](?:t|start)=(\d+)/);
  const start = t ? Number(t[1]) : 0;
  // A verified clip window beats the URL's own offset — the player stops at
  // the end of the goal sequence instead of rolling into post-match footage.
  const end = clipEndS && clipEndS > start ? clipEndS : undefined;
  return { id: m[1], start, end };
}

function newNonce(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

/** Adapt a served session into the shape the board renderer expects. The
 *  fields the demo data carries but the server withholds (title, correctness)
 *  are filled with inert placeholders — the renderer never reads them. */
function toBoardGoal(session: GgtSession): TacticsGoalDef {
  return {
    id: session.session_id,
    title: '',
    options: [],
    answerIndex: -1,
    funFact: '',
    players: session.goal.players,
    steps: session.goal.steps,
    bonus: { question: '', options: [], answerIndex: -1 },
  };
}

export function GuessTheGoalLive({ backHref }: { backHref?: string } = {}) {
  const t = useMiniT();
  const locale = useMiniLocale();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<GgtSession | null>(null);
  const [outcome, setOutcome] = useState<GgtGuessOutcome | null>(null);
  const [bonusOutcome, setBonusOutcome] = useState<GgtBonusOutcome | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [bonusPicked, setBonusPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [gallery, setGallery] = useState<GgtGallery | null>(null);

  /** Whole published pool solved — replays pay nothing, so the idle card must
   *  stop promising coins. Falls back to counts when the backend predates the
   *  pool_exhausted field. */
  const poolExhausted = gallery
    ? (gallery.pool_exhausted ?? (gallery.solved > 0 && gallery.solved >= gallery.total))
    : false;
  /** Five goals a day. Optional-chained so an older backend (no limit fields)
   *  simply behaves as before rather than locking the mode out. */
  const dailyLimit = gallery?.daily_goal_limit ?? null;
  const goalsToday = gallery?.goals_today ?? 0;
  const dailyLimitReached = gallery?.daily_limit_reached ?? false;
  const goalsLeftToday = dailyLimit === null ? null : Math.max(0, dailyLimit - goalsToday);
  const [showGallery, setShowGallery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addXP } = usePlayer();
  const [time, setTime] = useState(0);
  /** serverNow - clientNow at payload receipt; keeps our clock honest. */
  const offsetRef = useRef(0);
  const nonceRef = useRef<string | null>(null);

  const pick = useCallback(
    (text: GgtI18nText | null | undefined): string => {
      if (!text) return '';
      return (locale === 'ka' ? text.ka : null) ?? text.en;
    },
    [locale]
  );

  const boardGoal = useMemo(() => (session ? toBoardGoal(session) : null), [session]);
  const timeline = useMemo(() => (boardGoal ? buildTimeline(boardGoal) : null), [boardGoal]);

  const adoptSession = useCallback((next: GgtSession, resumed = false) => {
    offsetRef.current = new Date(next.server_now).getTime() - Date.now();
    setTime(0);
    setSession(next);
    setOutcome(next.outcome ?? null);
    setBonusOutcome(null);
    setPicked(next.guess_option_id ?? null);
    setBonusPicked(null);
    setShowVideo(false);
    setError(null);
    // 'guessed' without a bonus payload should not happen (the server only
    // parks in 'guessed' when a bonus exists) — degrade to the done panel so
    // the user always has a Next Goal button.
    setPhase(next.state === 'guessed' ? (next.bonus ? 'bonus' : 'bonus_done') : 'watch');
    trackEvent('ggt_session_started', {
      resumed,
      repeat_view: next.max_points < 100,
      difficulty: next.goal.difficulty,
      main_moves: next.goal.main_moves,
      duration_seconds: next.goal.duration_seconds,
      solved: next.progress.solved,
      total_goals: next.progress.total,
    });
  }, []);

  const loadCurrent = useCallback(
    (track = true) => {
      guessTheGoalApi
        .current()
        .then((existing) => {
          if (existing) {
            adoptSession(existing, true);
            if (track) trackEvent('ggt_screen_viewed', { entry: 'resumed' });
          } else {
            setPhase('idle');
            if (track) trackEvent('ggt_screen_viewed', { entry: 'idle' });
          }
        })
        .catch((err) => {
          if (err instanceof GuessTheGoalApiError && err.status === 503) {
            setPhase('disabled');
            if (track) trackEvent('ggt_screen_viewed', { entry: 'disabled' });
          } else {
            setPhase('load_error');
            trackEvent('ggt_error', { stage: 'load' });
          }
          void err;
        });
    },
    [adoptSession]
  );

  const retryLoad = useCallback(() => {
    setPhase('loading');
    setError(null);
    loadCurrent();
  }, [loadCurrent]);

  const loadedOnceRef = useRef(false);
  useEffect(() => {
    // A failed resume must NOT fall through to 'idle': Kick off from there
    // would abandon a session (and its pending bonus) the user still has.
    // Ref-guarded: Strict Mode's double-mount must not double-fire the
    // request or the screen-view/session-start analytics.
    if (loadedOnceRef.current) return;
    loadedOnceRef.current = true;
    loadCurrent();
  }, [loadCurrent]);

  useEffect(() => {
    // Progress data feeds the home screen and the collection overlay; reveal
    // and bonus_done refresh it so the numbers are current after every solve,
    // and opening the overlay always refetches so it can never show stale
    // totals from before the last solve.
    if (!showGallery && phase !== 'idle' && phase !== 'reveal' && phase !== 'bonus_done') return;
    let cancelled = false;
    guessTheGoalApi
      .gallery()
      .then((data) => {
        if (!cancelled) setGallery(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [phase, showGallery]);

  useEffect(() => {
    if (!showGallery) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGallery(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [showGallery]);

  /** Server-clock elapsed seconds past the grace window. */
  const serverElapsed = useCallback((): number => {
    if (!session) return 0;
    const now = Date.now() + offsetRef.current + SKEW_PAD_MS;
    return Math.max(0, (now - new Date(session.started_at).getTime() - session.grace_ms) / 1000);
  }, [session]);

  useEffect(() => {
    // The board freezes the instant an answer is locked in — the reveal takes
    // over whenever the server responds.
    if (phase !== 'watch' || !timeline || picked !== null) return undefined;
    let raf = 0;
    const tick = () => {
      setTime(serverElapsed());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, timeline, serverElapsed, picked]);

  const start = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    // Optimistic: swap to the board skeleton NOW — the session request rides
    // inside the transition instead of blocking the tap.
    setPhase('starting');
    // The nonce survives retries so a lost response can't mint two sessions.
    if (!nonceRef.current) nonceRef.current = newNonce();
    try {
      const next = await guessTheGoalApi.start(nonceRef.current);
      nonceRef.current = null;
      adoptSession(next);
    } catch (err) {
      if (err instanceof GuessTheGoalApiError) {
        if (err.status === 503) {
          setPhase('disabled');
          return;
        }
        // Only a definite 4xx invalidates the nonce; a 5xx/timeout may have
        // committed, and retrying with a FRESH nonce would abandon that
        // committed session (free-kicks precedent).
        if (err.status >= 400 && err.status < 500) {
          nonceRef.current = null;
          if (err.status === 409) {
            if (err.code === 'GGT_DAILY_LIMIT_REACHED') {
              // The idle card disables PLAY, so reaching here means its
              // gallery data was stale — refresh it so the card catches up.
              setPhase('idle');
              setError(t('All {limit} goals played — come back tomorrow', {
                limit: gallery?.daily_goal_limit ?? 5,
              }));
              guessTheGoalApi.gallery().then(setGallery).catch(() => {});
              return;
            }
            const existing = await guessTheGoalApi.current().catch(() => null);
            if (existing) {
              adoptSession(existing, true);
              return;
            }
          }
        }
      }
      setPhase('idle');
      setError(t('Something went wrong — try again'));
      trackEvent('ggt_error', { stage: 'start' });
    } finally {
      setBusy(false);
    }
  }, [busy, adoptSession, t, gallery?.daily_goal_limit]);

  const submitGuess = useCallback(
    async (optionId: string) => {
      if (!session || busy || phase !== 'watch') return;
      setBusy(true);
      setError(null);
      setPicked(optionId);
      // Sampled before the request so network latency doesn't inflate it.
      const watchSeconds = Math.round(serverElapsed());
      try {
        // Same-option retries replay the stored result server-side, so a
        // timeout here is safe to re-submit.
        const result = await guessTheGoalApi.guess(session.session_id, optionId);
        setOutcome(result);
        setPhase('reveal');
        if (result.awards.coins > 0) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
        }
        if (result.awards.xp > 0) addXP(result.awards.xp);
        trackEvent('ggt_guess_submitted', {
          correct: result.correct,
          points: result.points,
          revealed_moves: result.revealed_moves,
          main_moves: session.goal.main_moves,
          watch_seconds: watchSeconds,
          difficulty: session.goal.difficulty,
          first_solve: result.awards.first_solve,
          coins_awarded: result.awards.coins,
          xp_awarded: result.awards.xp,
          daily_cap_reached: result.awards.daily_cap_reached,
          has_bonus: Boolean(result.bonus),
        });
      } catch (err) {
        if (err instanceof GuessTheGoalApiError && err.status >= 400 && err.status < 500) {
          // Definite rejection (session gone/answered in another tab): a
          // same-option retry can never succeed — reconcile with the server.
          setPhase('loading');
          loadCurrent(false);
          return;
        }
        // picked is KEPT: an ambiguous failure (timeout/5xx) may have
        // committed, and a same-option retry replays the stored result.
        setError(t('Something went wrong — try again'));
        trackEvent('ggt_error', { stage: 'guess' });
        void err;
      } finally {
        setBusy(false);
      }
    },
    [session, busy, phase, queryClient, addXP, t, serverElapsed, loadCurrent]
  );

  const submitBonus = useCallback(
    async (optionId: string) => {
      if (!session || busy) return;
      setBusy(true);
      setError(null);
      setBonusPicked(optionId);
      try {
        const result = await guessTheGoalApi.bonus(session.session_id, optionId);
        setBonusOutcome(result);
        setPhase('bonus_done');
        if (result.awards.coins > 0) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
        }
        if (result.awards.xp > 0) addXP(result.awards.xp);
        trackEvent('ggt_bonus_answered', {
          correct: result.correct,
          bonus_points: result.bonus_points,
          coins_awarded: result.awards.coins,
          xp_awarded: result.awards.xp,
          difficulty: session.goal.difficulty,
        });
      } catch (err) {
        if (err instanceof GuessTheGoalApiError && err.status >= 400 && err.status < 500) {
          setPhase('loading');
          loadCurrent(false);
          return;
        }
        setError(t('Something went wrong — try again'));
        trackEvent('ggt_error', { stage: 'bonus' });
        void err;
      } finally {
        setBusy(false);
      }
    },
    [session, busy, queryClient, addXP, t, loadCurrent]
  );

  const mainMoves = session?.goal.main_moves ?? 1;
  const duration = timeline?.duration ?? 0;

  /** Display-only replay position ("Move 2/5") — scoring no longer derives
   *  from it, so a fast guess on a short goal isn't punished for the author's
   *  step count. */
  const revealedMoves = useMemo(() => {
    if (!timeline) return 1;
    const elapsed = Math.min(time, timeline.duration);
    let revealed = 0;
    for (const step of timeline.steps) {
      if (step.main && step.start <= elapsed) revealed += 1;
    }
    return Math.max(1, Math.min(revealed, mainMoves));
  }, [timeline, time, mainMoves]);

  /** No time decay (owner decision): a correct guess pays the session's full
   *  max_points, which is already reduced for replayed goals. */
  const potential = session?.max_points ?? 0;

  /** Animation position: loop the replay while watching; freeze at full when
   *  revealed. The score clock (time) is monotonic — only the drawing loops. */
  const animTime =
    phase === 'watch' && duration > 0
      ? Math.min(time % (duration + LOOP_HOLD), duration)
      : duration;
  const goalFlash = phase !== 'watch' || (duration > 0 && animTime >= duration - 0.05);

  // Clips we host ourselves play in a normal <video>; anything still pointing
  // at YouTube keeps the iframe. Self-hosted is the fallback-proof path — an
  // embed can be switched off by the rights holder at any time.
  const selfHostedVideo = outcome?.video_url && /^https?:\/\/[^ ]+\.mp4(\?|$)/i.test(outcome.video_url)
    ? outcome.video_url
    : null;
  const video = !selfHostedVideo && outcome?.video_url
    ? youtubeEmbed(outcome.video_url, outcome.clip_end_s)
    : null;
  const hasVideo = Boolean(selfHostedVideo || video);

  const inGame = phase === 'watch' || phase === 'reveal' || phase === 'bonus' || phase === 'bonus_done';
  const activeKind = useMemo<TacticsStepKind | null>(() => {
    if (phase !== 'watch' || !timeline) return null;
    let current: TacticsStepKind | null = null;
    for (const s of timeline.steps) {
      if (s.start <= animTime && animTime < s.end && s.kind !== 'run') current = s.kind;
    }
    if (!current) {
      for (const s of timeline.steps) if (s.start <= animTime && animTime < s.end) current = s.kind;
    }
    return current;
  }, [phase, timeline, animTime]);



  const pitchColumn = session && boardGoal && timeline && (
    <div className="flex flex-col gap-1.5 lg:flex-[3]">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="shrink-0 font-poppins text-[11px] font-black uppercase tracking-wider text-white/45">
          {t('Solved {n}/{total}', { n: session.progress.solved, total: session.progress.total })}
        </span>
        {phase === 'watch' ? (
          <span className="shrink-0 font-poppins text-[11px] font-black uppercase tracking-wider text-brand-yellow">
            {t('+{points} points', { points: potential })}
          </span>
        ) : outcome ? (
          <span
            className={`font-poppins text-[11px] font-black uppercase tracking-wider ${outcome.correct ? 'text-brand-green-bright' : 'text-brand-red'}`}
          >
            {outcome.correct ? t('+{points} points', { points: outcome.points }) : t('Missed')}
          </span>
        ) : null}
      </div>

      {phase === 'watch' && (
        <div className="flex items-center gap-2 px-1">
          <span className="shrink-0 rounded-full bg-white/[0.07] px-2.5 py-1 font-poppins text-[10px] font-black uppercase tracking-wide text-white/80">
            {t('Move {n}/{total}', { n: revealedMoves, total: mainMoves })}
          </span>
          {activeKind && !goalFlash && (
            <span
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 font-poppins text-[10px] font-black uppercase tracking-wide"
              style={{ color: activeKind === 'shot' ? '#FFE500' : '#ffffff' }}
            >
              <GgtActionGlyph kind={activeKind} color={activeKind === 'shot' ? '#FFE500' : '#ffffff'} />
              {GGT_ACTION_META[activeKind].label[locale]}
            </span>
          )}
        </div>
      )}

      <div
        className="relative w-full overflow-hidden rounded-2xl bg-black"
        style={{ aspectRatio: `${BOARD_VIEW_W} / ${BOARD_VIEW_H}` }}
      >
        {showVideo && selfHostedVideo ? (
          <video
            src={`${selfHostedVideo}${outcome?.clip_start_s ? `#t=${outcome.clip_start_s}` : ''}`}
            title={pick(outcome?.title)}
            autoPlay
            controls
            playsInline
            className="absolute inset-0 h-full w-full"
          />
        ) : showVideo && video ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0${video.start ? `&start=${video.start}` : ''}${video.end ? `&end=${video.end}` : ''}`}
            title={pick(outcome?.title)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <TacticsBoard2D goal={boardGoal} timeline={timeline} t={animTime} goalFlash={goalFlash} />
        )}
      </div>

      {(phase === 'reveal' || phase === 'bonus_done' || (hasVideo && phase !== 'watch')) && (
        <div className="flex items-center justify-center gap-2.5">
          {hasVideo && (
            <button
              type="button"
              onClick={() => setShowVideo((v) => !v)}
              className="flex h-10 items-center justify-center gap-2 rounded-full bg-brand-yellow px-5 font-poppins text-[12px] font-black uppercase tracking-wide text-black transition-all hover:brightness-105 active:translate-y-[1px]"
            >
              <Clapperboard className="size-4" />
              {showVideo ? t('Back to the board') : t('Watch the real goal')}
            </button>
          )}
          {(phase === 'reveal' || phase === 'bonus_done') && gallery && (
            <button
              type="button"
              onClick={() => setShowGallery(true)}
              className="flex h-10 items-center justify-center gap-2 rounded-full bg-brand-blue px-5 font-poppins text-[12px] font-black uppercase tracking-wide text-white transition-all hover:brightness-110 active:translate-y-[1px]"
            >
              <LayoutGrid className="size-4" />
              {t('Your collection')}
            </button>
          )}
        </div>
      )}

      {/* Legend is hidden during the timed watch phase: on a 390px phone it
          pushed the four answer options below the fold and players scrolled
          while their score decayed. Glyphs are taught pre-kickoff (idle) and
          re-shown at reveal. */}
      {phase !== 'watch' && <GgtLegend />}
    </div>
  );

  return (
    <div className="min-h-screen font-fun">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-[430px] flex-col px-4 py-6 md:px-8 md:py-8 lg:max-w-6xl">
        <div className="mb-4 md:mb-6">
          <div className="flex items-center gap-3 md:gap-4">
            <Link
              href={backHref ?? '/mini-games'}
              aria-label={t('Back')}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:size-11"
            >
              <ArrowLeft className="size-5 md:size-6" />
            </Link>
            <h1 className="font-poppins text-[20px] uppercase leading-[1.1] text-white md:text-[32px]">
              {t('Guess the Goal')}
            </h1>
          </div>
          <p className="mt-1.5 pl-12 text-[11px] font-black uppercase tracking-[0.04em] text-white/55 md:pl-[60px] md:text-sm md:tracking-[0.08em]">
            {t('Name the iconic goal — real rewards, server-scored')}
          </p>
        </div>
      {phase === 'loading' && (
        <div className="flex flex-1 items-center justify-center font-poppins text-sm font-bold uppercase text-white/40">
          {t('Loading…')}
        </div>
      )}

      {phase === 'load_error' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <WifiOff className="size-10 text-white/30" />
          <p className="max-w-xs font-poppins text-sm font-bold uppercase leading-relaxed text-white/55">
            {t("Couldn't load your game")}
          </p>
          <button
            type="button"
            onClick={retryLoad}
            className="flex h-12 w-full max-w-[220px] items-center justify-center rounded-2xl bg-brand-green-bright font-poppins text-sm font-black uppercase tracking-wide text-black"
          >
            {t('Try again')}
          </button>
        </div>
      )}

      {phase === 'disabled' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <WifiOff className="size-10 text-white/30" />
          <p className="max-w-xs font-poppins text-sm font-bold uppercase leading-relaxed text-white/55">
            {t('Guess the Goal is warming up — check back soon')}
          </p>
          <button
            type="button"
            onClick={retryLoad}
            className="flex h-12 w-full max-w-[220px] items-center justify-center rounded-2xl bg-white/10 font-poppins text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-white/20"
          >
            {t('Try again')}
          </button>
        </div>
      )}

      {phase === 'idle' && (
        <div className="flex flex-1 flex-col items-center gap-8 pb-8 pt-2 md:pt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex w-full max-w-md flex-col items-center gap-4 rounded-[20px] p-8 text-center text-black md:p-10"
            style={{ backgroundColor: '#FF9600' }}
          >
            <h2 className="font-poppins text-2xl uppercase leading-[1.05] md:text-3xl">
              {t('Guess the Goal')}
            </h2>
            <p className="max-w-xs text-sm font-semibold leading-relaxed text-black/80">
              {poolExhausted
                ? t(
                    'You have solved every goal in the library. Replays keep your mind sharp — no repeat rewards, all glory.'
                  )
                : gallery
                  ? t(
                      'A legendary goal replays on the coaching board. Name it — the first solve of each goal pays coins and XP.'
                    )
                  : t(
                      'A legendary goal replays on the coaching board. Watch the moves and name the goal.'
                    )}
            </p>
            {gallery && !poolExhausted && goalsLeftToday !== null && (
              <div
                className="rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-black"
                style={{ backgroundColor: 'rgba(0,0,0,0.14)' }}
              >
                {dailyLimitReached
                  ? t('All {limit} goals played — come back tomorrow', { limit: dailyLimit ?? 0 })
                  : t('{left} of {limit} goals left today', {
                      left: goalsLeftToday,
                      limit: dailyLimit ?? 0,
                    })}
              </div>
            )}
            {error && <p className="max-w-xs text-xs font-bold text-black">{error}</p>}
            <button
              type="button"
              onClick={start}
              disabled={busy || dailyLimitReached}
              className="font-poppins mt-2 inline-flex h-[50px] min-w-[200px] items-center justify-center gap-2 rounded-[20px] bg-black px-8 text-[20px] uppercase tracking-wide text-white transition-all hover:brightness-110 active:translate-y-[2px] disabled:opacity-60"
            >
              <Play className="size-5 fill-current" />{' '}
              {dailyLimitReached ? t('Back tomorrow') : t('Kick off')}
            </button>
            <GgtLegend />
          </motion.div>
          {gallery && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="w-full max-w-3xl"
            >
              <GgtGalleryPanel gallery={gallery} locale={locale} t={t} pick={pick} />
            </motion.div>
          )}
        </div>
      )}

      {phase === 'starting' && (
        <div
          role="status"
          aria-busy="true"
          aria-label={t('Loading…')}
          className="flex min-h-0 flex-1 flex-col gap-3 pt-1 lg:my-auto lg:flex-none lg:flex-row lg:items-start lg:justify-center lg:gap-6"
        >
          <div className="flex flex-col gap-1.5 lg:flex-[3]">
            <div className="h-[26px]" />
            <div
              className="w-full animate-pulse rounded-2xl bg-[#4a9c53]/40"
              style={{ aspectRatio: `${BOARD_VIEW_W} / ${BOARD_VIEW_H}` }}
            />
            <GgtLegend />
          </div>
          <div className="flex flex-col gap-2 lg:flex-[2]">
            <div className="h-[22px]" />
            <div className="flex flex-col gap-2.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="min-h-[52px] animate-pulse rounded-[16px] border-2 border-white/10 bg-white/[0.04] sm:min-h-[56px]"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {inGame && session && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 pt-1 lg:my-auto lg:flex-none lg:flex-row lg:items-start lg:justify-center lg:gap-6">
          {pitchColumn}

          <div className="flex flex-col gap-2 lg:flex-[2]">
            <AnimatePresence mode="wait">
              {(phase === 'watch' || phase === 'reveal') && (
                <motion.div
                  key={`options-${session.session_id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col gap-1.5"
                >
                  <p className="flex items-baseline px-1 font-poppins text-[11px] font-black uppercase tracking-wider text-white/45">
                    {t('Which goal is this?')}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {session.goal.options.map((option) => {
                      const isAnswer = outcome?.correct_option_id === option.id;
                      const isPicked = picked === option.id;
                      const state: GgtOptionState =
                        phase === 'reveal'
                          ? isAnswer
                            ? 'correct'
                            : isPicked
                              ? 'wrong'
                              : 'dim'
                          : picked !== null
                            ? isPicked
                              ? 'locked'
                              : 'dim'
                            : 'idle';
                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={phase !== 'watch' || busy || (picked !== null && picked !== option.id)}
                          onClick={() => submitGuess(option.id)}
                          className={GGT_OPTION_CLASS}
                          style={ggtOptionStyle(state)}
                        >
                          {pick(option.text)}
                        </button>
                      );
                    })}
                  </div>
                  {error && phase === 'watch' && picked && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => submitGuess(picked)}
                      className="text-xs font-semibold text-brand-red underline"
                    >
                      {error}
                    </button>
                  )}
                  {phase === 'reveal' && outcome && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 flex flex-col gap-2">
                      <p className="px-1 font-poppins text-sm font-black uppercase leading-snug text-white">
                        {pick(outcome.title)}
                      </p>
                      {outcome.fun_fact && (
                        <p className="rounded-xl bg-white/[0.05] px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-white/65">
                          {pick(outcome.fun_fact)}
                        </p>
                      )}
                      {outcome.awards.first_solve && (
                        <p className="flex items-center gap-2 px-1 font-poppins text-[12px] font-black uppercase text-brand-green-bright">
                          <CoinIcon className="size-4" /> +{outcome.awards.coins} · +{outcome.awards.xp} XP
                          {outcome.awards.daily_cap_reached && (
                            <span className="text-white/40">{t('(daily cap)')}</span>
                          )}
                        </p>
                      )}
                      {outcome.correct && !outcome.awards.first_solve && (
                        <p className="px-1 font-poppins text-[11px] font-bold uppercase text-white/40">
                          {t('Already solved before — no repeat rewards')}
                        </p>
                      )}
                      {error && (
                        <p className="px-1 text-xs font-semibold text-brand-red">{error}</p>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          outcome.session_state === 'guessed' && outcome.bonus ? setPhase('bonus') : start()
                        }
                        className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-brand-green-bright font-poppins text-sm font-black uppercase tracking-wide text-black disabled:opacity-60"
                      >
                        {outcome.session_state === 'guessed' ? t('Bonus question') : t('Next goal')}
                        <ChevronRight className="size-4" />
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {(phase === 'bonus' || phase === 'bonus_done') && (
                <motion.div
                  key={`bonus-${session.session_id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col gap-1.5"
                >
                  <p className="flex items-baseline px-1 font-poppins text-[11px] font-black uppercase tracking-wider text-brand-yellow">
                    {t('Bonus question')}
                  </p>
                  <p className="px-1 pb-1 font-poppins text-sm font-black uppercase leading-snug text-white">
                    {pick((outcome?.bonus ?? session.bonus)?.question)}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    {((outcome?.bonus ?? session.bonus)?.options ?? []).map((option) => {
                      const isAnswer = bonusOutcome?.correct_option_id === option.id;
                      const isPicked = bonusPicked === option.id;
                      const state: GgtOptionState =
                        phase === 'bonus_done'
                          ? isAnswer
                            ? 'correct'
                            : isPicked
                              ? 'wrong'
                              : 'dim'
                          : bonusPicked !== null
                            ? isPicked
                              ? 'locked'
                              : 'dim'
                            : 'idle';
                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={phase !== 'bonus' || busy || (bonusPicked !== null && bonusPicked !== option.id)}
                          onClick={() => submitBonus(option.id)}
                          className={GGT_OPTION_CLASS}
                          style={ggtOptionStyle(state)}
                        >
                          {pick(option.text)}
                        </button>
                      );
                    })}
                  </div>
                  {phase === 'bonus_done' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 flex flex-col gap-2">
                      {bonusOutcome && (bonusOutcome.awards.coins > 0 || bonusOutcome.awards.xp > 0) && (
                        <p className="flex items-center gap-2 px-1 font-poppins text-[12px] font-black uppercase text-brand-green-bright">
                          <CoinIcon className="size-4" /> +{bonusOutcome.awards.coins} · +{bonusOutcome.awards.xp} XP
                          {bonusOutcome.awards.daily_cap_reached && (
                            <span className="text-white/40">{t('(daily cap)')}</span>
                          )}
                        </p>
                      )}
                      {error && (
                        <p className="px-1 text-xs font-semibold text-brand-red">{error}</p>
                      )}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={start}
                        className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-brand-green-bright font-poppins text-sm font-black uppercase tracking-wide text-black disabled:opacity-60"
                      >
                        {t('Next goal')}
                        <RotateCcw className="size-4" />
                      </button>
                    </motion.div>
                  )}
                  {error && phase === 'bonus' && bonusPicked && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => submitBonus(bonusPicked)}
                      className="text-xs font-semibold text-brand-red underline"
                    >
                      {error}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
      </div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showGallery && gallery && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                role="dialog"
                aria-modal="true"
                aria-label={t('Your collection')}
                className="fixed inset-0 z-[100] overflow-y-auto bg-[#0d1220]/95 backdrop-blur-md"
                onClick={() => setShowGallery(false)}
              >
                <div
                  className="mx-auto max-w-3xl px-4 pb-32 pt-6 md:py-12"
                  onClick={(e) => e.stopPropagation()}
                >
                  <GgtGalleryPanel
                    gallery={gallery}
                    locale={locale}
                    t={t}
                    pick={pick}
                    onClose={() => setShowGallery(false)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
