"use client";

import { useEffect } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import { CardScroller } from "@/features/play/CardScroller";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { partnerCopy, toPartnerLocale } from "../partnerCopy";
import { usePartnerSession } from "../PartnerSessionProvider";
import { usePartnerGames, usePartnerResetLabel } from "../hooks/usePartnerGames";
import { PartnerGameCard } from "./PartnerGameCard";
import { PartnerRankedCard } from "./PartnerRankedCard";

// Wide frames: Ranked is a 2×2 tile at the start of the grid and every game shows at once, no arrows.
const WIDE_GRID = "grid grid-cols-4 gap-4 xl:grid-cols-5 2xl:grid-cols-6";

export function PartnerHome() {
  const { locale } = useLocale();
  const partnerLocale = toPartnerLocale(locale);
  const copy = partnerCopy(partnerLocale);
  const { markReady } = usePartnerSession();
  const { data, isPending, isError, refetch } = usePartnerGames();
  const resetLabel = usePartnerResetLabel(data?.resetsAt);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (data) markReady();
  }, [data, markReady]);

  if (isPending) {
    if (isDesktop) {
      return (
        <div role="status" aria-busy className={`mt-4 ${WIDE_GRID}`}>
          <div className="col-span-2 row-span-2 animate-pulse rounded-xl bg-white/[0.06]" />
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-white/[0.06]" />
          ))}
        </div>
      );
    }
    return (
      <div role="status" aria-busy className="mt-4 flex flex-col gap-6">
        <div className="aspect-[21/9] w-full animate-pulse rounded-2xl bg-white/[0.06]" />
        <div className="flex gap-2.5">
          <div className="aspect-[4/3] flex-1 animate-pulse rounded-xl bg-white/[0.06]" />
          <div className="aspect-[4/3] flex-1 animate-pulse rounded-xl bg-white/[0.06]" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div role="alert" className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="font-poppins text-lg font-semibold text-white">{copy.errorTitle}</h1>
        <p className="mt-2 max-w-xs font-poppins text-sm text-white/70">{copy.errorBody}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand-yellow px-5 font-poppins text-sm font-bold uppercase text-black transition-colors hover:bg-brand-yellow-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {copy.tryAgain}
        </button>
      </div>
    );
  }

  // A game set to 0 plays for today is off for the day, not "done", and a game not open yet is noise:
  // both are left out of the list. Ranked keeps its card either way.
  const tiles = data.games.filter((tile) => tile.playsLimit > 0);
  const ranked = tiles.find((tile) => tile.gameId === "ranked");
  const others = tiles.filter((tile) => tile.gameId !== "ranked" && tile.available);

  if (isDesktop) {
    return (
      <section aria-labelledby="partner-more-games" className={`mt-4 ${WIDE_GRID}`}>
        <h2 id="partner-more-games" className="sr-only">
          {copy.moreGames}
        </h2>
        {ranked && <PartnerRankedCard tile={ranked} locale={partnerLocale} resetLabel={resetLabel} variant="tile" />}
        {others.map((tile, index) => (
          <PartnerGameCard key={tile.gameId} tile={tile} locale={partnerLocale} index={index} fill />
        ))}
      </section>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-6">
      {ranked && <PartnerRankedCard tile={ranked} locale={partnerLocale} resetLabel={resetLabel} />}
      {others.length > 0 && (
        <section aria-labelledby="partner-more-games">
          <h2 id="partner-more-games" className="mb-3 font-poppins text-[15px] font-semibold uppercase text-white">
            {copy.moreGames}
          </h2>
          <CardScroller>
            {others.map((tile, index) => (
              <PartnerGameCard key={tile.gameId} tile={tile} locale={partnerLocale} index={index} />
            ))}
          </CardScroller>
        </section>
      )}
    </div>
  );
}
