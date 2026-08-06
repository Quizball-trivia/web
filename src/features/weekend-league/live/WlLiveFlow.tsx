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
import { CheckInPanel } from '../components/CheckInPanel';
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
import { BreakScreen, ChampionScreen, EliminationReveal, GameIntro, GameResult } from '../gauntlet/GauntletScreens';
import { ROUNDS, wlLadder } from '../gauntlet/gauntlet.data';
import { ResultSplash } from '@/features/daily/components/ResultSplash';
import { useResultSplash } from '@/features/daily/components/useResultSplash';
import { playBgm, stopBgm } from '@/lib/sounds/gameSounds';
import { useWlLive, type WlLiveScreen, type WlLiveState } from './useWlLive';

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

export interface WlLiveFlowUiProps {
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
  /** Live checked-in count for the ready meter (public payload). */
  checkedInCount?: number;
  /** Server break deadline (epoch ms) — drives the designed break screen. */
  breakUntilMs?: number | null;
  /** 0-based game currently running / next to run (public payload). */
  currentGameIndex?: number;
}

export function WlLiveFlow({ tournamentId, ...ui }: WlLiveFlowUiProps & { tournamentId: string }) {
  const live = useWlLive(tournamentId, ui.role);
  const selfUserId = useAuthStore((s) => s.user?.id ?? null);
  return <WlLiveFlowView live={live} selfUserId={selfUserId} {...ui} />;
}

/** The full live-game UI with an injectable driver — the real socket state in
 *  the app, a scripted driver in the /dev/wl simulator. One UI, by construction. */
export function WlLiveFlowView({
  live,
  selfUserId,
  role,
  status,
  checkedIn,
  checkinPending,
  onCheckin,
  onExit,
  onSpectate,
  kickoffMs,
  registered,
  checkedInCount,
  breakUntilMs,
  currentGameIndex,
}: WlLiveFlowUiProps & { live: WlLiveState; selfUserId: string | null }) {
  const { t, locale } = useLocale();

  const yourRow = useMemo(
    () => live.board.find((row) => row.user_id === selfUserId) ?? null,
    [live.board, selfUserId],
  );

  // Remember the latest game_result so the break screen and next game's intro
  // can show real field/advance counts after the screen has moved on.
  // Ranked's background loop: start when live play begins, stop with a fade
  // when the tournament resolves or the screen unmounts.
  const inPlay = live.screen.kind === 'question' || live.screen.kind === 'reveal'
    || live.screen.kind === 'game_result';
  useEffect(() => {
    if (!inPlay) return;
    playBgm('kickoff');
    return () => stopBgm(400);
  }, [inPlay]);
  useEffect(() => {
    if (live.screen.kind === 'final_result') stopBgm(600);
  }, [live.screen.kind]);

  // Render-time adjustment (same pattern as useChoice's nonce): capture the
  // result while the game_result screen is showing, no effect round-trip.
  const [lastResult, setLastResult] = useState<{ game_index: number; field?: number; advanced?: number | null } | null>(null);
  if (live.screen.kind === 'game_result' && lastResult !== live.screen.result) {
    setLastResult(live.screen.result);
  }

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
    // The SAME designed check-in panel the /dev/wl prototype renders, fed by
    // live data: real ready counter, closes at the authoritative kickoff.
    return (
      <Immersive>
        <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col justify-center px-4">
          <CheckInPanel
            checkedIn={checkedIn}
            ready={checkedInCount ?? 0}
            registered={registered ?? 0}
            closesAtMs={kickoffMs ?? null}
            onCheckIn={checkinPending ? () => {} : onCheckin}
          />
          <button
            type="button"
            onClick={onExit}
            className="mx-auto mt-6 flex items-center gap-1.5 font-poppins text-[12px] font-bold uppercase tracking-widest text-white/40 hover:text-white"
          >
            <LogOut className="size-4" /> {t('weekendLeague.gQuit')}
          </button>
        </div>
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
            breakUntilMs={breakUntilMs ?? null}
            lastResult={lastResult}
            checkedInCount={checkedInCount ?? 0}
            currentGameIndex={currentGameIndex ?? live.gameIndex}
            onExit={onExit}
            onSpectate={onSpectate ?? onExit}
          />
        </motion.div>
      </AnimatePresence>
      {/* Spectators keep the standings in view the whole time — the rail lives
          OUTSIDE the keyed transition so it never remounts between question
          and reveal, and re-renders as each reveal refreshes the board. */}
      {role === 'spectator'
        && (live.screen.kind === 'question' || live.screen.kind === 'reveal') && (
        <SpectatorBoardRail board={live.board} />
      )}
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

/** Persistent standings rail for spectators (desktop). On smaller screens the
 *  board still appears at each reveal, where there is room for it. */
function SpectatorBoardRail({ board }: { board: WlBoardRow[] }) {
  const { t } = useLocale();
  if (board.length === 0) return null;
  return (
    <aside className="fixed right-4 top-20 z-40 hidden w-80 xl:block">
      <div className="rounded-[20px] border border-white/10 bg-surface-card-deep/90 p-4 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-poppins text-[12px] font-black uppercase tracking-wide text-white">
            {t('weekendLeague.gStandingsTitle')}
          </span>
          <LiveBadge />
        </div>
        <BoardStrip board={board} selfUserId={null} rows={8} />
      </div>
    </aside>
  );
}

/** Slim connection signal — only visible while the socket is down. */
function ConnectionDot({ connected }: { connected: boolean }) {
  if (connected) return null;
  return (
    <span className="fixed right-3 top-3 z-50 size-2.5 animate-pulse rounded-full bg-brand-red-soft" />
  );
}

/**
 * Advance target for the game at `gameIdx`, given the ORIGINAL field size.
 * The ladder is a function of the starting field (mirror of wlBuildLadder), so
 * it must be read at the right stage — not re-derived from a shrunken field.
 */
function advanceForGame(gameIdx: number, originalField: number): number {
  if (originalField <= 0) return 0;
  const ladder = wlLadder(originalField);
  return ladder[Math.min(2, Math.max(0, gameIdx))] ?? 0;
}

/** Games array for the break screen's progress strip + next-game lookup,
 *  built ONLY from authoritative counts (zeros hide the count copy). */
function ladderStrip(
  finished: { game_index: number; field?: number; advanced?: number | null } | null,
  originalField: number,
): { index: number; players: number; advance: number }[] {
  const g = finished?.game_index ?? -1;
  const field = Number(finished?.field ?? 0) || 0;
  const advanced = Number(finished?.advanced ?? 0) || 0;
  return [0, 1, 2].map((i) => {
    if (i === g) return { index: i, players: field, advance: advanced };
    if (i === g + 1 && advanced > 0) {
      return { index: i, players: advanced, advance: advanceForGame(i, originalField) };
    }
    return { index: i, players: 0, advance: 0 };
  });
}

function screenKey(screen: WlLiveScreen): string {
  switch (screen.kind) {
    // Question and its reveal share a key: the reveal keeps the SAME question
    // on screen, so remounting would drop the local pick and blank the buttons.
    case 'question': return `q-${screen.attempt.attempt_id}`;
    case 'reveal': return `q-${screen.reveal.attempt_id}`;
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
  screen, role, locale, serverNow, submitAnswer, retryNonce, board, selfUserId, score, rank, breakUntilMs, lastResult, checkedInCount, currentGameIndex, onExit, onSpectate,
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
  breakUntilMs: number | null;
  lastResult: { game_index: number; field?: number; advanced?: number | null } | null;
  checkedInCount: number;
  currentGameIndex: number;
  onExit: () => void;
  onSpectate: () => void;
}) {
  const { t } = useLocale();
  const yourRank = rank ?? (selfUserId ? board.find((r) => r.user_id === selfUserId)?.rank ?? null : null);

  switch (screen.kind) {
    case 'waiting': {
      // Between games with a known deadline: the SAME designed break screen
      // the prototype shows, counting down the server's break window. Counts
      // come only from the authoritative game_result; joining mid-break still
      // gets the countdown + progress strip (count copy hides on zeros).
      // The server nulls past deadlines on every poll, and the next dispatch
      // replaces this screen — an expired deadline only ever shows briefly.
      if (breakUntilMs != null) {
        const finishedIndex = lastResult?.game_index ?? Math.max(0, currentGameIndex - 1);
        return (
          <BreakScreen
            games={ladderStrip(lastResult, checkedInCount)}
            game={{
              index: finishedIndex,
              players: Number(lastResult?.field ?? 0) || 0,
              advance: Number(lastResult?.advanced ?? 0) || 0,
            }}
            finalRank={lastResult != null ? rank : null}
            score={score}
            deadlineMs={breakUntilMs}
          />
        );
      }
      return (
        <div className="mx-auto w-full max-w-2xl px-4 py-10">
          <div className="rounded-[24px] bg-brand-cyan/[0.08] p-8 text-center">
            <div className="mb-3 flex justify-center"><LiveBadge /></div>
            <div className="font-poppins text-xl font-black uppercase text-white" style={poppins}>
              {t('weekendLeague.gWaitingNext')}
            </div>
            {role === 'spectator' && (
              <p className="mt-2 font-poppins text-[12px] font-semibold text-white/50">
                {t('weekendLeague.gSpectatorDelayHint')}
              </p>
            )}
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
    }

    case 'question': {
      const attempt = screen.attempt;
      const introCounts = (() => {
        if (attempt.game_index === 0) {
          // The game-1 field is everyone checked in (humans + bots).
          return checkedInCount > 0
            ? { players: checkedInCount, advance: advanceForGame(0, checkedInCount) }
            : null;
        }
        if (lastResult != null && lastResult.game_index === attempt.game_index - 1) {
          const advanced = Number(lastResult.advanced ?? 0) || 0;
          return { players: advanced, advance: advanceForGame(attempt.game_index, checkedInCount) };
        }
        return null;
      })();
      return (
        <QuestionScreen
          attempt={attempt}
          score={score}
          rank={yourRank}
          introCounts={introCounts}
          onExit={onExit}
          answered={screen.answer}
          locale={locale}
          serverNow={serverNow}
          submitAnswer={submitAnswer}
          retryNonce={retryNonce}
          spectator={role === 'spectator'}
        />
      );
    }

    case 'reveal': {
      // Mid-round there is NO separate reveal screen: the answer buttons
      // already carry the verdict, so the question simply stays up until the
      // next one dispatches. Only the round's last question breaks away, to
      // the standings. Spectators keep the neutral reveal (they never answer).
      if (role === 'spectator') {
        return (
          <RevealScreen
            reveal={screen.reveal}
            answer={screen.answer}
            locale={locale}
            board={board}
            selfUserId={selfUserId}
            spectator
          />
        );
      }
      if (isLastQuestionOfRound(screen.reveal)) {
        return (
          <RevealThenStandings
            board={board}
            selfUserId={selfUserId}
            roundIndex={screen.reveal.round_index}
            question={
              screen.attempt != null ? (
                <QuestionScreen
                  attempt={{
                    ...screen.attempt,
                    evaluation: screen.reveal.evaluation ?? screen.attempt.evaluation,
                  }}
                  score={score}
                  rank={yourRank}
                  introCounts={null}
                  onExit={onExit}
                  answered={screen.answer}
                  locale={locale}
                  serverNow={serverNow}
                  submitAnswer={() => {}}
                  retryNonce={retryNonce}
                  spectator={false}
                  revealed
                />
              ) : null
            }
          />
        );
      }
      // Hold the question screen (with its resolved buttons) — the attempt is
      // still on the reveal payload, so nothing flickers. The reveal's answer
      // key is merged UNCONDITIONALLY: if the screen remounts (round-end
      // wrapper) the verdict re-derives from the key instead of blanking.
      if (screen.attempt != null) {
        const attemptWithKey = {
          ...screen.attempt,
          evaluation: screen.reveal.evaluation ?? screen.attempt.evaluation,
        };
        return (
          <QuestionScreen
            attempt={attemptWithKey}
            score={score}
            rank={yourRank}
            introCounts={null}
            onExit={onExit}
            answered={screen.answer}
            locale={locale}
            serverNow={serverNow}
            submitAnswer={() => {}}
            retryNonce={retryNonce}
            spectator={false}
            revealed
          />
        );
      }
      return (
        <RevealScreen
          reveal={screen.reveal}
          answer={screen.answer}
          locale={locale}
          board={board}
          selfUserId={selfUserId}
          spectator={false}
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
          breakUntilMs={breakUntilMs}
          originalField={checkedInCount}
          onExit={onExit}
          onSpectate={onSpectate}
        />
      );
    }

    case 'final_result': {
      const { champion } = screen;
      return (
        <ChampionScreen champion={champion} finalRank={yourRank} score={score} onExit={onExit}>
          <BoardStrip board={board} selfUserId={selfUserId} rows={10} />
        </ChampionScreen>
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

/** Questions per round, mirroring the backend WL_QUESTIONS_PER_ROUND. */
const QUESTIONS_PER_ROUND: Record<number, number> = { 0: 5, 1: 5, 2: 5, 3: 5, 4: 1 };

function isLastQuestionOfRound(reveal: { round_index: number; question_index: number }): boolean {
  const total = QUESTIONS_PER_ROUND[reveal.round_index] ?? 5;
  return reveal.question_index >= total - 1;
}

/**
 * Round end: the resolved question holds briefly — so a player who timed out
 * still sees the correct answer — then the standings take over.
 */
function RevealThenStandings({
  board, selfUserId, roundIndex, question,
}: {
  board: WlBoardRow[];
  selfUserId: string | null;
  roundIndex: number;
  question: React.ReactNode;
}) {
  const [phase, setPhase] = useState<'answer' | 'board'>(question == null ? 'board' : 'answer');
  useEffect(() => {
    if (question == null) return;
    const id = setTimeout(() => setPhase('board'), 2_200);
    return () => clearTimeout(id);
  }, [question]);
  if (phase === 'answer') return <>{question}</>;
  return <RoundStandings board={board} selfUserId={selfUserId} roundIndex={roundIndex} />;
}

/** Round-end standings: the one place the board interrupts play. */
function RoundStandings({
  board, selfUserId, roundIndex,
}: {
  board: WlBoardRow[];
  selfUserId: string | null;
  roundIndex: number;
}) {
  const { t } = useLocale();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-6 text-center"
    >
      <div className="font-poppins text-[12px] font-black uppercase tracking-widest text-white/70">
        {t('weekendLeague.gRoundOnly', { n: roundIndex + 1 })}
      </div>
      <div className="mt-1 font-poppins text-2xl font-black uppercase text-white" style={poppins}>
        {t('weekendLeague.gStandingsTitle')}
      </div>
      {/* The whole top-24 — the board IS the drama at a round end. Your own
          row highlights in place (or appends below the cut when outside). */}
      <div className="mt-2 max-h-[62vh] w-full overflow-y-auto overscroll-contain">
        <BoardStrip board={board} selfUserId={selfUserId} rows={24} />
      </div>
    </motion.div>
  );
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

/** Designed end-of-game sequence: the elimination count-down reveal, then
 *  the survived/eliminated result — the same components /dev/wl-gauntlet
 *  renders, fed by the live game_result payload. */
function LiveGameResult({
  result, eliminated, yourRank, score, breakUntilMs, originalField, onExit, onSpectate,
}: {
  result: { game_index: number; field?: number; advanced?: number | null };
  eliminated: boolean;
  yourRank: number | null;
  score: number;
  breakUntilMs: number | null;
  /** Starting field (checked-in count) — the ladder is a function of it. */
  originalField: number;
  onExit: () => void;
  onSpectate: () => void;
}) {
  const [phase, setPhase] = useState<'cut' | 'result' | 'break'>('cut');
  const game = {
    index: result.game_index,
    players: Number(result.field ?? 0) || 0,
    advance: Number(result.advanced ?? 0) || 0,
  };
  const isLastGame = result.game_index >= 2;
  // Stub/walkover results carry no counts: skip the count-down theatre and
  // hide the rank line rather than animating "0 players".
  const countsKnown = game.players > 0 && game.advance > 0;
  // Survivors flow into the designed break screen once the server break is
  // on (the engine keeps game_result until the next dispatch): auto after a
  // beat, or via Continue.
  const canBreak = !eliminated && breakUntilMs != null && !isLastGame;
  useEffect(() => {
    if (phase !== 'result' || !canBreak) return;
    // Nothing is required of the player: the result reads for a beat, then the
    // break countdown takes over on its own.
    const id = setTimeout(() => setPhase('break'), 4_000);
    return () => clearTimeout(id);
  }, [phase, canBreak]);
  if (phase === 'cut' && countsKnown) {
    return <EliminationReveal game={game} isLastGame={isLastGame} onDone={() => setPhase('result')} />;
  }
  if (phase === 'break' && canBreak) {
    return (
      <BreakScreen
        games={ladderStrip(result, originalField)}
        game={game}
        finalRank={yourRank}
        score={score}
        deadlineMs={breakUntilMs}
      />
    );
  }
  return (
    <GameResult
      game={game}
      isLastGame={isLastGame}
      survived={!eliminated}
      finalRank={countsKnown ? yourRank : null}
      score={score}
      // Survivors have no CTA — this only fires for the eliminated/finalist
      // branches that still show one. Keep Watching is the role switch.
      onContinue={() => { if (canBreak) setPhase('break'); }}
      onKeepWatching={onSpectate}
      onExit={onExit}
    />
  );
}

// ── Question rendering per kind ─────────────────────────────────────────────

function QuestionScreen({
  attempt, answered, locale, serverNow, submitAnswer, retryNonce, spectator, score, rank, introCounts, revealed = false, onExit,
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
  /** Field/advance for the game-intro theatre (prev game's result). */
  introCounts: { players: number; advance: number } | null;
  /** Public reveal with no answer from this player (timeout): highlight the
   *  correct option anyway so nobody is left guessing. */
  revealed?: boolean;
  onExit: () => void;
}) {
  const { t } = useLocale();
  const secondsLeft = useServerCountdown(attempt.deadlineAt, serverNow);
  const leadLeft = useServerCountdown(attempt.playableAt, serverNow);
  const ready = leadLeft <= 0;
  const locked = spectator || answered != null || secondsLeft <= 0 || !ready;
  const q = attempt.question;

  const round = { ...(ROUNDS[attempt.round_index] ?? ROUNDS[0]), index: attempt.round_index };
  const windowSec = Math.max(1, Math.round((attempt.deadlineAt - attempt.playableAt) / 1000));
  const header: RoundHeaderModel = {
    gameIndex: attempt.game_index,
    round,
    score,
    rank,
    // Reading grace: the timer HOLDS at the full window until playableAt —
    // ranked parity, so the countdown never starts on an unread question.
    secondsLeft: ready ? secondsLeft : windowSec,
    spectator,
    step: `${attempt.question_index + 1}/5`,
    onQuit: onExit,
  };
  // Round intro only at the round's FIRST question; it dismisses itself and
  // hands the remaining lead to reading time. (Mid-round questions get no
  // overlay — that flash between every question was noise.)
  const [introDone, setIntroDone] = useState(false);
  const showRoundIntro = !ready && attempt.question_index === 0 && !introDone;
  const ack = answered as { accepted: boolean; correct?: boolean; points?: number } | null;

  // Games 2 and 3 open with the GAME N card, full-screen on its own: the field
  // just shrank, so the new numbers are the whole point. Game 1 skips it —
  // the lobby and check-in already stated the format.
  const showGameIntro = !ready
    && attempt.round_index === 0
    && attempt.question_index === 0
    && attempt.game_index > 0;
  if (showGameIntro) {
    return (
      <div className="fixed inset-0 z-50 bg-surface-page-alt">
        <GameIntro
          game={{
            index: attempt.game_index,
            players: Number(introCounts?.players ?? 0) || 0,
            advance: Number(introCounts?.advance ?? 0) || 0,
          }}
          isLastGame={attempt.game_index >= 2}
          onDone={() => {}}
        />
      </div>
    );
  }

  return (
    <>
      <RoundScreenShell
        header={header}
        overlay={showRoundIntro ? <RoundIntroOverlay round={round} onDone={() => setIntroDone(true)} /> : null}
      >
        {attempt.kind === 'true_false' && (
          <TrueFalseQuestion revealed={revealed} prompt={pick(q['prompt'], locale)} locked={locked} onAnswer={submitAnswer} feedback={ack} evaluation={attempt.evaluation} retryNonce={retryNonce} />
        )}
        {attempt.kind === 'mcq' && (
          <McqQuestion revealed={revealed} q={q} locale={locale} locked={locked} onAnswer={submitAnswer} feedback={ack} evaluation={attempt.evaluation} retryNonce={retryNonce} />
        )}
        {attempt.kind === 'higher_lower' && (
          <HigherLowerQuestion revealed={revealed} q={q} locale={locale} locked={locked} onAnswer={submitAnswer} feedback={ack} evaluation={attempt.evaluation} retryNonce={retryNonce} />
        )}
        {attempt.kind === 'career_path' && (
          <TypedKindQuestion
            revealed={revealed}
            card={
              <CareerPathCard
                heading={t('weekendLeague.gCareerPrompt')}
                items={(Array.isArray(q['clubs']) ? (q['clubs'] as unknown[]) : []).map((c) => ({
                  label: pick(c, locale),
                  // Crests are keyed on English names; the chip label stays localized.
                  matchName: pick(c, 'en' as Locale),
                }))}
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
          <WhoAmIQuestion revealed={revealed} attempt={attempt} locale={locale} serverNow={serverNow} locked={locked} spectator={spectator} onSubmit={(guess) => submitAnswer({ guess })} feedback={ack} />
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
  revealed = false,
): AnswerState {
  // Timed out without answering: the public reveal still shows what was right.
  if (chosen == null) {
    if (revealed && correctId != null) return id === correctId ? 'correct' : 'faded';
    return 'idle';
  }
  // INSTANT verdict: the dispatch carries the answer key for players (only
  // spectators get it scrubbed), so the tap colours immediately — no waiting
  // on the ack. The server still scores; this is display only.
  if (correctId != null) {
    if (id === correctId) return 'correct';
    if (id === chosen) return 'wrong';
    return 'faded';
  }
  // No key in the payload (spectator/legacy): fall back to the server verdict.
  const resolved = ack?.accepted === true && typeof ack.correct === 'boolean';
  if (id !== chosen) return 'faded';
  if (resolved) return ack!.correct ? 'correct' : 'wrong';
  return 'pending';
}

type Ack = { accepted: boolean; correct?: boolean; points?: number } | null;

function TrueFalseQuestion({
  prompt, locked, onAnswer, feedback, evaluation, retryNonce, revealed = false,
}: {
  prompt: string;
  locked: boolean;
  onAnswer: (a: unknown) => void;
  feedback: Ack;
  evaluation: Record<string, unknown>;
  retryNonce: number;
  revealed?: boolean;
}) {
  const { t } = useLocale();
  const { chosen, choose } = useChoice(locked, onAnswer, retryNonce);
  const correctId = typeof evaluation['correct_id'] === 'string' ? evaluation['correct_id'] : null;
  return (
    <>
      <QuestionCard>{prompt}</QuestionCard>
      <PairAnswers
        choices={[
          { key: 'true', label: t('weekendLeague.gTrue'), state: choiceState('true', chosen, feedback, correctId, revealed) },
          { key: 'false', label: t('weekendLeague.gFalse'), state: choiceState('false', chosen, feedback, correctId, revealed) },
        ]}
        disabled={locked || chosen != null}
        onPick={(key) => choose(key)}
      />
    </>
  );
}

function McqQuestion({
  q, locale, locked, onAnswer, feedback, evaluation, retryNonce, revealed = false,
}: {
  q: Record<string, unknown>;
  locale: Locale;
  locked: boolean;
  onAnswer: (a: unknown) => void;
  feedback: Ack;
  evaluation: Record<string, unknown>;
  retryNonce: number;
  revealed?: boolean;
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
          return { key: id, label: pick(o['text'], locale), state: choiceState(id, chosen, feedback, correctId, revealed) };
        })}
        disabled={locked || chosen != null}
        onPick={(key) => choose(key)}
      />
    </>
  );
}

function HigherLowerQuestion({
  q, locale, locked, onAnswer, feedback, evaluation, retryNonce, revealed = false,
}: {
  q: Record<string, unknown>;
  locale: Locale;
  locked: boolean;
  onAnswer: (a: unknown) => void;
  feedback: Ack;
  evaluation: Record<string, unknown>;
  retryNonce: number;
  revealed?: boolean;
}) {
  const { t } = useLocale();
  const { chosen, choose } = useChoice(locked, onAnswer, retryNonce);
  // Values appear as soon as the pick is locked in (the payload already
  // carries them); before that they stay hidden so the answer isn't readable.
  const showValues = chosen != null || revealed;
  const left = Number(evaluation['left_value']);
  const right = Number(evaluation['right_value']);
  const correctSide = Number.isFinite(left) && Number.isFinite(right) ? (left > right ? 'left' : 'right') : null;
  const sideLabel = (side: 'left' | 'right') => (
    <span>
      {pick(q[side === 'left' ? 'left_name' : 'right_name'], locale)}
      {showValues && Number.isFinite(side === 'left' ? left : right) && (
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
        prompt={t('weekendLeague.gWhoHasMore')}
      />
      <PairAnswers
        choices={[
          { key: 'left', label: sideLabel('left'), state: choiceState('left', chosen, feedback, correctSide, revealed) },
          { key: 'right', label: sideLabel('right'), state: choiceState('right', chosen, feedback, correctSide, revealed) },
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
  card, locked, spectator, onSubmit, feedback, evaluation, locale, revealed = false,
}: {
  card: React.ReactNode;
  locked: boolean;
  spectator: boolean;
  onSubmit: (guess: string) => void;
  feedback: Ack;
  evaluation: Record<string, unknown>;
  locale: Locale;
  revealed?: boolean;
}) {
  const [guess, setGuess] = useState('');
  const outcome: 'correct' | 'wrong' | null =
    feedback?.accepted && typeof feedback.correct === 'boolean'
      ? (feedback.correct ? 'correct' : 'wrong')
      // Timed out with nothing submitted — treat as wrong so the answer shows.
      : revealed ? 'wrong' : null;
  const answerText = outcome === 'wrong' ? pick(evaluation['display_answer'], locale) : '';
  return (
    <>
      {card}
      <TypedAnswerPanel
        locked={feedback != null || locked || revealed}
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
  attempt, locale, serverNow, locked, spectator, onSubmit, feedback, revealed = false,
}: {
  attempt: WlDispatchEventPayload;
  locale: Locale;
  serverNow: () => number;
  locked: boolean;
  spectator: boolean;
  onSubmit: (guess: string) => void;
  feedback: Ack;
  revealed?: boolean;
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
  const revealAll = (locked && feedback != null) || revealed;
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
      revealed={revealed}
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
    <div className="rounded-[24px] p-6 text-center">
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

export function BoardStrip({
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
      <div className="overflow-hidden rounded-[10px] border-2 border-brand-green">
        <div className="divide-y divide-brand-green/25">
          {top.map((row) => (
            <BoardRowView key={row.user_id} row={row} isYou={row.user_id === selfUserId} />
          ))}
          {showYouRow && (
            <>
              <div className="py-0.5 text-center font-poppins text-[11px] font-bold text-white/30">⋯</div>
              <BoardRowView row={you} isYou />
            </>
          )}
        </div>
      </div>
      {you == null && selfUserId != null && (
        <div className="mt-1.5 text-center font-poppins text-[11px] font-bold uppercase text-white/40">
          {t('weekendLeague.gYourRank')}: 24+
        </div>
      )}
    </div>
  );
}

/** Podium palette — the same gold / silver / bronze the leaderboard uses.
 *  Rendered as a FILLED badge: tinted text alone (silver especially) barely
 *  separates from white on a dark row. */
const MEDAL_COLORS: Record<number, string> = { 1: '#FFD700', 2: '#C7CBD1', 3: '#CD7F32' };

function BoardRowView({ row, isYou }: { row: WlBoardRow; isYou: boolean }) {
  const { t } = useLocale();
  const medal = MEDAL_COLORS[row.rank] ?? null;
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
        isYou ? 'bg-brand-green text-white' : 'text-white hover:bg-white/[0.03]'
      }`}
    >
      {medal ? (
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full font-poppins text-base font-black tabular-nums text-black shadow-[0_0_12px_rgba(0,0,0,0.35)]"
          style={{ ...poppins, backgroundColor: medal }}
        >
          {row.rank}
        </span>
      ) : (
        <span className="min-w-[2.25rem] text-center font-poppins text-xl font-black tabular-nums" style={poppins}>
          #{row.rank}
        </span>
      )}
      <span className="flex-1 truncate font-fun text-sm font-black uppercase">
        {isYou ? t('weekendLeague.gYou') : (row.nickname ?? t('weekendLeague.gPlayerN', { n: row.rank }))}
      </span>
      <span className="font-poppins text-base font-black tabular-nums" style={poppins}>
        {row.points}
      </span>
    </div>
  );
}
