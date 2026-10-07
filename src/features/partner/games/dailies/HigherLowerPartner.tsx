"use client";

import { useEffect, useState } from "react";
import { HighLowBoard } from "@/features/daily/HighLowGame";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import type { PartnerGameScreenProps } from "../../game-kit/types";
import { PartnerDailyShell, type PartnerDailyBoardContext } from "./PartnerDailyShell";
import type { HigherLowerFeedback, HigherLowerItem, HigherLowerReveal } from "./dailyPlay.types";

/** A round is a chain of matchups: pick the higher value each time; one mistake or the clock ends the round. */
export function HigherLowerPartner(props: PartnerGameScreenProps) {
  const copy = getDailyChallengeCopy();
  return (
    <PartnerDailyShell<HigherLowerItem>
      {...props}
      gameId="higher-lower"
      roundLabel={(n, total) => `${copy.round} ${n}/${total}`}
      renderBoard={(ctx) => <Board key={`${ctx.play.playId}:${ctx.play.index}:${ctx.controller.epoch}`} {...ctx} />}
    />
  );
}

/** How long a passed matchup's values stay up before the next matchup shows. */
const FLASH_MS = 700;

function Board({ play, item, controller, fire }: PartnerDailyBoardContext<HigherLowerItem>) {
  const reveal = play.reveal as HigherLowerReveal | null;
  const [flash, setFlash] = useState<{ left: string; right: string; values: { left: number; right: number } } | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), FLASH_MS);
    return () => window.clearTimeout(id);
  }, [flash]);

  const last = item.passed[item.passed.length - 1];
  useEffect(() => {
    if (!reveal) return;
    const higher = last && last.leftValue >= last.rightValue ? "left" : "right";
    fire(reveal.cleared ? "correct" : "wrong", higher);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal !== null]);

  // The failing (or final) matchup keeps its values on screen during the reveal.
  const resolvedValues = play.resolved && last && item.passed.length === item.matchupIndex + 1
    ? { left: last.leftValue, right: last.rightValue }
    : null;

  return (
    <HighLowBoard
      statLabel={item.statLabel}
      prompt={item.prompt}
      matchupIndex={flash ? item.matchupIndex - 1 : item.matchupIndex}
      matchupCount={item.matchupCount}
      leftName={flash?.left ?? item.left}
      rightName={flash?.right ?? item.right}
      revealedValues={flash?.values ?? resolvedValues}
      disabled={play.resolved || pending || flash !== null}
      onPick={async (side) => {
        if (pending || play.resolved || flash) return;
        setPending(true);
        const names = { left: item.left, right: item.right };
        const result = await controller.answer<HigherLowerFeedback>({ matchupIndex: item.matchupIndex, pick: side });
        setPending(false);
        const feedback = result?.feedback;
        if (feedback?.correct && result && !result.play.resolved) {
          setFlash({ ...names, values: { left: feedback.leftValue, right: feedback.rightValue } });
        }
      }}
      score={play.score}
    />
  );
}
