"use client";

import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/AppLogo";
import { ChevronLeft, ScrollText } from "lucide-react";
import { motion } from "motion/react";

interface TermsOfServiceScreenProps {
  onBack: () => void;
}

const sections = [
  {
    title: "1. Acceptance of Terms",
    content:
      'By accessing or using QuizBall ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.',
  },
  {
    title: "2. Description of Service",
    content:
      "QuizBall is a real-time multiplayer football trivia game. We provide a platform for users to compete in quiz matches, earn ratings, and track their progress. We reserve the right to modify or discontinue the Service at any time without notice.",
  },
  {
    title: "3. User Accounts",
    content:
      "You are responsible for maintaining the confidentiality of your account credentials. You agree to accept responsibility for all activities that occur under your account. We reserve the right to terminate accounts that violate our community guidelines or cheat in competitive play.",
  },
  {
    title: "4. Virtual Currency and Items",
    content:
      'The Service may include virtual currency ("Coins") or items. These items have no real-world value and cannot be exchanged for cash. We do not guarantee, and are not responsible for, the persistence of user data or virtual items.',
  },
  {
    title: "5. Prohibited Conduct",
    content:
      "You agree not to use the Service for any unlawful purpose or to:",
    bullets: [
      "Harass, abuse, or harm another person.",
      "Use bots, cheats, or automation software.",
      "Interfere with the proper operation of the Service.",
    ],
  },
  {
    title: "6. Limitation of Liability",
    content:
      "In no event shall QuizBall, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.",
  },
  {
    title: "7. Changes to Terms",
    content:
      "We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect.",
  },
  {
    title: "8. Contact Us",
    content:
      "If you have any questions about these Terms, please contact us at support@quizball.com.",
  },
];

export function TermsOfServiceScreen({ onBack }: TermsOfServiceScreenProps) {
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
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand-green/15 text-brand-green">
                <ScrollText className="size-5" />
              </div>
              <h1 className="font-poppins text-2xl md:text-3xl font-semibold tracking-tight text-white">
                Terms of Service
              </h1>
            </div>
            <p className="font-poppins text-sm font-medium text-white/55">
              Last updated: January 30, 2026
            </p>

            <div className="my-6 h-px w-full bg-white/10" />

            {/* Sections */}
            <div className="space-y-8">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="mb-3 font-poppins text-base md:text-lg font-semibold text-white">
                    {section.title}
                  </h2>
                  <p className="font-poppins text-sm md:text-[15px] leading-relaxed text-white/70">
                    {section.content}
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

      {/* Footer */}
      <footer className="py-8">
        <p className="text-center font-poppins text-xs font-medium tracking-[0.18em] text-white/35">
          &copy; 2026 Quizball
        </p>
      </footer>
    </div>
  );
}
