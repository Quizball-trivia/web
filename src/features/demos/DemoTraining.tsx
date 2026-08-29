"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TrainingMatchScreen } from "@/features/training/TrainingMatchScreen";
import { useLocale } from "@/contexts/LocaleContext";
import type { CategorySummary } from "@/lib/domain";
import { getDemoGameQuestions } from "./data/demoQuestions";

const TRAINING_QUESTION_COUNT = 12;

function demoBanCategories(locale: "en" | "ka" | "es"): CategorySummary[] {
  const name = (en: string, ka: string) => (locale === "ka" ? ka : en);
  return [
    { id: "demo-cat-1", name: name("World Cup", "მსოფლიო ჩემპიონატი"), slug: "world-cup", icon: "🏆" },
    { id: "demo-cat-2", name: name("Premier League", "პრემიერ ლიგა"), slug: "premier-league", icon: "🦁" },
    { id: "demo-cat-3", name: name("Champions League", "ჩემპიონთა ლიგა"), slug: "champions-league", icon: "⭐" },
    { id: "demo-cat-4", name: name("Legends", "ლეგენდები"), slug: "legends", icon: "🐐" },
  ];
}

export function DemoTraining() {
  const router = useRouter();
  const { locale } = useLocale();

  const questions = useMemo(
    () => getDemoGameQuestions(locale).slice(0, TRAINING_QUESTION_COUNT),
    [locale],
  );
  const banCategories = useMemo(() => demoBanCategories(locale), [locale]);

  const handleComplete = useCallback(() => {
    router.push("/demos");
  }, [router]);

  const resultsCopy = useMemo(
    () =>
      locale === "ka"
        ? {
            message: "ასე გამოიყურება ჩვენი მთავარი 1v1 რეჟიმი — რეიტინგულ თამაშში მოწინააღმდეგე ნამდვილი მოთამაშეა.",
            cta: "დემოებზე დაბრუნება",
          }
        : {
            message: "That's our flagship 1v1 mode — in ranked play the opponent is a real player.",
            cta: "Back to demos",
          },
    [locale],
  );

  return (
    <TrainingMatchScreen
      onComplete={handleComplete}
      banCategoriesOverride={banCategories}
      questionsOverride={questions}
      resultsCopy={resultsCopy}
    />
  );
}
