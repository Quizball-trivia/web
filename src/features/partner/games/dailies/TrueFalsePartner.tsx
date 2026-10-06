"use client";

import { useEffect, useMemo, useState } from "react";
import { TrueFalseBoard } from "@/features/daily/TrueFalseGame";
import { shuffleArray } from "@/lib/utils";
import { partnerCopy } from "../../partnerCopy";
import type { PartnerGameScreenProps } from "../../game-kit/types";
import { PartnerDailyShell, PartnerPointsRow, type PartnerDailyBoardContext } from "./PartnerDailyShell";
import type { TrueFalseItem, TrueFalseReveal } from "./dailyPlay.types";

export function TrueFalsePartner(props: PartnerGameScreenProps) {
  return (
    <PartnerDailyShell<TrueFalseItem>
      {...props}
      gameId="true-false"
      renderBoard={(ctx) => <Board key={`${ctx.play.playId}:${ctx.play.index}:${ctx.controller.epoch}`} {...ctx} />}
    />
  );
}

function Board({ play, item, controller, fire }: PartnerDailyBoardContext<TrueFalseItem>) {
  const reveal = play.reveal as TrueFalseReveal | null;
  const [picked, setPicked] = useState<boolean | null>(null);
  const options = useMemo(
    () => shuffleArray([{ value: true, label: item.trueLabel }, { value: false, label: item.falseLabel }]),
    [item.trueLabel, item.falseLabel],
  );

  useEffect(() => {
    if (!reveal) return;
    const correctIndex = options.findIndex((o) => o.value === reveal.correctAnswer);
    fire(reveal.correct ? "correct" : "wrong", correctIndex === 0 ? "left" : "right");
    // Once per item: the board remounts for the next one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal !== null]);

  return (
    <TrueFalseBoard
      prompt={item.prompt}
      options={options}
      selected={reveal ? reveal.picked : picked}
      correctAnswer={reveal?.correctAnswer ?? null}
      showResult={play.resolved}
      timedOut={play.resolved && reveal?.picked == null}
      timeoutAnswerLabel={reveal ? (reveal.correctAnswer ? item.trueLabel : item.falseLabel) : null}
      disabled={picked !== null || controller.busy}
      onAnswer={(value) => {
        if (picked !== null || play.resolved) return;
        setPicked(value);
        void controller.answer({ answer: value });
      }}
      footer={<PartnerPointsRow label={partnerCopy(controller.lang).pointsLabel} score={play.score} />}
    />
  );
}
