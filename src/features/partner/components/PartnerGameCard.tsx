"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, Lock, Play } from "lucide-react";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import { CARD_WIDTH } from "@/features/play/CardScroller";
import { cn } from "@/lib/utils";
import type { PartnerGameTile } from "../api/partnerApi.types";
import { partnerCopy, type PartnerLocale } from "../partnerCopy";
import { PARTNER_GAME_DEMO_SLUG, partnerGamePath, partnerGameTitle } from "../partnerGames";

export type PartnerTileState = "playable" | "done" | "coming_soon";

export function partnerTileState(tile: PartnerGameTile): PartnerTileState {
  if (!tile.available) return "coming_soon";
  // A play left midway (reload, relaunch) is reopened from its tile, whatever is left today.
  return tile.playsLeft > 0 || tile.inProgress ? "playable" : "done";
}

export function formatPartnerPoints(points: number, locale: PartnerLocale): string {
  return new Intl.NumberFormat(locale === "ka" ? "ka-GE" : "en-GB").format(points);
}

export function PartnerGameCard({ tile, locale, index }: { tile: PartnerGameTile; locale: PartnerLocale; index: number }) {
  const copy = partnerCopy(locale);
  const state = partnerTileState(tile);
  const title = partnerGameTitle(tile.gameId, locale);
  const slug = PARTNER_GAME_DEMO_SLUG[tile.gameId];
  const statusLabel =
    state === "done" ? copy.doneForToday
    : state === "coming_soon" ? copy.comingSoon
    : tile.inProgress ? copy.continuePlay
    : copy.playsLeft(tile.playsLeft);

  const body = (
    <>
      <div className="relative aspect-video w-full overflow-hidden">
        <DemoModeArt
          slug={slug}
          className={cn("size-full transition-transform duration-300", state === "playable" ? "group-hover:scale-[1.04]" : "opacity-30")}
        />
        {state === "playable" ? (
          <span className="absolute left-2 top-2 rounded-full bg-brand-yellow px-2 py-1 font-poppins text-[10px] font-bold uppercase leading-none text-black">
            {statusLabel}
          </span>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 text-center">
            {state === "done" ? (
              <CheckCircle2 className="size-6 text-brand-green-light" aria-hidden />
            ) : (
              <Lock className="size-5 text-white/80" aria-hidden />
            )}
            <span className="font-poppins text-[10px] font-bold uppercase tracking-wide text-white">{statusLabel}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-2.5">
        <h3 className={cn("line-clamp-2 font-poppins text-[12px] font-semibold uppercase", state === "playable" ? "text-white" : "text-white/70")}>
          {title}
        </h3>
        {state === "done" ? (
          <p className="mt-auto flex items-center gap-1 pt-2 font-poppins text-[10px] text-brand-yellow">
            <Clock3 className="size-3" aria-hidden /> {copy.comeBackTomorrow}
          </p>
        ) : tile.maxScore !== null ? (
          <p className="mt-auto pt-2 font-poppins text-[10px] text-white/60">{copy.upToPoints(formatPartnerPoints(tile.maxScore, locale))}</p>
        ) : null}
      </div>
    </>
  );

  if (state !== "playable") {
    return (
      <div
        data-testid="partner-game-card"
        data-game-id={tile.gameId}
        data-state={state}
        aria-label={`${title}: ${statusLabel}`}
        className={cn(CARD_WIDTH, "relative flex flex-col overflow-hidden rounded-xl bg-brand-blue/50")}
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={partnerGamePath(tile.gameId)}
      data-testid="partner-game-card"
      data-game-id={tile.gameId}
      data-state={state}
      aria-label={`${title}: ${statusLabel}`}
      className={cn(
        CARD_WIDTH,
        "group relative flex animate-in fade-in slide-in-from-bottom-2 flex-col overflow-hidden rounded-xl bg-brand-blue duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
      )}
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms`, animationFillMode: "backwards" }}
    >
      {body}
      <span className="sr-only">{copy.play}</span>
      <Play className="absolute right-2 top-2 size-6 rounded-full bg-black/40 p-1.5 text-white" aria-hidden />
    </Link>
  );
}
