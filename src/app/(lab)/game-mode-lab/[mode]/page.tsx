"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { BallKnowledgeGame } from "@/features/game-mode-lab/modes/BallKnowledgeGame";
import { BingoBattleGame } from "@/features/game-mode-lab/modes/BingoBattleGame";
import { ConnectionsRaceGame } from "@/features/game-mode-lab/modes/ConnectionsRaceGame";
import { DraftBattleGame } from "@/features/game-mode-lab/modes/DraftBattleGame";
import { MissingXIGame } from "@/features/game-mode-lab/modes/MissingXIGame";
import { OwnGoalGame } from "@/features/game-mode-lab/modes/OwnGoalGame";
import { SayItWithMemesGame } from "@/features/game-mode-lab/modes/SayItWithMemesGame";
import { Stat501Game } from "@/features/game-mode-lab/modes/Stat501Game";
import { Top10KnockoutGame } from "@/features/game-mode-lab/modes/Top10KnockoutGame";
import type { LabModeId } from "@/features/game-mode-lab/registry";

const MODE_COMPONENTS: Record<LabModeId, ComponentType> = {
  "top-10-knockout": Top10KnockoutGame,
  "missing-xi": MissingXIGame,
  "ball-knowledge": BallKnowledgeGame,
  "bingo-battle": BingoBattleGame,
  "draft-battle": DraftBattleGame,
  "connections-race": ConnectionsRaceGame,
  "stat-501": Stat501Game,
  "own-goal": OwnGoalGame,
  "say-it-with-memes": SayItWithMemesGame,
};

export default function GameModePage() {
  const params = useParams<{ mode: string }>();
  const Game = MODE_COMPONENTS[params.mode as LabModeId];

  if (!Game) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-page font-poppins text-white">
        <p className="text-sm text-brand-slate-light">That prototype doesn&apos;t exist.</p>
        <Button asChild>
          <Link href="/game-mode-lab">Back to Game Mode Lab</Link>
        </Button>
      </main>
    );
  }

  return <Game />;
}
