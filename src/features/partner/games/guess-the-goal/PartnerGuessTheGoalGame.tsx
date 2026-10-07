"use client";

import { useMemo } from "react";
import { useLocale } from "@/contexts/LocaleContext";
import {
  GuessTheGoalScreen,
  type GgtLiveBonusOutcome,
  type GgtLiveGuessOutcome,
  type GgtLiveSession,
  type GgtPlayEnd,
  type GgtPlayView,
  type GgtScreenDeps,
} from "@/features/mini-games/components/GuessTheGoalLive";
import { toPartnerLocale } from "../../partnerCopy";
import type { PartnerGameScreenProps } from "../../game-kit/types";
import { GUESS_THE_GOAL_PARTNER_COPY } from "./guessTheGoalPartnerCopy";

/**
 * Guess the Goal for Freecroco: the quizball.io screen in partner mode — the partner game endpoints, points instead
 * of coins/XP, no collection, deadlines shown, and the host's result screen once the play has its score.
 */
export function PartnerGuessTheGoalGame({ api, onFinished, onExit }: PartnerGameScreenProps) {
  const { locale } = useLocale();
  const copy = GUESS_THE_GOAL_PARTNER_COPY[toPartnerLocale(locale)];

  const deps = useMemo<GgtScreenDeps>(() => {
    // A play cancelled by a block (sent: false) has no points to show.
    const report = (play: GgtPlayEnd) => (play.sent ? onFinished({ playId: play.play_id, score: play.score }) : onExit());
    return {
      api: {
        // A play left at its deadline is settled when the screen opens again: go straight to its points.
        current: async () => {
          const { session, finished } = await api.get<{ session: GgtLiveSession | null; finished: GgtPlayEnd | null }>("current");
          if (finished) report(finished);
          return session;
        },
        start: (clientNonce) => api.post<GgtLiveSession>("start", { client_nonce: clientNonce }),
        guess: (sessionId, optionId) => api.post<GgtLiveGuessOutcome>(`sessions/${sessionId}/guess`, { option_id: optionId }),
        bonus: (sessionId, optionId) => api.post<GgtLiveBonusOutcome>(`sessions/${sessionId}/bonus`, { option_id: optionId }),
      },
      partner: {
        expire: (sessionId) => api.post(`sessions/${sessionId}/expire`, {}),
        lookup: (sessionId) => api.get<GgtPlayView>(`sessions/${sessionId}`),
        onFinished: report,
        onExit,
        copy,
      },
    };
  }, [api, copy, onExit, onFinished]);

  return <GuessTheGoalScreen deps={deps} />;
}
