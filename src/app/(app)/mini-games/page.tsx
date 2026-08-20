"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { isRoadToGoalEnabled } from "@/lib/features/roadToGoal";
import {
  trackRoadToGoalCardClicked,
  trackRoadToGoalCardViewed,
} from "@/features/mini-games/analytics/roadToGoal.analytics";

const GAMES = [
  {
    key: "free-kicks",
    href: "/free-kicks",
    titleKey: "play.freeKicksTitle",
    descKey: "play.freeKicksSubtitle",
    iconSrc: "/assets/free-kicks-card-icon.png",
    live: true,
  },
  {
    key: "road-to-goal",
    href: isRoadToGoalEnabled ? "/road-to-goal" : "/demos/mini-road-to-goal?from=/mini-games",
    titleKey: "play.roadToGoalTitle",
    descKey: "play.roadToGoalSubtitle",
    iconSrc: "/assets/road-to-goal-card-icon.png",
    live: isRoadToGoalEnabled,
  },
  {
    key: "guess-the-goal",
    href: "/guess-the-goal",
    titleKey: "miniGames.guessTheGoalTitle",
    descKey: "miniGames.guessTheGoalSubtitle",
    iconSrc: "/assets/guess-the-goal-card-icon.png",
    live: true,
  },
] as const;

type MiniGameEntry = (typeof GAMES)[number];

function GameCard({ game, index }: { game: MiniGameEntry; index: number }) {
  const { t } = useLocale();
  const roadToGoalDestination = game.live ? "live" : "demo";

  useEffect(() => {
    if (game.key !== "road-to-goal") return;
    trackRoadToGoalCardViewed({
      destination: roadToGoalDestination,
      enabled: game.live,
    });
  }, [game.key, game.live, roadToGoalDestination]);

  return (
    <div
      className="relative flex h-full animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: "backwards" }}
    >
      <Link
        href={game.href}
        onClick={game.key === "road-to-goal"
          ? () => trackRoadToGoalCardClicked({
              destination: roadToGoalDestination,
              enabled: game.live,
            })
          : undefined}
        className="relative flex min-h-[184px] w-full flex-col overflow-hidden rounded-[8px] p-3.5 text-center text-black transition-all hover:brightness-105 active:translate-y-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:min-h-[268px] md:rounded-[20px] md:p-6"
        style={{ backgroundColor: "#FF9600" }}
      >
        {game.live ? (
          <div className="absolute left-2.5 top-2.5 inline-flex items-center rounded-full bg-black px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-brand-yellow md:left-3 md:top-3 md:px-3 md:text-[11px]">
            {t("miniGames.hubLiveBadge")}
          </div>
        ) : null}
        <h3 className="font-poppins mt-6 flex min-h-[2.1rem] items-start justify-center px-2 text-center text-[16px] uppercase leading-[1.1] md:mt-8 md:min-h-[3.5rem] md:text-[28px] md:leading-[0.95]">
          {t(game.titleKey)}
        </h3>
        <p className="mt-2 mb-3 text-center text-[10px] font-bold leading-snug text-black/80 md:mt-3 md:mb-5 md:text-[17px] md:font-semibold md:px-4">
          {t(game.descKey)}
        </p>
        <div className="flex flex-1 items-center justify-center">
          <Image
            src={game.iconSrc}
            alt=""
            width={200}
            height={200}
            className="h-[72px] w-[72px] object-contain pointer-events-none md:h-[110px] md:w-[110px]"
          />
        </div>
        <div className="mt-3 flex justify-center">
          <span className="font-poppins inline-flex h-[34px] min-w-[120px] items-center justify-center rounded-[14px] bg-black px-5 text-[15px] uppercase tracking-wide text-white md:h-[50px] md:min-w-[200px] md:rounded-[20px] md:px-8 md:text-[24px]">
            {t("miniGames.hubPlay")}
          </span>
        </div>
      </Link>
    </div>
  );
}

export default function MiniGamesPage() {
  const { t } = useLocale();
  return (
    <div className="min-h-screen font-fun">
      <div className="mx-auto max-w-[430px] px-4 py-6 md:max-w-6xl md:px-8 md:py-10">
        <div className="mb-5 md:mb-10">
          <div className="flex items-center gap-3 md:gap-4">
            <Link
              href="/play"
              aria-label={t("common.back")}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:size-11"
            >
              <ArrowLeft className="size-5 md:size-6" />
            </Link>
            <h1 className="font-poppins text-[20px] uppercase leading-[1.1] text-white md:text-[40px]">
              {t("miniGames.hubTitle")}
            </h1>
          </div>
          <p className="mt-1.5 pl-12 text-[11px] font-black uppercase tracking-[0.04em] text-white/55 md:mt-2 md:pl-[60px] md:text-sm md:tracking-[0.08em]">
            {t("miniGames.hubSubtitle")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {GAMES.map((game, index) => (
            <GameCard key={game.key} game={game} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
