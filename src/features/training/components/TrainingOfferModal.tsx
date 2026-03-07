"use client";

import { motion } from "motion/react";
import { GraduationCap } from "lucide-react";

interface TrainingOfferModalProps {
  onPlayTraining: () => void;
  onSkip: () => void;
}

export function TrainingOfferModal({ onPlayTraining, onSkip }: TrainingOfferModalProps) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center font-fun select-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onSkip} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className="relative w-full max-w-sm mx-4 bg-[#1B2F36] border-2 border-[#0D1B21] border-b-4 rounded-2xl p-6 shadow-2xl"
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="size-16 rounded-full bg-[#FF9600]/20 border-2 border-[#FF9600] flex items-center justify-center">
            <GraduationCap className="size-8 text-[#FF9600]" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-white uppercase tracking-wide text-center mb-1">
          Training Match
        </h2>
        <p className="text-sm font-semibold text-[#9CB8C4] text-center mb-6 leading-relaxed">
          Learn how ranked matches work before your first placement
        </p>

        {/* Play Training button */}
        <button
          onClick={onPlayTraining}
          className="w-full py-3.5 rounded-xl bg-[#58CC02] border-b-[5px] border-[#46A302] text-sm font-black text-white uppercase tracking-wider active:translate-y-[2px] active:border-b-[3px] transition-all mb-3"
        >
          PLAY TRAINING
        </button>

        {/* Skip button */}
        <button
          onClick={onSkip}
          className="w-full py-2.5 text-xs font-bold text-[#56707A] uppercase tracking-wider hover:text-white/60 transition-colors"
        >
          SKIP — I KNOW HOW TO PLAY
        </button>
      </motion.div>
    </div>
  );
}
