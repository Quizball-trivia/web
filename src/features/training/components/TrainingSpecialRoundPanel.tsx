"use client";

// Local driver for ranked's special question panels (put-in-order / who-am-I)
// inside the scripted training match. Mirrors src/features/promo/: the panels
// submit via getSocket().emit, so a stub socket re-broadcasts each emit as a
// window event and this component resolves the round locally with the
// production fuzzy matcher / positional scoring.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { LiveSpecialQuestionPanel } from "@/features/possession/components/LiveSpecialQuestionPanel";
import { __setSocketOverride } from "@/lib/realtime/socket-client";
import { fuzzyMatchesAnswer } from "@/lib/answerMatching";
import type {
  ClientToServerEvents,
  MatchAnswerAckPayload,
  MatchCluesGuessAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
  ServerToClientEvents,
} from "@/lib/realtime/socket.types";
import { TRAINING_MATCH_ID, TRAINING_OPPONENT_ID, trainingSelfId } from "../lib/trainingRealtimeSim";
import type { TrainingSpecialRound } from "../data/trainingSpecialRounds";

const TRAINING_EMIT_EVENT = "training:socket-emit";
const CLUE_SECONDS = 10;
const FROZEN_TIME = 99;

interface TrainingEmitDetail {
  event: string;
  args: unknown[];
}

function createTrainingStubSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  const stub = {
    id: "training-stub",
    connected: true,
    active: true,
    auth: {},
    emit: (...args: unknown[]) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent<TrainingEmitDetail>(TRAINING_EMIT_EVENT, {
            detail: { event: String(args[0] ?? ""), args: args.slice(1) },
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

interface Resolution {
  correct: boolean;
  points: number;
  clueIndex?: number;
  foundCount?: number;
  submittedOrderIds?: string[];
}

interface TrainingSpecialRoundPanelProps {
  round: TrainingSpecialRound;
  qIndex: number;
  totalQuestions: number;
  isPaused: boolean;
  /** Bot outcome, known once the round resolves (from the possession script). */
  botResolved: boolean;
  botCorrect: boolean;
  botPoints: number;
  onResolve: (correct: boolean, points: number) => void;
}

export function TrainingSpecialRoundPanel({
  round,
  qIndex,
  totalQuestions,
  isPaused,
  botResolved,
  botCorrect,
  botPoints,
  onResolve,
}: TrainingSpecialRoundPanelProps) {
  const isClues = round.kind === "clues";
  const clueCount = isClues ? round.question.clues.length : 0;
  const cluesDuration = Math.max(1, clueCount) * CLUE_SECONDS;

  const [timeLeft, setTimeLeft] = useState(cluesDuration);
  const [guessAck, setGuessAck] = useState<MatchCluesGuessAckPayload | null>(null);
  const [penaltyReveals, setPenaltyReveals] = useState(0);
  const [resolution, setResolution] = useState<Resolution | null>(null);

  // The panels submit through the socket singleton — swap in the stub while a
  // special round is on screen (training never holds a live socket).
  useEffect(() => {
    __setSocketOverride(createTrainingStubSocket());
    return () => __setSocketOverride(null);
  }, []);

  // Clue pacing — one clue per CLUE_SECONDS, held at the last clue. Pauses
  // under tooltips.
  useEffect(() => {
    if (!isClues || resolution) return;
    const interval = setInterval(() => {
      if (isPaused) return;
      setTimeLeft((t) => (t <= CLUE_SECONDS ? t : t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isClues, resolution, isPaused]);

  const timedReveals = isClues
    ? Math.min(clueCount, Math.max(1, Math.floor((cluesDuration - timeLeft) / CLUE_SECONDS) + 1))
    : 0;
  const revealCount = Math.min(clueCount, Math.max(timedReveals, 1 + penaltyReveals));

  // Latest-value refs so the emit listener subscribes exactly once.
  const revealCountRef = useRef(revealCount);
  const roundRef = useRef(round);
  const resolutionRef = useRef(resolution);
  const onResolveRef = useRef(onResolve);
  useEffect(() => {
    revealCountRef.current = revealCount;
    roundRef.current = round;
    resolutionRef.current = resolution;
    onResolveRef.current = onResolve;
  });

  useEffect(() => {
    function resolve(res: Resolution) {
      if (resolutionRef.current) return;
      setResolution(res);
      onResolveRef.current(res.correct, res.points);
    }

    function onEmit(event: Event) {
      const detail = (event as CustomEvent<TrainingEmitDetail>).detail;
      if (!detail || resolutionRef.current) return;
      const currentRound = roundRef.current;

      if (detail.event === "match:clues_answer" && currentRound.kind === "clues") {
        const payload = detail.args[0] as { guess?: string; giveUp?: boolean } | undefined;
        if (payload?.giveUp) {
          return;
        }
        const guess = payload?.guess ?? "";
        if (guess.trim().length > 0 && fuzzyMatchesAnswer(guess, currentRound.accepted)) {
          const clueIdx = Math.max(0, revealCountRef.current - 1);
          resolve({ correct: true, points: Math.max(20, 100 - 20 * clueIdx), clueIndex: clueIdx });
        } else {
          // Wrong guess: ack like the server — clears the input and reveals
          // the next clue; the round keeps waiting.
          setPenaltyReveals((p) => p + 1);
          setGuessAck({
            matchId: TRAINING_MATCH_ID,
            qIndex,
            clueIndex: revealCountRef.current - 1,
            revealCount: Math.min(clueCount, revealCountRef.current + 1),
          });
        }
        return;
      }

      if (detail.event === "match:put_in_order_answer" && currentRound.kind === "putInOrder") {
        const payload = detail.args[0] as { orderedItemIds?: string[] } | undefined;
        const submitted = payload?.orderedItemIds ?? [];
        const correctIds = currentRound.correctIds;
        const total = correctIds.length;
        const matched = submitted.filter((id, i) => id === correctIds[i]).length;
        if (matched !== total) return;
        resolve({
          correct: matched === total,
          points: Math.round((matched / total) * 100),
          foundCount: matched,
          submittedOrderIds: submitted,
        });
      }
    }

    window.addEventListener(TRAINING_EMIT_EVENT, onEmit);
    return () => window.removeEventListener(TRAINING_EMIT_EVENT, onEmit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Panel-facing payloads (display only) ──
  const selfId = trainingSelfId();
  const questionKind = round.kind;

  const answerAck = useMemo<MatchAnswerAckPayload | null>(() => {
    if (!resolution) return null;
    return {
      matchId: TRAINING_MATCH_ID,
      qIndex,
      questionKind,
      selectedIndex: null,
      isCorrect: resolution.correct,
      myTotalPoints: 0,
      oppAnswered: true,
      pointsEarned: resolution.points,
      phaseKind: "normal",
      clueIndex: resolution.clueIndex ?? null,
      foundCount: resolution.foundCount,
      submittedOrderIds: resolution.submittedOrderIds,
      cluesDisplayAnswer: round.kind === "clues" ? { en: round.displayAnswer } : undefined,
    };
  }, [resolution, qIndex, questionKind, round]);

  const myRound = useMemo<MatchRoundResultPlayer | null>(() => {
    if (!resolution) return null;
    return {
      selectedIndex: null,
      isCorrect: resolution.correct,
      timeMs: 0,
      pointsEarned: resolution.points,
      totalPoints: 0,
      submittedOrderIds: resolution.submittedOrderIds ?? [],
      foundCount: resolution.foundCount,
      clueIndex: resolution.clueIndex ?? null,
    };
  }, [resolution]);

  const opponentRound = useMemo<MatchRoundResultPlayer | null>(() => {
    if (!resolution || !botResolved) return null;
    return {
      selectedIndex: null,
      isCorrect: botCorrect,
      timeMs: 0,
      pointsEarned: botPoints,
      totalPoints: 0,
      submittedOrderIds: [],
    };
  }, [resolution, botResolved, botCorrect, botPoints]);

  const roundResult = useMemo<MatchRoundResultPayload | null>(() => {
    if (!resolution || !myRound) return null;
    const reveal = round.kind === "putInOrder"
      ? {
          kind: "putInOrder" as const,
          correctOrder: round.correctIds.map((id, i) => {
            const item = round.question.items.find((entry) => entry.id === id);
            return {
              id,
              label: { en: item?.label ?? id },
              details: item?.details ? { en: item.details } : null,
              emoji: item?.emoji ?? null,
              sortValue: i,
            };
          }),
        }
      : { kind: "clues" as const, displayAnswer: { en: round.displayAnswer } };
    return {
      matchId: TRAINING_MATCH_ID,
      qIndex,
      questionKind,
      reveal,
      players: {
        [selfId]: myRound,
        [TRAINING_OPPONENT_ID]: opponentRound ?? {
          selectedIndex: null,
          isCorrect: false,
          timeMs: 0,
          pointsEarned: 0,
          totalPoints: 0,
          submittedOrderIds: [],
        },
      },
    };
  }, [resolution, myRound, opponentRound, round, qIndex, questionKind, selfId]);

  const cluesHeld = isClues && revealCount >= clueCount;

  return (
    <LiveSpecialQuestionPanel
      matchId={TRAINING_MATCH_ID}
      qIndex={qIndex}
      totalQuestions={totalQuestions}
      question={round.question}
      showOptions
      timeRemaining={isClues ? timeLeft : FROZEN_TIME}
      questionDurationSeconds={isClues ? cluesDuration : FROZEN_TIME}
      hideTimer={!isClues || cluesHeld}
      roundResolved={resolution !== null}
      answerAck={answerAck}
      roundResult={roundResult}
      myRound={myRound}
      opponentRound={opponentRound}
      countdownGuessAck={null}
      cluesGuessAck={guessAck}
      guidedPutInOrderIds={round.kind === "putInOrder" ? round.correctIds : undefined}
      guidedCluesAnswers={round.kind === "clues" ? round.accepted : undefined}
    />
  );
}
