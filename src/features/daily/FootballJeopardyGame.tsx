"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  onBack: () => void;
  onComplete: (score: number) => void;
}

function isCareerPathQuestion(
  q: Question | CareerPathQuestion
): q is CareerPathQuestion {
  return "teams" in q && "acceptedAnswers" in q;
}

const createJeopardyCategories = (): JeopardyCategory[] => {
  return [
    {
      id: "career-paths",
      name: "Career Paths",
      emoji: "🛣️",
      accentColor: "#a855f7",
      isCareerPath: true,
      questions: {
        100: {
          id: "cp-100",
          teams: [
            { name: "Man United", emoji: "🔴" },
            { name: "Real Madrid", emoji: "⚪" },
            { name: "Juventus", emoji: "⚫" },
            { name: "Al Nassr", emoji: "🟡" },
          ],
          correctAnswer: "Cristiano Ronaldo",
          acceptedAnswers: ["ronaldo", "cristiano ronaldo", "cr7", "cristiano"],
          difficulty: "easy",
        } as CareerPathQuestion,
        200: {
          id: "cp-200",
          teams: [
            { name: "Barcelona", emoji: "🔵" },
            { name: "PSG", emoji: "🔴" },
            { name: "Inter Miami", emoji: "🩷" },
          ],
          correctAnswer: "Lionel Messi",
          acceptedAnswers: ["messi", "lionel messi", "leo messi"],
          difficulty: "medium",
        } as CareerPathQuestion,
        300: {
          id: "cp-300",
          teams: [
            { name: "Everton", emoji: "🔵" },
            { name: "Man City", emoji: "🩵" },
            { name: "Chelsea", emoji: "🔵" },
            { name: "NY City FC", emoji: "🩵" },
          ],
          correctAnswer: "Frank Lampard",
          acceptedAnswers: ["lampard", "frank lampard"],
          difficulty: "hard",
        } as CareerPathQuestion,
      },
    },
    {
      id: "transfer-records",
      name: "Transfer Records",
      emoji: "💰",
      accentColor: "#f59e0b",
      questions: {
        100: {
          id: "tr-100",
          question:
            "Which player became the world's most expensive footballer when he joined PSG in 2017?",
          options: ["Cristiano Ronaldo", "Kylian Mbappé", "Neymar Jr", "Paul Pogba"],
          correctAnswer: 2,
          category: "Transfer Records",
          difficulty: "easy",
          clue: "Brazilian forward who left Barcelona",
        },
        200: {
          id: "tr-200",
          question:
            "Which club paid a world record £100 million for Jack Grealish in 2021?",
          options: ["Manchester United", "Chelsea", "Manchester City", "Liverpool"],
          correctAnswer: 2,
          category: "Transfer Records",
          difficulty: "medium",
          clue: "Premier League club managed by Pep Guardiola",
        },
        300: {
          id: "tr-300",
          question:
            "Who holds the record as the most expensive goalkeeper in history after his 2018 move to Chelsea?",
          options: ["Alisson Becker", "Kepa Arrizabalaga", "Ederson", "Jan Oblak"],
          correctAnswer: 1,
          category: "Transfer Records",
          difficulty: "hard",
          clue: "Spanish goalkeeper from Athletic Bilbao",
        },
      },
    },
    {
      id: "iconic-moments",
      name: "Iconic Moments",
      emoji: "⚡",
      accentColor: "#3b82f6",
      questions: {
        100: {
          id: "im-100",
          question:
            "Which player scored a famous overhead kick goal in the 2018 Champions League against Juventus?",
          options: ["Lionel Messi", "Cristiano Ronaldo", "Karim Benzema", "Gareth Bale"],
          correctAnswer: 1,
          category: "Iconic Moments",
          difficulty: "easy",
          clue: "Portuguese legend who later joined Juventus",
        },
        200: {
          id: "im-200",
          question:
            'In which year did Sergio Agüero score the famous "93:20" title-winning goal for Manchester City?',
          options: ["2010", "2011", "2012", "2013"],
          correctAnswer: 2,
          category: "Iconic Moments",
          difficulty: "medium",
          clue: "Year of the London Olympics",
        },
        300: {
          id: "im-300",
          question:
            'Which team completed the "Remontada" by overturning a 4-0 deficit against PSG in 2017?',
          options: ["Real Madrid", "Barcelona", "Bayern Munich", "Manchester United"],
          correctAnswer: 1,
          category: "Iconic Moments",
          difficulty: "hard",
          clue: "Catalan club at Camp Nou",
        },
      },
    },
  ];
};

type PickedQuestion = {
  categoryId: string;
  value: 100 | 200 | 300;
  isCorrect?: boolean;
};

export function FootballJeopardyGame({
  onBack,
  onComplete,
}: FootballJeopardyGameProps) {
  const [categories] = useState<JeopardyCategory[]>(createJeopardyCategories());
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

  const MAX_PICKS = 5;
  const MAX_TIME = 10;
  const remainingPicks = MAX_PICKS - pickedQuestions.length;

  useEffect(() => {
    if (!timerActive || timeRemaining <= 0 || showResult) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          handleTimeUp();
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, timeRemaining, showResult]);

  const handleTimeUp = () => {
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
        { categoryId, value: questionValue as 100 | 200 | 300, isCorrect: false },
      ]);
    }
  };

  const getCurrentQuestionValue = (): number => {
    if (!currentQuestion || !currentCategory) return 100;

    for (const [value, q] of Object.entries(currentCategory.questions)) {
      const question = q as Question | CareerPathQuestion;
      if (question.id === currentQuestion.id) {
        return parseInt(value);
      }
    }
    return 100;
  };

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

  const handleCareerPathSubmit = (timeUp: boolean = false) => {
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
  };

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
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div
                  className="flex size-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${currentCategory?.accentColor}20` }}
                >
                  <span className="text-xl">{currentCategory?.emoji}</span>
                </div>
                <div>
                  <h2 className="text-sm font-medium">
                    {currentCategory?.name || "Question"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Question {pickedQuestions.length + 1} of {MAX_PICKS}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="gap-1 h-7"
                  style={{
                    borderColor: currentCategory?.accentColor,
                    color: currentCategory?.accentColor,
                  }}
                >
                  <Coins className="size-3" />
                  {getCurrentQuestionValue()}
                </Badge>
                <Badge variant="secondary" className="gap-1 h-7">
                  <Trophy className="size-3" />
                  {totalScore}
                </Badge>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock
                    className={`size-3.5 ${isLowTime ? "text-destructive" : "text-muted-foreground"}`}
                  />
                  <span
                    className={`text-xs ${isLowTime ? "text-destructive" : ""}`}
                  >
                    {timeRemaining}s remaining
                  </span>
                </div>
              </div>
              <div className="relative h-1 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    isLowTime ? "bg-destructive" : ""
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
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          <AnimatePresence mode="wait">
            {isCareerPath ? (
              <motion.div
                key="career-path"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card
                  className="border-l-4"
                  style={{ borderLeftColor: currentCategory?.accentColor }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Star
                        className="size-4"
                        style={{ color: currentCategory?.accentColor }}
                      />
                      Identify the player from their career path
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-center gap-2.5 flex-wrap">
                      {currentQuestion.teams.map((team, index) => (
                        <React.Fragment key={index}>
                          <motion.div
                            className="flex flex-col items-center gap-1.5"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div
                              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl border-2"
                              style={{
                                borderColor: currentCategory?.accentColor,
                                backgroundColor: `${currentCategory?.accentColor}10`,
                              }}
                            >
                              {team.emoji}
                            </div>
                            <div className="text-xs text-center max-w-[80px] text-muted-foreground">
                              {team.name}
                            </div>
                          </motion.div>
                          {index < currentQuestion.teams.length - 1 && (
                            <ArrowRight
                              className="size-5 shrink-0 mb-5"
                              style={{ color: currentCategory?.accentColor }}
                            />
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {!showResult ? (
                      <div className="space-y-2">
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
                          className="text-center h-10 border-2"
                          style={{
                            borderColor: textAnswer
                              ? currentCategory?.accentColor
                              : undefined,
                          }}
                          disabled={showResult}
                          autoFocus
                        />
                        <p className="text-xs text-center text-muted-foreground">
                          Press Enter to submit
                        </p>
                      </div>
                    ) : (
                      <div
                        className={`p-3 rounded-xl border-2 ${
                          pickedQuestions[pickedQuestions.length - 1]?.isCorrect
                            ? "bg-green-500/10 border-green-500"
                            : "bg-red-500/10 border-red-500"
                        }`}
                      >
                        <div className="text-center space-y-1.5">
                          <div className="flex items-center justify-center gap-2">
                            {pickedQuestions[pickedQuestions.length - 1]
                              ?.isCorrect ? (
                              <CheckCircle2 className="size-5 text-green-600" />
                            ) : (
                              <XCircle className="size-5 text-red-600" />
                            )}
                            <span className="text-sm font-medium">
                              {pickedQuestions[pickedQuestions.length - 1]
                                ?.isCorrect
                                ? "Correct!"
                                : "Incorrect"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Answer:{" "}
                            <span className="text-foreground">
                              {currentQuestion.correctAnswer}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="multiple-choice"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card
                  className="border-l-4"
                  style={{ borderLeftColor: currentCategory?.accentColor }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm leading-relaxed">
                      {(currentQuestion as Question).question}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
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
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all text-sm ${
                            showCorrect
                              ? "bg-green-500/10 border-green-500"
                              : showIncorrect
                                ? "bg-red-500/10 border-red-500"
                                : isSelected
                                  ? "border-transparent"
                                  : "bg-secondary/30 hover:bg-secondary/50 border-transparent"
                          }`}
                          style={{
                            backgroundColor:
                              isSelected && !showResult
                                ? `${currentCategory?.accentColor}15`
                                : undefined,
                            borderColor:
                              isSelected && !showResult
                                ? currentCategory?.accentColor
                                : undefined,
                          }}
                          onClick={() => handleAnswerSelect(index)}
                          disabled={showResult}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all ${
                                showCorrect
                                  ? "border-2 border-green-500 bg-green-500 text-white"
                                  : showIncorrect
                                    ? "border-2 border-red-500 bg-red-500 text-white"
                                    : isSelected
                                      ? "text-white"
                                      : "border-2 border-muted-foreground/30"
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
                                <CheckCircle2 className="size-3.5" />
                              ) : showIncorrect ? (
                                <XCircle className="size-3.5" />
                              ) : (
                                String.fromCharCode(65 + index)
                              )}
                            </div>
                            <span>{option}</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {!showResult ? (
              <Button
                key="submit"
                className="w-full h-11 text-white"
                style={{ backgroundColor: currentCategory?.accentColor }}
                onClick={
                  isCareerPath ? () => handleCareerPathSubmit() : handleSubmitAnswer
                }
                disabled={isCareerPath ? !textAnswer.trim() : selectedAnswer === null}
              >
                <Sparkles className="size-4 mr-2" />
                Submit Answer
              </Button>
            ) : (
              <div key="continue" className="space-y-2.5">
                {pickedQuestions[pickedQuestions.length - 1]?.isCorrect && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center p-3 rounded-lg bg-green-500/10 border-2 border-green-500/30"
                  >
                    <p className="text-sm text-green-600 flex items-center justify-center gap-2 font-medium">
                      <Coins className="size-4" />+{getCurrentQuestionValue()} points
                      earned
                    </p>
                  </motion.div>
                )}
                <Button className="w-full h-11" onClick={handleContinue}>
                  {pickedQuestions.length >= MAX_PICKS ? (
                    <>
                      <Trophy className="size-4 mr-2" />
                      View Results
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="size-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Jeopardy board view
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center justify-center size-9 rounded-xl hover:bg-secondary active:scale-95 transition-all"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Brain className="size-5 text-primary" />
                <h1 className="text-lg font-bold">Football Jeopardy</h1>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1.5">
              <Trophy className="size-3.5 text-primary" />
              {totalScore}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="pt-2.5 pb-2.5">
              <div className="flex flex-col items-center">
                <Target className="size-4 text-primary mb-0.5" />
                <div className="text-[10px] text-muted-foreground">Picks Left</div>
                <div className="text-lg font-bold mt-0.5">{remainingPicks}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-2.5 pb-2.5">
              <div className="flex flex-col items-center">
                <Trophy className="size-4 text-primary mb-0.5" />
                <div className="text-[10px] text-muted-foreground">Correct</div>
                <div className="text-lg font-bold mt-0.5">{correctAnswers}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-2.5 pb-2.5">
              <div className="flex flex-col items-center">
                <Clock className="size-4 text-primary mb-0.5" />
                <div className="text-[10px] text-muted-foreground">Per Q</div>
                <div className="text-lg font-bold mt-0.5">10s</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardContent className="pt-2.5 pb-2.5">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pick <span className="text-foreground font-medium">{MAX_PICKS} questions</span>{" "}
              from the categories below. Each question has{" "}
              <span className="text-foreground font-medium">10 seconds</span> to answer.
              Points: <span className="text-green-600">100</span>,{" "}
              <span className="text-orange-600">200</span>,{" "}
              <span className="text-red-600">300</span>.
            </p>
          </CardContent>
        </Card>

        {/* Jeopardy Board */}
        <div className="space-y-3">
          {categories.map((category, categoryIndex) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.05 }}
              className="relative"
            >
              <div className="flex items-center gap-2 px-3 py-2 mb-2">
                <span className="text-xl">{category.emoji}</span>
                <span className="text-sm text-muted-foreground">{category.name}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 px-3">
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
                      className={`h-14 rounded-xl transition-all relative text-white font-bold flex items-center justify-center shadow-sm ${
                        isPicked
                          ? pickedQuestion?.isCorrect
                            ? "bg-green-500/20 border-2 border-green-500"
                            : "bg-red-500/20 border-2 border-red-500"
                          : "hover:opacity-90"
                      }`}
                      style={{
                        backgroundColor: !isPicked ? `${category.accentColor}` : undefined,
                      }}
                      onClick={() => handleQuestionSelect(category.id, value)}
                      disabled={isPicked || pickedQuestions.length >= MAX_PICKS}
                    >
                      {isPicked ? (
                        <div className="flex items-center justify-center">
                          {pickedQuestion?.isCorrect ? (
                            <CheckCircle2 className="size-5 text-green-600" />
                          ) : (
                            <XCircle className="size-5 text-red-600" />
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
              <Button
                className="w-full h-12 bg-primary hover:bg-primary/90"
                onClick={handleContinue}
              >
                <Trophy className="size-4 mr-2" />
                Finish & View Results
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
