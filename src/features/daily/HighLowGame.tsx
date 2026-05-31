"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { HighLowSession } from "@/lib/domain/dailyChallenge";
import { shuffleArray } from "@/lib/utils";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { QuitGameDialog } from "./QuitGameDialog";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import { ResultSplash } from "./components/ResultSplash";
import { useResultSplash } from "./components/useResultSplash";
import { DailyChallengeCompleteModal } from "./components/DailyChallengeCompleteModal";

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

interface HighLowGameProps {
  session: HighLowSession;
  onBack: () => void;
  onComplete: (score: number) => void;
}

export function HighLowGame({
  session,
  onBack,
  onComplete,
}: HighLowGameProps) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [currentMatchupIndex, setCurrentMatchupIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(session.secondsPerRound);
  const [roundScore, setRoundScore] = useState(0);
  const [roundResolved, setRoundResolved] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [finished, setFinished] = useState(false);
  const { splashProps, fire } = useResultSplash();
  const copy = getDailyChallengeCopy();

  const currentRound = session.rounds[currentRoundIndex];
  const currentMatchup = currentRound?.matchups[currentMatchupIndex];

  // Randomize which option renders on the left so the higher value isn't always
  // positionally predictable. Stable per matchup (keyed on its id) so it doesn't
  // reshuffle on timer ticks. Correctness compares values, so display side is cosmetic.
  const displaySides = useMemo(() => {
    if (!currentMatchup) {
      return null;
    }
    const swap = shuffleArray([false, true])[0];
    const original = {
      left: { name: currentMatchup.leftName, value: currentMatchup.leftValue },
      right: { name: currentMatchup.rightName, value: currentMatchup.rightValue },
    };
    return swap
      ? { left: original.right, right: original.left }
      : original;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMatchup?.id]);

  const advanceRound = useCallback(() => {
    if (currentRoundIndex >= session.rounds.length - 1) {
      setFinished(true);
      return;
    }

    setCurrentRoundIndex((previous) => previous + 1);
    setCurrentMatchupIndex(0);
    setTimeLeft(session.secondsPerRound);
    setRoundResolved(false);
  }, [currentRoundIndex, session.rounds.length, session.secondsPerRound]);

  const resolveRound = useCallback(
    (passed: boolean) => {
      if (roundResolved) {
        return;
      }

      if (passed) {
        setRoundScore((previous) => previous + 1);
      }

      setRoundResolved(true);
    },
    [roundResolved]
  );

  const handlePick = (displaySide: "left" | "right") => {
    if (!currentMatchup || !displaySides || roundResolved) {
      return;
    }

    const pickedValue =
      displaySide === "left" ? displaySides.left.value : displaySides.right.value;
    const otherValue =
      displaySide === "left" ? displaySides.right.value : displaySides.left.value;
    const isCorrect = pickedValue >= otherValue;
    // Which on-screen column holds the higher value (for the splash origin).
    const higherDisplaySide =
      displaySides.left.value >= displaySides.right.value ? "left" : "right";

    if (!isCorrect) {
      // Wrong: splash flies in from the side that was actually higher.
      fire("wrong", higherDisplaySide);
      resolveRound(false);
      return;
    }

    if (currentMatchupIndex >= currentRound.matchups.length - 1) {
      // Whole chain cleared: correct splash from the winning side.
      fire("correct", higherDisplaySide);
      resolveRound(true);
      return;
    }

    setCurrentMatchupIndex((previous) => previous + 1);
  };

  useEffect(() => {
    if (roundResolved || !currentRound) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => {
            fire("wrong", "right");
            resolveRound(false);
          }, 0);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentRound, resolveRound, roundResolved, fire]);

  useEffect(() => {
    if (!roundResolved) {
      return;
    }

    const timeout = window.setTimeout(() => {
      advanceRound();
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [advanceRound, roundResolved]);

  if (!currentRound || !currentMatchup || !displaySides) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat text-white">
      <DailyChallengeHeader
        onQuit={() => setShowQuitDialog(true)}
        currentIndex={currentRoundIndex}
        total={session.roundCount}
        timeLeft={timeLeft}
        centerLabel={`${copy.round} ${currentRoundIndex + 1}/${session.roundCount}`}
      />

      {/* Content */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-4">
        {/* Question card */}
        <div
          className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-5 text-white backdrop-blur-sm sm:px-6 sm:py-6"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(15px, 1.9vw, 26px)',
          }}
        >
          <p className="text-white/50 uppercase tracking-wider mb-1" style={{ fontSize: 'clamp(10px, 1.2vw, 14px)', fontWeight: 600 }}>
            {currentRound.statLabel}
          </p>
          <p className="leading-snug">{currentRound.prompt}</p>
        </div>

        {/* Matchup counter */}
        <div className="mt-3 text-center text-sm text-white/50" style={poppins}>
          {copy.matchup} {currentMatchupIndex + 1}/{currentRound.matchups.length}
        </div>

        {/* VS buttons — two big yellow-bordered cards */}
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
          <button
            type="button"
            disabled={roundResolved}
            onClick={() => handlePick("left")}
            className="flex flex-col items-center justify-center rounded-[16px] px-4 py-6 transition-shadow duration-150 sm:py-8"
            style={{
              border: '2px solid #FFE500',
              boxShadow: '0 0 6.334px 1.32px rgba(255,229,0,0.25)',
              cursor: roundResolved ? 'default' : 'pointer',
              opacity: roundResolved ? 0.6 : 1,
            }}
          >
            <span className="text-white/45 uppercase tracking-wider mb-2" style={{ ...poppins, fontSize: 'clamp(9px, 1vw, 12px)' }}>
              {copy.pick}
            </span>
            <span style={{ ...poppins, fontSize: 'clamp(18px, 2.5vw, 32px)', fontWeight: 700 }}>
              {displaySides.left.name}
            </span>
          </button>

          <span className="text-white/35" style={{ ...poppins, fontSize: 'clamp(14px, 1.6vw, 20px)' }}>VS</span>

          <button
            type="button"
            disabled={roundResolved}
            onClick={() => handlePick("right")}
            className="flex flex-col items-center justify-center rounded-[16px] px-4 py-6 transition-shadow duration-150 sm:py-8"
            style={{
              border: '2px solid #FFE500',
              boxShadow: '0 0 6.334px 1.32px rgba(255,229,0,0.25)',
              cursor: roundResolved ? 'default' : 'pointer',
              opacity: roundResolved ? 0.6 : 1,
            }}
          >
            <span className="text-white/45 uppercase tracking-wider mb-2" style={{ ...poppins, fontSize: 'clamp(9px, 1vw, 12px)' }}>
              {copy.pick}
            </span>
            <span style={{ ...poppins, fontSize: 'clamp(18px, 2.5vw, 32px)', fontWeight: 700 }}>
              {displaySides.right.name}
            </span>
          </button>
        </div>

        {/* Instruction (result is shown via the fly-in splash). */}
        {!roundResolved && (
          <p className="mt-3 text-center text-sm text-white/50" style={poppins}>
            {copy.higherValueInstruction}
          </p>
        )}

        {/* Score */}
        <div className="mt-4 flex items-center justify-between text-sm" style={poppins}>
          <span className="text-white/55">{copy.score}</span>
          <span className="text-white">{roundScore}</span>
        </div>
      </div>

      <QuitGameDialog
        open={showQuitDialog}
        onOpenChange={setShowQuitDialog}
        onQuit={onBack}
      />

      <ResultSplash {...splashProps} />

      <DailyChallengeCompleteModal
        open={finished}
        title={session.title}
        correct={roundScore}
        total={session.roundCount}
        onDone={() => onComplete(roundScore)}
      />
    </div>
  );
}
