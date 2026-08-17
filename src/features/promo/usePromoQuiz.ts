'use client';

import { useCallback, useMemo, useState } from 'react';
import type { AnswerStateArray } from '@/lib/types/game.types';
import type {
  MatchAnswerAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
} from '@/lib/realtime/socket.types';
import {
  PROMO_CLUES_ANSWER,
  PROMO_PUT_IN_ORDER_CORRECT_IDS,
  PROMO_QUESTIONS,
  PROMO_TOTAL_QUESTIONS,
  type PromoQuestion,
} from './promoQuiz.data';

export const PROMO_MATCH_ID = 'promo-match';
const PROMO_SELF_ID = 'promo-self';

// The special panels auto-submit when timeRemaining hits 0, so the promo flow
// holds a constant positive value and never renders a countdown.
export const PROMO_FROZEN_TIME = 99;

export type PromoStage = 'question' | 'revealed';

function buildAnswerStates(
  optionCount: number,
  selectedIndex: number | null,
  correctIndex: number,
  revealed: boolean,
): AnswerStateArray {
  const states = Array.from({ length: 4 }, (_, i) => {
    if (i >= optionCount) return 'disabled';
    if (!revealed) return selectedIndex === i ? 'correct' : 'default';
    if (i === correctIndex) return 'correct';
    if (i === selectedIndex) return 'wrong';
    return 'default';
  });
  return states as unknown as AnswerStateArray;
}

function roundPlayer(
  isCorrect: boolean,
  pointsEarned: number,
  totalPoints: number,
  extra: Partial<MatchRoundResultPlayer> = {},
): MatchRoundResultPlayer {
  return {
    selectedIndex: null,
    isCorrect,
    timeMs: 3200,
    pointsEarned,
    totalPoints,
    submittedOrderIds: [],
    ...extra,
  };
}

export interface PromoQuizState {
  index: number;
  current: PromoQuestion;
  stage: PromoStage;
  score: number;
  selectedAnswer: number | null;
  answerStates: AnswerStateArray;
  answerAck: MatchAnswerAckPayload | null;
  roundResult: MatchRoundResultPayload | null;
  myRound: MatchRoundResultPlayer | null;
  isLast: boolean;
  finished: boolean;
}

export function usePromoQuiz() {
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<PromoStage>('question');
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);
  const [lastOrderIds, setLastOrderIds] = useState<string[] | null>(null);
  const [lastFoundCount, setLastFoundCount] = useState<number | null>(null);
  const [lastClueIndex, setLastClueIndex] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  // Special panels submit through the socket stub; a nonce forces a fresh
  // panel instance per question so their internal state resets cleanly.
  const [nonce, setNonce] = useState(0);

  const current = PROMO_QUESTIONS[index];
  const isLast = index >= PROMO_QUESTIONS.length - 1;
  const revealed = stage === 'revealed';

  const answerStates = useMemo<AnswerStateArray>(() => {
    if (current.kind !== 'multipleChoice') {
      return ['default', 'default', 'default', 'default'] as unknown as AnswerStateArray;
    }
    return buildAnswerStates(
      current.question.options.length,
      selectedAnswer,
      current.question.correctIndex,
      revealed,
    );
  }, [current, selectedAnswer, revealed]);

  const answerAck = useMemo<MatchAnswerAckPayload | null>(() => {
    if (stage !== 'revealed') return null;
    const kind =
      current.kind === 'multipleChoice'
        ? 'multipleChoice'
        : current.kind === 'putInOrder'
          ? 'putInOrder'
          : 'clues';
    return {
      matchId: PROMO_MATCH_ID,
      qIndex: index,
      questionKind: kind,
      selectedIndex: selectedAnswer,
      isCorrect: lastCorrect,
      myTotalPoints: score,
      oppAnswered: true,
      pointsEarned: lastPoints,
      ...(current.kind === 'clues'
        ? { clueIndex: lastClueIndex ?? 0,
            cluesDisplayAnswer: { en: PROMO_CLUES_ANSWER, ka: PROMO_CLUES_ANSWER } }
        : {}),
      ...(current.kind === 'putInOrder'
        ? { foundCount: lastFoundCount ?? 0,
            submittedOrderIds: lastOrderIds ?? PROMO_PUT_IN_ORDER_CORRECT_IDS }
        : {}),
    } as MatchAnswerAckPayload;
  }, [stage, current, index, selectedAnswer, lastCorrect, score, lastPoints, lastClueIndex, lastFoundCount, lastOrderIds]);

  const myRound = useMemo<MatchRoundResultPlayer | null>(() => {
    if (stage !== 'revealed') return null;
    return roundPlayer(lastCorrect, lastPoints, score, {
      selectedIndex: selectedAnswer,
      ...(current.kind === 'putInOrder'
        ? { foundCount: lastFoundCount ?? 0,
            submittedOrderIds: lastOrderIds ?? PROMO_PUT_IN_ORDER_CORRECT_IDS }
        : {}),
      ...(current.kind === 'clues' ? { clueIndex: lastClueIndex ?? 0 } : {}),
    });
  }, [stage, current, lastCorrect, lastPoints, score, selectedAnswer, lastClueIndex, lastFoundCount, lastOrderIds]);

  const roundResult = useMemo<MatchRoundResultPayload | null>(() => {
    if (stage !== 'revealed' || !myRound) return null;

    const reveal =
      current.kind === 'multipleChoice'
        ? { kind: 'multipleChoice' as const, correctIndex: current.question.correctIndex }
        : current.kind === 'putInOrder'
          ? {
              kind: 'putInOrder' as const,
              // Items are displayed scrambled; the authoritative order comes
              // from the correct-IDs list, not the display order.
              correctOrder: PROMO_PUT_IN_ORDER_CORRECT_IDS.map((id, i) => {
                const item = (current.question.items as Array<{ id: string; label: string; details?: string | null; emoji?: string | null }>)
                  .find((candidate) => candidate.id === id);
                return {
                  id,
                  label: { en: item?.label ?? id, ka: item?.label ?? id },
                  details: item?.details ? { en: item.details, ka: item.details } : null,
                  emoji: item?.emoji ?? null,
                  sortValue: i,
                };
              }),
            }
          : {
              kind: 'clues' as const,
              displayAnswer: { en: PROMO_CLUES_ANSWER, ka: PROMO_CLUES_ANSWER },
            };

    return {
      matchId: PROMO_MATCH_ID,
      qIndex: index,
      questionKind: current.kind,
      reveal,
      players: { [PROMO_SELF_ID]: myRound },
    } as MatchRoundResultPayload;
  }, [stage, current, index, myRound]);

  const reveal = useCallback(
    (isCorrect: boolean, points: number) => {
      setLastCorrect(isCorrect);
      setLastPoints(points);
      if (points > 0) setScore((s) => s + points);
      setStage('revealed');
    },
    [],
  );

  const answerMultipleChoice = useCallback(
    (optionIndex: number) => {
      if (stage !== 'question' || current.kind !== 'multipleChoice') return;
      setSelectedAnswer(optionIndex);
      const isCorrect = optionIndex === current.question.correctIndex;
      reveal(isCorrect, isCorrect ? current.points : 0);
    },
    [stage, current, reveal],
  );

  const submitSpecial = useCallback(
    (
      isCorrect: boolean,
      opts?: {
        points?: number;
        submittedOrderIds?: string[];
        foundCount?: number;
        clueIndex?: number;
      },
    ) => {
      if (stage !== 'question') return;
      setLastOrderIds(opts?.submittedOrderIds ?? null);
      setLastFoundCount(opts?.foundCount ?? null);
      setLastClueIndex(opts?.clueIndex ?? null);
      reveal(isCorrect, opts?.points ?? (isCorrect ? current.points : 0));
    },
    [stage, current, reveal],
  );

  const next = useCallback(() => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setStage('question');
    setSelectedAnswer(null);
    setLastCorrect(false);
    setLastPoints(0);
    setLastOrderIds(null);
    setLastFoundCount(null);
    setLastClueIndex(null);
    setNonce((n) => n + 1);
  }, [isLast]);

  const restart = useCallback(() => {
    setIndex(0);
    setStage('question');
    setScore(0);
    setSelectedAnswer(null);
    setLastCorrect(false);
    setLastPoints(0);
    setLastOrderIds(null);
    setLastFoundCount(null);
    setLastClueIndex(null);
    setFinished(false);
    setNonce((n) => n + 1);
  }, []);

  return {
    index,
    current,
    stage,
    score,
    selectedAnswer,
    answerStates,
    answerAck,
    roundResult,
    myRound,
    isLast,
    finished,
    nonce,
    totalQuestions: PROMO_TOTAL_QUESTIONS,
    answerMultipleChoice,
    submitSpecial,
    next,
    restart,
  };
}
