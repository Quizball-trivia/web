"use client";

import { useCallback, useEffect, useState } from "react";

import type { HighLowSession } from "@/lib/domain/dailyChallenge";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { QuitGameDialog } from "./QuitGameDialog";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";

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
  const [roundPassed, setRoundPassed] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const copy = getDailyChallengeCopy();

  const currentRound = session.rounds[currentRoundIndex];
  const currentMatchup = currentRound?.matchups[currentMatchupIndex];

  const advanceRound = useCallback(() => {
    if (currentRoundIndex >= session.rounds.length - 1) {
      onComplete(roundScore);
      return;
    }

    setCurrentRoundIndex((previous) => previous + 1);
    setCurrentMatchupIndex(0);
    setTimeLeft(session.secondsPerRound);
    setRoundResolved(false);
    setRoundPassed(false);
  }, [currentRoundIndex, onComplete, roundScore, session.rounds.length, session.secondsPerRound]);

  const resolveRound = useCallback(
    (passed: boolean) => {
      if (roundResolved) {
        return;
      }

      if (passed) {
        setRoundScore((previous) => previous + 1);
      }

      setRoundPassed(passed);
      setRoundResolved(true);
    },
    [roundResolved]
  );

  const handlePick = (side: "left" | "right") => {
    if (!currentMatchup || roundResolved) {
      return;
    }

    const higherSide =
      currentMatchup.leftValue > currentMatchup.rightValue ? "left" : "right";
    const isCorrect = side === higherSide;

    if (!isCorrect) {
      resolveRound(false);
      return;
    }

    if (currentMatchupIndex >= currentRound.matchups.length - 1) {
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
          window.setTimeout(() => resolveRound(false), 0);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentRound, resolveRound, roundResolved]);

  useEffect(() => {
    if (!roundResolved) {
      return;
    }

    const timeout = window.setTimeout(() => {
      advanceRound();
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [advanceRound, roundResolved]);

  if (!currentRound || !currentMatchup) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-deep text-white">
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
          className="rounded-[24px] bg-surface-page px-5 py-5 text-white sm:px-6 sm:py-6"
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
              {currentMatchup.leftName}
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
              {currentMatchup.rightName}
            </span>
          </button>
        </div>

        {/* Result / instruction */}
        {roundResolved ? (
          <div
            className="mt-3 flex items-center justify-center gap-2 rounded-[16px] px-4 py-3"
            style={{
              ...poppins,
              fontSize: 'clamp(13px, 1.7vw, 20px)',
              backgroundColor: roundPassed ? 'rgba(56,182,14,0.15)' : 'rgba(251,49,1,0.15)',
              border: roundPassed ? '2px solid rgba(56,182,14,0.5)' : '2px solid rgba(251,49,1,0.5)',
              color: roundPassed ? '#58CC02' : '#FB3101',
            }}
          >
            {roundPassed ? copy.chainComplete : copy.roundFailed}
          </div>
        ) : (
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
    </div>
  );
}
