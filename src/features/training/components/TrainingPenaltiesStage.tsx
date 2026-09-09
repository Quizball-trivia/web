"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PossessionMatchViewport,
  type PossessionViewportModel,
} from "@/features/possession/components/PossessionMatchViewport";
import { PenaltyStartCountdownOverlay } from "@/features/possession/components/PenaltyStartCountdownOverlay";
import { PenaltyMatchEndOverlay } from "@/features/possession/components/PenaltyMatchEndOverlay";
import { PossessionQuestionPanel } from "@/components/game/PossessionQuestionPanel";
import { BarBattleFlightOverlay } from "@/features/possession/components/BarBattleFlightOverlay";
import { useBarBattle, getBarBattleGoalAttackDelayMs } from "@/features/possession/hooks/useBarBattle";
import { usePossessionBarBattleFlights } from "@/features/possession/hooks/usePossessionBarBattleFlights";
import {
  PENALTY_RESULT_DISPLAY_DELAY_MS,
  PENALTY_SCORE_FLIGHT_HANDOFF_MS,
} from "@/features/possession/realtimePossession.helpers";
import { TIMER_SECONDS } from "@/features/possession/types/possession.types";
import type { AnswerStateArray } from "@/features/possession/types/possession.types";
import type {
  MatchAnswerAckPayload,
  MatchRoundResultPayload,
  MatchRoundResultPlayer,
} from "@/lib/realtime/socket.types";
import type { GameQuestion } from "@/lib/domain";
import { usePlayerAvatar } from "@/hooks/usePlayerAvatar";
import { useLocale } from "@/contexts/LocaleContext";
import { useTraining } from "../TrainingMatchProvider";
import { localizeTrainingQuestion } from "../data/trainingQuestions";
import {
  TRAINING_PENALTY_SCRIPT,
  getTrainingRequiredAnswerIndex,
} from "../data/trainingScript";
import { BOT_AVATAR, BOT_NAME, BOT_RANK_POINTS } from "../constants";
import {
  TRAINING_MATCH_ID,
  TRAINING_OPPONENT_ID,
  patchTrainingMatch,
  startTrainingRound,
  trainingSelfId,
} from "../lib/trainingRealtimeSim";

const COUNTDOWN_TICK_MS = 900;
const SPLASH_HOLD_MS = 2400;
const END_OVERLAY_HOLD_MS = 4000;
const END_NO_OVERLAY_HOLD_MS = 1200;
// Keep penalty kick qIndexes clear of the 12 regulation questions so the
// flight/battle dedupe keys (matchId:qIndex) never collide.
const PENALTY_QINDEX_BASE = 100;

type StagePhase =
  | "countdown"
  | "question"
  | "reveal"
  | "ended";

interface RevealData {
  result: "goal" | "saved";
  myPts: number;
  oppPts: number;
  nextPlayerGoals: number;
  nextOpponentGoals: number;
  nextPlayerAttempts: Array<"goal" | "miss">;
  nextOpponentAttempts: Array<"goal" | "miss">;
}

const DEFAULT_ANSWER_STATES: AnswerStateArray = ["default", "default", "default", "default"];

function getPenaltyAnswerStates(index: number, questions: readonly GameQuestion[]): AnswerStateArray {
  const question = questions[index % questions.length];
  const script = TRAINING_PENALTY_SCRIPT[index] ?? TRAINING_PENALTY_SCRIPT[0];
  const requiredIndex = getTrainingRequiredAnswerIndex(script, question) ?? question.correctIndex;
  return DEFAULT_ANSWER_STATES.map((_, optionIndex) => (
    optionIndex === requiredIndex ? "default" : "disabled"
  )) as AnswerStateArray;
}

export function TrainingPenaltiesStage() {
  const { match, tooltips, onSkip, penaltyQuestions } = useTraining();
  const { locale, t } = useLocale();
  const { avatarUrl: playerAvatar, avatarCustomization, username: playerName } = usePlayerAvatar();

  // The practice shootout only truly decides the match when regulation ended
  // level — otherwise it's a practice segment and the results screen keeps the
  // regulation winner (no "match decided by penalties" overlay).
  const regulationTied = match.state.playerGoals === match.state.opponentGoals;

  const [phase, setPhase] = useState<StagePhase>("countdown");
  const [countdownDisplay, setCountdownDisplay] = useState(3);
  const [kickIndex, setKickIndex] = useState(0);
  const [playerGoals, setPlayerGoals] = useState(0);
  const [opponentGoals, setOpponentGoals] = useState(0);
  const [playerAttempts, setPlayerAttempts] = useState<Array<"goal" | "miss">>([]);
  const [opponentAttempts, setOpponentAttempts] = useState<Array<"goal" | "miss">>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerStates, setAnswerStates] = useState<AnswerStateArray>(() => getPenaltyAnswerStates(0, penaltyQuestions));
  const timeRemaining = TIMER_SECONDS;
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  const [kickResult, setKickResult] = useState<"goal" | "saved" | null>(null);
  const [splashVisible, setSplashVisible] = useState(false);
  const [playerWon, setPlayerWon] = useState(false);
  const [showEndOverlay, setShowEndOverlay] = useState(false);

  const tooltipFired = useRef(false);

  const kickScript = TRAINING_PENALTY_SCRIPT[kickIndex] ?? TRAINING_PENALTY_SCRIPT[0];
  const shooterIsPlayer = kickScript.shooterIsPlayer;
  const question = penaltyQuestions[kickIndex % penaltyQuestions.length];
  const localizedQuestion = useMemo(
    () => localizeTrainingQuestion(question, locale),
    [question, locale],
  );
  const requiredAnswerIndex = getTrainingRequiredAnswerIndex(kickScript, question) ?? question.correctIndex;
  const penaltyQIndex = PENALTY_QINDEX_BASE + kickIndex;

  // ── Realtime-store sim: publish each kick so flights/battle run like ranked ──
  useEffect(() => {
    if (phase !== "question" || !question) return;
    startTrainingRound(question, penaltyQIndex, TRAINING_PENALTY_SCRIPT.length, "penalty");
  }, [phase, question, penaltyQIndex]);

  // Clear round payloads on unmount so a later remount can't replay stale flights.
  useEffect(() => () => {
    patchTrainingMatch({
      currentQuestion: null,
      answerAck: null,
      lastRoundResult: null,
      opponentAnswered: false,
      opponentAnsweredCorrectly: null,
      opponentRecentPoints: 0,
    });
  }, []);

  const answerAck = useMemo<MatchAnswerAckPayload | null>(() => {
    if (phase !== "reveal" && phase !== "ended") return null;
    if (!revealData) return null;
    const selected = selectedAnswer !== null && selectedAnswer >= 0 ? selectedAnswer : null;
    return {
      matchId: TRAINING_MATCH_ID,
      qIndex: penaltyQIndex,
      questionKind: "multipleChoice",
      selectedIndex: selected,
      isCorrect: selected === question.correctIndex,
      correctIndex: question.correctIndex,
      myTotalPoints: 0,
      oppAnswered: true,
      pointsEarned: revealData.myPts,
      phaseKind: "penalty",
    };
  }, [phase, revealData, selectedAnswer, question, penaltyQIndex]);

  const myRound = useMemo<MatchRoundResultPlayer | null>(() => {
    if (!revealData) return null;
    const selected = selectedAnswer !== null && selectedAnswer >= 0 ? selectedAnswer : null;
    return {
      selectedIndex: selected,
      isCorrect: selected === question.correctIndex,
      timeMs: 0,
      pointsEarned: revealData.myPts,
      totalPoints: 0,
      submittedOrderIds: [],
    };
  }, [revealData, selectedAnswer, question]);

  const opponentRound = useMemo<MatchRoundResultPlayer | null>(() => {
    if (!revealData) return null;
    return {
      selectedIndex: null,
      isCorrect: revealData.oppPts > 0,
      timeMs: 0,
      pointsEarned: revealData.oppPts,
      totalPoints: 0,
      submittedOrderIds: [],
    };
  }, [revealData]);

  const roundResult = useMemo<MatchRoundResultPayload | null>(() => {
    if (!revealData || !myRound || !opponentRound) return null;
    return {
      matchId: TRAINING_MATCH_ID,
      qIndex: penaltyQIndex,
      questionKind: "multipleChoice",
      reveal: { kind: "multipleChoice", correctIndex: question.correctIndex },
      players: { [trainingSelfId()]: myRound, [TRAINING_OPPONENT_ID]: opponentRound },
      phaseKind: "penalty",
      shooterSeat: shooterIsPlayer ? 1 : 2,
      deltas: {
        possessionDelta: 0,
        penaltyOutcome: revealData.result,
        goalScoredBySeat: null,
      },
    };
  }, [revealData, myRound, opponentRound, question, penaltyQIndex, shooterIsPlayer]);

  useEffect(() => {
    if (!revealData) return;
    patchTrainingMatch({
      answerAck,
      lastRoundResult: roundResult,
      opponentAnswered: true,
      opponentAnsweredCorrectly: revealData.oppPts > 0,
      opponentRecentPoints: revealData.oppPts,
    });
  }, [revealData, answerAck, roundResult]);

  const barBattleFlights = usePossessionBarBattleFlights();

  const barBattle = useBarBattle({
    answerAck,
    opponentAnswered: revealData !== null,
    opponentRecentPoints: revealData?.oppPts ?? null,
    opponentAnsweredCorrectly: revealData ? revealData.oppPts > 0 : null,
    roundResult,
    myRound,
    opponentRound,
    phaseKind: "penalty",
    dividerX: 250,
    mySeat: 1,
  });

  // Intro tooltip — explains why penalties happen in ranked.
  useEffect(() => {
    if (!tooltipFired.current) {
      tooltipFired.current = true;
      tooltips.tryShowStageTooltip("penalties");
    }
  }, [tooltips]);

  // Kick-off countdown (pauses while a tooltip is up)
  useEffect(() => {
    if (phase !== "countdown" || tooltips.isPaused) return;
    const interval = setInterval(() => {
      setCountdownDisplay((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setPhase("question");
          return prev;
        }
        return prev - 1;
      });
    }, COUNTDOWN_TICK_MS);
    return () => clearInterval(interval);
  }, [phase, tooltips.isPaused]);

  // Role tooltip when a kick's question opens.
  useEffect(() => {
    if (phase !== "question") return;
    tooltips.tryShowEventTooltip(shooterIsPlayer ? "penalty-shooter" : "penalty-keeper");
  }, [phase, shooterIsPlayer, tooltips]);

  const resolveKick = useCallback(
    (selected: number) => {
      const correct = selected === question.correctIndex;
      const states: AnswerStateArray = ["disabled", "disabled", "disabled", "disabled"];
      states[question.correctIndex] = "correct";
      if (!correct && selected !== null && selected >= 0) states[selected] = "wrong";

      const { result, playerPoints: myPts, opponentPoints: oppPts } = kickScript;

      const kickOutcome: "goal" | "miss" = result === "goal" ? "goal" : "miss";
      const nextPlayerAttempts = shooterIsPlayer ? [...playerAttempts, kickOutcome] : playerAttempts;
      const nextOpponentAttempts = shooterIsPlayer ? opponentAttempts : [...opponentAttempts, kickOutcome];
      const nextPlayerGoals = playerGoals + (shooterIsPlayer && result === "goal" ? 1 : 0);
      const nextOpponentGoals = opponentGoals + (!shooterIsPlayer && result === "goal" ? 1 : 0);

      setSelectedAnswer(selected);
      setAnswerStates(states);
      setRevealData({
        result,
        myPts,
        oppPts,
        nextPlayerGoals,
        nextOpponentGoals,
        nextPlayerAttempts,
        nextOpponentAttempts,
      });
      setPhase("reveal");
    },
    [question, shooterIsPlayer, kickScript, playerAttempts, opponentAttempts, playerGoals, opponentGoals],
  );

  const handleAnswer = useCallback(
    (selected: number) => {
      if (phase !== "question" || selectedAnswer !== null) return;
      if (selected !== requiredAnswerIndex) return;
      resolveKick(selected);
    },
    [phase, selectedAnswer, requiredAnswerIndex, resolveKick],
  );

  const startKick = useCallback((index: number) => {
    setKickIndex(index);
    setSelectedAnswer(null);
    setAnswerStates(getPenaltyAnswerStates(index, penaltyQuestions));
    setRevealData(null);
    setKickResult(null);
    setSplashVisible(false);
    setPhase("question");
  }, [penaltyQuestions]);

  const endShootout = useCallback((won: boolean, withOverlay: boolean) => {
    setPlayerWon(won);
    setShowEndOverlay(withOverlay);
    setPhase("ended");
  }, []);

  // Ranked's penalty reveal chain: bar battle plays out → kick animation →
  // result splash (+ scoreboard pip) → advance.
  useEffect(() => {
    if (phase !== "reveal" || !revealData) return;

    const resultDelayMs = getBarBattleGoalAttackDelayMs(
      revealData.myPts,
      revealData.oppPts,
      PENALTY_SCORE_FLIGHT_HANDOFF_MS,
      { includeScoreFlightHandoff: true, holdPenaltySaveShield: revealData.result === "saved" },
    );
    const splashAtMs = resultDelayMs + PENALTY_RESULT_DISPLAY_DELAY_MS;

    const t1 = setTimeout(() => setKickResult(revealData.result), resultDelayMs);
    const t2 = setTimeout(() => {
      setSplashVisible(true);
      setPlayerGoals(revealData.nextPlayerGoals);
      setOpponentGoals(revealData.nextOpponentGoals);
      setPlayerAttempts(revealData.nextPlayerAttempts);
      setOpponentAttempts(revealData.nextOpponentAttempts);
    }, splashAtMs);
    const t3 = setTimeout(() => {
      const nextIndex = kickIndex + 1;
      const { nextPlayerGoals: pg, nextOpponentGoals: og } = revealData;

      if (nextIndex < TRAINING_PENALTY_SCRIPT.length) {
        startKick(nextIndex);
        return;
      }
      // The regulation script guarantees 1–1, then these two fixed pairs end
      // 2–1. No dynamic early-exit or sudden-death branch can change the lesson.
      endShootout(pg > og, regulationTied);
    }, splashAtMs + SPLASH_HOLD_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [phase, revealData, kickIndex, regulationTied, startKick, endShootout]);

  // Hold the ending (overlay or a short beat), then hand the scoreboard back.
  const finishedRef = useRef(false);
  useEffect(() => {
    if (phase !== "ended" || finishedRef.current) return;
    const timer = setTimeout(() => {
      finishedRef.current = true;
      match.finishPenalties(playerGoals, opponentGoals);
    }, showEndOverlay ? END_OVERLAY_HOLD_MS : END_NO_OVERLAY_HOLD_MS);
    return () => clearTimeout(timer);
  }, [phase, showEndOverlay, match, playerGoals, opponentGoals]);

  const penaltyRound = Math.min(Math.floor(kickIndex / 2) + 1, 2);
  const showQuestion = phase === "question" || phase === "reveal";
  const suppressSplash = barBattleFlights.suppressScoreSplash;

  const viewportModel: PossessionViewportModel = useMemo(() => ({
    showMainUI: true,
    hud: {
      kind: "penalty",
      props: {
        penaltyPlayerScore: playerGoals,
        penaltyOpponentScore: opponentGoals,
        penaltyPlayerAttempts: playerAttempts,
        penaltyOpponentAttempts: opponentAttempts,
        penaltyRound,
        penaltyTotalRounds: TRAINING_PENALTY_SCRIPT.length / 2,
        isPenaltySuddenDeath: false,
        isPlayerShooter: shooterIsPlayer,
        playerName,
        opponentName: BOT_NAME,
        playerAvatarUrl: playerAvatar,
        opponentAvatarUrl: BOT_AVATAR,
        playerAvatarCustomization: avatarCustomization,
        opponentRankPoints: BOT_RANK_POINTS,
        timeRemaining: phase === "question" && selectedAnswer === null ? timeRemaining : 0,
        phase: phase === "question" ? "penalty-playing" : "penalty-reveal",
        onQuit: onSkip,
      },
    },
    pitchProps: {
      playerPosition: 50,
      playerAvatarUrl: playerAvatar,
      playerAvatarCustomization: avatarCustomization,
      opponentAvatarUrl: BOT_AVATAR,
      playerName,
      opponentName: BOT_NAME,
      // Ranked zooms 1.8× during penalties (simpleShotAnimation only cancels
      // the zoom for open-play shots, not penalty mode). The shootout follows
      // the second half, where the pitch is mirrored — so like ranked, kicks
      // go toward the LEFT goal.
      zoomToGoal: true,
      mirrored: true,
      targetGoal: "left",
      centerPossessionTrack: true,
      simpleShotAnimation: true,
      barBattle,
      barBattleVariant: "ranked_sim",
      penaltyMode: {
        isPlayerShooter: shooterIsPlayer,
        result: kickResult,
        phase: phase === "question" ? "playing" : phase === "countdown" ? "setup" : "result",
      },
    },
    goalCelebration: null,
    penaltySplash: {
      visible: splashVisible,
      result: kickResult ?? "goal",
      resultShooterIsMe: shooterIsPlayer,
      localQuestionIndex: kickIndex,
    },
    muted: false,
  }), [
    phase, playerGoals, opponentGoals, playerAttempts, opponentAttempts, penaltyRound,
    shooterIsPlayer, playerName, playerAvatar, avatarCustomization,
    selectedAnswer, timeRemaining, kickResult, splashVisible, kickIndex, onSkip, barBattle,
  ]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
      <div className="w-full max-w-lg flex flex-col lg:max-w-7xl lg:flex-row lg:h-[calc(100dvh-2rem)] lg:items-stretch lg:gap-4 lg:px-4">
        <PossessionMatchViewport
          model={viewportModel}
          onPenaltySplashComplete={() => setSplashVisible(false)}
        >
          {showQuestion && (
            <div className="relative">
              {phase === "question" && !tooltips.isPaused && (
                <div className="mx-3 mb-1.5 rounded-xl border border-brand-yellow/50 bg-brand-blue/90 px-3 py-2 text-center font-poppins text-xs font-bold text-white shadow-lg sm:mx-4 sm:text-sm">
                  {t(
                    kickScript.requiredAnswer === "wrong"
                      ? "training.tapGuidedWrongAnswer"
                      : "training.tapGuidedAnswer",
                    { answer: localizedQuestion.options[requiredAnswerIndex] },
                  )}
                </div>
              )}
              <PossessionQuestionPanel
                phase={phase === "question" ? "penalty-playing" : "penalty-reveal"}
                isPenaltyPhase
                isShotPhase={false}
                isLastAttackPhase={false}
                question={localizedQuestion}
                qIndex={kickIndex}
                totalQuestions={TRAINING_PENALTY_SCRIPT.length}
                penaltyDisplayRound={penaltyRound}
                penaltyDisplayTotal={2}
                isPenaltySuddenDeath={false}
                timeRemaining={null}
                showOptions
                selectedAnswer={selectedAnswer}
                answerStates={answerStates}
                opponentAnswer={null}
                guidedAnswerIndex={requiredAnswerIndex}
                onAnswer={handleAnswer}
                showPlayerSplash={!suppressSplash && phase === "reveal" && (revealData?.myPts ?? 0) > 0 && !splashVisible}
                playerSplashPoints={suppressSplash ? null : revealData?.myPts ?? null}
              />
            </div>
          )}
        </PossessionMatchViewport>
      </div>

      {phase === "countdown" && <PenaltyStartCountdownOverlay display={countdownDisplay} />}

      <PenaltyMatchEndOverlay
        visible={phase === "ended" && showEndOverlay}
        playerWon={playerWon}
        myPenaltyGoals={playerGoals}
        oppPenaltyGoals={opponentGoals}
        playerName={playerName}
        opponentName={BOT_NAME}
        playerAvatarUrl={playerAvatar}
        opponentAvatarUrl={BOT_AVATAR}
        playerAvatarCustomization={avatarCustomization}
        opponentRankPoints={BOT_RANK_POINTS}
      />

      <BarBattleFlightOverlay
        flights={barBattleFlights.flights}
        onArrive={barBattleFlights.handleFlightArrive}
      />
    </div>
  );
}
