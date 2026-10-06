"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, Lock, Play } from "lucide-react";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import { cn } from "@/lib/utils";
import type { PartnerGameTile } from "../api/partnerApi.types";
import { partnerCopy, type PartnerLocale } from "../partnerCopy";
import { PARTNER_GAME_DEMO_SLUG, partnerGamePath } from "../partnerGames";
import { partnerTileState } from "./PartnerGameCard";
import { usePartnerRankedResume } from "../games/ranked/usePartnerRankedResume";
import { rankedCopy } from "../games/ranked/rankedCopy";

export function PartnerRankedCard({ tile, locale, resetLabel }: { tile: PartnerGameTile; locale: PartnerLocale; resetLabel: string }) {
  const copy = partnerCopy(locale);
  const state = partnerTileState(tile);
  // A running match (after a relaunch) is resumable even with no plays left: its play is already taken.
  const resume = usePartnerRankedResume(tile.available);

  return (
    <section
      data-testid="partner-ranked-card"
      data-state={state}
      aria-labelledby="partner-ranked-title"
      className="overflow-hidden rounded-2xl bg-brand-blue"
    >
      <div className="relative aspect-[21/9] w-full overflow-hidden">
        <DemoModeArt slug={PARTNER_GAME_DEMO_SLUG.ranked} className={cn("size-full", state !== "playable" && "opacity-40")} />
      </div>

      <div className="flex items-end justify-between gap-3 px-4 pt-3">
        <div className="min-w-0">
          <h2 id="partner-ranked-title" className="font-poppins text-[17px] font-semibold uppercase leading-tight text-white">
            {copy.rankedTitle}
          </h2>
          <p className="mt-0.5 font-poppins text-[11px] text-white/70">{copy.rankedSubtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-poppins text-[10px] font-semibold uppercase tracking-wide text-white/60">{copy.playsLeftToday}</p>
          <p className="font-poppins text-2xl font-bold tabular-nums leading-tight text-white" data-testid="partner-ranked-plays">
            {tile.playsLeft} <span className="text-base font-semibold text-white/60">/ {tile.playsLimit}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-3">
        <p className="flex min-w-0 items-center gap-1 font-poppins text-[11px] text-brand-yellow">
          {resetLabel && (
            <>
              <Clock3 className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{copy.resetsIn(resetLabel)}</span>
            </>
          )}
        </p>
        {resume || state === "playable" ? (
          <Link
            href={partnerGamePath("ranked")}
            data-testid={resume ? "partner-ranked-resume" : undefined}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-brand-yellow px-6 font-poppins text-sm font-bold uppercase text-black transition-colors hover:bg-brand-yellow-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <Play className="size-4 fill-current" aria-hidden />
            {resume ? rankedCopy(locale).resume : copy.play}
          </Link>
        ) : (
          <span className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-white/10 px-4 font-poppins text-xs font-semibold uppercase text-white/80">
            {state === "done" ? <CheckCircle2 className="size-4 text-brand-green-light" aria-hidden /> : <Lock className="size-4" aria-hidden />}
            {state === "done" ? copy.comeBackTomorrow : copy.comingSoon}
          </span>
        )}
      </div>
    </section>
  );
}
