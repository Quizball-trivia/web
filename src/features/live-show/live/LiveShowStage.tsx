'use client';

/**
 * The ორშაბათობა live show on the real server: the 3D studio (Tato and Kala reacting to the crowd) with the round,
 * leaders and lobby drawn over it, and the interactive question beside it (below it on a phone). Everyone — hosts,
 * players and spectators — sees the same studio and the same question; only registered players get answer buttons.
 *
 * Data comes in as plain props (the WL live state, the clock, the lobby slots), so a dev page can drive it from a
 * fake stream exactly as the server would.
 */

import { useImmersiveStore } from '@/stores/immersive.store';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Crown, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WlAnswerAck, WlBoardRow } from '@/lib/realtime/socket.types';
import type { WlLiveScreen } from '@/features/weekend-league/live/useWlLive';
import { SHOW_COPY } from '../show.copy';
import type { SimPlayer } from '../show.sim';
import type { ShowAnswer, ShowLocale } from '../show.types';
import type { ShowScreen, ShowState } from '../useShowSim';
import { HostScreen } from '../views/HostScreen';
import { QuestionView } from '../views/QuestionViews';
import { ShowHeader, StageIntro } from '../views/ShowScreens';
import { ArenaScoreSplash } from '@/components/game/ArenaScoreSplash';
import {
  correctIdOf, showKindOf, toBoard, toRevealStats, toShowQuestion, toStages, type LiveShowKind, type ShowRound,
} from './showLive.adapter';

export type LiveShowPhase = 'pregame' | 'countdown' | 'game';

export interface LiveShowStageProps {
  locale: ShowLocale;
  title: string;
  phase: LiveShowPhase;
  /** Server-clock now (ms). */
  now: number;
  kickoffMs: number | null;
  registered: number | null;
  /** The WL live screen + board for this event. */
  screen: WlLiveScreen;
  board: WlBoardRow[];
  score: number;
  selfUserId: string | null;
  /** Registered and seated: may answer. Spectators see the same screens without buttons. */
  canAnswer: boolean;
  onAnswer: (answer: string) => void;
  /** Bumps when a rejected answer unlocks the question again. */
  retryNonce: number;
  rounds?: ShowRound[] | null;
  /** Before kickoff: the registration / host Start panel. */
  pregamePanel: ReactNode;
  /** During the Start countdown: big seconds + late registration. */
  countdownPanel: ReactNode;
  lobbyLine: string;
  onExit: () => void;
}

const DISPATCH_LEAD_MS = 3_000;
const REVEAL_HOLD_MS = 5_000;
/** The round card gives way this long before the window opens, so the first question still gets reading time. */
const INTRO_READ_MS = 1_500;

function youOf(selfUserId: string | null, score: number): SimPlayer {
  return {
    id: selfUserId ?? 'you', name: '', skill: 0, alive: true, outAfterStage: null,
    points: score, timeMs: 0, finalPoints: score, finalTimeMs: 0,
  };
}

function ackResult(ack: WlAnswerAck | null): { points: number; correct: boolean } | null {
  return ack && ack.accepted ? { points: ack.points, correct: ack.correct } : null;
}

export function LiveShowStage(props: LiveShowStageProps) {
  const { locale, title, phase, now, kickoffMs, registered, screen, board, score, selfUserId, canAnswer, onAnswer, retryNonce, rounds } = props;
  // Rounds seen so far (round_index → kind), for headers when the server sends no layout.
  const [seen, setSeen] = useState<Map<number, ShowRound>>(() => new Map());
  const attempt = screen.kind === 'question' || screen.kind === 'reveal' ? screen.attempt : null;
  if (attempt) {
    const prev = seen.get(attempt.round_index);
    const kind: LiveShowKind = showKindOf(attempt);
    const count = Math.max(prev?.count ?? 0, attempt.question_index + 1);
    if (!prev || prev.kind !== kind || prev.count !== count) setSeen(new Map(seen).set(attempt.round_index, { kind, count }));
  }
  const stages = useMemo(() => toStages(rounds, seen), [rounds, seen]);

  // Your tap, per attempt (the server's ack follows; a rejection clears it).
  const [picked, setPicked] = useState<{ attemptId: string; answer: ShowAnswer } | null>(null);
  const [nonceSeen, setNonceSeen] = useState(retryNonce);
  // An attempt whose ack went missing and was retried: the server keeps the FIRST accepted answer, which may not be
  // the latest tap, so that attempt waits for the shared reveal instead of colouring a possibly wrong option.
  const [retriedAttempt, setRetriedAttempt] = useState<string | null>(null);
  if (nonceSeen !== retryNonce) {
    setNonceSeen(retryNonce);
    if (picked) setRetriedAttempt(picked.attemptId);
    setPicked(null);
  }
  const serverAck = screen.kind === 'question' || screen.kind === 'reveal' ? screen.answer : null;
  // The option the server actually accepted wins over this tab's tap (a retry or a second tab may have tapped
  // another); without one (an older server), the local tap stands in, except on a retried attempt.
  const acceptedId = serverAck?.accepted ? serverAck.answer_id ?? null : null;
  const localTap = picked && attempt && picked.attemptId === attempt.attempt_id ? picked.answer : null;
  // The server already holds an answer (e.g. after a reconnect): lock the buttons even without the local tap.
  const yourAnswer: ShowAnswer | null = acceptedId && serverAck?.accepted
    ? { kind: 'choice', optionId: acceptedId, elapsedMs: serverAck.elapsedMs }
    : localTap ?? (serverAck?.accepted ? { kind: 'choice', optionId: '', elapsedMs: serverAck.elapsedMs } : null);

  // Ranked feel: your option turns green/red the moment the server's ack lands (the correct option itself waits for
  // the shared reveal), and a correct tap splashes its points.
  const immersive = phase !== 'pregame';
  const enterImmersive = useImmersiveStore((s) => s.enter);
  const leaveImmersive = useImmersiveStore((s) => s.leave);
  useEffect(() => {
    if (!immersive) return;
    enterImmersive();
    return leaveImmersive;
  }, [immersive, enterImmersive, leaveImmersive]);

  const verdictId = acceptedId
    ?? (localTap && retriedAttempt !== attempt?.attempt_id && (localTap.kind === 'choice' || localTap.kind === 'reveal_choice')
      ? localTap.optionId
      : null);
  const verdict = attempt && serverAck?.accepted && verdictId ? { optionId: verdictId, correct: serverAck.correct } : null;

  // A new question starts at the top (prompt and timer in view); the reveal keeps the scroll.
  // The page may scroll inside the app shell's pane, not the window: bring the stage itself into view.
  const rootRef = useRef<HTMLDivElement>(null);
  const questionId = screen.kind === 'question' ? screen.attempt.attempt_id : null;
  useEffect(() => {
    if (!questionId || !rootRef.current) return;
    // Full screen, the stage is its own scroller; inline (pre-game) the app pane scrolls.
    if (phase === 'pregame') rootRef.current.scrollIntoView({ block: 'start' });
    else rootRef.current.scrollTo({ top: 0 });
  }, [questionId, phase]);

  const reveal = screen.kind === 'reveal' ? screen.reveal : null;
  const question = attempt ? toShowQuestion(attempt, correctIdOf(reveal)) : null;
  const revealStats = reveal ? toRevealStats(reveal) : null;
  const showBoard = useMemo(() => {
    const final = screen.kind === 'final_result' ? screen.result.board : screen.kind === 'game_result' ? screen.result.board : null;
    return toBoard(final ?? board, locale);
  }, [screen, board, locale]);

  const showScreen: ShowScreen = (() => {
    if (phase !== 'game') return { kind: 'lobby', openedAt: 0, closesAt: kickoffMs ?? now };
    switch (screen.kind) {
      case 'question': {
        const a = screen.attempt;
        if (a.question_index === 0 && now < a.playableAt - INTRO_READ_MS) return { kind: 'stage_intro', stage: a.round_index, until: a.playableAt - INTRO_READ_MS };
        return { kind: 'question', stage: a.round_index, q: a.question_index, shownAt: a.playableAt - DISPATCH_LEAD_MS, startsAt: a.playableAt, deadline: a.deadlineAt };
      }
      case 'reveal':
        return { kind: 'reveal', stage: screen.reveal.round_index, q: screen.reveal.question_index, until: now + REVEAL_HOLD_MS };
      case 'game_result':
      case 'final_result':
        return { kind: 'champion', board: showBoard };
      default:
        return { kind: 'stage_intro', stage: 0, until: now };
    }
  })();

  const stageIndex = 'stage' in showScreen ? showScreen.stage : 0;
  // No round badge before the game or on the final board.
  const inRound = phase === 'game' && showScreen.kind !== 'champion';
  const stage = inRound ? stages[stageIndex] ?? stages[0] ?? null : null;
  const you = youOf(selfUserId, score);
  const rank = selfUserId ? showBoard.find((r) => r.id === selfUserId)?.rank ?? null : null;
  const field = Math.max(registered ?? 0, showBoard.length);

  const state = {
    pack: { id: 'live', title: { en: title, ka: title }, stages },
    settings: { title, joinMinutes: 0, georgiaOnly: false },
    screen: showScreen,
    now,
    paused: false,
    speed: 1,
    fieldSize: field,
    players: [],
    you,
    youAlive: canAnswer,
    yourAnswer,
    yourResult: ackResult(serverAck),
    reveal: revealStats,
    answeredCount: revealStats?.answered ?? 0,
    aliveCount: field,
    board: showBoard,
    stage,
    question,
  } satisfies ShowState;

  const windowMs = attempt ? Math.max(1_000, attempt.deadlineAt - attempt.playableAt) : 10_000;
  // Zoom out eases over five steps; evolution shows one era per step, however many there are.
  const steps = question?.kind === 'evolution' ? Math.max(1, question.eras.length) : 5;
  const stepMs = windowMs / steps;
  // Answers are open only inside the server window: a late reveal or a stalled socket must not leave taps live.
  const windowOpen = showScreen.kind === 'question' && now >= showScreen.startsAt && now < showScreen.deadline;
  const submit = (a: ShowAnswer) => {
    if (!attempt || !canAnswer || yourAnswer || !windowOpen) return;
    if (a.kind !== 'choice' && a.kind !== 'reveal_choice') return;
    setPicked({ attemptId: attempt.attempt_id, answer: a });
    onAnswer(a.optionId);
  };

  let panel: ReactNode;
  if (phase === 'pregame') panel = props.pregamePanel;
  else if (phase === 'countdown') panel = props.countdownPanel;
  else if (screen.kind === 'cancelled') {
    panel = (
      <PanelCard>
        <p className="font-poppins text-lg font-black text-white">{locale === 'ka' ? 'თამაში გაუქმდა.' : 'The game was cancelled.'}</p>
        <button type="button" onClick={props.onExit} className="mt-4 rounded-xl bg-white/10 px-6 py-3 font-poppins text-sm font-black uppercase text-white hover:bg-white/15">
          {locale === 'ka' ? 'გასვლა' : 'Exit'}
        </button>
      </PanelCard>
    );
  } else if (showScreen.kind === 'champion') {
    panel = <FinalBoard locale={locale} board={showBoard} selfUserId={selfUserId} yourScore={canAnswer ? score : null} onExit={props.onExit} />;
  } else if (showScreen.kind === 'stage_intro' && stage) {
    panel = <StageIntro locale={locale} stage={stage} index={showScreen.stage} count={Math.max(stages.length, 1)} />;
  } else if (question && (showScreen.kind === 'question' || showScreen.kind === 'reveal')) {
    const secondsLeft = showScreen.kind === 'question' ? Math.max(0, Math.ceil((showScreen.deadline - Math.max(now, showScreen.startsAt)) / 1000)) : null;
    panel = (
      <div className="relative pb-16">
        {stage && (
          <ShowHeader
            locale={locale}
            stageIndex={showScreen.stage}
            stageCount={Math.max(stages.length, 1)}
            stage={stage}
            qIndex={showScreen.q}
            secondsLeft={secondsLeft}
            points={score}
            rank={canAnswer ? rank : null}
            alive={field}
            spectating={!canAnswer}
          />
        )}
        <div className="mx-auto mt-4 w-full max-w-xl px-1">
          <QuestionView
            key={question.id}
            q={question}
            locale={locale}
            now={now}
            startsAt={showScreen.kind === 'question' ? showScreen.startsAt : 0}
            deadline={showScreen.kind === 'question' ? showScreen.deadline : 0}
            answer={yourAnswer}
            verdict={verdict}
            onAnswer={canAnswer && windowOpen ? submit : undefined}
            reveal={revealStats}
            stepMs={stepMs}
            hideWorth
            // Zoom out / evolution: compact art and 2x2 answers, so a phone sees the buttons without scrolling.
            variant={question.kind === 'zoom_out' || question.kind === 'evolution' ? 'host' : 'phone'}
          />
        </div>
        {canAnswer && attempt && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex justify-center">
            <ArenaScoreSplash key={attempt.attempt_id} show={verdict?.correct === true} points={serverAck?.accepted ? serverAck.points : null} side="right" />
          </div>
        )}
      </div>
    );
  } else {
    panel = <PanelCard><p className="font-poppins text-lg font-black text-white">{locale === 'ka' ? 'მოემზადე…' : 'Get ready…'}</p></PanelCard>;
  }

  return (
    // From the host's Start on, the show takes the whole screen (no app sidebar), like Weekend League and Ranked.
    <div
      ref={rootRef}
      className={cn(
        'bg-surface-page-alt font-fun',
        phase === 'pregame' ? 'min-h-[100dvh]' : 'fixed inset-0 z-50 overflow-y-auto overscroll-contain',
      )}
    >
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-3 py-3 sm:px-4 sm:py-5 lg:flex-row lg:items-start">
        <div className="w-full min-w-0 lg:sticky lg:top-4 lg:flex-1">
          <HostScreen
            state={state}
            locale={locale}
            live={{
              hideQuestion: true,
              lobbyLine: props.lobbyLine,
              countdownTo: phase === 'countdown' ? kickoffMs : null,
              joined: registered,
              joinLine: locale === 'ka' ? 'დარეგისტრირდი და ითამაშე ჩვენთან ერთად!' : 'Register and play along with us!',
            }}
          />
        </div>
        <aside className="w-full shrink-0 lg:w-[440px]">{panel}</aside>
      </div>
    </div>
  );
}

function PanelCard({ children }: { children: ReactNode }) {
  return <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-6 text-center">{children}</div>;
}

function FinalBoard({ locale, board, selfUserId, yourScore, onExit }: {
  locale: ShowLocale;
  board: ReturnType<typeof toBoard>;
  selfUserId: string | null;
  /** Your points, shown even when the board (server top 24) doesn't list you. */
  yourScore: number | null;
  onExit: () => void;
}) {
  const copy = SHOW_COPY[locale];
  const top = board.slice(0, 10);
  const me = selfUserId ? board.find((r) => r.id === selfUserId) : undefined;
  const meShown = me && top.some((r) => r.id === me.id);
  return (
    <div className="rounded-[24px] border-2 border-white/10 bg-surface-card-deep p-5">
      <div className="flex flex-col items-center gap-1 pb-3 text-center">
        <Crown className="size-12 text-brand-yellow drop-shadow-[0_0_24px_rgba(255,229,0,0.5)]" />
        <div className="font-poppins text-sm font-black uppercase tracking-[0.3em] text-brand-yellow">{copy.champion}</div>
        <div className="font-poppins text-3xl font-black uppercase leading-tight text-white">{board[0]?.name ?? '—'}</div>
        {board[0] && <div className="font-poppins text-base font-bold tabular-nums text-white/70">{copy.points(board[0].points)}</div>}
      </div>
      <ol className="flex flex-col gap-1.5">
        {top.map((r) => <BoardLine key={r.id} row={r} mine={r.id === selfUserId} />)}
        {me && !meShown && (
          <>
            <li className="text-center font-poppins text-xs font-bold text-white/40">…</li>
            <BoardLine row={me} mine />
          </>
        )}
      </ol>
      {!me && yourScore != null && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-green/20 px-3 py-2 ring-2 ring-brand-green">
          <span className="font-poppins text-sm font-black uppercase text-white">{locale === 'ka' ? 'შენი ქულა' : 'Your score'}</span>
          <span className="font-poppins text-sm font-black tabular-nums text-white">{yourScore}</span>
        </div>
      )}
      <button
        type="button"
        onClick={onExit}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 py-3 font-poppins text-sm font-black uppercase text-white hover:bg-white/15"
      >
        <LogOut className="size-4" /> {locale === 'ka' ? 'გასვლა' : 'Exit'}
      </button>
    </div>
  );
}

function BoardLine({ row, mine }: { row: ReturnType<typeof toBoard>[number]; mine: boolean }) {
  return (
    <li className={cn('flex items-center gap-3 rounded-xl px-3 py-2', mine ? 'bg-brand-green/25 ring-2 ring-brand-green' : 'bg-white/5')}>
      <span className={cn('w-7 font-poppins text-base font-black tabular-nums', row.rank <= 3 ? 'text-brand-yellow' : 'text-white/60')}>{row.rank}</span>
      <span className="min-w-0 flex-1 truncate font-poppins text-sm font-black uppercase text-white">{row.name}</span>
      <span className="font-poppins text-sm font-black tabular-nums text-white">{row.points}</span>
    </li>
  );
}

