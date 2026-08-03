'use client';

// Weekend League LIVE flow — the real synchronized game, driven entirely by
// the wl:* socket stream (see useWlLive). Replaces the mock GauntletFlow for
// in-app play; the prototype stays on /dev/wl.

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, LogOut } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuthStore } from '@/stores/auth.store';
import type {
  WlBoardRow,
  WlDispatchEventPayload,
  WlI18nText,
  WlRevealEventPayload,
} from '@/lib/realtime/socket.types';
import type { Locale } from '@/lib/i18n/messages';
import { poppins } from '../constants';
import { LiveBadge } from '../components/LiveBadge';
// ONE visual source with /dev/wl-gauntlet: the live flow renders the same
// designed views the prototype uses — change them there, they change here.
import { QuestionCard, RoundIntroOverlay, type AnswerState } from '../gauntlet/RoundChrome';
import {
  AnswerOptionList,
  CareerPathCard,
  GauntletBackdrop,
  HigherLowerCard,
  PairAnswers,
  RoundScreenShell,
  TypedAnswerPanel,
  WhoAmIBadges,
  WhoAmIClueLadder,
  type RoundHeaderModel,
} from '../gauntlet/RoundViews';
import { AnswerReveal, EliminationReveal, GameResult } from '../gauntlet/GauntletScreens';
import { ROUNDS } from '../gauntlet/gauntlet.data';
import { ResultSplash } from '@/features/daily/components/ResultSplash';
import { useResultSplash } from '@/features/daily/components/useResultSplash';
import { useWlLive, type WlLiveScreen } from './useWlLive';

const WHO_AM_I_CLUES = 5;
const WHO_AM_I_POINTS = [300, 240, 180, 120, 60];

function pick(text: unknown, locale: Locale): string {
  if (typeof text === 'string') return text;
  if (text && typeof text === 'object') {
    const t = text as WlI18nText;
    return t[locale] ?? t.en ?? Object.values(t).find((v) => typeof v === 'string') ?? '';
  }
  return '';
}

/** Seconds left on a server-clock deadline, ticking 4×/s. */
function useServerCountdown(deadlineAt: number | null, serverNow: () => number): number {
  const [left, setLeft] = useState(() =>
    deadlineAt == null ? 0 : Math.max(0, deadlineAt - serverNow()),
  );
  useEffect(() => {
    if (deadlineAt == null) return;
    const tick = () => setLeft(Math.max(0, deadlineAt - serverNow()));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadlineAt, serverNow]);
  return Math.ceil(left / 1000);
}

export function WlLiveFlow({
  tournamentId,
  role,
  status,
  checkedIn,
  checkinPending,
  onCheckin,
  onExit,
  onSpectate,
  kickoffMs,
  registered,
}: {
  tournamentId: string;
  role: 'player' | 'spectator';
  /** Backend tournament status (drives the pre-game check-in screen). */
  status: string | null;
  /** Role-appropriate check-in state (Saturday or final). */
  checkedIn: boolean;
  checkinPending: boolean;
  onCheckin: () => void;
  onExit: () => void;
  /** Eliminated players continue as spectators through here. */
  onSpectate?: () => void;
  /** Saturday kickoff (qualifier start) — drives the waiting countdown. */
  kickoffMs?: number | null;
  registered?: number;
}) {
  const { t, locale } = useLocale();
  const live = useWlLive(tournamentId, role);
  const selfUserId = useAuthStore((s) => s.user?.id ?? null);

  const yourRow = useMemo(
    () => live.board.find((row) => row.user_id === selfUserId) ?? null,
    [live.board, selfUserId],
  );

  // Verdict splash lives ABOVE the keyed screen transition so a quick
  // question→reveal flip can't unmount it mid-animation; fired from an effect
  // (never during render), once per attempt.
  const { splashProps: liveSplashProps, fire: fireSplash } = useResultSplash();
  const splashedFor = useRef<string | null>(null);
  const liveScreen = live.screen;
  useEffect(() => {
    const attemptId =
      liveScreen.kind === 'question' ? liveScreen.attempt.attempt_id
      : liveScreen.kind === 'reveal' ? liveScreen.reveal.attempt_id
      : null;
    if (attemptId == null) return;
    const ack = (liveScreen as { answer?: unknown }).answer as { accepted: boolean; correct?: boolean } | null;
    if (ack?.accepted !== true || typeof ack.correct !== 'boolean') return;
    if (splashedFor.current === attemptId) return;
    splashedFor.current = attemptId;
    fireSplash(ack.correct ? 'correct' : 'wrong', 'left');
  }, [liveScreen, fireSplash]);

  if (live.denied === 'not_entered') {
    return (
      <Immersive>
        <Shell onExit={onExit}>
          <div className="font-poppins text-lg font-black uppercase text-white">
            {t('weekendLeague.gNotEntered')}
          </div>
        </Shell>
      </Immersive>
    );
  }

  const inCheckinWindow = status === 'checkin' || status === 'final_checkin';
  if (role === 'player' && inCheckinWindow && live.screen.kind === 'waiting') {
    return (
      <Immersive>
      <Shell onExit={onExit}>
        <div className="mb-2 flex justify-center"><LiveBadge /></div>
        <div className="font-poppins text-2xl font-black uppercase text-white" style={poppins}>
          {checkedIn ? t('weekendLeague.gCheckedIn') : t('weekendLeague.gCheckinTitle')}
        </div>
        <p className="mx-auto mt-1 max-w-xs font-poppins text-[13px] font-semibold text-white/60">
          {checkedIn ? t('weekendLeague.gWaitingKickoff') : t('weekendLeague.gCheckinBody')}
        </p>
        {checkedIn ? (
          <>
            <div className="mx-auto mt-5 flex size-14 items-center justify-center rounded-full bg-brand-green text-white">
              <Check className="size-8" strokeWidth={3} />
            </div>
            <KickoffCountdown kickoffMs={kickoffMs ?? null} registered={registered ?? 0} />
          </>
        ) : (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            disabled={checkinPending}
            onClick={onCheckin}
            className="mx-auto mt-5 flex h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-brand-green font-poppins text-lg font-black uppercase tracking-wide text-white transition-colors hover:bg-brand-green/90 disabled:opacity-60"
          >
            {t('weekendLeague.gCheckin')}
          </motion.button>
        )}
      </Shell>
      </Immersive>
    );
  }

  return (
    <Immersive resetKey={screenKey(live.screen)}>
      <ConnectionDot connected={live.connected && live.subscribed} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={screenKey(live.screen)}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <ScreenBody
            screen={live.screen}
            role={role}
            locale={locale}
            serverNow={live.serverNow}
            submitAnswer={live.submitAnswer}
            retryNonce={live.retryNonce}
            board={live.board}
            selfUserId={selfUserId}
            score={live.score}
            rank={yourRow?.rank ?? null}
            onExit={onExit}
            onSpectate={onSpectate ?? onExit}
          />
        </motion.div>
      </AnimatePresence>
      <ResultSplash {...liveSplashProps} />
    </Immersive>
  );
}

/** Full-screen takeover with the gauntlet backdrop — live play looks exactly
 *  like /dev/wl-gauntlet even though the route lives inside the app shell. */
function Immersive({ children, resetKey }: { children: React.ReactNode; resetKey?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Each screen starts at the top — the container outlives the keyed screens,
  // so a long clue ladder must not leave the next screen scrolled down.
  useEffect(() => {
    ref.current?.scrollTo(0, 0);
  }, [resetKey]);
  return (
    <div ref={ref} className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
      <GauntletBackdrop>{children}</GauntletBackdrop>
    </div>
  );
}

/** Slim connection signal — only visible while the socket is down. */
function ConnectionDot({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <span className="fixed right-3 top-3 z-50 size-2.5 animate-pulse rounded-full bg-brand-red-soft" />
  );
}

function screenKey(screen: WlLiveScreen): string {
  switch (screen.kind) {
    case 'question': return `q-${screen.attempt.attempt_id}`;
    case 'reveal': return `r-${screen.reveal.attempt_id}`;
    case 'game_result': return `g-${screen.result.game_index}`;
    case 'final_result': return 'final';
    default: return screen.kind;
  }
}

function Shell({ children, onExit }: { children: React.ReactNode; onExit: () => void }) {
  const { t } = useLocale();
  const SHELL_EXIT_LABEL = t('weekendLeague.gQuit');
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-5 text-center font-fun">
      <div className="w-full rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-6">
        {children}
        <button
          type="button"
          onClick={onExit}
          className="mx-auto mt-6 flex items-center gap-1.5 font-poppins text-[12px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
        >
          <LogOut className="size-4" /> {SHELL_EXIT_LABEL}
        </button>
      </div>
    </div>
  );
}


function ScreenBody({
  screen, role, locale, serverNow, submitAnswer, retryNonce, board, selfUserId, score, rank, onExit, onSpectate,
}: {
  screen: WlLiveScreen;
  role: 'player' | 'spectator';
  locale: Locale;
  serverNow: () => number;
  submitAnswer: (answer: unknown) => void;
  retryNonce: number;
  board: WlBoardRow[];
  selfUserId: string | null;
  score: number;
  rank: number | null;
  onExit: () => void;
  onSpectate: () => void;
}) {
  const { t } = useLocale();
  const yourRank = rank ?? (selfUserId ? board.find((r) => r.user_id === selfUserId)?.rank ?? null : null);

  switch (screen.kind) {
    case 'waiting':
      return (
        <div className="mx-auto w-full max-w-2xl px-4 py-10">
          <div className="rounded-[24px] bg-brand-cyan/[0.08] p-8 text-center">
            <div className="mb-3 flex justify-center"><LiveBadge /></div>
            <div className="font-poppins text-xl font-black uppercase text-white" style={poppins}>
              {t('weekendLeague.gWaitingNext')}
            </div>
            <BoardStrip board={board} selfUserId={selfUserId} />
            <button
              type="button"
              onClick={onExit}
              className="mx-auto mt-6 flex items-center gap-1.5 font-poppins text-[12px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
            >
              <LogOut className="size-4" /> {t('weekendLeague.gQuit')}
            </button>
          </div>
        </div>
      );

    case 'question':
      return (
        <QuestionScreen
          attempt={screen.attempt}
          score={score}
          rank={yourRank}
          onExit={onExit}
          answered={screen.answer}
          locale={locale}
          serverNow={serverNow}
          submitAnswer={submitAnswer}
          retryNonce={retryNonce}
          spectator={role === 'spectator'}
        />
      );

    case 'reveal': {
      if (role === 'spectator' || screen.answer == null || !screen.answer.accepted) {
        return (
          <RevealScreen
            reveal={screen.reveal}
            answer={screen.answer}
            locale={locale}
            board={board}
            selfUserId={selfUserId}
            spectator={role === 'spectator'}
          />
        );
      }
      const ack = screen.answer as { accepted: boolean; correct?: boolean; points?: number };
      return (
        <AnswerReveal
          question={null}
          result={{ correct: ack.correct === true, points: ack.points ?? 0, timeFrac: 0 }}
          score={score}
          gameIndex={screen.reveal.game_index}
          round={ROUNDS[screen.reveal.round_index] ?? ROUNDS[0]}
          onContinue={() => {}}
          answerTextOverride={revealAnswerText(screen.reveal, screen.attempt, locale, t as never) || null}
          correctPct={revealCorrectPct(screen.reveal)}
        />
      );
    }

    case 'game_result': {
      const { result, eliminated } = screen;
      if (role === 'spectator') {
        return (
          <SpectatorGameResult result={result} board={board} selfUserId={selfUserId} />
        );
      }
      return (
        <LiveGameResult
          result={result}
          eliminated={eliminated}
          yourRank={yourRank}
          score={score}
          onExit={onExit}
          onSpectate={onSpectate}
        />
      );
    }

    case 'final_result': {
      const { champion } = screen;
      const finalRankRow = yourRank;
      return (
        <div className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-4 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className={`flex size-20 items-center justify-center rounded-full ${champion ? 'bg-brand-gold text-black' : 'bg-white/10 text-brand-gold'}`}
          >
            <span className="text-4xl">🏆</span>
          </motion.div>
          <div className="mt-4 font-poppins text-4xl font-black uppercase text-brand-gold" style={poppins}>
            {champion ? t('weekendLeague.gChampionTitle') : t('weekendLeague.gFinalDoneTitle')}
          </div>
          {!champion && finalRankRow != null && (
            <div className="mt-2 font-poppins text-xl font-black tabular-nums text-white" style={poppins}>
              {t('weekendLeague.gYouFinished', { r: finalRankRow })}
            </div>
          )}
          <div className="mt-2 font-poppins text-[13px] font-black uppercase tracking-wide text-white/55">
            {t('weekendLeague.gTotalScore')} <span className="tabular-nums text-white">{score}</span>
          </div>
          <BoardStrip board={board} selfUserId={selfUserId} rows={10} />
          <button
            type="button"
            onClick={onExit}
            className="mx-auto mt-6 flex h-12 items-center justify-center rounded-2xl bg-white/10 px-8 font-poppins text-sm font-black uppercase text-white hover:bg-white/15"
          >
            {t('weekendLeague.gContinue')}
          </button>
        </div>
      );
    }

    case 'cancelled':
      return (
        <div className="mx-auto w-full max-w-2xl px-4 py-10">
          <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-6 text-center">
            <div className="font-poppins text-xl font-black uppercase text-white">{t('weekendLeague.gCancelledTitle')}</div>
            <p className="mt-2 font-poppins text-[13px] font-semibold text-white/60">{t('weekendLeague.gCancelledBody')}</p>
          </div>
        </div>
      );
  }
}

/** Spectators get the same elimination theatre, then the board — the cut
 *  is public information, only the personal verdict is player-only. */
function SpectatorGameResult({
  result, board, selfUserId,
}: {
  result: { game_index: number; field?: number; advanced?: number | null };
  board: WlBoardRow[];
  selfUserId: string | null;
}) {
  const { t } = useLocale();
  const [phase, setPhase] = useState<'cut' | 'board'>('cut');
  const game = {
    index: result.game_index,
    players: Number(result.field ?? 0) || 0,
    advance: Number(result.advanced ?? 0) || 0,
  };
  if (phase === 'cut' && game.players > 0 && game.advance > 0) {
    return <EliminationReveal game={game} isLastGame={result.game_index >= 2} onDone={() => setPhase('board')} />;
  }
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-6 text-center">
        <div className="font-poppins text-3xl font-black uppercase text-brand-green-light" style={poppins}>
          {t('weekendLeague.gGameComplete', { n: result.game_index + 1 })}
        </div>
        {result.advanced != null && (
          <p className="mt-2 font-poppins text-[13px] font-semibold text-white/60">
            {t('weekendLeague.gAdvanceCount', { n: result.advanced })}
          </p>
        )}
        <BoardStrip board={board} selfUserId={selfUserId} rows={8} />
      </div>
    </div>
  );
}

/** Kickoff countdown for the designed waiting screen — same tabular clock
 *  language as the league card, fed by the live qualifier timestamp. */
function KickoffCountdown({ kickoffMs, registered }: { kickoffMs: number | null; registered: number }) {
  const { t } = useLocale();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (kickoffMs == null || kickoffMs <= nowMs) return null;
  const total = Math.max(0, Math.floor((kickoffMs - nowMs) / 1000));
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const cells: Array<[string, string]> = [
    [String(d).padStart(2, '0'), t('weekendLeague.days')],
    [String(h).padStart(2, '0'), t('weekendLeague.hrs')],
    [String(m).padStart(2, '0'), t('weekendLeague.min')],
    [String(sec).padStart(2, '0'), t('weekendLeague.sec')],
  ];
  return (
    <div className="mt-6">
      <div className="flex items-center justify-center gap-3">
        {cells.map(([value, unit], i) => (
          <div key={unit} className="flex items-start gap-3">
            {i > 0 && <span className="pt-1 font-poppins text-2xl font-black text-white/30">:</span>}
            <div className="text-center">
              <div className="font-poppins text-3xl font-black tabular-nums text-white" style={poppins}>{value}</div>
              <div className="mt-0.5 font-poppins text-[10px] font-bold uppercase tracking-wide text-white/45">{unit}</div>
            </div>
          </div>
        ))}
      </div>
      {registered > 0 && (
        <div className="mt-4 font-poppins text-[12px] font-semibold text-white/50">
          {t('weekendLeague.playersEntered', { count: registered })}
        </div>
      )}
    </div>
  );
}

/** Designed end-of-game sequence: the elimination count-down reveal, then
 *  the survived/eliminated result — the same components /dev/wl-gauntlet
 *  renders, fed by the live game_result payload. */
function LiveGameResult({
  result, eliminated, yourRank, score, onExit, onSpectate,
}: {
  result: { game_index: number; field?: number; advanced?: number | null };
  eliminated: boolean;
  yourRank: number | null;
  score: number;
  onExit: () => void;
  onSpectate: () => void;
}) {
  const [phase, setPhase] = useState<'cut' | 'result'>('cut');
  const game = {
    index: result.game_index,
    players: Number(result.field ?? 0) || 0,
    advance: Number(result.advanced ?? 0) || 0,
  };
  const isLastGame = result.game_index >= 2;
  // Stub/walkover results carry no counts: skip the count-down theatre and
  // hide the rank line rather than animating "0 players".
  const countsKnown = game.players > 0 && game.advance > 0;
  if (phase === 'cut' && countsKnown) {
    return <EliminationReveal game={game} isLastGame={isLastGame} onDone={() => setPhase('result')} />;
  }
  return (
    <GameResult
      game={game}
      isLastGame={isLastGame}
      survived={!eliminated}
      finalRank={countsKnown ? yourRank : null}
      score={score}
      // Survivors stay players: the screen auto-advances when the next game
      // dispatches, so Continue only acknowledges. Keep Watching (eliminated
      // branch) is the role switch.
      onContinue={() => {}}
      onKeepWatching={onSpectate}
      onExit={onExit}
    />
  );
}

/** Server-provided correct answer as display text, per kind. MCQ ids and
 *  true/false resolve against the attempt's question payload so the player
 *  never sees an internal option id. */
function revealAnswerText(
  reveal: WlRevealEventPayload,
  attempt: WlDispatchEventPayload | null,
  locale: Locale,
  t: (key: never, params?: never) => string,
): string {
  const evaluation = reveal.evaluation ?? {};
  const display = pick(evaluation['display_answer'], locale);
  if (display) return display;
  const accepted = evaluation['accepted_answers'];
  if (Array.isArray(accepted) && typeof accepted[0] === 'string') return accepted[0];
  const correctId = typeof evaluation['correct_id'] === 'string' ? evaluation['correct_id'] : null;
  if (correctId != null) {
    if (correctId === 'true' || correctId === 'false') {
      return t((correctId === 'true' ? 'weekendLeague.gTrue' : 'weekendLeague.gFalse') as never);
    }
    const options = attempt && Array.isArray(attempt.question['options'])
      ? (attempt.question['options'] as Array<Record<string, unknown>>)
      : [];
    const hit = options.find((o) => String(o['id']) === correctId);
    if (hit) return pick(hit['text'], locale);
    return '';
  }
  const left = Number(evaluation['left_value']);
  const right = Number(evaluation['right_value']);
  if (Number.isFinite(left) && Number.isFinite(right)) return left > right ? String(left) : String(right);
  return '';
}

/** Real percent-correct from the reveal distribution; null when the answer
 *  space is free-text and keys cannot be matched reliably. */
function revealCorrectPct(reveal: WlRevealEventPayload): number | null {
  const evaluation = reveal.evaluation ?? {};
  const distribution = (reveal as { distribution?: Record<string, number> }).distribution ?? null;
  const answered = Number(reveal.answered ?? 0);
  if (!distribution || answered <= 0) return null;
  let correctKey: string | null = null;
  if (typeof evaluation['correct_id'] === 'string') {
    correctKey = evaluation['correct_id'];
  } else {
    const left = Number(evaluation['left_value']);
    const right = Number(evaluation['right_value']);
    if (Number.isFinite(left) && Number.isFinite(right)) correctKey = left > right ? 'left' : 'right';
  }
  if (correctKey == null) return null;
  const correct = Number(distribution[correctKey] ?? 0);
  return Math.round((100 * correct) / answered);
}

// ── Question rendering per kind ─────────────────────────────────────────────

function QuestionScreen({
  attempt, answered, locale, serverNow, submitAnswer, retryNonce, spectator, score, rank, onExit,
}: {
  attempt: WlDispatchEventPayload;
  answered: { accepted: boolean } | null;
  locale: Locale;
  serverNow: () => number;
  submitAnswer: (answer: unknown) => void;
  retryNonce: number;
  spectator: boolean;
  score: number;
  rank: number | null;
  onExit: () => void;
}) {
  const { t } = useLocale();
  const secondsLeft = useServerCountdown(attempt.deadlineAt, serverNow);
  const leadLeft = useServerCountdown(attempt.playableAt, serverNow);
  const ready = leadLeft <= 0;
  const locked = spectator || answered != null || secondsLeft <= 0 || !ready;
  const q = attempt.question;

  const round = { ...(ROUNDS[attempt.round_index] ?? ROUNDS[0]), index: attempt.round_index };
  const header: RoundHeaderModel = {
    gameIndex: attempt.game_index,
    round,
    score,
    rank,
    secondsLeft: ready ? secondsLeft : 0,
    spectator,
    step: `${attempt.question_index + 1}/5`,
    onQuit: onExit,
  };
  const ack = answered as { accepted: boolean; correct?: boolean; points?: number } | null;

  return (
    <>
      {!ready && <RoundIntroOverlay round={round} onDone={() => {}} />}
      <RoundScreenShell header={header}>
        {attempt.kind === 'true_false' && (
          <TrueFalseQuestion prompt={pick(q['prompt'], locale)} locked={locked} onAnswer={submitAnswer} feedback={ack} evaluation={attempt.evaluation} retryNonce={retryNonce} />
        )}
        {attempt.kind === 'mcq' && (
          <McqQuestion q={q} locale={locale} locked={locked} onAnswer={submitAnswer} feedback={ack} evaluation={attempt.evaluation} retryNonce={retryNonce} />
        )}
        {attempt.kind === 'higher_lower' && (
          <HigherLowerQuestion q={q} locale={locale} locked={locked} onAnswer={submitAnswer} feedback={ack} evaluation={attempt.evaluation} retryNonce={retryNonce} />
        )}
        {attempt.kind === 'career_path' && (
          <TypedKindQuestion
            card={
              <CareerPathCard
                heading={t('weekendLeague.gCareerPrompt')}
                items={(Array.isArray(q['clubs']) ? (q['clubs'] as unknown[]) : []).map((c) => ({ label: pick(c, locale) }))}
              />
            }
            locked={locked}
            spectator={spectator}
            onSubmit={(guess) => submitAnswer(guess)}
            feedback={ack}
            evaluation={attempt.evaluation}
            locale={locale}
          />
        )}
        {attempt.kind === 'who_am_i' && (
          <WhoAmIQuestion attempt={attempt} locale={locale} serverNow={serverNow} locked={locked} spectator={spectator} onSubmit={(guess) => submitAnswer({ guess })} feedback={ack} />
        )}

        {ack != null && attempt.kind !== 'career_path' && attempt.kind !== 'who_am_i' && (
          <AnswerFeedback ack={ack} />
        )}
      </RoundScreenShell>
    </>
  );
}

function AnswerFeedback({ ack }: { ack: { accepted: boolean; correct?: boolean; points?: number } }) {
  const { t } = useLocale();
  if (!ack.accepted) {
    return (
      <div className="mt-4 text-center font-poppins text-[13px] font-bold uppercase text-white/50">
        {t('weekendLeague.gLocked')}
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`mt-4 text-center font-poppins text-xl font-black uppercase ${ack.correct ? 'text-brand-green-light' : 'text-brand-red-soft'}`}
      style={poppins}
    >
      {ack.correct ? t('weekendLeague.gCorrect') : t('weekendLeague.gWrong')}
      {ack.correct && <span className="ml-2 text-brand-yellow">{t('weekendLeague.gPlusPoints', { n: ack.points ?? 0 })}</span>}
    </motion.div>
  );
}

function useChoice(locked: boolean, onAnswer: (a: unknown) => void, retryNonce: number) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [seenNonce, setSeenNonce] = useState(retryNonce);
  // A rejected (non-terminal) ack bumps the nonce — clear the pick so the
  // player can answer again inside the window (render-time adjustment, no
  // effect round-trip).
  if (retryNonce !== seenNonce) {
    setSeenNonce(retryNonce);
    setChosen(null);
  }
  const choose = (id: string) => {
    if (locked || chosen != null) return;
    setChosen(id);
    onAnswer(id);
  };
  return { chosen, choose };
}

/** Answer-button state before the public reveal: your own pick colors from the
 *  server ack; the correct option only highlights once reveal data exists. */
function choiceState(
  id: string,
  chosen: string | null,
  ack: { accepted: boolean; correct?: boolean } | null,
  correctId: string | null,
): AnswerState {
  if (chosen == null) return 'idle';
  // The answer key never colors anything before the player's own answer is
  // resolved — even if a payload ever leaked it, clicking must not reveal it.
  const resolved = ack?.accepted === true && typeof ack.correct === 'boolean';
  if (resolved && correctId != null) {
    if (id === correctId) return 'correct';
    if (id === chosen) return 'wrong';
    return 'faded';
  }
  if (id !== chosen) return 'faded';
  if (resolved) return ack!.correct ? 'correct' : 'wrong';
  return 'idle';
}

type Ack = { accepted: boolean; correct?: boolean; points?: number } | null;

function TrueFalseQuestion({
  prompt, locked, onAnswer, feedback, evaluation, retryNonce,
}: {
  prompt: string;
  locked: boolean;
  onAnswer: (a: unknown) => void;
  feedback: Ack;
  evaluation: Record<string, unknown>;
  retryNonce: number;
}) {
  const { t } = useLocale();
  const { chosen, choose } = useChoice(locked, onAnswer, retryNonce);
  const correctId = typeof evaluation['correct_id'] === 'string' ? evaluation['correct_id'] : null;
  return (
    <>
      <QuestionCard>{prompt}</QuestionCard>
      <PairAnswers
        choices={[
          { key: 'true', label: t('weekendLeague.gTrue'), state: choiceState('true', chosen, feedback, correctId) },
          { key: 'false', label: t('weekendLeague.gFalse'), state: choiceState('false', chosen, feedback, correctId) },
        ]}
        disabled={locked || chosen != null}
        onPick={(key) => choose(key)}
      />
    </>
  );
}

function McqQuestion({
  q, locale, locked, onAnswer, feedback, evaluation, retryNonce,
}: {
  q: Record<string, unknown>;
  locale: Locale;
  locked: boolean;
  onAnswer: (a: unknown) => void;
  feedback: Ack;
  evaluation: Record<string, unknown>;
  retryNonce: number;
}) {
  const { chosen, choose } = useChoice(locked, onAnswer, retryNonce);
  const correctId = typeof evaluation['correct_id'] === 'string' ? evaluation['correct_id'] : null;
  const options = Array.isArray(q['options']) ? (q['options'] as Array<Record<string, unknown>>) : [];
  const image = q['image'] as { url?: string } | null | undefined;
  return (
    <>
      <QuestionCard>{pick(q['prompt'], locale)}</QuestionCard>
      {image?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt=""
          className="mx-auto mt-4 max-h-56 w-auto max-w-full rounded-xl object-contain"
        />
      )}
      <AnswerOptionList
        options={options.map((o) => {
          const id = String(o['id']);
          return { key: id, label: pick(o['text'], locale), state: choiceState(id, chosen, feedback, correctId) };
        })}
        disabled={locked || chosen != null}
        onPick={(key) => choose(key)}
      />
    </>
  );
}

function HigherLowerQuestion({
  q, locale, locked, onAnswer, feedback, evaluation, retryNonce,
}: {
  q: Record<string, unknown>;
  locale: Locale;
  locked: boolean;
  onAnswer: (a: unknown) => void;
  feedback: Ack;
  evaluation: Record<string, unknown>;
  retryNonce: number;
}) {
  const { t } = useLocale();
  const { chosen, choose } = useChoice(locked, onAnswer, retryNonce);
  // Values (and hence the correct side) only render once the OWN answer is
  // resolved — an unresolved duplicate ack must not leak them.
  const revealed = feedback?.accepted === true && typeof feedback.correct === 'boolean';
  const left = Number(evaluation['left_value']);
  const right = Number(evaluation['right_value']);
  const correctSide = Number.isFinite(left) && Number.isFinite(right) ? (left > right ? 'left' : 'right') : null;
  const sideLabel = (side: 'left' | 'right') => (
    <span>
      {pick(q[side === 'left' ? 'left_name' : 'right_name'], locale)}
      {revealed && Number.isFinite(side === 'left' ? left : right) && (
        <span className="mt-1 block font-poppins text-[13px] font-bold tabular-nums opacity-70">
          {side === 'left' ? left : right}
        </span>
      )}
    </span>
  );
  return (
    <>
      <HigherLowerCard
        statLabel={pick(q['stat_label'], locale)}
        prompt={t('weekendLeague.gHigherLowerPrompt', { name: pick(q['left_name'], locale) })}
      />
      <PairAnswers
        choices={[
          { key: 'left', label: sideLabel('left'), state: choiceState('left', chosen, feedback, correctSide) },
          { key: 'right', label: sideLabel('right'), state: choiceState('right', chosen, feedback, correctSide) },
        ]}
        disabled={locked || chosen != null}
        onPick={(key) => choose(key)}
      />
    </>
  );
}

/** Shared driver for the typed kinds (career path, who-am-i): the designed
 *  blue input + green submit / red give-up, then the verdict box. */
function TypedKindQuestion({
  card, locked, spectator, onSubmit, feedback, evaluation, locale,
}: {
  card: React.ReactNode;
  locked: boolean;
  spectator: boolean;
  onSubmit: (guess: string) => void;
  feedback: Ack;
  evaluation: Record<string, unknown>;
  locale: Locale;
}) {
  const [guess, setGuess] = useState('');
  const outcome: 'correct' | 'wrong' | null =
    feedback?.accepted && typeof feedback.correct === 'boolean'
      ? (feedback.correct ? 'correct' : 'wrong')
      : null;
  const answerText = outcome === 'wrong' ? pick(evaluation['display_answer'], locale) : '';
  return (
    <>
      {card}
      <TypedAnswerPanel
        locked={feedback != null || locked}
        outcome={outcome}
        answerText={answerText}
        guess={guess}
        onGuessChange={setGuess}
        onSubmit={() => {
          if (locked || guess.trim() === '') return;
          onSubmit(guess.trim());
        }}
        onGiveUp={() => {
          if (locked) return;
          // An empty guess is scored as wrong by the server — same effect as
          // the prototype's give-up, and it reveals the answer at the flip.
          onSubmit('');
        }}
        readOnly={spectator}
      />
    </>
  );
}

function WhoAmIQuestion({
  attempt, locale, serverNow, locked, spectator, onSubmit, feedback,
}: {
  attempt: WlDispatchEventPayload;
  locale: Locale;
  serverNow: () => number;
  locked: boolean;
  spectator: boolean;
  onSubmit: (guess: string) => void;
  feedback: Ack;
}) {
  const clues = Array.isArray(attempt.question['clues'])
    ? (attempt.question['clues'] as Array<Record<string, unknown>>)
    : [];
  const clueWindow = Math.max(1, (attempt.deadlineAt - attempt.playableAt) / WHO_AM_I_CLUES);
  // Ticks with the countdown renders; clue index derives from the same clock
  // the server uses to score, so the shown ladder matches the earned points.
  const secondsLeft = useServerCountdown(attempt.deadlineAt, serverNow);
  void secondsLeft;
  const clueIndex = Math.min(
    WHO_AM_I_CLUES - 1,
    Math.max(0, Math.floor((serverNow() - attempt.playableAt) / clueWindow)),
  );
  const revealAll = locked && feedback != null;
  return (
    <TypedKindQuestion
      card={
        <>
          <WhoAmIBadges pointsNow={WHO_AM_I_POINTS[clueIndex]} />
          <WhoAmIClueLadder
            clues={clues.map((clue, i) => ({
              text: pick((clue as { content?: unknown })['content'] ?? clue, locale),
              revealed: revealAll || i <= clueIndex,
              points: WHO_AM_I_POINTS[i] ?? 0,
            }))}
          />
        </>
      }
      locked={locked}
      spectator={spectator}
      onSubmit={onSubmit}
      feedback={feedback}
      evaluation={attempt.evaluation}
      locale={locale}
    />
  );
}

// ── Reveal + standings ──────────────────────────────────────────────────────

function RevealScreen({
  reveal, answer, locale, board, selfUserId, spectator,
}: {
  reveal: WlRevealEventPayload;
  answer: { accepted: boolean; correct?: boolean; points?: number } | null;
  locale: Locale;
  board: WlBoardRow[];
  selfUserId: string | null;
  spectator: boolean;
}) {
  const { t } = useLocale();
  const evaluation = reveal.evaluation ?? {};
  const answerText =
    pick(evaluation['display_answer'], locale)
    || (typeof evaluation['correct_id'] === 'string' ? String(evaluation['correct_id']) : '');
  // Spectators (and anyone without an own accepted answer) get a neutral
  // reveal — a personal "Wrong" verdict only exists for a submitted answer.
  const verdict: 'correct' | 'wrong' | 'neutral' =
    spectator || answer == null || !answer.accepted
      ? 'neutral'
      : answer.correct === true ? 'correct' : 'wrong';
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
    <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-6 text-center">
      {verdict !== 'neutral' && (
        <div
          className={`mx-auto flex size-14 items-center justify-center rounded-full ${verdict === 'correct' ? 'bg-brand-green' : 'bg-brand-red-soft'} text-white`}
        >
          {verdict === 'correct' ? <Check className="size-8" strokeWidth={3} /> : <span className="font-poppins text-2xl font-black">✕</span>}
        </div>
      )}
      <div
        className={`mt-3 font-poppins text-3xl font-black uppercase ${
          verdict === 'correct' ? 'text-brand-green-light' : verdict === 'wrong' ? 'text-brand-red-soft' : 'text-white'
        }`}
        style={poppins}
      >
        {verdict === 'correct' ? t('weekendLeague.gCorrect') : verdict === 'wrong' ? t('weekendLeague.gWrong') : t('weekendLeague.gTimeUp')}
      </div>
      {verdict === 'correct' && (
        <div className="mt-1 font-poppins text-xl font-black tabular-nums text-brand-yellow" style={poppins}>
          {t('weekendLeague.gPlusPoints', { n: answer?.accepted ? answer.points ?? 0 : 0 })}
        </div>
      )}
      {verdict !== 'correct' && answerText && (
        <div className="mt-2 font-poppins text-[14px] font-semibold text-white/70">
          {t('weekendLeague.gCorrectAnswer')} <span className="text-brand-green-light">{answerText}</span>
        </div>
      )}
      <div className="mt-2 font-poppins text-[12px] font-semibold text-white/45">
        {t('weekendLeague.gAnsweredCount', { n: reveal.answered })}
      </div>
      <BoardStrip board={board} selfUserId={selfUserId} />
    </div>
    </div>
  );
}

function BoardStrip({
  board, selfUserId, rows = 5,
}: {
  board: WlBoardRow[];
  selfUserId: string | null;
  rows?: number;
}) {
  const { t } = useLocale();
  if (board.length === 0) return null;
  const top = board.slice(0, rows);
  const you = selfUserId ? board.find((r) => r.user_id === selfUserId) ?? null : null;
  const showYouRow = you != null && !top.some((r) => r.user_id === you.user_id);
  return (
    <div className="mx-auto mt-5 w-full max-w-sm text-left">
      {top.map((row) => (
        <BoardRowView key={row.user_id} row={row} isYou={row.user_id === selfUserId} />
      ))}
      {showYouRow && (
        <>
          <div className="py-0.5 text-center font-poppins text-[11px] font-bold text-white/30">⋯</div>
          <BoardRowView row={you} isYou />
        </>
      )}
      {you == null && selfUserId != null && (
        <div className="mt-1.5 text-center font-poppins text-[11px] font-bold uppercase text-white/40">
          {t('weekendLeague.gYourRank')}: 24+
        </div>
      )}
    </div>
  );
}

function BoardRowView({ row, isYou }: { row: WlBoardRow; isYou: boolean }) {
  const { t } = useLocale();
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-1.5 font-poppins text-[13px] font-bold ${
        isYou ? 'bg-brand-cyan/15 text-brand-cyan' : 'text-white/75'
      }`}
    >
      <span className="tabular-nums">#{row.rank}</span>
      <span className="mx-2 flex-1 truncate">
        {isYou ? t('weekendLeague.gYou') : (row.nickname ?? t('weekendLeague.gPlayerN', { n: row.rank }))}
      </span>
      <span className="tabular-nums">{row.points}</span>
    </div>
  );
}
