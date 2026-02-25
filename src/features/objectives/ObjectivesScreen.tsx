"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";

import { Target, Trophy, Calendar, Clock, Crown, Star, ArrowLeft } from "lucide-react";

import { ObjectiveCard } from "./components/ObjectiveCard";
import { generateObjectives } from "./data/mockObjectives";
import type { Objective, ObjectiveCategory, PlayerProgress } from "./types";

interface ObjectivesScreenProps {
  onBack: () => void;
  playerProgress?: PlayerProgress;
  onClaimReward?: (objective: Objective) => void;
}

const DEFAULT_PROGRESS: PlayerProgress = {
  questionsStreak: 5,
  rankedWins: 1,
  careerLevelsCompleted: 2,
  totalGamesPlayed: 15,
  perfectScores: 1,
  friendsInvited: 0,
};

const TABS: { value: ObjectiveCategory; label: string; icon: typeof Calendar; color: string; activeColor: string }[] = [
  { value: "daily", label: "Daily", icon: Calendar, color: "text-[#56707A]", activeColor: "text-[#58CC02] bg-[#58CC02]/15 border-[#58CC02]/40" },
  { value: "weekly", label: "Weekly", icon: Clock, color: "text-[#56707A]", activeColor: "text-[#1CB0F6] bg-[#1CB0F6]/15 border-[#1CB0F6]/40" },
  { value: "season", label: "Season", icon: Crown, color: "text-[#56707A]", activeColor: "text-[#FFD700] bg-[#FFD700]/15 border-[#FFD700]/40" },
  { value: "lifetime", label: "Lifetime", icon: Star, color: "text-[#56707A]", activeColor: "text-[#CE82FF] bg-[#CE82FF]/15 border-[#CE82FF]/40" },
];

export function ObjectivesScreen({
  onBack,
  playerProgress = DEFAULT_PROGRESS,
  onClaimReward,
}: ObjectivesScreenProps) {
  const [selectedTab, setSelectedTab] = useState<ObjectiveCategory>("daily");
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

  const allObjectives = useMemo(
    () => generateObjectives(playerProgress),
    [playerProgress]
  );

  const filteredObjectives = useMemo(
    () => allObjectives.filter((obj) => obj.category === selectedTab),
    [allObjectives, selectedTab]
  );

  const getClaimableCount = useCallback(
    (category: ObjectiveCategory) => {
      return allObjectives.filter(
        (obj) => obj.category === category && obj.completed && !claimedIds.has(obj.id)
      ).length;
    },
    [allObjectives, claimedIds]
  );

  const handleClaim = useCallback(
    (objective: Objective) => {
      if (!objective.completed || claimedIds.has(objective.id)) return;

      setClaimedIds((prev) => new Set([...prev, objective.id]));
      onClaimReward?.(objective);
    },
    [claimedIds, onClaimReward]
  );

  const totalClaimable = getClaimableCount(selectedTab);
  const totalCompleted = allObjectives.filter((obj) => obj.completed || claimedIds.has(obj.id)).length;
  const totalObjectives = allObjectives.length;
  const progressPct = totalObjectives > 0 ? (totalCompleted / totalObjectives) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#131F24] font-fun">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#131F24]/95 backdrop-blur-sm border-b-2 border-[#1B2F36]">
        <div className="max-w-2xl lg:max-w-4xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                aria-label="Back"
                onClick={onBack}
                className="flex items-center justify-center size-9 md:size-10 rounded-xl bg-[#1B2F36] border-b-[3px] border-[#0D1B21] hover:bg-[#243B44] active:border-b-[1px] active:translate-y-[2px] transition-all"
              >
                <ArrowLeft className="size-4 md:size-5 text-white" />
              </button>
              <div className="flex items-center gap-1.5 md:gap-2">
                <Target className="size-5 md:size-6 text-[#CE82FF]" />
                <h1 className="text-base md:text-xl font-black text-white uppercase tracking-wide">
                  Objectives
                </h1>
              </div>
            </div>

            {totalClaimable > 0 && (
              <div className="px-3 py-1.5 rounded-full bg-[#58CC02]/15 border border-[#58CC02]/30 flex items-center gap-1.5">
                <Trophy className="size-3.5 md:size-4 text-[#58CC02]" />
                <span className="text-[10px] md:text-xs font-black text-[#58CC02] uppercase">
                  {totalClaimable} to claim
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl lg:max-w-4xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-3 md:space-y-4">
        {/* Progress Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#CE82FF] p-3 md:p-5"
        >
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <div>
              <span className="text-[10px] md:text-xs font-black text-[#56707A] uppercase tracking-wider">
                Overall Progress
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-2xl md:text-4xl font-black text-white">{totalCompleted}</span>
                <span className="text-base md:text-xl font-black text-[#56707A]">/{totalObjectives}</span>
              </div>
            </div>
            <div className="size-12 md:size-16 rounded-2xl bg-[#CE82FF]/20 border-2 border-[#CE82FF]/40 flex items-center justify-center">
              <Target className="size-6 md:size-8 text-[#CE82FF]" />
            </div>
          </div>

          <div className="bg-[#131F24] rounded-xl md:rounded-2xl border-b-[3px] border-[#0D1B21] p-2 md:p-3">
            <div className="relative h-3 md:h-4 bg-[#243B44] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#CE82FF] to-[#E0A8FF]"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent h-1/2" />
              </motion.div>
            </div>
            <div className="flex items-center justify-between mt-1.5 md:mt-2">
              <span className="text-[10px] md:text-xs font-black text-[#56707A]">
                Complete missions to earn rewards
              </span>
              <span className="text-[10px] md:text-xs font-black text-[#CE82FF]">
                {progressPct.toFixed(0)}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-2">
          {TABS.map((tab) => {
            const count = getClaimableCount(tab.value);
            const isActive = selectedTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedTab(tab.value)}
                className={`flex flex-col items-center gap-1 py-2.5 md:py-3 rounded-xl border-b-[3px] font-black text-xs transition-all ${
                  isActive
                    ? `bg-[#1B2F36] ${tab.activeColor} border-b-current`
                    : "bg-[#1B2F36]/50 text-[#56707A] border-b-[#0D1B21] hover:bg-[#1B2F36]"
                }`}
              >
                <tab.icon className="size-4 md:size-5" />
                <span className="text-[11px] md:text-xs uppercase">{tab.label}</span>
                {count > 0 && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-[#58CC02]/20 text-[#58CC02] border border-[#58CC02]/30">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Objectives List */}
        <div className="space-y-2.5 md:space-y-3 pb-6">
          {filteredObjectives.map((objective, index) => (
            <ObjectiveCard
              key={objective.id}
              objective={objective}
              isClaimed={claimedIds.has(objective.id)}
              onClaim={() => handleClaim(objective)}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
