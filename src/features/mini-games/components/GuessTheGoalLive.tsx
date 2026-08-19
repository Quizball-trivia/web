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
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Play, RotateCcw, WifiOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { MiniGameShell, StatPill } from './MiniGameShell';
import { TacticsBoard2D, BOARD_VIEW_W, BOARD_VIEW_H } from './TacticsBoard2D';
import { GgtActionGlyph, GgtLegend, GGT_ACTION_META, GGT_OPTION_CLASS, ggtOptionStyle, type GgtOptionState } from './guessTheGoalUi';
import { buildTimeline, type TacticsGoalDef, type TacticsStepKind } from '../lib/tacticsEngine';
import { useMiniLocale, useMiniT } from '../lib/i18n';
import { useStoreWallet } from '@/lib/queries/store.queries';
import { queryKeys } from '@/lib/queries/queryKeys';
import { CoinIcon } from '@/features/store/components/CoinIcon';
import {
  guessTheGoalApi,
  GuessTheGoalApiError,
  type GgtGuessOutcome,
  type GgtBonusOutcome,
  type GgtI18nText,
  type GgtSession,
} from '@/lib/repositories/guessTheGoal.repo';

type Phase = 'loading' | 'idle' | 'watch' | 'reveal' | 'bonus' | 'bonus_done' | 'disabled';

const LOOP_HOLD = 1.6;

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
  const { data: wallet } = useStoreWallet();

  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<GgtSession | null>(null);
  const [outcome, setOutcome] = useState<GgtGuessOutcome | null>(null);
  const [bonusOutcome, setBonusOutcome] = useState<GgtBonusOutcome | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [bonusPicked, setBonusPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const adoptSession = useCallback((next: GgtSession) => {
    offsetRef.current = new Date(next.server_now).getTime() - Date.now();
    setSession(next);
    setOutcome(null);
    setBonusOutcome(null);
    setPicked(null);
    setBonusPicked(null);
    setError(null);
    setPhase(next.state === 'guessed' ? 'bonus' : 'watch');
  }, []);

  useEffect(() => {
    let cancelled = false;
    guessTheGoalApi
      .current()
      .then((existing) => {
        if (cancelled) return;
        if (existing) adoptSession(existing);
        else setPhase('idle');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof GuessTheGoalApiError && err.status === 503) setPhase('disabled');
        else {
          setError(err instanceof Error ? err.message : String(err));
          setPhase('idle');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [adoptSession]);

  /** Server-clock elapsed seconds past the grace window. */
  const serverElapsed = useCallback((): number => {
    if (!session) return 0;
    const now = Date.now() + offsetRef.current;
    return Math.max(0, (now - new Date(session.started_at).getTime() - session.grace_ms) / 1000);
  }, [session]);

  useEffect(() => {
    if (phase !== 'watch' || !timeline) return undefined;
    let raf = 0;
    const tick = () => {
      setTime(serverElapsed());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, timeline, serverElapsed]);

  const start = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
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
        nonceRef.current = null;
        if (err.status === 409) {
          const existing = await guessTheGoalApi.current().catch(() => null);
          if (existing) {
            adoptSession(existing);
            return;
          }
        }
      }
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [busy, adoptSession]);

  const submitGuess = useCallback(
    async (optionId: string) => {
      if (!session || busy || phase !== 'watch') return;
      setBusy(true);
      setPicked(optionId);
      try {
        // Same-option retries replay the stored result server-side, so a
        // timeout here is safe to re-submit.
        const result = await guessTheGoalApi.guess(session.session_id, optionId);
        setOutcome(result);
        setPhase('reveal');
        if (result.awards.coins > 0) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
        }
      } catch (err) {
        setPicked(null);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [session, busy, phase, queryClient]
  );

  const submitBonus = useCallback(
    async (optionId: string) => {
      if (!session || busy) return;
      setBusy(true);
      setBonusPicked(optionId);
      try {
        const result = await guessTheGoalApi.bonus(session.session_id, optionId);
        setBonusOutcome(result);
        setPhase('bonus_done');
        if (result.awards.coins > 0) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.store.wallet() });
        }
      } catch (err) {
        setBonusPicked(null);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [session, busy, queryClient]
  );

  const mainMoves = session?.goal.main_moves ?? 1;
  const duration = timeline?.duration ?? 0;

  const revealedMoves = useMemo(() => {
    if (!timeline) return 1;
    const elapsed = Math.min(time, timeline.duration);
    let revealed = 0;
    for (const step of timeline.steps) {
      if (step.main && step.start <= elapsed) revealed += 1;
    }
    return Math.max(1, Math.min(revealed, mainMoves));
  }, [timeline, time, mainMoves]);

  const potential = useMemo(() => {
    if (!session) return 0;
    const span = Math.max(1, mainMoves - 1);
    const stepIdx = Math.max(0, Math.min(revealedMoves - 1, mainMoves - 1));
    const raw = Math.round(
      session.max_points - ((session.max_points - session.min_points) * stepIdx) / span
    );
    return Math.max(session.min_points, Math.min(session.max_points, raw));
  }, [session, revealedMoves, mainMoves]);

  /** Animation position: loop the replay while watching; freeze at full when
   *  revealed. The score clock (time) is monotonic — only the drawing loops. */
  const animTime =
    phase === 'watch' && duration > 0
      ? Math.min(time % (duration + LOOP_HOLD), duration)
      : duration;
  const goalFlash = phase !== 'watch' || (duration > 0 && animTime >= duration - 0.05);

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

  const totalAwardedCoins = (outcome?.awards.coins ?? 0) + (bonusOutcome?.awards.coins ?? 0);
  const totalAwardedXp = (outcome?.awards.xp ?? 0) + (bonusOutcome?.awards.xp ?? 0);

  const pitchColumn = session && boardGoal && timeline && (
    <div className="flex flex-col gap-1.5 lg:flex-[3]">
      <div className="flex items-baseline justify-between px-1">
        <div className="flex items-baseline gap-3">
          <span className="font-poppins text-[11px] font-black uppercase tracking-wider text-white/45">
            {t('Solved {n}/{total}', { n: session.progress.solved, total: session.progress.total })}
          </span>
        </div>
        {phase === 'watch' ? (
          <span className="font-poppins text-[11px] font-black uppercase tracking-wider text-brand-yellow">
            {t('Answer now · +{points}', { points: potential })}
          </span>
        ) : outcome ? (
          <span
            className={`font-poppins text-[11px] font-black uppercase tracking-wider ${outcome.correct ? 'text-brand-green-bright' : 'text-brand-red'}`}
          >
            {outcome.correct ? t('+{points} points', { points: outcome.points }) : t('Missed')}
          </span>
        ) : null}
      </div>

      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{ aspectRatio: `${BOARD_VIEW_W} / ${BOARD_VIEW_H}` }}
      >
        <TacticsBoard2D goal={boardGoal} timeline={timeline} t={animTime} goalFlash={goalFlash} />
        {phase === 'watch' && (
          <div className="absolute left-2 top-2 flex items-center gap-1.5">
            <div className="rounded-full bg-black/50 px-3 py-1.5 font-poppins text-[11px] font-black uppercase tracking-wide text-white/80 backdrop-blur">
              {t('Move {n}/{total}', { n: revealedMoves, total: mainMoves })}
            </div>
            {activeKind && !goalFlash && (
              <div
                className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 font-poppins text-[11px] font-black uppercase tracking-wide backdrop-blur"
                style={{ color: activeKind === 'shot' ? '#FFE500' : '#ffffff' }}
              >
                <GgtActionGlyph kind={activeKind} color={activeKind === 'shot' ? '#FFE500' : '#ffffff'} />
                {GGT_ACTION_META[activeKind].label[locale]}
              </div>
            )}
          </div>
        )}
      </div>

      <GgtLegend />
    </div>
  );

  return (
    <MiniGameShell
      title={t('Guess the Goal')}
      subtitle={t('Name the iconic goal — real rewards, server-scored')}
      accent="#58CC02"
      backHref={backHref}
      wide
      headerRight={
        <StatPill
          label={t('Coins')}
          value={
            <span className="inline-flex items-center gap-1">
              <CoinIcon className="size-4" />
              {wallet?.coins ?? '—'}
            </span>
          }
        />
      }
    >
      {phase === 'loading' && (
        <div className="flex flex-1 items-center justify-center font-poppins text-sm font-bold uppercase text-white/40">
          {t('Loading…')}
        </div>
      )}

      {phase === 'disabled' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <WifiOff className="size-10 text-white/30" />
          <p className="max-w-xs font-poppins text-sm font-bold uppercase leading-relaxed text-white/55">
            {t('Guess the Goal is warming up — check back soon')}
          </p>
        </div>
      )}

      {phase === 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
        >
          <div className="text-6xl">📋</div>
          <div>
            <h2 className="font-poppins text-2xl font-black uppercase text-white">{t('Guess the Goal')}</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-relaxed text-white/60">
              {t(
                'A legendary goal replays on the coaching board. The earlier you name it, the more you earn — first solve of each goal pays coins and XP.'
              )}
            </p>
          </div>
          {error && (
            <p className="max-w-xs text-xs font-semibold text-brand-red">{error}</p>
          )}
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-brand-green-bright font-poppins text-lg font-black uppercase tracking-wide text-black disabled:opacity-60"
          >
            <Play className="size-5 fill-current" /> {t('Kick off')}
          </button>
        </motion.div>
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
                          : 'idle';
                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={phase !== 'watch' || busy}
                          onClick={() => submitGuess(option.id)}
                          className={GGT_OPTION_CLASS}
                          style={ggtOptionStyle(state)}
                        >
                          {pick(option.text)}
                        </button>
                      );
                    })}
                  </div>
                  {error && phase === 'watch' && (
                    <button
                      type="button"
                      onClick={() => picked && submitGuess(picked)}
                      className="text-xs font-semibold text-brand-red underline"
                    >
                      {error} — {t('Try again')}
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
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => (outcome.session_state === 'guessed' ? setPhase('bonus') : start())}
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
                          : 'idle';
                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={phase !== 'bonus' || busy}
                          onClick={() => submitBonus(option.id)}
                          className={GGT_OPTION_CLASS}
                          style={ggtOptionStyle(state)}
                        >
                          {pick(option.text)}
                        </button>
                      );
                    })}
                  </div>
                  {phase === 'bonus_done' && bonusOutcome && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 flex flex-col gap-2">
                      {(totalAwardedCoins > 0 || totalAwardedXp > 0) && (
                        <p className="flex items-center gap-2 px-1 font-poppins text-[12px] font-black uppercase text-brand-green-bright">
                          <CoinIcon className="size-4" /> +{totalAwardedCoins} · +{totalAwardedXp} XP
                        </p>
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
                  {error && phase === 'bonus' && (
                    <button
                      type="button"
                      onClick={() => bonusPicked && submitBonus(bonusPicked)}
                      className="text-xs font-semibold text-brand-red underline"
                    >
                      {error} — {t('Try again')}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </MiniGameShell>
  );
}
