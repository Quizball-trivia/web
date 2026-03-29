"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

import { Input } from "@/components/ui/input";
import { QuitGameDialog } from "./QuitGameDialog";
import { Check, CheckCircle2, Clock, Timer, Lightbulb, Trophy, ArrowRight, ArrowLeft } from "lucide-react";
import type { CountdownSession } from "@/lib/domain/dailyChallenge";

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

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const maxLength = Math.max(s1.length, s2.length);
  const distance = matrix[s1.length][s2.length];

  return 1 - distance / maxLength;
}

function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

interface RankedAnswerMatch {
  display: string;
  score: number;
}

function rankAnswerMatches(input: string, answerGroups: AnswerGroup[], foundAnswers: string[]): RankedAnswerMatch[] {
  const normalizedInput = normalizeAnswer(input);
  if (!normalizedInput) return [];

  const ranked = answerGroups
    .filter((group) => !foundAnswers.includes(group.display))
    .map((group) => {
      const bestScore = group.acceptedAnswers.reduce((best, alias) => {
        const normalizedAlias = normalizeAnswer(alias);
        if (!normalizedAlias) return best;
        if (normalizedInput === normalizedAlias) return Math.max(best, 1);
        if (normalizedAlias.startsWith(normalizedInput)) return Math.max(best, 0.96);
        if (normalizedAlias.split(" ").some((token) => token.startsWith(normalizedInput))) return Math.max(best, 0.93);
        if (normalizedInput.length >= 4) return Math.max(best, calculateSimilarity(normalizedInput, normalizedAlias));
        return best;
      }, 0);

      return {
        display: group.display,
        score: bestScore,
      };
    })
    .filter((entry) => entry.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return ranked;
}

export function CountdownGame({ session, onBack, onComplete }: CountdownGameProps) {
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
    () => rankAnswerMatches(inputValue, currentQuestion?.answerGroups ?? [], foundAnswers),
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
  }, [currentRound, foundAnswers, questions, allRoundAnswers, onComplete]);

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
      const normalizedInput = answer.toLowerCase().trim();

      if (!normalizedInput) return false;
      if (!currentQuestion || !currentQuestion.answerGroups) {
        return false;
      }

      for (const answerGroup of currentQuestion.answerGroups) {
        if (foundAnswers.includes(answerGroup.display)) {
          continue;
        }

        for (const acceptedAnswer of answerGroup.acceptedAnswers) {
          const normalizedAcceptedAnswer = normalizeAnswer(acceptedAnswer);
          const similarity = calculateSimilarity(normalizedInput, normalizedAcceptedAnswer);
          if (normalizedInput === normalizedAcceptedAnswer || similarity >= 0.9) {
            setFoundAnswers((prev) => [...prev, answerGroup.display]);
            setRecentAnswer(answerGroup.display);
            setTimeout(() => setRecentAnswer(null), 1500);
            return true;
          }
        }
      }

      const [bestSuggestion, secondSuggestion] = rankAnswerMatches(answer, currentQuestion.answerGroups, foundAnswers);
      if (
        bestSuggestion &&
        bestSuggestion.score >= 0.9 &&
        (normalizeAnswer(answer).length >= 4 || bestSuggestion.score === 1) &&
        (!secondSuggestion || bestSuggestion.score - secondSuggestion.score >= 0.08)
      ) {
        setFoundAnswers((prev) => [...prev, bestSuggestion.display]);
        setRecentAnswer(bestSuggestion.display);
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
    setFoundAnswers((prev) => [...prev, display]);
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
      if (suggestions.length > 0 && normalizeAnswer(inputValue).length < 4) {
        e.preventDefault();
        const idx = Math.min(highlightedSuggestion, suggestions.length - 1);
        const suggestion = suggestions[idx];
        if (suggestion) {
          submitSuggestion(suggestion.display);
        }
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
      <div className="fixed inset-0 z-40 bg-[#131F24] font-fun flex items-center justify-center">
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] p-6">
          <p className="text-center text-[#56707A]">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (showRoundTransition) {
    return (
      <div className="fixed inset-0 z-40 bg-[#131F24] font-fun flex items-center justify-center p-4">
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] p-6 md:p-8 max-w-md w-full text-center space-y-4">
          <div className="mb-4"><CheckCircle2 className="size-14 text-[#58CC02] mx-auto" /></div>
          <h2 className="text-2xl font-black uppercase text-white">Round {currentRound + 1} Complete!</h2>
          <div className="space-y-2">
            <p className="text-[#56707A]">You found</p>
            <div className="text-4xl text-[#1CB0F6] font-black">{foundAnswers.length}</div>
            <p className="text-[#56707A]">answers</p>
          </div>
          {currentRound < questions.length - 1 && (
            <div className="pt-4">
              <p className="text-sm text-[#56707A]">Next round starting...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#131F24] font-fun flex flex-col">
      {/* Header */}
      <div className="bg-[#1B2F36] border-b-[3px] border-[#131F24]">
        <div className="max-w-2xl mx-auto px-3 md:px-4 py-2.5 md:py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQuitDialog(true)}
                className="flex items-center justify-center size-9 rounded-xl hover:bg-[#243B44] active:scale-95 transition-all text-white"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex items-center gap-2">
                <Timer className="size-6 text-[#1CB0F6]" />
                <h1 className="text-lg md:text-xl font-black uppercase text-white">Countdown</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[#243B44] text-white">
                Round {currentRound + 1}/{totalRounds}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1CB0F6]/15 text-[#1CB0F6]">
                <Trophy className="size-3" />
                {allRoundAnswers.reduce((sum, arr) => sum + arr.length, 0) +
                  foundAnswers.length}
              </span>
            </div>
          </div>

          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#58CC02] rounded-full transition-all duration-300"
              style={{ width: `${((currentRound + 1) / totalRounds) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full p-3 md:p-4 lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-2xl mx-auto space-y-3 w-full">
        {/* Timer */}
        <div
          className={`bg-[#1B2F36] rounded-xl border-b-4 p-4 md:p-5 ${
            timeRemaining <= 5
              ? "border-b-[#CC3C3C] animate-pulse"
              : "border-b-[#0F1F26]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock
                className={`size-5 ${timeRemaining <= 5 ? "text-[#FF4B4B]" : "text-[#1CB0F6]"}`}
              />
              <span className="text-sm text-[#56707A] font-bold">Time Remaining</span>
            </div>
            <div
              className={`text-3xl font-black ${timeRemaining <= 5 ? "text-[#FF4B4B]" : "text-[#1CB0F6]"}`}
            >
              {timeRemaining}s
            </div>
          </div>
        </div>

        {/* Category */}
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-b-[#0F1F26] p-4 md:p-5">
          <div className="space-y-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1CB0F6] text-white">
              {currentQuestion.category}
            </span>
            <h2 className="text-xl md:text-2xl font-black text-white">{currentQuestion.prompt}</h2>
          </div>
        </div>

        {/* Input */}
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-b-[#0F1F26] p-4 md:p-5">
          <div className="space-y-2">
            <label className="text-sm text-[#56707A] font-bold">Type your answer</label>
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder="Press Enter to submit..."
              className="bg-[#243B44] border-2 border-[#1B2F36] text-white placeholder:text-[#56707A] focus:border-[#1CB0F6] text-lg h-12 rounded-xl"
              autoComplete="off"
              autoCapitalize="off"
            />
            <p className="text-xs text-[#56707A]">
              <Lightbulb className="size-3.5 inline-block align-text-bottom mr-1 text-[#FF9600]" />Tip: Don&apos;t worry about exact spelling - close matches count!
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
                        ? "border-[#1CB0F6] bg-[#1CB0F6]/15 text-[#1CB0F6]"
                        : "border-white/10 bg-white/5 text-white/80 hover:border-[#1CB0F6]/50"
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
            <div className="bg-[#1B2F36] rounded-xl border-b-4 border-b-[#46A302] p-6 px-8">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-[#58CC02] flex items-center justify-center">
                  <Check className="size-6 text-white" />
                </div>
                <div>
                  <div className="text-sm text-[#56707A]">Correct!</div>
                  <div className="text-xl font-black text-white">{recentAnswer}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Found Answers */}
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-b-[#0F1F26] p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-black text-white">Answers Found</h3>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-[#1CB0F6]/15 text-[#1CB0F6]">
              {foundAnswers.length}
            </span>
          </div>
          {foundAnswers.length === 0 ? (
            <p className="text-sm text-[#56707A] text-center py-8">
              No answers found yet. Start typing!
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {foundAnswers.map((answer, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-lg bg-[#58CC02]/15 border border-[#58CC02]/30"
                >
                  <Check className="size-4 text-[#58CC02] shrink-0" />
                  <span className="text-sm truncate text-white">{answer}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Skip Button */}
        <button
          onClick={handleSkipRound}
          className="w-full py-3 rounded-xl font-black text-white bg-[#243B44] border-b-4 border-b-[#1B2F36] active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
        >
          <ArrowRight className="size-4" />
          Skip to Next Round
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
