"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from 'motion/react';

import { Input } from "@/components/ui/input";
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
import { QuitGameDialog } from "./QuitGameDialog";

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
  const [lastAwardedPoints, setLastAwardedPoints] = useState(0);
  const [showQuitDialog, setShowQuitDialog] = useState(false);

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
        return "text-brand-cyan";
      case "manager":
        return "text-brand-purple";
      case "club":
        return "text-brand-green-light";
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

    let points = 0;
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);

      const streakBonus = Math.min(newStreak - 1, 5) * 10;
      points = 50 + streakBonus;
      setLastAwardedPoints(points);
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
        onComplete(score + points);
      }
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !showFeedback) {
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-surface-deep font-fun flex flex-col">
      {/* Header */}
      <div className="bg-surface-card border-b-[3px] border-surface-deep">
        <div className="max-w-2xl mx-auto px-3 md:px-4 py-2.5 md:py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQuitDialog(true)}
                className="flex items-center justify-center size-9 rounded-xl hover:bg-surface-card-tint active:scale-95 transition-all text-white"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-brand-cyan" />
                <h1 className="text-lg md:text-xl font-black uppercase text-white">Emoji Guess</h1>
              </div>
            </div>
          </div>

          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand-green-light rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-brand-slate font-bold">
              Question {currentQuestionIndex + 1}/{questions.length}
            </div>
            <div className="flex items-center gap-3">
              {streak > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-orange/15 border border-brand-orange/30 text-brand-orange">
                  🔥 {streak} streak
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-surface-card-tint text-brand-cyan">
                <Coins className="size-3" />
                {score}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 pb-20 overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full flex flex-col items-center justify-center flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
          >
            <div className="bg-surface-card rounded-xl border-b-4 border-surface-card-deeper p-5 md:p-6">
              {/* Answer Type Badge */}
              <div className="flex justify-center mb-6">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-card-tint ${getAnswerTypeColor(currentQuestion.answerType)}`}>
                  {getAnswerTypeIcon(currentQuestion.answerType)}
                  {currentQuestion.answerType.charAt(0).toUpperCase() +
                    currentQuestion.answerType.slice(1)}
                </span>
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
                  onKeyDown={handleKeyDown}
                  disabled={showFeedback}
                  className="bg-surface-card-tint border-2 border-surface-card text-white placeholder:text-brand-slate focus:border-brand-cyan text-center h-12 text-base rounded-xl"
                  autoFocus
                />

                <button
                  onClick={handleSubmit}
                  disabled={!userAnswer.trim() || showFeedback}
                  className="w-full py-3 rounded-xl font-black text-white bg-brand-green-light border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all disabled:opacity-50 disabled:active:border-b-4 disabled:active:translate-y-0"
                >
                  {showFeedback ? "Next..." : "Submit Answer"}
                </button>
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
                      className={`flex items-center justify-center gap-2 p-4 rounded-xl border-b-4 ${
                        isCorrect
                          ? "bg-brand-green-light/15 border-b-[#46A302]"
                          : "bg-brand-red-soft/10 border-b-[#CC3C3C]"
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="size-5 text-brand-green-light" />
                          <span className="text-sm font-bold text-brand-green-light">
                            Correct! +{lastAwardedPoints} coins
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="size-5 text-brand-red-soft" />
                          <div className="text-sm text-center">
                            <div className="font-bold text-brand-red-soft">Incorrect!</div>
                            <div className="mt-1 text-brand-slate">
                              Answer: {currentQuestion.displayAnswer}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="text-center mt-4 text-xs text-brand-slate">
              Guess the {currentQuestion.answerType} represented by the emojis
            </div>
          </motion.div>
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
