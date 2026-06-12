'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { getSocket } from '@/lib/realtime/socket-client';
import type {
  MatchAnswerAckPayload,
  MatchCluesAnswerPayload,
  MatchCluesGuessAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
  ResolvedCluesQuestion,
} from '@/lib/realtime/socket.types';
import { calculateCluesDisplayPoints } from '@/utils/cluesScoring';
import { useLocale } from '@/contexts/LocaleContext';
import {
  QuestionKindBadge,
  SpecialResultSummary,
  resolveI18nText,
} from './shared';

/**
 * How long a guess may stay "pending" (input + Submit + Give Up disabled)
 * waiting for the server's guess-ack before the panel unlocks itself again.
 *
 * `pendingGuess` used to be cleared ONLY by a server event (guess ack, answer
 * ack, or round result). A single lost/stale-dropped ack therefore locked the
 * whole panel forever — the "frozen on Who Am I" bug from the Jun 2026 prod
 * audit (clue_chain rounds die at ~4× the MCQ rate). MCQ answers have a retry
 * loop; clues now at least self-unlock so the player can re-submit.
 */
const PENDING_GUESS_UNLOCK_MS = 2000;

/**
 * Grace after the visible timer hits zero before the client force-submits a
 * give-up. Ensures the server always receives SOME answer for this round even
 * if the player never typed anything and the server-side timeout resolution
 * is delayed — a late/duplicate answer is safely ignored server-side.
 */
const AUTO_GIVE_UP_GRACE_MS = 1000;

export function LiveCluesPanel({
  matchId,
  qIndex,
  question,
  showOptions,
  timeRemaining,
  questionDurationSeconds,
  answerAck,
  roundResolved,
  roundResult,
  myRound,
  opponentRound,
  cluesGuessAck,
}: {
  matchId: string;
  qIndex: number;
  question: ResolvedCluesQuestion;
  showOptions: boolean;
  timeRemaining: number;
  questionDurationSeconds: number;
  answerAck: MatchAnswerAckPayload | null;
  roundResolved: boolean;
  roundResult: MatchRoundResultPayload | null;
  myRound: MatchRoundResultPlayer | null;
  opponentRound: MatchRoundResultPlayer | null;
  cluesGuessAck: MatchCluesGuessAckPayload | null;
}) {
  const { t } = useLocale();
  const [guess, setGuess] = useState('');
  const [pendingGuess, setPendingGuess] = useState(false);
  // As each new clue reveals, the answer input gets pushed further down the
  // page. Keep it on-screen by scrolling the input block into view whenever the
  // revealed-clue count grows (mobile: clues stack and shove the input off-screen).
  const inputBlockRef = useRef<HTMLDivElement>(null);
  const [manualRevealCount, setManualRevealCount] = useState(1);
  const resolvedLocale = question.resolvedLocale ?? 'en';
  const submitted = Boolean(answerAck?.questionKind === 'clues' && answerAck?.qIndex === qIndex);
  const clueCount = question.clues.length;
  const secondsPerClue = clueCount > 0 ? Math.max(1, Math.floor(questionDurationSeconds / clueCount)) : questionDurationSeconds;
  const timedRevealCount = roundResolved
    ? clueCount
    : Math.min(clueCount, Math.max(1, Math.floor((questionDurationSeconds - timeRemaining) / secondsPerClue) + 1));
  const revealedClues = submitted || roundResolved ? clueCount : Math.max(manualRevealCount, timedRevealCount);
  const displayAnswer = roundResult?.reveal.kind === 'clues'
    ? resolveI18nText(roundResult.reveal.displayAnswer, resolvedLocale)
    : answerAck?.questionKind === 'clues' && answerAck.qIndex === qIndex && answerAck.cluesDisplayAnswer
      ? resolveI18nText(answerAck.cluesDisplayAnswer, resolvedLocale)
    : null;
  const inputLocked = !showOptions || submitted || pendingGuess || roundResolved;

  // Scroll the answer input back into view each time a new clue is revealed,
  // so the user never has to manually scroll down to reach it.
  useEffect(() => {
    if (roundResolved) return;
    const node = inputBlockRef.current;
    if (typeof node?.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [revealedClues, roundResolved]);

  const playerAnswerCount = roundResolved
    ? (myRound?.isCorrect ? 1 : 0)
    : submitted && answerAck?.isCorrect
      ? 1
      : 0;
  const opponentAnswerCount = roundResolved ? (opponentRound?.isCorrect ? 1 : 0) : null;
  const cluesPlayerCorrect = roundResolved ? Boolean(myRound?.isCorrect) : Boolean(answerAck?.isCorrect);
  const cluesPlayerPoints = roundResolved
    ? (myRound?.pointsEarned ?? answerAck?.pointsEarned ?? null)
    : (submitted ? answerAck?.pointsEarned ?? null : null);
  const cluesOpponentPoints = roundResolved ? (opponentRound?.pointsEarned ?? 0) : null;
  const cluesPlayerDetail = roundResolved && typeof myRound?.clueIndex === 'number'
    ? `clue ${myRound.clueIndex + 1}`
    : submitted
      ? 'answer submitted'
      : 'not answered';
  const cluesOpponentDetail = roundResolved && opponentRound?.isCorrect && typeof opponentRound.clueIndex === 'number'
    ? `clue ${opponentRound.clueIndex + 1}`
    : roundResolved
      ? 'no correct answer'
      : 'result pending';

  useEffect(() => {
    queueMicrotask(() => {
      setGuess('');
      setPendingGuess(false);
      setManualRevealCount(1);
    });
  }, [qIndex]);

  useEffect(() => {
    if (!cluesGuessAck || cluesGuessAck.qIndex !== qIndex) return;
    queueMicrotask(() => {
      setManualRevealCount((current) => Math.max(current, cluesGuessAck.revealCount));
      setPendingGuess(false);
      setGuess('');
    });
  }, [cluesGuessAck, qIndex]);

  useEffect(() => {
    if (submitted || roundResolved) {
      queueMicrotask(() => {
        setPendingGuess(false);
      });
    }
  }, [roundResolved, submitted]);

  // Watchdog: never let a lost guess-ack deadlock the input. If no server
  // event cleared `pendingGuess` within the window, unlock so the player can
  // submit again (re-submitting an already-committed answer is a server no-op).
  useEffect(() => {
    if (!pendingGuess) return;
    const timer = setTimeout(() => {
      setPendingGuess(false);
    }, PENDING_GUESS_UNLOCK_MS);
    return () => clearTimeout(timer);
  }, [pendingGuess]);

  // Deadline failsafe: when the timer hits zero and the player still hasn't
  // submitted anything, auto give-up (once per question) so the server always
  // has this player's answer for the round — parity with put-in-order's
  // auto-submit. Cancelled if an ack/round result lands during the grace.
  const autoGiveUpQIndexRef = useRef<number | null>(null);
  useEffect(() => {
    if (autoGiveUpQIndexRef.current === qIndex) return;
    if (!showOptions || submitted || roundResolved || timeRemaining > 0) return;
    const timer = setTimeout(() => {
      if (autoGiveUpQIndexRef.current === qIndex) return;
      autoGiveUpQIndexRef.current = qIndex;
      const payload: MatchCluesAnswerPayload = {
        kind: 'giveUp',
        matchId,
        qIndex,
        giveUp: true,
        timeMs: Math.max(0, Math.round(questionDurationSeconds * 1000)),
      };
      getSocket().emit('match:clues_answer', payload);
    }, AUTO_GIVE_UP_GRACE_MS);
    return () => clearTimeout(timer);
  }, [matchId, qIndex, questionDurationSeconds, roundResolved, showOptions, submitted, timeRemaining]);

  const emitGuess = useCallback((options?: { giveUp?: boolean }) => {
    if (inputLocked) return;
    if (!options?.giveUp && !guess.trim()) return;
    setPendingGuess(true);
    const payload: MatchCluesAnswerPayload = options?.giveUp
      ? {
          kind: 'giveUp',
          matchId,
          qIndex,
          giveUp: true,
          timeMs: Math.max(0, Math.round((questionDurationSeconds - timeRemaining) * 1000)),
        }
      : {
          kind: 'guess',
          matchId,
          qIndex,
          guess: guess.trim(),
          timeMs: Math.max(0, Math.round((questionDurationSeconds - timeRemaining) * 1000)),
        };
    getSocket().emit('match:clues_answer', payload);
  }, [guess, inputLocked, matchId, qIndex, questionDurationSeconds, timeRemaining]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-start pt-2">
        {/* `key={qIndex}` re-fires the drop-in animation on each new
            question while the rest of the panel keeps its state. */}
        <QuestionKindBadge key={qIndex} kind="clues" />
      </div>

      {/* Prompt — plain text, no card chrome. Matches the countdown /
          put-in-order layout: the prompt line sits above the You/Opp
          summary and the clues so the player has the question's framing
          before any clues drop. */}
      <div className="px-1">
        <p className="text-base font-black font-fun leading-snug text-white">{question.prompt}</p>
      </div>

      <SpecialResultSummary
        visible={submitted || roundResolved}
        tone="orange"
        player={{
          label: t('possession.you'),
          count: playerAnswerCount,
          total: 1,
          points: cluesPlayerPoints,
          badge: cluesPlayerCorrect ? t('possession.correct') : t('possession.wrong'),
          status: cluesPlayerCorrect ? 'positive' : 'negative',
          detail: cluesPlayerDetail,
        }}
        opponent={{
          label: t('possession.opp'),
          count: opponentAnswerCount,
          total: 1,
          points: cluesOpponentPoints,
          badge: roundResolved ? (opponentRound?.isCorrect ? t('possession.correct') : t('possession.wrong')) : t('possession.waiting'),
          status: roundResolved ? (opponentRound?.isCorrect ? 'positive' : 'negative') : 'pending',
          detail: cluesOpponentDetail,
        }}
      />

      {(submitted || roundResolved) && displayAnswer && (
        <motion.div
          aria-live="polite"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={`flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2 ${
            cluesPlayerCorrect
              ? 'border-brand-green/25 bg-brand-green/10'
              : 'border-brand-red-soft/25 bg-brand-red-soft/10'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            {cluesPlayerCorrect ? (
              <CheckCircle2 className="size-4 shrink-0 text-brand-green" />
            ) : (
              <XCircle className="size-4 shrink-0 text-brand-red-soft" />
            )}
            <div className="min-w-0">
              <p className={`text-[10px] font-fun font-black uppercase tracking-[0.18em] ${
                cluesPlayerCorrect ? 'text-brand-green' : 'text-brand-red-soft'
              }`}>
                {cluesPlayerCorrect ? t('possession.correctAnswerLabel') : t('possession.theAnswerWas')}
              </p>
              <p className="truncate text-sm font-fun font-black uppercase tracking-wide text-white">
                {displayAnswer}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            {cluesPlayerCorrect && cluesPlayerPoints != null && (
              <p className="text-[11px] font-fun font-black uppercase text-brand-green">
                +{cluesPlayerPoints} {t('possession.pointsLabel')}
              </p>
            )}
            {opponentRound && (
              <p className="text-[9px] font-fun font-black uppercase tracking-[0.16em] text-white/50">
                {opponentRound.isCorrect && typeof opponentRound.clueIndex === 'number'
                  ? t('possession.oppClue', { index: opponentRound.clueIndex + 1 })
                  : t('possession.oppMissed')}
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* All clue cards rendered upfront — locked clues show `???`, revealed
          clues show their text. Each row has a per-clue points pill on the
          right (revealed = solid green / white text; locked = dark fill +
          green border + green text). */}
      <div>
        <div className="space-y-1.5">
          {question.clues.map((clue, index) => {
            const cluePoints = calculateCluesDisplayPoints(index + 1);
            const revealed = index < revealedClues;
            return (
              <motion.div
                key={`${index}-${clue.content}`}
                initial={index === 0 ? false : { opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] px-5 py-4"
              >
                <div className="min-w-0 flex-1 text-center">
                  {revealed ? (
                    clue.type === 'emoji' ? (
                      <span className="text-4xl">{clue.content}</span>
                    ) : (
                      <p className="text-base font-fun font-black uppercase tracking-wide text-white">
                        {clue.content}
                      </p>
                    )
                  ) : (
                    <p className="text-base font-fun font-black uppercase tracking-wide text-white/35">
                      ???
                    </p>
                  )}
                </div>
                <span
                  className={`font-poppins inline-flex shrink-0 items-center justify-center rounded-[20px] border-[2px] border-brand-green tabular-nums ${
                    revealed
                      ? 'bg-brand-green text-white shadow-[0_0_10px_rgba(56,182,14,0.35)]'
                      : 'bg-surface-page text-brand-green'
                  }`}
                  style={{
                    fontWeight: 600,
                    fontSize: 18,
                    letterSpacing: '0.02em',
                    // Figma node 137 × 81 → ~68 × 40 at 1x design density.
                    width: 'clamp(72px, 18vw, 96px)',
                    height: 'clamp(40px, 10vw, 52px)',
                  }}
                  aria-label={`${cluePoints} points at this clue${revealed ? '' : ' (locked)'}`}
                >
                  {cluePoints} pt
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Centered yellow clue indicator row. Filled yellow = revealed,
          dark = still locked. */}
      {!roundResolved && (
        <div className="flex items-center justify-center gap-2">
          {question.clues.map((_, index) => {
            const revealed = index < revealedClues;
            return (
              <div
                key={index}
                className={`size-3 rounded-full transition-colors duration-300 ${
                  revealed
                    ? 'bg-brand-yellow shadow-[0_0_10px_rgba(255,229,0,0.55)]'
                    : 'bg-surface-page'
                }`}
              />
            );
          })}
        </div>
      )}

      {!roundResolved && (
        <div ref={inputBlockRef} className="space-y-2 scroll-mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder={t('possession.typeYourAnswerPlaceholder')}
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  emitGuess();
                }
              }}
              disabled={inputLocked}
              autoFocus
              aria-label={t('possession.typeYourAnswerAriaLabel')}
              className="font-poppins h-14 w-full rounded-[20px] border-none bg-brand-blue px-5 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus:outline-none disabled:opacity-50"
              style={{
                fontWeight: 600,
                letterSpacing: '0.08em',
                boxShadow: '0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)',
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => emitGuess()}
              disabled={!guess.trim() || inputLocked}
              aria-label={t('possession.submitAnswer')}
              className="font-poppins h-14 rounded-[20px] bg-brand-green text-white outline-none transition-colors hover:bg-brand-green-deep disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: '0.06em',
                boxShadow: '0 1.76px 6.334px 1.32px rgba(56, 182, 14, 0.25)',
              }}
            >
              {t('possession.submit')}
            </button>
            <button
              type="button"
              onClick={() => emitGuess({ giveUp: true })}
              disabled={inputLocked}
              aria-label={t('possession.giveUp')}
              className="font-poppins h-14 rounded-[20px] bg-brand-red-soft text-white outline-none transition-colors hover:bg-brand-red-deep disabled:opacity-40"
              style={{
                fontWeight: 600,
                fontSize: 16,
                letterSpacing: '0.06em',
                boxShadow: '0 1.76px 6.334px 1.32px rgba(255, 75, 75, 0.25)',
              }}
            >
              {t('possession.giveUp')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
