"use client";

import { motion } from "motion/react";
import { CriterionAsset } from "@/features/football-grid/components/CriterionAsset";
import { cn } from "@/lib/utils";
import { poppins } from "./ui";

export interface ClubView { key: string; name: string; crest: string }

/** A crest the server names: a site path, or "club:<name>" for the app's crest registry. */
export function ClubCrest({ club, className }: { club: ClubView; className?: string }) {
  if (club.crest.startsWith("club:")) {
    const label = club.crest.slice(5);
    return <CriterionAsset className={className} criterion={{ id: club.key, key: `club:${club.key}`, family: "club", labelEn: label, labelKa: label, labelTr: label, assetKey: null, difficulty: "easy" }} />;
  }
  // eslint-disable-next-line @next/next/no-img-element -- crest files are served as they are, like the Grid's.
  return <img src={club.crest} alt="" className={cn("object-contain", className)} />;
}

/** A club as the Grid shows it: the crest on a white badge (dark crests stay readable), the name underneath. */
export function ClubTile({ club }: { club: ClubView | null }) {
  const name = club?.name ?? "· · ·";
  return (
    <motion.div key={club?.key ?? "hidden"} data-club={club?.key} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.25 }}
      className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-4 text-center shadow-lg shadow-black/25">
      {club
        ? <span className="flex size-24 items-center justify-center rounded-2xl bg-white p-2.5"><ClubCrest club={club} className="size-full" /></span>
        : <span className="flex size-24 items-center justify-center text-6xl font-black text-white/35" style={poppins}>?</span>}
      <span className={cn("break-words font-black uppercase leading-tight", club ? "text-white" : "text-white/35", name.length > 16 ? "text-xs" : "text-sm")} style={poppins}>{name}</span>
    </motion.div>
  );
}

/** Loads the match's crests before any reveal, so no reveal waits for an image. */
export function CrestPreload({ crests }: { crests: readonly string[] }) {
  return (
    <div aria-hidden className="pointer-events-none fixed size-0 overflow-hidden opacity-0">
      {crests.map((crest) => <ClubCrest key={crest} club={{ key: crest, name: "", crest }} className="size-1" />)}
    </div>
  );
}
