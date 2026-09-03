"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CircleCheck, CircleX, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LabFeedback {
  kind: "correct" | "wrong" | "info";
  text: string;
  /** Change key to re-trigger the animation for consecutive messages. */
  id: number;
}

/** Feedback state + a stable flash() helper (counter id keeps renders pure). */
export function useFeedback() {
  const idRef = useRef(0);
  const [feedback, setFeedback] = useState<LabFeedback | null>(null);

  const flash = useCallback((kind: LabFeedback["kind"], text: string) => {
    idRef.current += 1;
    setFeedback({ kind, text, id: idRef.current });
  }, []);

  const clearFeedback = useCallback(() => setFeedback(null), []);

  return { feedback, flash, clearFeedback };
}

const KIND_STYLES = {
  correct: { icon: CircleCheck, className: "bg-brand-green/15 text-brand-green-light border-brand-green/40" },
  wrong: { icon: CircleX, className: "bg-brand-red-soft/15 text-brand-red-soft border-brand-red-soft/40" },
  info: { icon: Info, className: "bg-brand-cyan/15 text-brand-cyan border-brand-cyan/40" },
} as const;

/** Transient correct/wrong/info flash shown under a game board. */
export function FeedbackBanner({ feedback }: { feedback: LabFeedback | null }) {
  return (
    <div className="min-h-11">
      <AnimatePresence mode="wait">
        {feedback ? (
          <motion.div
            key={feedback.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold",
              KIND_STYLES[feedback.kind].className,
            )}
          >
            {(() => {
              const Icon = KIND_STYLES[feedback.kind].icon;
              return <Icon className="size-4 shrink-0" />;
            })()}
            <span className="min-w-0">{feedback.text}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
