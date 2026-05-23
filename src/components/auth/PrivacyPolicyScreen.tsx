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
                <ShieldCheck className="size-5" />
              </div>
              <h1 className="font-poppins text-2xl md:text-3xl font-semibold tracking-tight text-white">
                Privacy Policy
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
