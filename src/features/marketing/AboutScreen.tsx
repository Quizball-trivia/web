"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/AppLogo";
import { ChevronLeft, Info } from "lucide-react";
import { motion } from "motion/react";
import type { AboutCopy } from "@/lib/i18n/copy";
import type { Locale } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

interface AboutScreenProps {
  copy: AboutCopy;
  locale: Locale;
}

const BACK_LABEL: Record<Locale, string> = { en: "Back", ka: "უკან" };

export function AboutScreen({ copy, locale }: AboutScreenProps) {
  const router = useRouter();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/${locale}`);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat text-white font-poppins">
      <header className="sticky top-0 z-50 flex h-16 md:h-20 items-center justify-between px-6 md:px-12 lg:px-20 bg-surface-page-alt/80 backdrop-blur-md">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 rounded-full bg-white/10 px-4 font-poppins text-sm font-semibold text-white hover:bg-white/20 hover:text-white"
          onClick={handleBack}
        >
          <ChevronLeft className="size-4" />
          {BACK_LABEL[locale]}
        </Button>
        <Link href={`/${locale}`} aria-label="QuizBall">
          <AppLogo size="md" />
        </Link>
        <LanguageSwitcher locale={locale} />
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="rounded-[24px] bg-surface-card/40 backdrop-blur-sm p-6 md:p-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-cyan/15 text-brand-cyan">
                <Info className="size-5" />
              </div>
              <h1 className="font-poppins text-2xl md:text-3xl font-semibold tracking-tight text-white">
                {copy.title}
              </h1>
            </div>
            <p className="font-poppins text-sm font-medium text-white/55">
              {copy.subtitle}
            </p>

            <div className="my-6 h-px w-full bg-white/10" />

            <div className="space-y-6">
              {copy.paragraphs.map((paragraph, idx) => (
                <p
                  key={idx}
                  className="font-poppins text-sm md:text-[15px] leading-relaxed text-white/70"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="py-8">
        <p className="text-center font-poppins text-xs font-medium tracking-[0.18em] text-white/35">
          &copy; 2026 Quizball
        </p>
      </footer>
    </div>
  );
}
