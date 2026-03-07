"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface TrainingTooltipProps {
  title: string;
  message: string;
  position: "top" | "center" | "bottom";
  onDismiss: () => void;
  onSkip: () => void;
}

export function TrainingTooltip({ title, message, position, onDismiss, onSkip }: TrainingTooltipProps) {
  return (
    <div className="fixed inset-0 z-[100] font-fun select-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Skip link */}
      <button
        onClick={onSkip}
        className="absolute top-12 right-4 z-10 text-xs font-bold text-white/40 uppercase tracking-wider hover:text-white/70 transition-colors"
      >
        Skip Training
      </button>

      {/* Tooltip */}
      <div
        className={cn(
          "absolute left-0 right-0 flex justify-center px-4",
          position === "top" && "top-24",
          position === "center" && "top-1/2 -translate-y-1/2",
          position === "bottom" && "bottom-24",
        )}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: position === "top" ? -20 : 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="w-full max-w-sm bg-[#1B2F36] border-2 border-[#0D1B21] border-b-4 rounded-2xl p-5 shadow-2xl"
        >
          <h3 className="text-lg font-black text-white uppercase tracking-wide mb-2">
            {title}
          </h3>
          <p className="text-sm font-semibold text-[#9CB8C4] leading-relaxed mb-5">
            {message}
          </p>
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl bg-[#58CC02] border-b-[5px] border-[#46A302] text-sm font-black text-white uppercase tracking-wider active:translate-y-[2px] active:border-b-[3px] transition-all"
          >
            GOT IT
          </button>
        </motion.div>
      </div>
    </div>
  );
}
