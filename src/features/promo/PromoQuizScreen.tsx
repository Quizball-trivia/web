'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Socket } from 'socket.io-client';
import { PossessionQuestionPanel } from '@/components/game/PossessionQuestionPanel';
import { LiveSpecialQuestionPanel } from '@/features/possession/components/LiveSpecialQuestionPanel';
import { __setSocketOverride } from '@/lib/realtime/socket-client';
import type {
  ClientToServerEvents,
  MatchCluesGuessAckPayload,
  ServerToClientEvents,
} from '@/lib/realtime/socket.types';
import { PROMO_CLUES_ACCEPTED, PROMO_PUT_IN_ORDER_CORRECT_IDS } from './promoQuiz.data';
import { PROMO_FROZEN_TIME, PROMO_MATCH_ID, usePromoQuiz } from './usePromoQuiz';
import { PromoLocaleDefault } from './PromoLocaleDefault';

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

const PROMO_EMIT_EVENT = 'promo:socket-emit';

// Who-am-I clue pacing: one clue every CLUE_SECONDS; after the last clue the
// countdown holds and the round waits for an answer (no timeout, no give-up).
const CLUE_SECONDS = 10;

interface PromoEmitDetail {
  event: string;
  args: unknown[];
}

// The clue / put-in-order panels submit straight through getSocket(). We swap
// in a stub that re-broadcasts each emit as a window event so this screen can
// drive the reveal locally, with no backend involved.
function createPromoSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  const stub = {
    id: 'promo-stub',
    connected: true,
    active: true,
    auth: {},
    emit: (...args: unknown[]) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent<PromoEmitDetail>(PROMO_EMIT_EVENT, {
            detail: { event: String(args[0] ?? ''), args: args.slice(1) },
          }),
        );
      }
      return stub;
    },
    on: () => stub,
    once: () => stub,
    off: () => stub,
    removeListener: () => stub,
    removeAllListeners: () => stub,
    connect: () => stub,
    disconnect: () => stub,
    listenersAny: () => [],
    listeners: () => [],
  } as unknown as Socket<ServerToClientEvents, ClientToServerEvents>;
  return stub;
}

function isAcceptedCluesGuess(raw: string): boolean {
  const guess = raw.trim().toLowerCase();
  return guess.length > 0 && PROMO_CLUES_ACCEPTED.includes(guess);
}

type PromoQuizApi = ReturnType<typeof usePromoQuiz>;

/**
 * One special round (put-in-order or who-am-I). Remounted per question via the
 * parent's key, so all round-local state (clue countdown, wrong-guess reveals)
 * starts fresh without effect-driven resets.
 */
function PromoSpecialRound({ quiz }: { quiz: PromoQuizApi }) {
  const current = quiz.current;
  const isClues = current.kind === 'clues';
  const clueCount = isClues ? current.question.clues.length : 0;
  const cluesDuration = Math.max(1, clueCount) * CLUE_SECONDS;

  const [timeLeft, setTimeLeft] = useState(cluesDuration);
  const [guessAck, setGuessAck] = useState<MatchCluesGuessAckPayload | null>(null);
  // Wrong guesses reveal the next clue (mirrors the real game's server ack),
  // which also lowers the score awarded on the eventual correct answer.
  const [penaltyReveals, setPenaltyReveals] = useState(0);

  useEffect(() => {
    if (!isClues) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => (t <= CLUE_SECONDS ? t : t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isClues]);

  const timedReveals = isClues
    ? Math.min(clueCount, Math.max(1, Math.floor((cluesDuration - timeLeft) / CLUE_SECONDS) + 1))
    : 0;
  const revealCount = Math.min(clueCount, Math.max(timedReveals, 1 + penaltyReveals));

  // Latest-value refs so the emit listener subscribes exactly once.
  const revealCountRef = useRef(revealCount);
  const submitRef = useRef(quiz.submitSpecial);
  const qIndexRef = useRef(quiz.index);
  useEffect(() => {
    revealCountRef.current = revealCount;
    submitRef.current = quiz.submitSpecial;
    qIndexRef.current = quiz.index;
  });

  useEffect(() => {
    function onEmit(event: Event) {
      const detail = (event as CustomEvent<PromoEmitDetail>).detail;
      if (!detail) return;

      if (detail.event === 'match:clues_answer') {
        const payload = detail.args[0] as { guess?: string; giveUp?: boolean } | undefined;
        if (payload?.giveUp) return; // no give-up path in promo mode
        if (isAcceptedCluesGuess(payload?.guess ?? '')) {
          const clueIdx = Math.max(0, revealCountRef.current - 1);
          submitRef.current(true, { points: 100 - 20 * clueIdx, clueIndex: clueIdx });
        } else {
          // Wrong guess: ack it like the server would — clears the input and
          // reveals the next clue. The round keeps waiting for an answer.
          setPenaltyReveals((p) => p + 1);
          setGuessAck({
            matchId: PROMO_MATCH_ID,
            qIndex: qIndexRef.current,
            clueIndex: revealCountRef.current - 1,
            revealCount: Math.min(5, revealCountRef.current + 1),
          });
        }
        return;
      }

      if (detail.event === 'match:put_in_order_answer') {
        const payload = detail.args[0] as { orderedItemIds?: string[] } | undefined;
        const submitted = payload?.orderedItemIds ?? [];
        const total = PROMO_PUT_IN_ORDER_CORRECT_IDS.length;
        const matched = submitted.filter((id, i) => id === PROMO_PUT_IN_ORDER_CORRECT_IDS[i]).length;
        submitRef.current(matched === total, {
          points: Math.round((matched / total) * 100),
          submittedOrderIds: submitted,
          foundCount: matched,
        });
      }
    }

    window.addEventListener(PROMO_EMIT_EVENT, onEmit);
    return () => window.removeEventListener(PROMO_EMIT_EVENT, onEmit);
  }, []);

  if (current.kind === 'multipleChoice') return null;

  const cluesHeld = isClues && revealCount >= clueCount;

  return (
    <LiveSpecialQuestionPanel
      matchId={PROMO_MATCH_ID}
      qIndex={quiz.index}
      totalQuestions={quiz.totalQuestions}
      question={current.question}
      showOptions
      timeRemaining={isClues ? timeLeft : PROMO_FROZEN_TIME}
      questionDurationSeconds={isClues ? cluesDuration : PROMO_FROZEN_TIME}
      hideTimer={!isClues || cluesHeld}
      soloMode
      roundResolved={quiz.stage === 'revealed'}
      answerAck={quiz.answerAck}
      roundResult={quiz.roundResult}
      myRound={quiz.myRound}
      opponentRound={null}
      countdownGuessAck={null}
      cluesGuessAck={guessAck}
    />
  );
}

export function PromoQuizScreen({ playerName = 'Shota' }: { playerName?: string }) {
  const quiz = usePromoQuiz();

  // Install the stub socket before any interaction can produce an emit. The
  // panels only emit on user input, which cannot precede the first effect.
  useEffect(() => {
    __setSocketOverride(createPromoSocket());
    return () => __setSocketOverride(null);
  }, []);

  // Fresh question or restart: always film from the top of the page.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [quiz.index, quiz.nonce, quiz.finished]);

  const revealed = quiz.stage === 'revealed';

  if (quiz.finished) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
        <PromoLocaleDefault />
        <div className="font-fun text-sm uppercase tracking-[0.3em] text-white/50">
          Final score
        </div>
        <div className="font-fun text-7xl font-black text-brand-yellow" style={poppins}>
          {quiz.score}
        </div>
        <div className="font-fun text-2xl font-black uppercase text-white">{playerName}</div>
        <button
          type="button"
          onClick={quiz.restart}
          className="rounded-xl bg-brand-green px-8 py-4 font-fun text-lg font-black uppercase text-white transition-transform active:scale-95"
        >
          Play again
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <PromoLocaleDefault />
      {/* Scoreboard — replaces the ranked HUD (no pitch, no opponent). */}
      <div className="flex items-center justify-center gap-6 px-4 pt-5 sm:pt-7">
        <div className="flex flex-col items-center gap-1">
          <span className="font-fun text-[10px] uppercase tracking-[0.24em] text-white/45">
            {playerName}
          </span>
          <motion.span
            key={quiz.score}
            initial={{ scale: 1.25, color: '#FFE500' }}
            animate={{ scale: 1, color: '#FFFFFF' }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="font-fun text-3xl font-black sm:text-4xl"
            style={poppins}
          >
            {quiz.score}
          </motion.span>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-3xl flex-1 px-3 pb-28 pt-2 sm:px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${quiz.index}-${quiz.nonce}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {quiz.current.kind === 'multipleChoice' ? (
              <PossessionQuestionPanel
                phase={revealed ? 'reveal' : 'playing'}
                isPenaltyPhase={false}
                isShotPhase={false}
                isLastAttackPhase={false}
                question={quiz.current.question}
                qIndex={quiz.index}
                totalQuestions={quiz.totalQuestions}
                timeRemaining={null}
                showOptions
                selectedAnswer={quiz.selectedAnswer}
                answerStates={quiz.answerStates}
                opponentAnswer={null}
                onAnswer={quiz.answerMultipleChoice}
              />
            ) : (
              <PromoSpecialRound quiz={quiz} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Operator control — manual advance only, so retakes are easy. */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-6"
          >
            <button
              type="button"
              onClick={quiz.next}
              className="w-full max-w-sm rounded-xl bg-brand-green px-8 py-4 font-fun text-lg font-black uppercase text-white shadow-lg transition-transform active:scale-95"
              style={poppins}
            >
              {quiz.isLast ? 'Finish' : 'Next question'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
