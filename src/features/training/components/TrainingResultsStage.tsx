"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useTraining } from "../TrainingMatchProvider";
import { BOT_NAME } from "../constants";

export function TrainingResultsStage() {
  const { match, tooltips, onSkip } = useTraining();
  const { player } = usePlayer();
  const { state } = match;
  const tooltipFired = useRef(false);

  useEffect(() => {
    if (!tooltipFired.current) {
      tooltipFired.current = true;
      tooltips.tryShowStageTooltip("results");
    }
  }, [tooltips]);

  const playerWon = state.playerGoals > state.opponentGoals;
  const isDraw = state.playerGoals === state.opponentGoals;

  return (
    <div className="fixed inset-0 z-50 bg-[#131F24] flex flex-col items-center justify-center font-fun select-none px-4">
      {/* Result badge */}
      <motion.div
        initial={{ scale: 0, rotate: -15 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className={`px-8 py-3 rounded-2xl border-b-4 mb-6 ${
          playerWon
            ? "bg-[#58CC02] border-[#46A302]"
            : isDraw
              ? "bg-[#FF9600] border-[#DB8200]"
              : "bg-[#FF4B4B] border-[#CC3E3E]"
        }`}
      >
        <span className="text-2xl font-black text-white uppercase tracking-wider">
          {playerWon ? "YOU WIN!" : isDraw ? "DRAW" : "DEFEAT"}
        </span>
      </motion.div>

      {/* Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-6 mb-8"
      >
        <div className="text-center">
          <p className="text-sm font-bold text-[#56707A] uppercase">{player.username}</p>
          <p className="text-5xl font-black text-white">{state.playerGoals}</p>
        </div>
        <span className="text-2xl font-black text-[#56707A]">-</span>
        <div className="text-center">
          <p className="text-sm font-bold text-[#56707A] uppercase">{BOT_NAME}</p>
          <p className="text-5xl font-black text-white">{state.opponentGoals}</p>
        </div>
      </motion.div>

      {/* Message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm font-semibold text-[#9CB8C4] text-center max-w-xs mb-10 leading-relaxed"
      >
        Great job! You now know how possession matches work. Time to compete for real!
      </motion.p>

      {/* Play Ranked button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        onClick={onSkip}
        className="w-full max-w-xs py-4 rounded-2xl bg-[#58CC02] border-b-[5px] border-[#46A302] text-base font-black text-white uppercase tracking-wider active:translate-y-[2px] active:border-b-[3px] transition-all"
      >
        PLAY RANKED
      </motion.button>
    </div>
  );
}
