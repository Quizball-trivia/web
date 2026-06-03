"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

import { Input } from "@/components/ui/input";
import { QuitGameDialog } from "./QuitGameDialog";
import { DailyChallengeHeader } from "./components/DailyChallengeHeader";
import { Check, CheckCircle2, Clock, Lightbulb, ArrowRight } from "lucide-react";
import type { CountdownSession } from "@/lib/domain/dailyChallenge";
import { useLocale } from "@/contexts/LocaleContext";
import {
  countdownMatch,
  normalizeAnswer,
  rankCountdownMatches,
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
  const [questions] = useState<CountdownQuestion[]>(() =>
    session.rounds.map((round) => ({
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
  const [showRoundTransition, setShowRoundTransition] = useState(false);
  const [allRoundAnswers, setAllRoundAnswers] = useState<string[][]>([]);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentRound];
  const isGameActive =
    questions.length > 0 && currentRound < questions.length && timeRemaining > 0;
  const totalRounds = questions.length;
  const suggestions = useMemo(
    () => rankCountdownMatches(inputValue, currentQuestion?.answerGroups ?? [], foundAnswers),
    [currentQuestion, foundAnswers, inputValue]
  );

  const handleRoundEnd = useCallback(() => {
    if (questions.length === 0) return;

    if (currentRound < questions.length - 1) {
      setAllRoundAnswers((prev) => [...prev, foundAnswers]);

      setShowRoundTransition(true);
      setTimeout(() => {
        setCurrentRound((prev) => prev + 1);
        setTimeRemaining(TIME_PER_ROUND);
        setFoundAnswers([]);
        setInputValue("");
        setRecentAnswer(null);
        setShowRoundTransition(false);
      }, 2000);
    } else {
      const totalAnswers = [...allRoundAnswers, foundAnswers].reduce(
        (sum, arr) => sum + arr.length,
        0
      );
      const score = totalAnswers * 100;
      onComplete(score);
    }
  }, [TIME_PER_ROUND, currentRound, foundAnswers, questions, allRoundAnswers, onComplete]);

  useEffect(() => {
    if (!isGameActive || showRoundTransition) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTimeout(() => handleRoundEnd(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGameActive, showRoundTransition, handleRoundEnd]);

  useEffect(() => {
    if (inputRef.current && !showRoundTransition) {
      inputRef.current.focus();
    }
  }, [currentRound, showRoundTransition]);

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
    setHighlightedSuggestion(0);
  };

  const submitSuggestion = useCallback((display: string) => {
    let isDuplicate = false;
    setFoundAnswers((prev) => {
      if (prev.includes(display)) {
        isDuplicate = true;
        return prev;
      }
      return [...prev, display];
    });
    if (isDuplicate) return;
    setRecentAnswer(display);
    setTimeout(() => setRecentAnswer(null), 1500);
    setInputValue("");
    setHighlightedSuggestion(0);
    inputRef.current?.focus();
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setHighlightedSuggestion((prev) => (prev + 1) % suggestions.length);
      return;
    }

    if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setHighlightedSuggestion((prev) => (prev - 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (e.key === "Enter" && inputValue.trim()) {
      if (suggestions.length === 1 && normalizeAnswer(inputValue).length < 4) {
        e.preventDefault();
        submitSuggestion(suggestions[0].display);
        return;
      }
      checkAnswer(inputValue);
      setInputValue("");
      setHighlightedSuggestion(0);
    }
  };

  const handleSkipRound = () => {
    handleRoundEnd();
  };

  if (!currentQuestion) {
    return (
      <div className="fixed inset-0 z-40 bg-surface-deep font-fun flex items-center justify-center">
        <div className="bg-surface-card rounded-xl border-b-4 border-surface-card-deeper p-6">
          <p className="text-center text-brand-slate">{t('dailyGames.loadingQuestions')}</p>
        </div>
      </div>
    );
  }

  if (showRoundTransition) {
    return (
      <div className="fixed inset-0 z-40 bg-surface-deep font-fun flex items-center justify-center p-4">
        <div className="bg-surface-card rounded-xl border-b-4 border-surface-card-deeper p-6 md:p-8 max-w-md w-full text-center space-y-4">
          <div className="mb-4"><CheckCircle2 className="size-14 text-brand-green-light mx-auto" /></div>
          <h2 className="text-2xl font-black uppercase text-white">{t('dailyGames.roundComplete', { round: currentRound + 1 })}</h2>
          <div className="space-y-2">
            <p className="text-brand-slate">{t("dailyGames.youFound")}</p>
            <div className="text-4xl text-brand-cyan font-black">{foundAnswers.length}</div>
            <p className="text-brand-slate">{t('dailyGames.answersWord')}</p>
          </div>
          {currentRound < questions.length - 1 && (
            <div className="pt-4">
              <p className="text-sm text-brand-slate">{t('dailyGames.nextRoundStarting')}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat font-poppins text-white">
      <DailyChallengeHeader
        onQuit={() => setShowQuitDialog(true)}
        currentIndex={currentRound}
        total={totalRounds}
        timeLeft={timeRemaining}
        centerLabel={`Round ${currentRound + 1}/${totalRounds}`}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full p-3 md:p-4 lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-2xl mx-auto space-y-3 w-full">
        {/* Timer */}
        <div
          className={`bg-surface-card rounded-xl border-b-4 p-4 md:p-5 ${
            timeRemaining <= 5
              ? "border-b-[#CC3C3C] animate-pulse"
              : "border-b-[#0F1F26]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock
                className={`size-5 ${timeRemaining <= 5 ? "text-brand-red-soft" : "text-brand-cyan"}`}
              />
              <span className="text-sm text-brand-slate font-bold">{t("dailyGames.timeRemaining")}</span>
            </div>
            <div
              className={`text-3xl font-black ${timeRemaining <= 5 ? "text-brand-red-soft" : "text-brand-cyan"}`}
            >
              {timeRemaining}s
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="bg-surface-card rounded-xl border-b-4 border-b-[#0F1F26] p-4 md:p-5">
          <div className="space-y-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-cyan text-white">
              {currentQuestion.category}
            </span>
            <h2 className="text-xl md:text-2xl font-black text-white">{currentQuestion.prompt}</h2>
          </div>
        </div>

        {/* Input */}
        <div className="bg-surface-card rounded-xl border-b-4 border-b-[#0F1F26] p-4 md:p-5">
          <div className="space-y-2">
            <label className="text-sm text-brand-slate font-bold">{t("dailyGames.typeYourAnswer")}</label>
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder={t("dailyGames.pressEnterPlaceholder")}
              className="bg-surface-card-tint border-2 border-surface-card text-white placeholder:text-brand-slate focus:border-brand-cyan focus-visible:border-brand-cyan focus-visible:ring-brand-cyan/50 text-lg h-12 rounded-xl"
              autoComplete="off"
              autoCapitalize="off"
            />
            <p className="text-xs text-brand-slate">
              <Lightbulb className="size-3.5 inline-block align-text-bottom mr-1 text-brand-orange" />{t('dailyGames.spellingTip')}
            </p>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.display}
                    type="button"
                    onClick={() => submitSuggestion(suggestion.display)}
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition-all ${
                      index === highlightedSuggestion
                        ? "border-brand-cyan bg-brand-cyan/15 text-brand-cyan"
                        : "border-white/10 bg-white/5 text-white/80 hover:border-brand-cyan/50"
                    }`}
                  >
                    {suggestion.display}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Answer Feedback */}
        {recentAnswer && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in fade-in zoom-in duration-300">
            <div className="bg-surface-card rounded-xl border-b-4 border-b-[#46A302] p-6 px-8">
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

        {/* Found Answers */}
        <div className="bg-surface-card rounded-xl border-b-4 border-b-[#0F1F26] p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-black text-white">{t("dailyGames.answersFound")}</h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-cyan/15 text-brand-cyan">
              {foundAnswers.length}
            </span>
          </div>
          {foundAnswers.length === 0 ? (
            <p className="text-sm text-brand-slate text-center py-8">
              No answers found yet. Start typing!
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {foundAnswers.map((answer, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-lg bg-brand-green-light/15 border border-brand-green-light/30"
                >
                  <Check className="size-4 text-brand-green-light shrink-0" />
                  <span className="text-sm truncate text-white">{answer}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skip Button */}
        <button
          onClick={handleSkipRound}
          className="w-full py-3 rounded-xl font-black text-white bg-surface-card-tint border-b-4 border-b-[#1B2F36] active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
        >
          <ArrowRight className="size-4" />
          {t("dailyGames.skipToNextRound")}
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
