"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

import { QuitGameDialog } from "./QuitGameDialog";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import { DailyChallengeCompleteModal } from "./components/DailyChallengeCompleteModal";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { Check, Lightbulb, ArrowRight, Send } from "lucide-react";
import type { CountdownSession } from "@/lib/domain/dailyChallenge";
import { useLocale } from "@/contexts/LocaleContext";
import { playSfx } from "@/lib/sounds/gameSounds";
import {
  countdownMatch,
  normalizeAnswer,
} from "@/lib/answerMatching";

interface AnswerGroup {
  display: string;
  acceptedAnswers: string[];
}

interface CountdownQuestion {
  id: string;
  category: string;
  prompt: string;
  answerGroups: AnswerGroup[];
}

interface CountdownGameProps {
  session: CountdownSession;
  onBack: () => void;
  onComplete: (score: number) => void;
}

export function CountdownGame({ session, onBack, onComplete }: CountdownGameProps) {
  const { t } = useLocale();
  const TIME_PER_ROUND = session.secondsPerRound;
  // Daily Countdown is exactly 2 rounds — cap here so it stays consistent even
  // if the backend config ever returns more.
  const [questions] = useState<CountdownQuestion[]>(() =>
    session.rounds.slice(0, 2).map((round) => ({
      ...round,
      answerGroups: round.answerGroups.map((group) => ({
        display: group.display,
        acceptedAnswers: group.acceptedAnswers,
      })),
    }))
  );
  const [currentRound, setCurrentRound] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(TIME_PER_ROUND);
  const [inputValue, setInputValue] = useState("");
  const [foundAnswers, setFoundAnswers] = useState<string[]>([]);
  const [recentAnswer, setRecentAnswer] = useState<string | null>(null);
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [finished, setFinished] = useState(false);
  const [allRoundAnswers, setAllRoundAnswers] = useState<string[][]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentRound];
  const isGameActive =
    !finished && questions.length > 0 && currentRound < questions.length && timeRemaining > 0;
  const totalRounds = questions.length;
  // Final tally for the result screen: answers the player found across all
  // rounds vs the total findable across every round.
  const totalFound = allRoundAnswers.reduce((sum, arr) => sum + arr.length, 0);
  const totalAnswerSlots = useMemo(
    () => questions.reduce((sum, q) => sum + (q.answerGroups?.length ?? 0), 0),
    [questions],
  );
  const handleRoundEnd = useCallback(() => {
    if (questions.length === 0) return;

    if (currentRound < questions.length - 1) {
      // No "round finished" overlay — go straight to the next question.
      setAllRoundAnswers((prev) => [...prev, foundAnswers]);
      setCurrentRound((prev) => prev + 1);
      setTimeRemaining(TIME_PER_ROUND);
      setFoundAnswers([]);
      setInputValue("");
      setRecentAnswer(null);
    } else {
      // Last round done — record the final tally and show the result screen
      // (like the other daily challenges) instead of leaving immediately.
      setAllRoundAnswers((prev) => [...prev, foundAnswers]);
      setFinished(true);
    }
  }, [TIME_PER_ROUND, currentRound, foundAnswers, questions]);

  // Tick down once per second while the round is live.
  useEffect(() => {
    if (!isGameActive) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isGameActive]);

  // When the timer hits 0 (whether or not the player found anything), auto-advance
  // to the next round / finish — no need to press "Next Round". Guard so it fires
  // exactly once per round.
  const roundEndedRef = useRef(false);
  useEffect(() => {
    roundEndedRef.current = false;
  }, [currentRound]);
  useEffect(() => {
    if (finished || timeRemaining > 0 || questions.length === 0 || roundEndedRef.current) return;
    roundEndedRef.current = true;
    // Defer out of the effect body so the round-advance state updates don't
    // cascade synchronously during this render pass.
    const id = setTimeout(() => handleRoundEnd(), 0);
    return () => clearTimeout(id);
  }, [timeRemaining, finished, questions.length, handleRoundEnd]);

  useEffect(() => {
    if (inputRef.current && !finished) {
      inputRef.current.focus();
    }
  }, [currentRound, finished]);

  const checkAnswer = useCallback(
    (answer: string) => {
      const normalizedInput = normalizeAnswer(answer);
      if (!normalizedInput) return false;
      if (!currentQuestion || !currentQuestion.answerGroups) {
        return false;
      }

      const matchedDisplay = countdownMatch(answer, currentQuestion.answerGroups, foundAnswers);
      if (matchedDisplay) {
        setFoundAnswers((prev) => [...prev, matchedDisplay]);
        setRecentAnswer(matchedDisplay);
        setTimeout(() => setRecentAnswer(null), 1500);
        return true;
      }

      return false;
    },
    [currentQuestion, foundAnswers]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Auto-accept while typing, like the ranked countdown: once the input is 3+
  // chars, after a short debounce we test it against the answers — a match is
  // added and the field clears, so the player never has to press Enter/Send.
  const autoCheckDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoCheckedRef = useRef("");
  useEffect(() => {
    if (autoCheckDebounceRef.current) clearTimeout(autoCheckDebounceRef.current);
    const trimmed = inputValue.trim();
    // Reset the de-dupe guard whenever the field empties (manual clear, Send, or
    // a round change), so the same word can be retried on the next question.
    if (trimmed.length === 0) {
      lastAutoCheckedRef.current = "";
      return;
    }
    if (trimmed.length < 3 || trimmed.toLowerCase() === lastAutoCheckedRef.current) return;

    autoCheckDebounceRef.current = setTimeout(() => {
      autoCheckDebounceRef.current = null;
      lastAutoCheckedRef.current = trimmed.toLowerCase();
      if (checkAnswer(trimmed)) {
        playSfx("dailyCorrect");
        setInputValue("");
        lastAutoCheckedRef.current = "";
      }
    }, 150);

    return () => {
      if (autoCheckDebounceRef.current) clearTimeout(autoCheckDebounceRef.current);
    };
  }, [inputValue, checkAnswer]);

  // Manual submit on Enter — same as the Send button. No answer suggestions are
  // ever shown (they'd leak the answers); a guess is only revealed once accepted.
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      playSfx(checkAnswer(inputValue) ? "dailyCorrect" : "wrongAnswer");
      setInputValue("");
    }
  };

  const handleSkipRound = () => {
    handleRoundEnd();
  };

  // When the game has finished, render only the result modal over a clean
  // backdrop — never fall through to the "loading questions" fallback below.
  if (finished) {
    return (
      <div className="fixed inset-0 z-40 bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat">
        <DailyChallengeCompleteModal
          open
          title={session.title}
          correct={totalFound}
          total={totalAnswerSlots}
          onDone={() => onComplete(totalFound * 100)}
        />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <LoadingScreen
        className="bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat"
      />
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat font-poppins text-white">
      <DailyChallengeHeader
        onQuit={() => setShowQuitDialog(true)}
        currentIndex={currentRound}
        total={totalRounds}
        timeLeft={timeRemaining}
        centerLabel={t("dailyGames.roundOf", { n: currentRound + 1, total: totalRounds })}
      />

      {/* Main Content — mirrors the ranked-match LiveCountdownPanel UI/UX. */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full p-3 md:p-4 lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-2xl mx-auto space-y-3 w-full">
        {/* Category badge + prompt — plain text, no card chrome (like ranked) */}
        <div className="space-y-2 px-1 pt-2">
          <span className="inline-flex items-center rounded-[7px] bg-brand-cyan px-2.5 py-1 text-[11px] font-fun font-black uppercase tracking-[0.14em] text-white">
            {currentQuestion.category}
          </span>
          <p className="text-lg font-black font-fun leading-snug text-white">{currentQuestion.prompt}</p>
        </div>

        {/* Input — flat blue Figma pill with Send icon, matching ranked. */}
        <div>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder={t("dailyGames.pressEnterPlaceholder")}
              autoComplete="off"
              autoCapitalize="off"
              className="font-poppins h-14 w-full rounded-[14px] border-none bg-brand-blue px-5 pr-14 text-center text-base uppercase text-white outline-none placeholder:text-white/55 placeholder:uppercase placeholder:tracking-[0.08em] focus:outline-none"
              style={{
                fontWeight: 600,
                letterSpacing: '0.08em',
                boxShadow: '0 1.76px 6.334px 1.32px rgba(22, 69, 255, 0.25)',
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (inputValue.trim()) {
                  playSfx(checkAnswer(inputValue) ? "dailyCorrect" : "wrongAnswer");
                  setInputValue("");
                }
              }}
              disabled={!inputValue.trim()}
              aria-label={t("dailyGames.submitAnswer")}
              className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex size-9 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <Send className="size-4" />
            </button>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[10px] font-fun font-black uppercase tracking-[0.18em] text-white/40">
            <Lightbulb className="size-3.5 text-brand-orange" />{t('dailyGames.spellingTip')}
          </p>
        </div>

        {/* Recent Answer Feedback */}
        {recentAnswer && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-300">
            <div className="bg-surface-card rounded-[20px] border border-brand-green-light/40 p-6 px-8">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-brand-green-light flex items-center justify-center">
                  <Check className="size-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-brand-slate">{t('dailyGames.correctExclaim')}</div>
                  <div className="text-xl font-black text-white">{recentAnswer}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Answers found — soft list with green chips, matching ranked. */}
        <div className="px-1.5 sm:px-0">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <h3 className="text-[11px] font-fun font-black uppercase tracking-[0.22em] text-white/55">
              {t("dailyGames.answersFound")}
            </h3>
            <span className="inline-flex items-center rounded-[7px] bg-brand-cyan/15 px-2 py-0.5 text-[11px] font-fun font-black text-brand-cyan">
              {foundAnswers.length}
            </span>
          </div>
          {foundAnswers.length === 0 ? (
            <p className="py-6 text-center text-xs font-fun font-black uppercase tracking-[0.18em] text-white/30">
              {t("dailyGames.noAnswersYet")}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {foundAnswers.map((answer) => (
                <div
                  key={answer}
                  className="rounded-[8px] border border-brand-green/20 bg-transparent px-3 py-2 text-sm font-fun font-black text-brand-green"
                >
                  {answer}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skip / Next Round — green submit-button style, matching the other
            daily challenges' primary action. */}
        <button
          onClick={handleSkipRound}
          className="w-full py-3.5 rounded-[20px] font-black uppercase tracking-wide text-white bg-brand-green hover:bg-brand-green-deep active:translate-y-[1px] transition-all flex items-center justify-center gap-2"
        >
          <ArrowRight className="size-4" />
          {currentRound >= totalRounds - 1
            ? t("dailyGames.viewResults")
            : t("dailyGames.skipToNextRound")}
        </button>
        </div>
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
