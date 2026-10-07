"use client";

import { useEffect, useState } from "react";
import { CareerPathBoard } from "@/features/daily/CareerPathGame";
import type { PartnerGameScreenProps } from "../../game-kit/types";
import { PartnerDailyShell, type PartnerDailyBoardContext } from "./PartnerDailyShell";
import type { CareerPathItem, CareerPathReveal } from "./dailyPlay.types";

/** One guess per player, judged on the server with the shared fuzzy matcher. */
export function CareerPathPartner(props: PartnerGameScreenProps) {
  return (
    <PartnerDailyShell<CareerPathItem>
      {...props}
      gameId="career-path"
      renderBoard={(ctx) => <Board key={`${ctx.play.playId}:${ctx.play.index}:${ctx.controller.epoch}`} {...ctx} />}
    />
  );
}

function Board({ play, item, controller, fire }: PartnerDailyBoardContext<CareerPathItem>) {
  const reveal = play.reveal as CareerPathReveal | null;
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!reveal) return;
    fire(reveal.correct ? "correct" : "wrong", "right");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal !== null]);

  return (
    <CareerPathBoard
      clubs={item.clubs}
      clubMatchNames={item.clubMatchNames}
      answer={answer}
      onAnswerChange={setAnswer}
      onSubmit={() => {
        if (submitted || play.resolved || !answer.trim()) return;
        setSubmitted(true);
        void controller.answer({ guess: answer.trim() });
      }}
      disabled={submitted || play.resolved}
      revealedAnswer={reveal?.displayAnswer ?? null}
      score={play.score}
    />
  );
}
