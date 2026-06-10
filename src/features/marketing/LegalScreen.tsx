"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/AppLogo";
import { ChevronLeft, ScrollText, ShieldCheck, Info, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import type { LegalCopy } from "@/lib/i18n/copy";
import type { Locale } from "@/lib/i18n/locale";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";

interface LegalScreenProps {
  copy: LegalCopy;
  locale: Locale;
  variant: "terms" | "privacy" | "about-legal";
}

const ICONS: Record<LegalScreenProps["variant"], { icon: LucideIcon; tint: string; text: string }> = {
  terms: { icon: ScrollText, tint: "bg-brand-green/15", text: "text-brand-green" },
  privacy: { icon: ShieldCheck, tint: "bg-brand-cyan/15", text: "text-brand-cyan" },
  "about-legal": { icon: Info, tint: "bg-brand-cyan/15", text: "text-brand-cyan" },
};

const BACK_LABEL: Record<Locale, string> = { en: "Back", ka: "უკან" };

export function LegalScreen({ copy, locale, variant }: LegalScreenProps) {
  const router = useRouter();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/${locale}`);
    }
  };

  const { icon: Icon, tint, text } = ICONS[variant];

  return (
    <div className="relative min-h-screen w-full bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat text-white font-poppins">
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
              <div className={`flex size-10 items-center justify-center rounded-xl ${tint} ${text}`}>
                <Icon className="size-5" />
              </div>
              <h1 className="font-poppins text-2xl md:text-3xl font-semibold tracking-tight text-white">
                {copy.title}
              </h1>
            </div>
            <p className="font-poppins text-sm font-medium text-white/55">
              {copy.updated}
            </p>

            <div className="my-6 h-px w-full bg-white/10" />

            <div className="space-y-8">
              {copy.sections.map((section) => (
                <section key={section.title}>
                  <h2 className="mb-3 font-poppins text-base md:text-lg font-semibold text-white">
                    {section.title}
                  </h2>
                  <p className="font-poppins text-sm md:text-[15px] leading-relaxed text-white/70">
                    {section.body}
                  </p>
                  {section.bullets && (
                    <ul className="mt-3 space-y-1.5">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-2 font-poppins text-sm md:text-[15px] text-white/70"
                        >
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-green" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
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
