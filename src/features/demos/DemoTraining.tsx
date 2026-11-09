"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { TrainingMatchScreen } from "@/features/training/TrainingMatchScreen";
import { useLocale } from "@/contexts/LocaleContext";
import type { CategorySummary } from "@/lib/domain";
import { getDemoGameQuestions } from "./data/demoQuestions";
import type { Locale } from "@/lib/i18n/messages";

const TRAINING_QUESTION_COUNT = 12;

function demoBanCategories(locale: Locale): CategorySummary[] {
  const name = (en: string, ka: string) => (locale === "ka" ? ka : en);
  return [
    { id: "demo-cat-1", name: name("World Cup", "მსოფლიო ჩემპიონატი"), slug: "world-cup", icon: "🏆" },
    { id: "demo-cat-2", name: name("Premier League", "პრემიერ ლიგა"), slug: "premier-league", icon: "🦁" },
    { id: "demo-cat-3", name: name("Champions League", "ჩემპიონთა ლიგა"), slug: "champions-league", icon: "⭐" },
    { id: "demo-cat-4", name: name("Legends", "ლეგენდები"), slug: "legends", icon: "🐐" },
  ];
}

export function DemoTraining({ backHref = "/demos", onExit }: { backHref?: string; onExit?: () => void } = {}) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const embedded = Boolean(onExit);

  const questions = useMemo(
    () => getDemoGameQuestions(locale).slice(0, TRAINING_QUESTION_COUNT),
    [locale],
  );
  const banCategories = useMemo(() => demoBanCategories(locale), [locale]);

  const handleComplete = useCallback(() => {
    if (onExit) onExit();
    else router.push(backHref);
  }, [onExit, backHref, router]);

  const resultsCopy = useMemo(
    () => ({
      message: t("training.demoEndMessage"),
      cta: embedded ? t("training.demoEndDone") : t("training.demoBack"),
    }),
    [t, embedded],
  );

  return (
    <TrainingMatchScreen
      onComplete={handleComplete}
      banCategoriesFallback={banCategories}
      questionsOverride={questions}
      resultsCopy={resultsCopy}
    />
  );
}
