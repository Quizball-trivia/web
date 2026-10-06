"use client";

import { useEffect, useState } from "react";
import { ImposterBoard } from "@/features/daily/ImposterGame";
import { getDailyChallengeCopy } from "@/lib/i18n/dailyChallenge";
import { playSfx } from "@/lib/sounds/gameSounds";
import { partnerCopy } from "../../partnerCopy";
import type { PartnerGameScreenProps } from "../../game-kit/types";
import { PartnerDailyShell, type PartnerDailyBoardContext } from "./PartnerDailyShell";
import type { PickEmItem, PickEmReveal } from "./dailyPlay.types";

/** Pick Em = the "imposter" daily: select every option that fits; points only for exactly the right set. */
export function PickEmPartner(props: PartnerGameScreenProps) {
  return (
    <PartnerDailyShell<PickEmItem>
      {...props}
      gameId="pick-em"
      renderBoard={(ctx) => <Board key={`${ctx.play.playId}:${ctx.play.index}:${ctx.controller.epoch}`} {...ctx} />}
    />
  );
}

function Board({ play, item, controller, fire }: PartnerDailyBoardContext<PickEmItem>) {
  const copy = getDailyChallengeCopy();
  const reveal = play.reveal as PickEmReveal | null;
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!reveal) return;
    if (reveal.correct) playSfx("dailyCorrect");
    fire(reveal.correct ? "correct" : "wrong", "right", { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal !== null]);

  const locked = play.resolved || submitted || controller.busy;
  return (
    <ImposterBoard
      prompt={item.prompt}
      instruction={copy.imposterInstruction}
      options={item.options}
      selectedOptionIds={reveal ? reveal.picked : selected}
      correctOptionIds={reveal?.correctOptionIds ?? null}
      resolved={play.resolved}
      locked={locked}
      onToggle={(id) => {
        if (locked) return;
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      }}
      onSubmit={() => {
        if (locked) return;
        setSubmitted(true);
        playSfx("imposterReveal");
        void controller.answer({ optionIds: selected });
      }}
      submitLabel={copy.submitSelection}
      scoreSlot={
        <>
          {partnerCopy(controller.lang).pointsLabel}: <span className="text-white" data-testid="partner-daily-score">{play.score}</span>
        </>
      }
    />
  );
}
