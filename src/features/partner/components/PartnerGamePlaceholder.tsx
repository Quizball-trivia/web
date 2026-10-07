"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import type { PartnerGameId } from "../api/partnerApi.types";
import { partnerCopy, toPartnerLocale } from "../partnerCopy";
import { FREECROCO_HOME_PATH, PARTNER_GAME_DEMO_SLUG, partnerGameTitle } from "../partnerGames";

/** Stand-in until each game ships its partner flow. */
export function PartnerGamePlaceholder({ gameId }: { gameId: PartnerGameId }) {
  const { locale } = useLocale();
  const partnerLocale = toPartnerLocale(locale);
  const copy = partnerCopy(partnerLocale);

  return (
    <div className="mt-4 flex flex-col gap-5">
      <Link
        href={FREECROCO_HOME_PATH}
        className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full bg-white/[0.08] px-3 font-poppins text-xs font-semibold text-white transition-colors hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {copy.backToGames}
      </Link>
      <div className="overflow-hidden rounded-2xl bg-brand-blue">
        <div className="aspect-video w-full overflow-hidden">
          <DemoModeArt slug={PARTNER_GAME_DEMO_SLUG[gameId]} className="size-full" />
        </div>
        <div className="p-4">
          <h1 className="font-poppins text-lg font-semibold uppercase text-white">{partnerGameTitle(gameId, partnerLocale)}</h1>
          <p className="mt-1 font-poppins text-sm text-white/70">{copy.gameSoonBody}</p>
        </div>
      </div>
    </div>
  );
}
