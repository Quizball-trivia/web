"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  User,
  Building2,
  UserCog,
  Sparkles,
  Coins,
  ArrowLeft,
} from "lucide-react";

interface EmojiQuestion {
  id: string;
  emojis: string;
  answerType: "player" | "manager" | "club";
  acceptedAnswers: string[];
  displayAnswer: string;
}

interface EmojiGuessGameProps {
  onBack: () => void;
  onComplete: (score: number) => void;
}

// Mock questions for testing
const MOCK_QUESTIONS: EmojiQuestion[] = [
  {
    id: "eg-1",
    emojis: "🐐⚽🇦🇷",
    answerType: "player",
    acceptedAnswers: ["messi", "lionel messi", "leo messi"],
    displayAnswer: "Lionel Messi",
  },
  {
    id: "eg-2",
    emojis: "🔴👹⚽🇧🇷",
    answerType: "club",
    acceptedAnswers: ["man united", "manchester united", "man utd"],
    displayAnswer: "Manchester United",
  },
  {
    id: "eg-3",
    emojis: "⚽🎯🔵🌙",
    answerType: "club",
    acceptedAnswers: ["chelsea", "chelsea fc"],
    displayAnswer: "Chelsea",
  },
  {
    id: "eg-4",
    emojis: "🇵🇹7️⃣⚽💪",
    answerType: "player",
    acceptedAnswers: ["ronaldo", "cristiano ronaldo", "cr7"],
    displayAnswer: "Cristiano Ronaldo",
  },
  {
    id: "eg-5",
    emojis: "🏆🧠⚽🇪🇸",
    answerType: "manager",
    acceptedAnswers: ["guardiola", "pep guardiola", "pep"],
    displayAnswer: "Pep Guardiola",
  },
];

export function EmojiGuessGame({ onBack, onComplete }: EmojiGuessGameProps) {
  const [questions] = useState<EmojiQuestion[]>(MOCK_QUESTIONS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const getAnswerTypeIcon = (type: "player" | "manager" | "club") => {
    switch (type) {
      case "player":
        return <User className="size-4" />;
      case "manager":
        return <UserCog className="size-4" />;
      case "club":
        return <Building2 className="size-4" />;
    }
  };

  const getAnswerTypeColor = (type: "player" | "manager" | "club") => {
    switch (type) {
      case "player":
        return "text-blue-500";
      case "manager":
        return "text-purple-500";
      case "club":
        return "text-green-500";
    }
  };

  const handleSubmit = () => {
    if (!userAnswer.trim()) return;

    const normalizedAnswer = userAnswer.toLowerCase().trim();
    const correct = currentQuestion.acceptedAnswers.some(
      (accepted) => normalizedAnswer === accepted.toLowerCase()
    );

    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);

      const basePoints = 50;
      const streakBonus = Math.min(newStreak - 1, 5) * 10;
      const points = basePoints + streakBonus;
      setScore((prev) => prev + points);
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setUserAnswer("");
        setShowFeedback(false);
      } else {
        const finalScore = correct
          ? score + 50 + Math.min(streak, 5) * 10
          : score;
        onComplete(finalScore);
      }
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !showFeedback) {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="flex items-center justify-center size-9 rounded-xl hover:bg-secondary active:scale-95 transition-all"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h1 className="text-xl font-bold">Emoji Guess</h1>
              </div>
            </div>
          </div>

          <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-muted-foreground">
              Question {currentQuestionIndex + 1}/{questions.length}
            </div>
            <div className="flex items-center gap-3">
              {streak > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-orange-500/10 border-orange-500/30"
                >
                  🔥 {streak} streak
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-xs bg-primary/10 border-primary/30"
              >
                <Coins className="size-3 mr-1" />
                {score}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <Card className="border-2">
              <CardContent className="pt-8 pb-6">
                {/* Answer Type Badge */}
                <div className="flex justify-center mb-6">
                  <Badge variant="outline" className="text-xs px-3 py-1">
                    <span
                      className={`flex items-center gap-1.5 ${getAnswerTypeColor(currentQuestion.answerType)}`}
                    >
                      {getAnswerTypeIcon(currentQuestion.answerType)}
                      {currentQuestion.answerType.charAt(0).toUpperCase() +
                        currentQuestion.answerType.slice(1)}
                    </span>
                  </Badge>
                </div>

                {/* Emojis */}
                <div className="text-center mb-8">
                  <div className="text-7xl mb-4 select-none">
                    {currentQuestion.emojis}
                  </div>
                </div>

                {/* Input */}
                <div className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Type your answer..."
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={showFeedback}
                    className="text-center h-12 text-base"
                    autoFocus
                  />

                  <Button
                    onClick={handleSubmit}
                    disabled={!userAnswer.trim() || showFeedback}
                    className="w-full h-12"
                    size="lg"
                  >
                    {showFeedback ? "Next..." : "Submit Answer"}
                  </Button>
                </div>

                {/* Feedback */}
                <AnimatePresence>
                  {showFeedback && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="mt-6"
                    >
                      <div
                        className={`flex items-center justify-center gap-2 p-4 rounded-lg ${
                          isCorrect
                            ? "bg-green-500/10 text-green-600"
                            : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="size-5" />
                            <span className="text-sm font-medium">
                              Correct! +{50 + Math.min(streak, 5) * 10} coins
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="size-5" />
                            <div className="text-sm text-center">
                              <div className="font-medium">Incorrect!</div>
                              <div className="mt-1">
                                Answer: {currentQuestion.displayAnswer}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            <div className="text-center mt-4 text-xs text-muted-foreground">
              Guess the {currentQuestion.answerType} represented by the emojis
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
