'use client';

import { useCallback, useMemo, useState } from 'react';
import type { AnswerStateArray } from '@/lib/types/game.types';
import type {
  MatchAnswerAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
} from '@/lib/realtime/socket.types';
import { type PromoRound } from './promoQuiz.data';
import type { PromoContentPack } from './promoContent';

export const PROMO_MATCH_ID = 'promo-match';
const PROMO_SELF_ID = 'promo-self';

// The possession special panels auto-submit when timeRemaining hits 0, so the
// promo flow holds a constant positive value and never renders a countdown.
export const PROMO_FROZEN_TIME = 99;

export type PromoStage = 'question' | 'revealed';

export interface PromoEmbeddedResult {
  correctUnits: number;
  totalUnits: number;
  points: number;
}

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

const POSSESSION_KINDS = ['multipleChoice', 'putInOrder', 'clues'] as const;

function isPossessionRound(
  round: PromoRound,
): round is Extract<PromoRound, { kind: 'multipleChoice' | 'putInOrder' | 'clues' }> {
  return (POSSESSION_KINDS as readonly string[]).includes(round.kind);
}

export function usePromoQuiz(pack: PromoContentPack) {
  const rounds = pack.rounds;
  const totalUnits = rounds.reduce((sum, r) => sum + r.units, 0);
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<PromoStage>('question');
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);
  const [lastOrderIds, setLastOrderIds] = useState<string[] | null>(null);
  const [lastFoundCount, setLastFoundCount] = useState<number | null>(null);
  const [lastClueIndex, setLastClueIndex] = useState<number | null>(null);
  const [lastEmbedded, setLastEmbedded] = useState<PromoEmbeddedResult | null>(null);
  const [finished, setFinished] = useState(false);
  // Special panels submit through the socket stub; a nonce forces a fresh
  // panel instance per question so their internal state resets cleanly.
  const [nonce, setNonce] = useState(0);

  const current = rounds[index];
  const isLast = index >= rounds.length - 1;
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
    if (stage !== 'revealed' || !isPossessionRound(current)) return null;
    return {
      matchId: PROMO_MATCH_ID,
      qIndex: index,
      questionKind: current.kind,
      selectedIndex: selectedAnswer,
      isCorrect: lastCorrect,
      myTotalPoints: score,
      oppAnswered: true,
      pointsEarned: lastPoints,
      ...(current.kind === 'clues'
        ? { clueIndex: lastClueIndex ?? 0,
            cluesDisplayAnswer: { en: pack.cluesAnswer, ka: pack.cluesAnswer } }
        : {}),
      ...(current.kind === 'putInOrder'
        ? { foundCount: lastFoundCount ?? 0,
            submittedOrderIds: lastOrderIds ?? pack.pioCorrectIds }
        : {}),
    } as MatchAnswerAckPayload;
  }, [stage, current, index, selectedAnswer, lastCorrect, score, lastPoints, lastClueIndex, lastFoundCount, lastOrderIds, pack]);

  const myRound = useMemo<MatchRoundResultPlayer | null>(() => {
    if (stage !== 'revealed' || !isPossessionRound(current)) return null;
    return roundPlayer(lastCorrect, lastPoints, score, {
      selectedIndex: selectedAnswer,
      ...(current.kind === 'putInOrder'
        ? { foundCount: lastFoundCount ?? 0,
            submittedOrderIds: lastOrderIds ?? pack.pioCorrectIds }
        : {}),
      ...(current.kind === 'clues' ? { clueIndex: lastClueIndex ?? 0 } : {}),
    });
  }, [stage, current, lastCorrect, lastPoints, score, selectedAnswer, lastClueIndex, lastFoundCount, lastOrderIds, pack]);

  const roundResult = useMemo<MatchRoundResultPayload | null>(() => {
    if (stage !== 'revealed' || !myRound || !isPossessionRound(current)) return null;

    const reveal =
      current.kind === 'multipleChoice'
        ? { kind: 'multipleChoice' as const, correctIndex: current.question.correctIndex }
        : current.kind === 'putInOrder'
          ? {
              kind: 'putInOrder' as const,
              // Items are displayed scrambled; the authoritative order comes
              // from the correct-IDs list, not the display order.
              correctOrder: pack.pioCorrectIds.map((id, i) => {
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
              displayAnswer: { en: pack.cluesAnswer, ka: pack.cluesAnswer },
            };

    return {
      matchId: PROMO_MATCH_ID,
      qIndex: index,
      questionKind: current.kind,
      reveal,
      players: { [PROMO_SELF_ID]: myRound },
    } as MatchRoundResultPayload;
  }, [stage, current, index, myRound, pack]);

  const reveal = useCallback(
    (isCorrect: boolean, points: number) => {
      setLastCorrect(isCorrect);
      setLastPoints(points);
      if (points > 0) setScore((s) => s + points);
      if (isCorrect) setCorrectCount((c) => c + 1);
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
      if (stage !== 'question' || !isPossessionRound(current)) return;
      setLastOrderIds(opts?.submittedOrderIds ?? null);
      setLastFoundCount(opts?.foundCount ?? null);
      setLastClueIndex(opts?.clueIndex ?? null);
      reveal(isCorrect, opts?.points ?? (isCorrect ? current.points : 0));
    },
    [stage, current, reveal],
  );

  /** An embedded daily-game / pass-chain round finished. */
  const completeEmbedded = useCallback(
    (result: PromoEmbeddedResult) => {
      if (stage !== 'question') return;
      setScore((s) => s + result.points);
      setCorrectCount((c) => c + result.correctUnits);
      setLastEmbedded(result);
      setStage('revealed');
    },
    [stage],
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
    setLastEmbedded(null);
    setNonce((n) => n + 1);
  }, [isLast]);

  const restart = useCallback(() => {
    setIndex(0);
    setStage('question');
    setScore(0);
    setCorrectCount(0);
    setSelectedAnswer(null);
    setLastCorrect(false);
    setLastPoints(0);
    setLastOrderIds(null);
    setLastFoundCount(null);
    setLastClueIndex(null);
    setLastEmbedded(null);
    setFinished(false);
    setNonce((n) => n + 1);
  }, []);

  return {
    index,
    current,
    stage,
    score,
    correctCount,
    selectedAnswer,
    answerStates,
    answerAck,
    roundResult,
    myRound,
    lastEmbedded,
    isLast,
    finished,
    nonce,
    totalRounds: rounds.length,
    totalUnits,
    answerMultipleChoice,
    submitSpecial,
    completeEmbedded,
    next,
    restart,
  };
}
