"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import type { PartnerGameId } from "../api/partnerApi.types";
import { PARTNER_GAME_DEMO_SLUG } from "../partnerGames";

/**
 * A game's start screen. Phones: the art on top of the rules. Wide partner frames: the art beside the rules, so the
 * whole screen (Start included) fits the frame's height.
 */
export function PartnerGameIntro({
  gameId,
  title,
  description,
  rules,
  note,
  startLabel,
  backLabel,
  busy = false,
  error,
  onStart,
  onBack,
  testId,
  startTestId,
  backTestId,
}: {
  gameId: PartnerGameId;
  title: string;
  description?: string;
  /** One line (highlighted) or a list. */
  rules: string | readonly string[];
  /** The small print under the rules ("Starting uses one of today's plays"). */
  note?: string;
  startLabel: string;
  backLabel: string;
  busy?: boolean;
  error?: ReactNode;
  onStart: () => void;
  onBack: () => void;
  testId?: string;
  startTestId?: string;
  backTestId?: string;
}) {
  return (
    <div className="mt-4 flex flex-col gap-5 lg:mx-auto lg:w-full lg:max-w-5xl" data-testid={testId}>
      <button
        type="button"
        onClick={onBack}
        data-testid={backTestId}
        className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full bg-white/[0.08] px-3 font-poppins text-xs font-semibold text-white transition-colors hover:bg-white/[0.14]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {backLabel}
      </button>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl bg-brand-blue lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      >
        <div className="relative aspect-video w-full overflow-hidden lg:aspect-auto lg:h-full lg:min-h-[320px]">
          <DemoModeArt slug={PARTNER_GAME_DEMO_SLUG[gameId]} className="absolute inset-0 size-full" />
        </div>
        <div className="flex flex-col gap-2 p-4 lg:justify-center lg:gap-3 lg:p-8">
          <h1 className="font-poppins text-lg font-semibold uppercase text-white lg:text-2xl">{title}</h1>
          {description && <p className="font-poppins text-sm text-white/70 lg:text-base">{description}</p>}
          {typeof rules === "string" ? (
            <p className="font-poppins text-sm font-semibold text-brand-yellow lg:text-base">{rules}</p>
          ) : (
            <ul className="space-y-1.5 font-poppins text-sm text-white/85 lg:text-[15px]">
              {rules.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {note && <p className="font-poppins text-xs text-white/50">{note}</p>}
          {error}
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            data-testid={startTestId}
            className="mt-2 inline-flex h-11 w-fit min-w-32 items-center justify-center gap-1.5 rounded-full bg-brand-yellow px-6 font-poppins text-sm font-semibold text-black transition-colors hover:bg-brand-yellow/90 disabled:opacity-60 lg:h-12 lg:px-8 lg:text-base"
          >
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Play className="size-4" aria-hidden />}
            {startLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
