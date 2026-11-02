"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { FinalThird } from "@/features/mini-games/components/FinalThird";
import { MiniGameIntro } from "@/features/mini-games/components/MiniGameIntro";
import { freeKicksApi } from "@/lib/repositories/freeKicks.repo";
import { useLocale } from "@/contexts/LocaleContext";

// The practice run ships a frozen question bank; load it only when someone opens it.
const FreeKicksPractice = dynamic(
  () => import("@/features/mini-games/components/FreeKicksPractice").then((m) => m.FreeKicksPractice),
  { ssr: false },
);

/** Set once the player has picked either path on the intro; until then practice is the primary choice. */
const INTRO_SEEN_KEY = "quizball_free_kicks_intro_seen";

function readIntroSeen(): boolean {
  try {
    return window.localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markIntroSeen(): void {
  try {
    window.localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Storage blocked (private mode): nothing to remember; readIntroSeen treats it as seen.
  }
}

/** The intro flag only changes through this page; there is nothing to subscribe to. */
const noSubscription = () => () => {};

/** Mounted with the game (either path, or a resumed round): the intro no longer pushes practice first. */
function IntroSeenMarker() {
  useEffect(() => markIntroSeen(), []);
  return null;
}

/** Free Kicks — LIVE: real coins from the store wallet, server-authoritative outcomes via /api/v1/free-kicks. */
export default function FreeKicksPage() {
  const { t } = useLocale();
  const [practice, setPractice] = useState(false);
  // Read on the client only (the server render has no storage, so it never pushes practice first).
  const newPlayer = useSyncExternalStore(noSubscription, () => !readIntroSeen(), () => false);
  const resume = useCallback(async () => Boolean(await freeKicksApi.current()), []);
  const openPractice = useCallback(() => setPractice(true), []);
  const closePractice = useCallback(() => setPractice(false), []);
  return (
    <MiniGameIntro
      resume={resume}
      config={{
        slug: "mini-final-third",
        title: t("play.freeKicksTitle"),
        tagline: t("miniGames.freeKicksModalDescription"),
        chips: [t("miniGames.chipSoloCoins"), t("miniGames.chipStakeRange", { min: "5", max: "500" })],
        steps: [t("miniGames.freeKicksRule1"), t("miniGames.freeKicksRule2"), t("miniGames.freeKicksRule3"), t("miniGames.freeKicksRule4"), t("miniGames.freeKicksRuleTimer")],
      }}
      practice={{
        label: t("miniGames.freeKicksPracticeCta"),
        hint: t("miniGames.freeKicksPracticeHint"),
        startLabel: t("miniGames.freeKicksPlayReal"),
        primary: newPlayer,
        onStart: openPractice,
      }}
    >
      <IntroSeenMarker />
      {practice ? (
        <FreeKicksPractice onExit={closePractice} />
      ) : (
        <FinalThird backHref="/play" live onPractice={openPractice} />
      )}
    </MiniGameIntro>
  );
}
