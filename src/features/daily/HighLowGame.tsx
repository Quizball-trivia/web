"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Clock } from "lucide-react";

import type { HighLowSession } from "@/lib/domain/dailyChallenge";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { QuitGameDialog } from "./QuitGameDialog";

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
    <div className="fixed inset-0 z-40 flex flex-col bg-[#101820] font-poppins text-white">
      <div className="border-b border-white/10 bg-black/15">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
          <button
            onClick={() => setShowQuitDialog(true)}
            className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/45">
              {session.title}
            </p>
            <p className="text-sm font-semibold text-white/80">
              {copy.round} {currentRoundIndex + 1} / {session.roundCount}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="size-4 text-[#F8D34A]" />
              <span>{timeLeft}s</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-6">
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#F8D34A] transition-all"
            style={{ width: `${((currentRoundIndex + 1) / session.roundCount) * 100}%` }}
          />
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#17222A]/90 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/55">
              {currentRound.category}
            </span>
            <span className="text-sm font-semibold capitalize text-white/55">
              {currentRound.difficulty}
            </span>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
            {currentRound.statLabel}
          </p>
          <h1 className="mt-2 mb-6 text-2xl font-semibold leading-tight md:text-3xl">
            {currentRound.prompt}
          </h1>

          <div className="mb-4 text-sm text-white/55">
            {copy.matchup} {currentMatchupIndex + 1} / {currentRound.matchups.length}
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <button
              type="button"
              disabled={roundResolved}
              onClick={() => handlePick("left")}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-8 text-left transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block text-sm uppercase tracking-[0.2em] text-white/45">
                {copy.pick}
              </span>
              <span className="mt-3 block text-3xl font-semibold">
                {currentMatchup.leftName}
              </span>
            </button>

            <div className="text-center text-lg font-semibold text-white/35">VS</div>

            <button
              type="button"
              disabled={roundResolved}
              onClick={() => handlePick("right")}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-8 text-left transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="block text-sm uppercase tracking-[0.2em] text-white/45">
                {copy.pick}
              </span>
              <span className="mt-3 block text-3xl font-semibold">
                {currentMatchup.rightName}
              </span>
            </button>
          </div>

          {roundResolved ? (
            <p className={`mt-5 text-sm font-semibold ${roundPassed ? "text-[#58CC02]" : "text-[#FF6B6B]"}`}>
              {roundPassed ? copy.chainComplete : copy.roundFailed}
            </p>
          ) : (
            <p className="mt-5 text-sm text-white/55">
              {copy.higherValueInstruction}
            </p>
          )}
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
