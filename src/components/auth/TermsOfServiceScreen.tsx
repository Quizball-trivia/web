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
    <div className="min-h-screen w-full bg-[#131F24] text-white font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 md:h-20 items-center justify-between px-6 md:px-12 lg:px-20 bg-[#131F24]/80 backdrop-blur-md border-b border-white/6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-[#56707A] hover:text-white hover:bg-white/5"
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
          {/* Title card */}
          <div className="mb-8 rounded-2xl bg-[#1B2F36] border border-white/8 border-b-4 border-b-[#14242a] p-6 md:p-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#1CB0F6]/15 text-[#1CB0F6]">
                <ScrollText className="size-5" />
              </div>
              <h1 className="font-fun text-2xl md:text-3xl font-black tracking-tight text-white">
                Terms of Service
              </h1>
            </div>
            <p className="text-sm font-bold text-[#56707A]">
              Last updated: January 30, 2026
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-4">
            {sections.map((section, i) => (
              <motion.section
                key={section.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08 * i }}
                className="rounded-2xl bg-[#1B2F36]/60 border border-white/6 border-b-4 border-b-[#14242a] p-5 md:p-6"
              >
                <h2 className="font-fun mb-3 text-base md:text-lg font-black text-white">
                  {section.title}
                </h2>
                <p className="text-sm md:text-[15px] leading-relaxed text-white/60">
                  {section.content}
                </p>
                {section.bullets && (
                  <ul className="mt-3 space-y-1.5">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-2 text-sm md:text-[15px] text-white/60"
                      >
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#1CB0F6]" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.section>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/6 py-8">
        <p className="text-center text-xs font-bold uppercase tracking-[0.28em] text-white/25">
          &copy; 2026 QuizBall
        </p>
      </footer>
    </div>
  );
}
