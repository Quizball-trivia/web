"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MINI_GAMES, MiniGameCard } from "@/features/mini-games/components/MiniGamesGrid";
import { useLocale } from "@/contexts/LocaleContext";

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
          {MINI_GAMES.map((game, index) => (
            <MiniGameCard key={game.key} game={game} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
