"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import type { PartnerGameId } from "../api/partnerApi.types";
import { usePartnerSession } from "../PartnerSessionProvider";
import { partnerCopy, toPartnerLocale } from "../partnerCopy";
import { FREECROCO_HOME_PATH, partnerGameTitle } from "../partnerGames";
import { partnerGamesQueryKey, usePartnerGames } from "../hooks/usePartnerGames";
import { PartnerGamePlaceholder } from "../components/PartnerGamePlaceholder";
import { PartnerPointsCount } from "../components/PartnerPointsCount";
import type { PartnerFinishedPlay, PartnerGameApi, PartnerGameScreenProps } from "./types";

/** Each game stream registers its screen here; a game without one shows the "coming soon" placeholder. */
export type PartnerGameRegistry = Partial<Record<PartnerGameId, ComponentType<PartnerGameScreenProps>>>;

export function PartnerGameHost({ gameId, registry }: { gameId: PartnerGameId; registry: PartnerGameRegistry }) {
  const { api } = usePartnerSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [finished, setFinished] = useState<PartnerFinishedPlay | null>(null);
  const Screen = registry[gameId];
  // Decided once, on open, from a fresh games list: a play that ended while the player was away (its card still said
  // Continue) shows its result rather than an intro whose start would find no plays left. Ranked has its own flow.
  const games = usePartnerGames();
  const [opened, setOpened] = useState(gameId === "ranked");
  if (!opened && games.isFetchedAfterMount && !games.isFetching) {
    // Only a successful, current-day answer can turn the game into a result; anything else just opens the game.
    // A day that had already ended when the answer arrived (a request straddling Tbilisi midnight) is not current.
    const fresh = !games.isError && games.data && Date.parse(games.data.resetsAt) > games.dataUpdatedAt;
    const tile = fresh ? games.data?.games.find((g) => g.gameId === gameId) : undefined;
    if (tile && tile.playsLeft === 0 && !tile.inProgress && tile.lastResult) {
      setFinished({ playId: tile.lastResult.playId, score: tile.lastResult.score });
    }
    setOpened(true);
  }

  const gameApi = useMemo<PartnerGameApi>(
    () => ({
      get: (path) => api.game(gameId, path, "GET"),
      post: (path, body) => api.game(gameId, path, "POST", body),
    }),
    [api, gameId],
  );

  if (!Screen) return <PartnerGamePlaceholder gameId={gameId} />;
  if (finished) return <PartnerPlayResult gameId={gameId} play={finished} />;
  if (!opened) {
    return (
      <div className="mt-16 flex justify-center" aria-busy="true">
        <span className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <Screen
      gameId={gameId}
      api={gameApi}
      onFinished={(play, options) => {
        void queryClient.invalidateQueries({ queryKey: partnerGamesQueryKey });
        if (!options?.ownResultScreen) setFinished(play);
      }}
      onExit={() => {
        void queryClient.invalidateQueries({ queryKey: partnerGamesQueryKey });
        router.push(FREECROCO_HOME_PATH);
      }}
    />
  );
}

/** "+N points" once the server has scored the play; delivery to Freecroco happens server-side (contract §6). */
function PartnerPlayResult({ gameId, play }: { gameId: PartnerGameId; play: PartnerFinishedPlay }) {
  const { locale } = useLocale();
  const partnerLocale = toPartnerLocale(locale);
  const copy = partnerCopy(partnerLocale);

  return (
    <div className="mt-6 flex flex-col items-center gap-5 text-center">
      <p className="font-poppins text-sm font-semibold uppercase tracking-wide text-white/60">{partnerGameTitle(gameId, partnerLocale)}</p>
      <PartnerPointsCount score={play.score} locale={partnerLocale} delayMs={200} className="text-5xl" />
      <p className="font-poppins text-sm text-white/70">{copy.pointsLabel}</p>
      <Link
        href={FREECROCO_HOME_PATH}
        className="mt-2 inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-5 font-poppins text-sm font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {copy.backToGames}
      </Link>
    </div>
  );
}
