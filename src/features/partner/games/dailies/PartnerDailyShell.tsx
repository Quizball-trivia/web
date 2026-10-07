"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Loader2, Play } from "lucide-react";
import { DemoModeArt } from "@/features/demos/DemoModeArt";
import { QuitGameDialog } from "@/features/daily/QuitGameDialog";
import { DailyChallengeHeader } from "@/features/daily/components/DailyChallengeHeader";
import { DailyGameStage } from "@/features/daily/components/DailyGameStage";
import { ResultSplash } from "@/features/daily/components/ResultSplash";
import { useResultSplash } from "@/features/daily/components/useResultSplash";
import { partnerCopy } from "../../partnerCopy";
import { PARTNER_GAME_DEMO_SLUG, partnerGameDescription, partnerGameTitle } from "../../partnerGames";
import type { PartnerGameScreenProps } from "../../game-kit/types";
import { dailyCopy, type PartnerDailyGameId } from "./dailyCopy";
import type { PartnerDailyPlay } from "./dailyPlay.types";
import { usePartnerDailyPlay, type PartnerDailyController } from "./usePartnerDailyPlay";

/** How long a resolved item's reveal stays up before the next one opens (the public dailies use the same beat). */
const REVEAL_MS = 1400;
/** Past the server's answer grace (ANSWER_GRACE_MS = 1 s) with a margin for the round trip. */
const TIMEOUT_READ_DELAY_MS = 1_300;

export interface PartnerDailyBoardContext<Item> {
  play: PartnerDailyPlay;
  item: Item;
  controller: PartnerDailyController;
  fire: ReturnType<typeof useResultSplash>["fire"];
}

interface PartnerDailyShellProps<Item> extends PartnerGameScreenProps {
  gameId: PartnerDailyGameId;
  /** "Round n/N" in the header (round-based games). */
  roundLabel?: (n: number, total: number) => string;
  renderBoard: (ctx: PartnerDailyBoardContext<Item>) => ReactNode;
}

/** Intro → play → result hand-off for the Freecroco dailies; the game-specific board comes from `renderBoard`. */
export function PartnerDailyShell<Item>({ gameId, api, onFinished, onExit, roundLabel, renderBoard }: PartnerDailyShellProps<Item>) {
  const controller = usePartnerDailyPlay(api);
  const { status, play, errorCode, busy, timeLeft, lang } = controller;
  const copy = dailyCopy(lang);
  const shellCopy = partnerCopy(lang);
  const { splashProps, fire } = useResultSplash();
  const [quitOpen, setQuitOpen] = useState(false);
  const reported = useRef(false);

  const ended = play?.state === "finished" || play?.state === "cancelled";
  // The server settles on the last answer and still sends that item, so its reveal plays before the result screen.
  const lastReveal = play?.state === "finished" && play.item !== null;
  useEffect(() => {
    if (!play || !ended || reported.current) return;
    const report = () => {
      reported.current = true;
      if (play.state === "finished") onFinished({ playId: play.playId, score: play.score });
      else onExit();
    };
    if (!lastReveal) return report();
    const id = window.setTimeout(report, REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [play, ended, lastReveal, onFinished, onExit]);

  // A resolved item shows its reveal for a beat, then the server opens the next one.
  const resolvedKey = play && play.state === "playing" && play.resolved ? `${play.playId}:${play.index}:${controller.epoch}` : null;
  useEffect(() => {
    if (!resolvedKey) return;
    const id = window.setTimeout(() => void controller.next(), REVEAL_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedKey]);

  // Time ran out on screen. The server closes the item only after its grace (an answer sent at the last moment may
  // still be on its way), so wait that out and read the play again until it shows the item closed.
  useEffect(() => {
    if (!play || play.state !== "playing" || play.resolved || timeLeft > 0 || busy) return;
    const id = window.setTimeout(() => void controller.refresh(), TIMEOUT_READ_DELAY_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, timeLeft, busy]);

  if (status === "loading" || status === "starting" || (play && ended && !lastReveal)) {
    return (
      <div className="mt-16 flex justify-center" data-testid="partner-daily-loading">
        <Loader2 className="size-8 animate-spin text-brand-yellow" aria-hidden />
      </div>
    );
  }

  if (status === "error") {
    const message = errorCode === "quota_exhausted" ? copy.noPlaysLeft : errorCode === "game_not_available" ? copy.notAvailable : copy.loadError;
    return (
      <div className="mt-10 flex flex-col items-center gap-4 text-center" data-testid="partner-daily-error" data-code={errorCode ?? undefined}>
        <p className="max-w-sm font-poppins text-sm text-white/80">{message}</p>
        <div className="flex gap-2">
          {errorCode !== "quota_exhausted" && (
            <button type="button" onClick={() => void controller.load()} className="h-10 rounded-full bg-white px-5 font-poppins text-sm font-semibold text-black hover:bg-white/90">
              {copy.tryAgain}
            </button>
          )}
          <button type="button" onClick={onExit} className="h-10 rounded-full bg-white/[0.08] px-5 font-poppins text-sm font-semibold text-white hover:bg-white/[0.14]">
            {shellCopy.backToGames}
          </button>
        </div>
      </div>
    );
  }

  if (status === "intro" || !play || !play.item) {
    return (
      <div className="mt-4 flex flex-col gap-5" data-testid="partner-daily-intro">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full bg-white/[0.08] px-3 font-poppins text-xs font-semibold text-white transition-colors hover:bg-white/[0.14]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {shellCopy.backToGames}
        </button>
        <div className="overflow-hidden rounded-2xl bg-brand-blue">
          <div className="aspect-video w-full overflow-hidden">
            <DemoModeArt slug={PARTNER_GAME_DEMO_SLUG[gameId]} className="size-full" />
          </div>
          <div className="flex flex-col gap-2 p-4">
            <h1 className="font-poppins text-lg font-semibold uppercase text-white">{partnerGameTitle(gameId, lang)}</h1>
            <p className="font-poppins text-sm text-white/70">{partnerGameDescription(gameId, lang)}</p>
            <p className="font-poppins text-sm font-semibold text-brand-yellow">{copy.rules[gameId]}</p>
            <p className="font-poppins text-xs text-white/50">{copy.usesPlay}</p>
            <button
              type="button"
              data-testid="partner-daily-start"
              onClick={() => void controller.start()}
              className="mt-2 inline-flex h-11 w-fit items-center gap-1.5 rounded-full bg-brand-yellow px-6 font-poppins text-sm font-semibold text-black transition-colors hover:bg-brand-yellow/90"
            >
              <Play className="size-4" aria-hidden />
              {copy.start}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-poppins text-white"
      data-testid="partner-daily-play"
      data-index={play.index}
      data-resolved={play.resolved}
    >
      <DailyGameStage
        header={
          <DailyChallengeHeader
            onQuit={() => setQuitOpen(true)}
            currentIndex={play.index}
            total={play.itemCount}
            timeLeft={play.resolved ? 0 : timeLeft}
            centerLabel={roundLabel?.(play.index + 1, play.itemCount)}
            className="px-0 pt-0"
          />
        }
      >
        {renderBoard({ play, item: play.item as Item, controller, fire })}
      </DailyGameStage>

      <QuitGameDialog
        open={quitOpen}
        onOpenChange={setQuitOpen}
        title={copy.quitTitle}
        description={copy.quitBody}
        onQuit={() => {
          setQuitOpen(false);
          void controller.quit();
        }}
      />

      <ResultSplash {...splashProps} />
    </div>
  );
}

/** The running points under a board. */
export function PartnerPointsRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="mt-4 flex items-center justify-between font-poppins text-sm font-semibold">
      <span className="text-white/55">{label}</span>
      <span className="text-brand-yellow" data-testid="partner-daily-score">
        {score}
      </span>
    </div>
  );
}
