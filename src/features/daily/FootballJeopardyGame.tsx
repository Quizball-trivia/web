"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from 'motion/react';

import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  XCircle,
  Trophy,
  Coins,
  Target,
  Clock,
  ArrowRight,
  Sparkles,
  Star,
} from "lucide-react";
import { QuitGameDialog } from "./QuitGameDialog";
import type { FootballJeopardySession } from "@/lib/domain/dailyChallenge";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  clue: string;
}

interface CareerPathQuestion {
  id: string;
  teams: Array<{
    name: string;
    emoji: string;
  }>;
  correctAnswer: string;
  acceptedAnswers: string[];
  difficulty: "easy" | "medium" | "hard";
}

interface JeopardyCategory {
  id: string;
  name: string;
  emoji: string;
  accentColor: string;
  isCareerPath?: boolean;
  questions: {
    100: Question | CareerPathQuestion;
    200: Question | CareerPathQuestion;
    300: Question | CareerPathQuestion;
  };
}

interface FootballJeopardyGameProps {
  session: FootballJeopardySession;
  onBack: () => void;
  onComplete: (score: number) => void;
}

function isCareerPathQuestion(
  q: Question | CareerPathQuestion
): q is CareerPathQuestion {
  return "teams" in q && "acceptedAnswers" in q;
}

type PickedQuestion = {
  categoryId: string;
  value: 100 | 200 | 300;
  isCorrect?: boolean;
};

export function FootballJeopardyGame({
  session,
  onBack,
  onComplete,
}: FootballJeopardyGameProps) {
  const categories = useMemo<JeopardyCategory[]>(
    () =>
      session.categories.map((category, index) => {
        const q100 = category.questions.find((q) => q.value === 100);
        const q200 = category.questions.find((q) => q.value === 200);
        const q300 = category.questions.find((q) => q.value === 300);

        if (!q100 || !q200 || !q300) {
          throw new Error(`Category "${category.name}" is missing a question for value ${!q100 ? 100 : !q200 ? 200 : 300}`);
        }

        return {
          id: category.id,
          name: category.name,
          emoji: ["🧠", "⚽", "🏆"][index] ?? "⚽",
          accentColor: ["#CE82FF", "#FF9600", "#1CB0F6"][index] ?? "#1CB0F6",
          questions: {
            100: {
              id: q100.id,
              question: q100.prompt,
              options: q100.options,
              correctAnswer: q100.correctAnswerIndex,
              category: category.name,
              difficulty: q100.difficulty,
              clue: q100.clue ?? "",
            },
            200: {
              id: q200.id,
              question: q200.prompt,
              options: q200.options,
              correctAnswer: q200.correctAnswerIndex,
              category: category.name,
              difficulty: q200.difficulty,
              clue: q200.clue ?? "",
            },
            300: {
              id: q300.id,
              question: q300.prompt,
              options: q300.options,
              correctAnswer: q300.correctAnswerIndex,
              category: category.name,
              difficulty: q300.difficulty,
              clue: q300.clue ?? "",
            },
          },
        };
      }),
    [session.categories]
  );
  const [pickedQuestions, setPickedQuestions] = useState<PickedQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<
    Question | CareerPathQuestion | null
  >(null);
  const [currentCategory, setCurrentCategory] = useState<JeopardyCategory | null>(
    null
  );
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  const [timeRemaining, setTimeRemaining] = useState(10);
  const [timerActive, setTimerActive] = useState(false);
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  const MAX_PICKS = session.pickCount;
  const MAX_TIME = 10;
  const remainingPicks = MAX_PICKS - pickedQuestions.length;

  const getCurrentQuestionValue = useCallback((): number => {
    if (!currentQuestion || !currentCategory) return 100;

    for (const [value, q] of Object.entries(currentCategory.questions)) {
      const question = q as Question | CareerPathQuestion;
      if (question.id === currentQuestion.id) {
        return parseInt(value);
      }
    }
    return 100;
  }, [currentQuestion, currentCategory]);

  const isQuestionPicked = (categoryId: string, value: 100 | 200 | 300) => {
    return pickedQuestions.some(
      (pq) => pq.categoryId === categoryId && pq.value === value
    );
  };

  const handleQuestionSelect = (categoryId: string, value: 100 | 200 | 300) => {
    if (currentQuestion || pickedQuestions.length >= MAX_PICKS) return;
    if (isQuestionPicked(categoryId, value)) return;

    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    const question = category.questions[value];
    setCurrentQuestion(question);
    setCurrentCategory(category);
    setSelectedAnswer(null);
    setTextAnswer("");
    setShowResult(false);
    setTimeRemaining(MAX_TIME);
    setTimerActive(true);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult || selectedAnswer !== null) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (
      selectedAnswer === null ||
      !currentQuestion ||
      isCareerPathQuestion(currentQuestion)
    )
      return;

    setTimerActive(false);
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    setShowResult(true);

    const questionValue = getCurrentQuestionValue();

    if (isCorrect) {
      setTotalScore((prev) => prev + questionValue);
      setCorrectAnswers((prev) => prev + 1);
    }

    const categoryId = currentCategory?.id || "";

    setPickedQuestions((prev) => [
      ...prev,
      { categoryId, value: questionValue as 100 | 200 | 300, isCorrect },
    ]);
  };

  const handleCareerPathSubmit = useCallback((timeUp: boolean = false) => {
    if (!currentQuestion || !isCareerPathQuestion(currentQuestion)) return;

    setTimerActive(false);
    const normalizedAnswer = textAnswer.toLowerCase().trim();
    const isCorrect =
      !timeUp &&
      currentQuestion.acceptedAnswers.some(
        (accepted) => accepted.toLowerCase() === normalizedAnswer
      );

    setShowResult(true);

    const questionValue = getCurrentQuestionValue();

    if (isCorrect) {
      setTotalScore((prev) => prev + questionValue);
      setCorrectAnswers((prev) => prev + 1);
    }

    const categoryId = currentCategory?.id || "";

    setPickedQuestions((prev) => [
      ...prev,
      { categoryId, value: questionValue as 100 | 200 | 300, isCorrect },
    ]);
  }, [currentQuestion, currentCategory, textAnswer, getCurrentQuestionValue]);

  useEffect(() => {
    if (!timerActive || timeRemaining <= 0 || showResult) return;

    const onTimeUp = () => {
      if (showResult || !currentQuestion) return;
      setTimerActive(false);
      setShowResult(true);

      if (isCareerPathQuestion(currentQuestion)) {
        handleCareerPathSubmit(true);
      } else {
        const questionValue = getCurrentQuestionValue();
        const categoryId = currentCategory?.id || "";

        setPickedQuestions((prev) => [
          ...prev,
          {
            categoryId,
            value: questionValue as 100 | 200 | 300,
            isCorrect: false,
          },
        ]);
      }
    };

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          onTimeUp();
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    timerActive,
    timeRemaining,
    showResult,
    currentQuestion,
    currentCategory,
    handleCareerPathSubmit,
    getCurrentQuestionValue,
  ]);

  const handleContinue = () => {
    if (pickedQuestions.length >= MAX_PICKS) {
      onComplete(totalScore);
    } else {
      setCurrentQuestion(null);
      setCurrentCategory(null);
      setSelectedAnswer(null);
      setTextAnswer("");
      setShowResult(false);
      setTimeRemaining(MAX_TIME);
      setTimerActive(false);
    }
  };

  if (currentQuestion) {
    const isCareerPath = isCareerPathQuestion(currentQuestion);
    const percentage = (timeRemaining / MAX_TIME) * 100;
    const isLowTime = percentage < 25;

    return (
      <div className="fixed inset-0 z-40 bg-[#131F24] font-fun flex flex-col">
        {/* Header */}
        <div className="bg-[#1B2F36] border-b-[3px] border-[#131F24]">
          <div className="max-w-2xl lg:max-w-3xl mx-auto px-3 md:px-4 lg:px-6 py-2.5 md:py-3 lg:py-4">
            <div className="flex items-center justify-between mb-2.5 lg:mb-3">
              <div className="flex items-center gap-2 lg:gap-3">
                <div
                  className="flex size-10 lg:size-12 items-center justify-center rounded-lg lg:rounded-xl"
                  style={{ backgroundColor: `${currentCategory?.accentColor}20` }}
                >
                  <span className="text-xl lg:text-2xl">{currentCategory?.emoji}</span>
                </div>
                <div>
                  <h2 className="text-sm lg:text-base font-bold text-white">
                    {currentCategory?.name || "Question"}
                  </h2>
                  <p className="text-xs lg:text-sm text-[#56707A]">
                    Question {pickedQuestions.length + 1} of {MAX_PICKS}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:gap-3">
                <span
                  className="inline-flex items-center gap-1 lg:gap-1.5 px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg text-xs lg:text-sm font-bold border"
                  style={{
                    borderColor: currentCategory?.accentColor,
                    color: currentCategory?.accentColor,
                    backgroundColor: `${currentCategory?.accentColor}15`,
                  }}
                >
                  <Coins className="size-3 lg:size-4" />
                  {getCurrentQuestionValue()}
                </span>
                <span className="inline-flex items-center gap-1 lg:gap-1.5 px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg text-xs lg:text-sm font-bold bg-[#243B44] text-white">
                  <Trophy className="size-3 lg:size-4 text-[#FFD700]" />
                  {totalScore}
                </span>
              </div>
            </div>

            <div className="space-y-1 lg:space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock
                    className={`size-3.5 lg:size-4 ${isLowTime ? "text-[#FF4B4B]" : "text-[#56707A]"}`}
                  />
                  <span
                    className={`text-xs lg:text-sm font-bold ${isLowTime ? "text-[#FF4B4B]" : "text-[#56707A]"}`}
                  >
                    {timeRemaining}s remaining
                  </span>
                </div>
              </div>
              <div className="relative h-1.5 lg:h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    isLowTime ? "bg-[#FF4B4B]" : ""
                  }`}
                  style={{
                    backgroundColor: isLowTime
                      ? undefined
                      : currentCategory?.accentColor,
                    width: `${percentage}%`,
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="min-h-full p-3 md:p-4 lg:p-6 lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-2xl lg:max-w-3xl mx-auto space-y-3 lg:space-y-4 w-full">
          <AnimatePresence mode="wait">
            {isCareerPath ? (
              <motion.div
                key="career-path"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div
                  className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] border-l-4 p-4 md:p-5 lg:p-6"
                  style={{ borderLeftColor: currentCategory?.accentColor }}
                >
                  <div className="pb-3 lg:pb-4">
                    <h3 className="text-sm lg:text-base font-bold text-white flex items-center gap-2">
                      <Star
                        className="size-4 lg:size-5"
                        style={{ color: currentCategory?.accentColor }}
                      />
                      Identify the player from their career path
                    </h3>
                  </div>
                  <div className="space-y-4 lg:space-y-5">
                    <div className="flex items-center justify-center gap-2.5 lg:gap-4 flex-wrap">
                      {currentQuestion.teams.map((team, index) => (
                        <React.Fragment key={index}>
                          <motion.div
                            className="flex flex-col items-center gap-1.5"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div
                              className="w-14 h-14 lg:w-18 lg:h-18 rounded-xl flex items-center justify-center text-2xl lg:text-3xl border-2"
                              style={{
                                borderColor: currentCategory?.accentColor,
                                backgroundColor: `${currentCategory?.accentColor}10`,
                              }}
                            >
                              {team.emoji}
                            </div>
                            <div className="text-xs lg:text-sm text-center max-w-[80px] lg:max-w-[100px] text-[#56707A]">
                              {team.name}
                            </div>
                          </motion.div>
                          {index < currentQuestion.teams.length - 1 && (
                            <ArrowRight
                              className="size-5 lg:size-6 shrink-0 mb-5 lg:mb-6"
                              style={{ color: currentCategory?.accentColor }}
                            />
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {!showResult ? (
                      <div className="space-y-2 lg:space-y-3">
                        <Input
                          type="text"
                          placeholder="Type player name..."
                          value={textAnswer}
                          onChange={(e) => setTextAnswer(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && textAnswer.trim()) {
                              handleCareerPathSubmit();
                            }
                          }}
                          className="bg-[#243B44] border-2 text-white placeholder:text-[#56707A] text-center h-10 lg:h-12 lg:text-base rounded-xl"
                          style={{
                            borderColor: textAnswer
                              ? currentCategory?.accentColor
                              : "#1B2F36",
                          }}
                          disabled={showResult}
                          autoFocus
                        />
                        <p className="text-xs lg:text-sm text-center text-[#56707A]">
                          Press Enter to submit
                        </p>
                      </div>
                    ) : (
                      <div
                        className={`p-3 lg:p-4 rounded-xl border-b-4 ${
                          pickedQuestions[pickedQuestions.length - 1]?.isCorrect
                            ? "bg-[#58CC02]/15 border-b-[#46A302]"
                            : "bg-[#FF4B4B]/10 border-b-[#CC3C3C]"
                        }`}
                      >
                        <div className="text-center space-y-1.5">
                          <div className="flex items-center justify-center gap-2">
                            {pickedQuestions[pickedQuestions.length - 1]
                              ?.isCorrect ? (
                              <CheckCircle2 className="size-5 lg:size-6 text-[#58CC02]" />
                            ) : (
                              <XCircle className="size-5 lg:size-6 text-[#FF4B4B]" />
                            )}
                            <span className="text-sm lg:text-base font-bold text-white">
                              {pickedQuestions[pickedQuestions.length - 1]
                                ?.isCorrect
                                ? "Correct!"
                                : "Incorrect"}
                            </span>
                          </div>
                          <p className="text-xs lg:text-sm text-[#56707A]">
                            Answer:{" "}
                            <span className="text-white">
                              {currentQuestion.correctAnswer}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="multiple-choice"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div
                  className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] border-l-4 p-4 md:p-5 lg:p-6"
                  style={{ borderLeftColor: currentCategory?.accentColor }}
                >
                  <div className="pb-3 lg:pb-4">
                    <h3 className="text-sm lg:text-lg font-bold leading-relaxed text-white">
                      {(currentQuestion as Question).question}
                    </h3>
                  </div>
                  <div className="space-y-2 lg:space-y-3">
                    {(currentQuestion as Question).options.map((option, index) => {
                      const isSelected = selectedAnswer === index;
                      const isCorrect =
                        index === (currentQuestion as Question).correctAnswer;
                      const showCorrect = showResult && isCorrect;
                      const showIncorrect = showResult && isSelected && !isCorrect;

                      return (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`w-full text-left p-3 lg:p-4 rounded-xl border-b-4 transition-all text-sm lg:text-base text-white ${
                            showCorrect
                              ? "bg-[#58CC02]/15 border-b-[#46A302]"
                              : showIncorrect
                                ? "bg-[#FF4B4B]/10 border-b-[#CC3C3C]"
                                : isSelected
                                  ? "border-b-[#0F1F26]"
                                  : "bg-[#243B44]/50 hover:bg-[#243B44] border-b-[#1B2F36]"
                          }`}
                          style={{
                            backgroundColor:
                              isSelected && !showResult
                                ? `${currentCategory?.accentColor}15`
                                : undefined,
                            borderLeftColor:
                              isSelected && !showResult
                                ? currentCategory?.accentColor
                                : undefined,
                            borderLeftWidth:
                              isSelected && !showResult ? "4px" : undefined,
                          }}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={showResult}
                        >
                          <div className="flex items-center gap-2.5 lg:gap-3">
                            <div
                              className={`flex size-6 lg:size-8 shrink-0 items-center justify-center rounded-full text-xs lg:text-sm font-bold transition-all ${
                                showCorrect
                                  ? "border-2 border-[#58CC02] bg-[#58CC02] text-white"
                                  : showIncorrect
                                    ? "border-2 border-[#FF4B4B] bg-[#FF4B4B] text-white"
                                    : isSelected
                                      ? "text-white"
                                      : "border-2 border-[#56707A]/30"
                              }`}
                              style={{
                                backgroundColor:
                                  isSelected && !showResult
                                    ? currentCategory?.accentColor
                                    : undefined,
                                borderColor:
                                  isSelected && !showResult
                                    ? currentCategory?.accentColor
                                    : undefined,
                              }}
                            >
                              {showCorrect ? (
                                <CheckCircle2 className="size-3.5 lg:size-4" />
                              ) : showIncorrect ? (
                                <XCircle className="size-3.5 lg:size-4" />
                              ) : (
                                String.fromCharCode(65 + index)
                              )}
                            </div>
                            <span>{option}</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!showResult ? (
              <button
                key="submit"
                className="w-full py-3 lg:py-4 rounded-xl font-black text-white lg:text-lg transition-all active:border-b-2 active:translate-y-[2px] disabled:opacity-50 disabled:active:border-b-4 disabled:active:translate-y-0 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: currentCategory?.accentColor,
                  borderBottom: `4px solid ${currentCategory?.accentColor}CC`,
                }}
                onClick={
                  isCareerPath ? () => handleCareerPathSubmit() : handleSubmitAnswer
                }
                disabled={isCareerPath ? !textAnswer.trim() : selectedAnswer === null}
              >
                <Sparkles className="size-4 lg:size-5" />
                Submit Answer
              </button>
            ) : (
              <div key="continue" className="space-y-2.5 lg:space-y-3">
                {pickedQuestions[pickedQuestions.length - 1]?.isCorrect && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center p-3 lg:p-4 rounded-xl bg-[#58CC02]/15 border-b-4 border-b-[#46A302]"
                  >
                    <p className="text-sm lg:text-base text-[#58CC02] flex items-center justify-center gap-2 font-bold">
                      <Coins className="size-4 lg:size-5" />+{getCurrentQuestionValue()} points
                      earned
                    </p>
                  </motion.div>
                )}
                <button
                  className="w-full py-3 lg:py-4 rounded-xl font-black text-white lg:text-lg bg-[#58CC02] border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                  onClick={handleContinue}
                >
                  {pickedQuestions.length >= MAX_PICKS ? (
                    <>
                      <Trophy className="size-4 lg:size-5" />
                      View Results
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="size-4 lg:size-5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </AnimatePresence>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // Jeopardy board view
  return (
    <div className="fixed inset-0 z-40 bg-[#131F24] font-fun flex flex-col">
      {/* Header */}
      <div className="bg-[#1B2F36] border-b-[3px] border-[#131F24]">
        <div className="max-w-2xl lg:max-w-3xl mx-auto px-3 md:px-4 lg:px-6 py-2.5 md:py-3 lg:py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowQuitDialog(true)}
              className="flex items-center justify-center size-9 lg:size-11 rounded-xl hover:bg-[#243B44] active:scale-95 transition-all text-white"
            >
              <ArrowLeft className="size-5 lg:size-6" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Brain className="size-5 lg:size-6 text-[#1CB0F6]" />
                <h1 className="text-lg lg:text-xl font-black uppercase text-white">Football Jeopardy</h1>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-lg text-xs lg:text-sm font-bold bg-[#243B44] text-white">
              <Trophy className="size-3.5 lg:size-4 text-[#FFD700]" />
              {totalScore}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6">
        <div className="max-w-2xl lg:max-w-3xl mx-auto space-y-3 lg:space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] p-3 lg:p-4">
            <div className="flex flex-col items-center">
              <Target className="size-4 lg:size-5 text-[#1CB0F6] mb-0.5" />
              <div className="text-[10px] lg:text-xs text-[#56707A]">Picks Left</div>
              <div className="text-lg lg:text-xl font-black text-white mt-0.5">{remainingPicks}</div>
            </div>
          </div>

          <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] p-3 lg:p-4">
            <div className="flex flex-col items-center">
              <Trophy className="size-4 lg:size-5 text-[#FFD700] mb-0.5" />
              <div className="text-[10px] lg:text-xs text-[#56707A]">Correct</div>
              <div className="text-lg lg:text-xl font-black text-white mt-0.5">{correctAnswers}</div>
            </div>
          </div>

          <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] p-3 lg:p-4">
            <div className="flex flex-col items-center">
              <Clock className="size-4 lg:size-5 text-[#FF9600] mb-0.5" />
              <div className="text-[10px] lg:text-xs text-[#56707A]">Per Q</div>
              <div className="text-lg lg:text-xl font-black text-white mt-0.5">10s</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] border-l-4 border-l-[#1CB0F6] p-3 lg:p-4">
          <p className="text-xs lg:text-sm text-[#56707A] leading-relaxed">
            Pick <span className="text-white font-bold">{MAX_PICKS} questions</span>{" "}
            from the categories below. Each question has{" "}
            <span className="text-white font-bold">10 seconds</span> to answer.
            Points: <span className="text-[#58CC02] font-bold">100</span>,{" "}
            <span className="text-[#FF9600] font-bold">200</span>,{" "}
            <span className="text-[#FF4B4B] font-bold">300</span>.
          </p>
        </div>

        {/* Jeopardy Board */}
        <div className="space-y-3 lg:space-y-4">
          {categories.map((category, categoryIndex) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.05 }}
              className="relative"
            >
              <div className="flex items-center gap-2 lg:gap-3 px-3 py-2 mb-2">
                <span className="text-xl lg:text-2xl">{category.emoji}</span>
                <span className="text-sm lg:text-base text-[#56707A] font-bold">{category.name}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 lg:gap-4 px-3">
                {([100, 200, 300] as const).map((value) => {
                  const isPicked = isQuestionPicked(category.id, value);
                  const pickedQuestion = pickedQuestions.find(
                    (pq) => pq.categoryId === category.id && pq.value === value
                  );

                  return (
                    <motion.button
                      key={value}
                      whileHover={
                        !isPicked && pickedQuestions.length < MAX_PICKS
                          ? { scale: 1.02 }
                          : {}
                      }
                      whileTap={
                        !isPicked && pickedQuestions.length < MAX_PICKS
                          ? { scale: 0.98 }
                          : {}
                      }
                      className={`h-14 lg:h-18 rounded-xl transition-all relative text-white font-black lg:text-lg flex items-center justify-center ${
                        isPicked
                          ? pickedQuestion?.isCorrect
                            ? "bg-[#58CC02]/20 border-2 border-[#58CC02]"
                            : "bg-[#FF4B4B]/20 border-2 border-[#FF4B4B]"
                          : "border-b-4 hover:opacity-90 active:border-b-2 active:translate-y-[2px]"
                      }`}
                      style={{
                        backgroundColor: !isPicked ? `${category.accentColor}` : undefined,
                        borderBottomColor: !isPicked ? `${category.accentColor}CC` : undefined,
                      }}
                      onClick={() => handleQuestionSelect(category.id, value)}
                      disabled={isPicked || pickedQuestions.length >= MAX_PICKS}
                    >
                      {isPicked ? (
                        <div className="flex items-center justify-center">
                          {pickedQuestion?.isCorrect ? (
                            <CheckCircle2 className="size-5 lg:size-6 text-[#58CC02]" />
                          ) : (
                            <XCircle className="size-5 lg:size-6 text-[#FF4B4B]" />
                          )}
                        </div>
                      ) : (
                        <span>{value}</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Finish Button */}
        <AnimatePresence>
          {pickedQuestions.length >= MAX_PICKS && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <button
                className="w-full py-3.5 lg:py-5 rounded-xl font-black text-white lg:text-lg bg-[#58CC02] border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all flex items-center justify-center gap-2"
                onClick={handleContinue}
              >
                <Trophy className="size-4 lg:size-5" />
                Finish & View Results
              </button>
            </motion.div>
          )}
        </AnimatePresence>
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
