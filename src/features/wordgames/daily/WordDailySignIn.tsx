"use client";
import type { ReactNode } from "react";
import { SignInLink } from "@/features/marketing/public/PublicLinks";
import type { WordDailyGame } from "./wordDaily.games";

export const YELLOW_PILL = "inline-flex h-10 items-center rounded-full bg-brand-yellow px-5 text-xs font-black uppercase text-black hover:bg-brand-yellow-deep";

export function DailySignIn({ game, placement, className = YELLOW_PILL, children }: { game: WordDailyGame; placement: string; className?: string; children: ReactNode }) {
  return <SignInLink placement={`${game.modeId}_${placement}`} modeId={game.modeId} returnTo={game.route} className={className}>{children}</SignInLink>;
}
