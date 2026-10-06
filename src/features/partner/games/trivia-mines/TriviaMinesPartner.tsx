"use client";

import { useEffect, useMemo } from "react";
import { TriviaMinesLive, type TriviaMinesPartnerMode } from "@/features/trivia-mines/TriviaMinesLive";
import { useLocale } from "@/contexts/LocaleContext";
import { toPartnerLocale, type PartnerLocale } from "../../partnerCopy";
import type { PartnerGameScreenProps } from "../../game-kit/types";
import { createPartnerTriviaMinesClient } from "./partnerTriviaMinesClient";

/** Freecroco wording: points, no stake (contract §7.6). */
const LABELS: Record<PartnerLocale, TriviaMinesPartnerMode["labels"]> = {
  en: {
    start: "Start",
    points: "Points",
    startPoints: "Start: 100 points",
    play: "Play",
    cashOut: (points) => `Bank ${points} points`,
    finish: "See my points",
    playReturned: "Play returned",
    playReturnedBody: "You left before opening a tile, so this play was not used.",
    exit: "Back to games",
  },
  ka: {
    start: "საწყისი",
    points: "ქულები",
    startPoints: "საწყისი: 100 ქულა",
    play: "თამაში",
    cashOut: (points) => `აიღე ${points} ქულა`,
    finish: "ჩემი ქულები",
    playReturned: "თამაში დაბრუნდა",
    playReturnedBody: "უჯრის გახსნამდე გახვედი, ამიტომ ეს თამაში არ დაგეხარჯა.",
    exit: "თამაშებზე დაბრუნება",
  },
};

/** Freecroco Trivia Mines: the site's live board on the partner endpoints, free and capped at 1,000 points. */
export function TriviaMinesPartner({ api, onFinished, onExit }: PartnerGameScreenProps) {
  const { locale } = useLocale();
  const client = useMemo(() => createPartnerTriviaMinesClient(api), [api]);
  // A play cancelled by a block has no result: leave for the home, which shows the account state.
  useEffect(() => client.onCancelled(onExit), [client, onExit]);

  return (
    <TriviaMinesLive
      client={client}
      partner={{
        labels: LABELS[toPartnerLocale(locale)],
        onFinished: () => {
          const run = client.last();
          // Only a scored run has a score event; a returned or cancelled one is never reported as points.
          if (run && (run.status === "cashed" || run.status === "lost") && run.score !== null) {
            onFinished({ playId: run.play_id, score: run.score });
          }
        },
        onExit: () => {
          const run = client.last();
          // Leaving settles at once: cash-out after a safe tile, 0 after a scout only, the play returned if untouched.
          if (run?.status === "active") void client.leave(run.run_id).catch(() => undefined).finally(onExit);
          else onExit();
        },
      }}
    />
  );
}
