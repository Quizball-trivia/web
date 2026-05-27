'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'motion/react';
import { getSocket } from '@/lib/realtime/socket-client';
import type {
  MatchAnswerAckPayload,
  MatchCountdownGuessAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
  ResolvedCountdownQuestion,
} from '@/lib/realtime/socket.types';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useLocale } from '@/contexts/LocaleContext';
import {
  QuestionKindBadge,
  SpecialResultSummary,
  resolveI18nText,
} from './shared';

const COUNTDOWN_AUTO_SUBMIT_DEBOUNCE_MS = 100;

function CountdownAnswerChip({ answer, tone }: { answer: string; tone: 'green' | 'red' | 'both' }) {
  const toneClass = tone === 'red'
    ? 'border-brand-red-soft/30 bg-brand-red-soft/10 text-brand-red-soft'
    : tone === 'both'
      ? 'border-brand-green/35 bg-brand-green/15 text-white'
      : 'border-brand-green/30 bg-brand-green/10 text-brand-green';
  return (
    <span className={`inline-flex min-w-0 max-w-full items-center rounded-[7px] border px-2 py-1 text-[11px] font-fun font-black ${toneClass}`}>
      <span className="truncate">{answer}</span>
    </span>
  );
}

function CountdownAnswerGroup({
  label,
  answers,
  tone,
}: {
  label: string;
  answers: string[];
  tone: 'green' | 'red' | 'both';
}) {
  if (answers.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-fun font-black uppercase tracking-[0.2em] text-white/45">
        {label} <span className="text-white/30">({answers.length})</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {answers.map((answer) => (
          <CountdownAnswerChip key={answer} answer={answer} tone={tone} />
        ))}
      </div>
    </div>
  );
}

export function LiveCountdownPanel({
  matchId,
  qIndex,
  question,
  showOptions,
  roundResolved,
  answerAck,
  countdownGuessAck,
  roundResult,
  myRound,
  opponentRound,
}: {
  matchId: string;
  qIndex: number;
  question: ResolvedCountdownQuestion;
  showOptions: boolean;
  roundResolved: boolean;
  answerAck: MatchAnswerAckPayload | null;
  countdownGuessAck: MatchCountdownGuessAckPayload | null;
  roundResult: MatchRoundResultPayload | null;
  myRound: MatchRoundResultPlayer | null;
  opponentRound: MatchRoundResultPlayer | null;
}) {
  const { t } = useLocale();
  const [guess, setGuess] = useState('');
  const [foundAnswers, setFoundAnswers] = useState<string[]>([]);
  const [showAllCorrectAnswers, setShowAllCorrectAnswers] = useState(false);
  const resolvedLocale = question.resolvedLocale ?? 'en';
  const lastSubmittedRef = useRef('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real-time opponent found count comes from the server via
  // `match:opponent_countdown_progress` and is stored in the realtime
  // match store. After the round resolves, snap to the authoritative
  // final count from the round_result payload.
  const opponentLiveFoundCount = useRealtimeMatchStore(
    (state) => state.match?.opponentCountdownFoundCount ?? 0,
  );

  useEffect(() => {
    queueMicrotask(() => {
      setGuess('');
      setFoundAnswers([]);
      setShowAllCorrectAnswers(false);
    });
    lastSubmittedRef.current = '';
  }, [qIndex]);

  useEffect(() => {
    if (!countdownGuessAck?.accepted || countdownGuessAck.qIndex !== qIndex) return;
    const displays = countdownGuessAck.acceptedDisplays?.length
      ? countdownGuessAck.acceptedDisplays.map((display) => resolveI18nText(display, resolvedLocale))
      : countdownGuessAck.acceptedDisplay
        ? [resolveI18nText(countdownGuessAck.acceptedDisplay, resolvedLocale)]
        : [];
    if (displays.length === 0) return;
    queueMicrotask(() => {
      setFoundAnswers((current) => {
        const next = [...current];
        for (const display of displays) {
          if (!next.includes(display)) next.push(display);
        }
        return next;
      });
      setGuess('');
    });
    lastSubmittedRef.current = '';
  }, [countdownGuessAck, qIndex, resolvedLocale]);

  const revealedAnswerGroups = useMemo(() => {
    if (!roundResolved || !roundResult || roundResult.reveal.kind !== 'countdown') return [];
    return roundResult.reveal.answerGroups.map((group) => ({
      id: group.id,
      display: resolveI18nText(group.display, resolvedLocale),
    }));
  }, [resolvedLocale, roundResolved, roundResult]);
  const revealedAnswers = useMemo(() => revealedAnswerGroups.map((group) => group.display), [revealedAnswerGroups]);

  const inputLocked = !showOptions || roundResolved;
  const playerFoundCount = roundResolved
    ? (myRound?.foundCount ?? answerAck?.foundCount ?? foundAnswers.length)
    : (countdownGuessAck?.foundCount ?? foundAnswers.length);
  const opponentFoundCount = roundResolved ? (opponentRound?.foundCount ?? 0) : opponentLiveFoundCount;
  const hasPlayerCountFeedback = showOptions || playerFoundCount > 0 || roundResolved;
  const countdownPlayerPoints = roundResolved
    ? (myRound?.pointsEarned ?? answerAck?.pointsEarned ?? null)
    : null;
  const countdownOpponentPoints = roundResolved ? (opponentRound?.pointsEarned ?? 0) : null;
  const playerFoundIdSet = useMemo(() => new Set(myRound?.foundAnswerIds ?? []), [myRound?.foundAnswerIds]);
  const opponentFoundIdSet = useMemo(() => new Set(opponentRound?.foundAnswerIds ?? []), [opponentRound?.foundAnswerIds]);
  const showCountdownOwnership = roundResolved && (playerFoundIdSet.size > 0 || opponentFoundIdSet.size > 0);
  const countdownAnswerBreakdown = useMemo(() => {
    const playerAnswers: string[] = [];
    const opponentAnswers: string[] = [];
    const unclaimedAnswers: string[] = [];

    for (const answer of revealedAnswerGroups) {
      const playerFound = playerFoundIdSet.has(answer.id);
      const opponentFound = opponentFoundIdSet.has(answer.id);
      if (playerFound) playerAnswers.push(answer.display);
      if (opponentFound) opponentAnswers.push(answer.display);
      if (!playerFound && !opponentFound) unclaimedAnswers.push(answer.display);
    }

    return { playerAnswers, opponentAnswers, unclaimedAnswers };
  }, [opponentFoundIdSet, playerFoundIdSet, revealedAnswerGroups]);

  const submitGuess = useCallback(() => {
    if (inputLocked || !guess.trim()) return;
    getSocket().emit('match:countdown_guess', { matchId, qIndex, guess: guess.trim() });
    lastSubmittedRef.current = guess.trim().toLowerCase();
  }, [guess, inputLocked, matchId, qIndex]);

  // Auto-submit on keystroke with a short debounce (3+ characters).
  // The server handles matching (prefix, fuzzy, exact) — if accepted, the ACK clears the input.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = guess.trim();
    if (inputLocked || trimmed.length < 3 || trimmed.toLowerCase() === lastSubmittedRef.current) return;

    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const normalized = trimmed.toLowerCase();
      if (normalized === lastSubmittedRef.current) return;
      getSocket().emit('match:countdown_guess', { matchId, qIndex, guess: trimmed });
      lastSubmittedRef.current = normalized;
    }, COUNTDOWN_AUTO_SUBMIT_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [guess, inputLocked, matchId, qIndex]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-start pt-2">
        {/* `key={qIndex}` forces the badge to remount on each new question
            so its drop-in animation re-fires. The rest of the panel keeps
            its state (typed guesses, sortable order) across the remount. */}
        <QuestionKindBadge key={qIndex} kind="countdown" />
      </div>

      {/* Prompt — plain text, no card chrome */}
      <div className="px-1 pt-1">
        <p className="text-lg font-black font-fun leading-snug text-white">{question.prompt}</p>
      </div>

      <SpecialResultSummary
        visible={hasPlayerCountFeedback}
        tone="green"
        player={{
          label: 'You',
          count: playerFoundCount,
          total: question.answerSlotCount,
          points: countdownPlayerPoints,
          badge: roundResolved ? (myRound?.isCorrect ? 'Won' : 'Did not win') : 'Found',
          status: roundResolved ? (myRound?.isCorrect ? 'positive' : 'negative') : 'positive',
          detail: roundResolved ? 'accepted answers' : 'accepted so far',
        }}
        opponent={{
          label: 'Opp',
          count: opponentFoundCount,
          total: question.answerSlotCount,
          points: countdownOpponentPoints,
          badge: roundResolved ? (opponentRound?.isCorrect ? 'Won' : 'Did not win') : (opponentFoundCount > 0 ? 'Finding' : 'Waiting'),
          status: roundResolved ? (opponentRound?.isCorrect ? 'positive' : 'negative') : (opponentFoundCount > 0 ? 'positive' : 'pending'),
          detail: roundResolved ? 'accepted answers' : 'accepted so far',
        }}
      />

      {/* Input — flat blue Figma pill. Using a plain <input> rather than
          the shared Input component because the latter applies a
          `dark:bg-input/30` default that overrides bg-brand-blue in
          dark-mode desktop while letting it through on iOS, so the pill
          renders differently across platforms. */}
      {!roundResolved && (
        <div>
          <div className="relative">
            <input
              type="text"
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  submitGuess();
                }
              }}
              placeholder={t('possession.typeYourAnswerPlaceholder')}
              disabled={inputLocked}
              aria-label={t('possession.typeYourAnswerAriaLabel')}
              className="font-poppins h-14 w-full rounded-[14px] border-none bg-brand-blue px-5 pr-14 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus:outline-none disabled:opacity-50"
              style={{
                fontWeight: 600,
                letterSpacing: '0.08em',
                boxShadow: '0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)',
              }}
            />
            <button
              type="button"
              onClick={submitGuess}
              disabled={inputLocked || !guess.trim()}
              aria-label={t('possession.submitAnswer')}
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex size-9 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Send className="size-4" />
            </button>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/40">

            Auto-matches as you type · Enter for short answers
          </p>
        </div>
      )}

      {/* Answers found list — single soft container */}
      <div className="px-1.5 sm:px-0">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h3 className="text-[11px] font-fun font-black uppercase tracking-[0.22em] text-white/55">
            {roundResolved ? 'Answer Results' : 'Answers Found'}
          </h3>
        </div>
        {(roundResolved ? revealedAnswers : foundAnswers).length === 0 ? (
          <p className="py-6 text-center text-xs font-fun font-black uppercase tracking-[0.18em] text-white/30">
            {roundResolved ? 'No answers found this round.' : ''}
          </p>
        ) : (
          roundResolved ? (
            <div className="space-y-3">
              {showCountdownOwnership ? (
                <>
                  <CountdownAnswerGroup label="You" answers={countdownAnswerBreakdown.playerAnswers} tone="green" />
                  <CountdownAnswerGroup label="Opponent" answers={countdownAnswerBreakdown.opponentAnswers} tone="red" />
                  {countdownAnswerBreakdown.unclaimedAnswers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/35">
                      <span>{countdownAnswerBreakdown.unclaimedAnswers.length} more correct answers not found</span>
                      <button
                        type="button"
                        onClick={() => setShowAllCorrectAnswers((current) => !current)}
                        className="rounded-[7px] border border-brand-green/30 px-2 py-1 text-[10px] font-fun font-black uppercase tracking-[0.14em] text-brand-green transition-colors hover:bg-brand-green/10"
                      >
                        {showAllCorrectAnswers ? 'Hide all' : 'See all'}
                      </button>
                    </div>
                  )}
                  {showAllCorrectAnswers && countdownAnswerBreakdown.unclaimedAnswers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-wrap gap-1.5"
                    >
                      {revealedAnswerGroups.map((answer) => (
                        <CountdownAnswerChip key={answer.id} answer={answer.display} tone="green" />
                      ))}
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {revealedAnswerGroups.slice(0, 8).map((answer) => (
                    <CountdownAnswerChip key={answer.id} answer={answer.display} tone="green" />
                  ))}
                  {revealedAnswerGroups.length > 8 && (
                    <span className="rounded-[7px] border border-white/10 px-2 py-1 text-[11px] font-fun font-black text-white/45">
                      +{revealedAnswerGroups.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {foundAnswers.map((answer) => (
                <motion.div
                  key={answer}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-[8px] border border-brand-green/20 bg-transparent px-3 py-2 text-sm font-fun font-black text-brand-green"
                >
                  {answer}
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
