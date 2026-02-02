"use client";

import { useState, useMemo, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const TABS: { value: ObjectiveCategory; label: string; icon: typeof Calendar }[] = [
  { value: "daily", label: "Daily", icon: Calendar },
  { value: "weekly", label: "Weekly", icon: Clock },
  { value: "season", label: "Season", icon: Crown },
  { value: "lifetime", label: "Lifetime", icon: Star },
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-background to-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button onClick={onBack} variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Target className="size-6 text-primary" />
              Objectives
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete missions to earn rewards
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Trophy className="size-4 text-primary" />
            <span className="text-sm font-bold">{totalClaimable}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <Tabs
          value={selectedTab}
          onValueChange={(v) => setSelectedTab(v as ObjectiveCategory)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4 h-auto">
            {TABS.map((tab) => {
              const count = getClaimableCount(tab.value);
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="flex flex-col gap-1 py-2">
                  <tab.icon className="size-4" />
                  <span className="text-xs">{tab.label}</span>
                  {count > 0 && (
                    <Badge className="h-4 min-w-4 px-1 text-[10px]">{count}</Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Objectives List */}
          <div className="mt-4 space-y-3 pb-6">
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
        </Tabs>
      </div>
    </div>
  );
}
