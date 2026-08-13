"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuctionGame } from "@/features/auction/hooks/useAuctionGame";
import { getDemoAuctionRoster } from "./data/demoAuctionRoster";
import { AuctionShowdownScreen } from "@/features/auction/components/AuctionShowdownScreen";
import { AuctionGameScreen } from "@/features/auction/components/AuctionGameScreen";
import { AuctionResultsScreen } from "@/features/auction/components/AuctionResultsScreen";

const poppins = { fontFamily: "'Poppins', sans-serif" };

const DEMO_USERNAME = "Investor";
const DEMO_AVATAR_SEED = "quizball-demo";

function DemoSearchingScreen() {
  const { t } = useLocale();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page">
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="relative">
          <div className="size-20 rounded-full border-[5px] border-white/10 border-t-brand-yellow animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/brand/goal-ball-small.webp"
              alt=""
              aria-hidden="true"
              draggable={false}
              width={28}
              height={28}
              className="block size-7 object-contain"
            />
          </div>
        </div>
        <h2 className="font-poppins text-xl font-black uppercase text-white" style={poppins}>
          {t("auctionGame.lookingForOpponents", { count: 2 })}
        </h2>
      </div>
    </div>
  );
}

export function DemoAuction() {
  const router = useRouter();
  const { locale } = useLocale();
  const roster = useMemo(() => getDemoAuctionRoster(locale), [locale]);
  const { state, actions, humanPlayerId } = useAuctionGame(
    locale === "ka" ? "ინვესტორი" : DEMO_USERNAME,
    DEMO_AVATAR_SEED,
    roster,
  );
  const [searching, setSearching] = useState(true);
  const replayTimerRef = useRef<number | null>(null);

  // (Re)start while the fake matchmaking screen is still up. The locale can
  // flip right after mount (DemoLocaleDefault runs after child effects), so a
  // roster change during the search window restarts the engine with the
  // correctly localized roster before the player sees any content.
  const searchingRef = useRef(searching);
  searchingRef.current = searching;
  useEffect(() => {
    if (!searchingRef.current) return;
    actions.startGame(3);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only on roster change
  }, [roster]);

  useEffect(() => {
    return () => {
      if (replayTimerRef.current !== null) window.clearTimeout(replayTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (searching && state.players.length > 0) {
      const timer = setTimeout(() => {
        setSearching(false);
        actions.setPhase("showdown");
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [searching, state.players.length, actions]);

  const handleShowdownComplete = useCallback(() => {
    actions.setPhase("formation");
  }, [actions]);

  const handlePlayAgain = useCallback(() => {
    setSearching(true);
    actions.startGame(3);
    if (replayTimerRef.current !== null) window.clearTimeout(replayTimerRef.current);
    replayTimerRef.current = window.setTimeout(() => {
      replayTimerRef.current = null;
      setSearching(false);
      actions.setPhase("showdown");
    }, 2000);
  }, [actions]);

  const handleExit = useCallback(() => {
    router.push("/demos");
  }, [router]);

  if (searching) {
    return <DemoSearchingScreen />;
  }

  if (state.phase === "showdown") {
    return (
      <AuctionShowdownScreen
        players={state.players}
        humanPlayerId={humanPlayerId}
        onComplete={handleShowdownComplete}
      />
    );
  }

  if (
    state.phase === "formation" ||
    state.phase === "clue-reveal" ||
    state.phase === "bidding" ||
    state.phase === "reveal" ||
    state.phase === "solo-pick"
  ) {
    return (
      <AuctionGameScreen
        state={state}
        actions={actions}
        humanPlayerId={humanPlayerId}
      />
    );
  }

  if (state.phase === "results") {
    return (
      <AuctionResultsScreen
        state={state}
        humanPlayerId={humanPlayerId}
        onPlayAgain={handlePlayAgain}
        onExit={handleExit}
      />
    );
  }

  return <DemoSearchingScreen />;
}
