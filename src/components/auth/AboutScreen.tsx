"use client";

import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/AppLogo";
import { ChevronLeft, Info } from "lucide-react";
import { motion } from "motion/react";

interface AboutScreenProps {
  onBack: () => void;
}

const paragraphs = [
  "QuizBall is a multiplayer football trivia game built for fans who want more than a simple quiz.",
  "Instead of only answering questions for points, players compete in live football-style matches. Correct answers help you control possession, create momentum, and score goals. The goal is to make football knowledge feel like an actual match: competitive, fast, social, and tense.",
  "QuizBall is designed for fans who follow clubs, players, tournaments, transfers, football history, and the small details that make the game interesting. You can challenge friends, test your football IQ, climb the leaderboard, and prove who really knows the game.",
  "Our mission is to turn football trivia into a real competitive experience — closer to a game than a static quiz.",
  "QuizBall is currently being developed and improved continuously. New modes, questions, rankings, and social features will be added over time.",
];

export function AboutScreen({ onBack }: AboutScreenProps) {
  return (
    <div className="relative min-h-screen w-full bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat text-white font-poppins">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 md:h-20 items-center justify-between px-6 md:px-12 lg:px-20 bg-surface-page-alt/80 backdrop-blur-md">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 rounded-full bg-white/10 px-4 font-poppins text-sm font-semibold text-white hover:bg-white/20 hover:text-white"
          onClick={onBack}
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <AppLogo size="md" />
        <div className="w-[72px]" />
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="rounded-[24px] bg-surface-card/40 backdrop-blur-sm p-6 md:p-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-cyan/15 text-brand-cyan">
                <Info className="size-5" />
              </div>
              <h1 className="font-poppins text-2xl md:text-3xl font-semibold tracking-tight text-white">
                About QuizBall
              </h1>
            </div>
            <p className="font-poppins text-sm font-medium text-white/55">
              Multiplayer football trivia — closer to a match than a quiz
            </p>

            <div className="my-6 h-px w-full bg-white/10" />

            {/* Body */}
            <div className="space-y-6">
              {paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className="font-poppins text-sm md:text-[15px] leading-relaxed text-white/70"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8">
        <p className="text-center font-poppins text-xs font-medium tracking-[0.18em] text-white/35">
          &copy; 2026 Quizball
        </p>
      </footer>
    </div>
  );
}
