"use client";

import { useEffect, useRef, useState } from "react";
import { CountdownBoard } from "@/features/daily/CountdownGame";
import { useLocale } from "@/contexts/LocaleContext";
import { playSfx } from "@/lib/sounds/gameSounds";
import type { PartnerGameScreenProps } from "../../game-kit/types";
import { PartnerDailyShell, type PartnerDailyBoardContext } from "./PartnerDailyShell";
import type { CountdownFeedback, CountdownItem } from "./dailyPlay.types";

/** Name as many answers as you can per round; every guess is checked on the server. */
export function CountdownPartner(props: PartnerGameScreenProps) {
  const { t } = useLocale();
  return (
    <PartnerDailyShell<CountdownItem>
      {...props}
      gameId="countdown"
      roundLabel={(n, total) => t("dailyGames.roundOf", { n, total })}
      renderBoard={(ctx) => <Board key={`${ctx.play.playId}:${ctx.play.index}:${ctx.controller.epoch}`} {...ctx} />}
    />
  );
}

function Board({ play, item, controller }: PartnerDailyBoardContext<CountdownItem>) {
  const [input, setInput] = useState("");
  const [recent, setRecent] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const open = !play.resolved && controller.timeLeft > 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!recent) return;
    const id = window.setTimeout(() => setRecent(null), 1500);
    return () => window.clearTimeout(id);
  }, [recent]);

  return (
    <CountdownBoard
      category={item.category}
      prompt={item.prompt}
      inputRef={inputRef}
      inputValue={input}
      onInputChange={setInput}
      onSubmit={async () => {
        const guess = input.trim();
        if (!guess || !open) return;
        setInput("");
        const result = await controller.answer<CountdownFeedback>({ guess });
        if (result?.feedback?.accepted) {
          playSfx("dailyCorrect");
          setRecent(result.feedback.display ?? guess);
        } else if (result) {
          playSfx("wrongAnswer");
        }
      }}
      recentAnswer={recent}
      foundAnswers={item.found}
      isLastRound={play.index >= play.itemCount - 1}
      onSkip={() => void controller.next()}
    />
  );
}
