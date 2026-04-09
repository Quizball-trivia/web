"use client";

import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/AppLogo";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

interface PrivacyPolicyScreenProps {
  onBack: () => void;
}

const sections = [
  {
    title: "1. Introduction",
    content:
      'QuizBall ("us", "we", or "our") operates the quizball.com website and mobile application (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.',
  },
  {
    title: "2. Information Collection and Use",
    content:
      "We collect several different types of information for various purposes to provide and improve our Service to you:",
    bullets: [
      "Personal Data: While using our Service, we may ask you to provide certain personally identifiable information (e.g., email address, nickname).",
      "Usage Data: We may also collect information on how the Service is accessed and used (e.g., gameplay statistics, device information).",
    ],
  },
  {
    title: "3. Use of Data",
    content: "QuizBall uses the collected data for various purposes:",
    bullets: [
      "To provide and maintain the Service",
      "To notify you about changes to our Service",
      "To allow you to participate in interactive features",
      "To provide customer care and support",
      "To monitor the usage of the Service",
    ],
  },
  {
    title: "4. Data Security",
    content:
      "The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.",
  },
  {
    title: "5. Third-Party Services",
    content:
      'We may employ third party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, or to assist us in analyzing how our Service is used. These third parties have access to your Personal Data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.',
  },
  {
    title: "6. Children's Privacy",
    content:
      'Our Service does not address anyone under the age of 13 ("Children"). We do not knowingly collect personally identifiable information from anyone under the age of 13. If you are a parent or guardian and you are aware that your child has provided us with Personal Data, please contact us.',
  },
  {
    title: "7. Data Retention",
    content:
      "We will retain your Personal Data only for as long as is necessary for the purposes set out in this Privacy Policy. We will retain and use your data to the extent necessary to comply with our legal obligations, resolve disputes, and enforce our policies.",
  },
  {
    title: "8. Your Rights",
    content: "You have the right to:",
    bullets: [
      "Access the personal data we hold about you",
      "Request correction of inaccurate data",
      "Request deletion of your data",
      "Object to processing of your data",
      "Request data portability",
    ],
  },
  {
    title: "9. Contact Us",
    content:
      "If you have any questions about this Privacy Policy, please contact us at privacy@quizball.com.",
  },
];

export function PrivacyPolicyScreen({ onBack }: PrivacyPolicyScreenProps) {
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
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#58CC02]/15 text-[#58CC02]">
                <ShieldCheck className="size-5" />
              </div>
              <h1 className="font-fun text-2xl md:text-3xl font-black tracking-tight text-white">
                Privacy Policy
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
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#58CC02]" />
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
