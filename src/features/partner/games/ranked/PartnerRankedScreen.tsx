"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { GameStageRouter, type GameStageRouterPartnerMode } from "@/features/game/GameStageRouter";
import { GameConnectionIndicator } from "@/features/game/GameConnectionIndicator";
import { PlayerProvider, usePlayer } from "@/contexts/PlayerContext";
import { HideRankProvider } from "@/contexts/HideRankContext";
import { useLocale } from "@/contexts/LocaleContext";
import { QUESTION_COUNT } from "@/lib/constants/game";
import { markRankedQueueIntent } from "@/lib/analytics/game-events";
import { getSocket, setRealtimeTokenSource, type RealtimeTokenSource } from "@/lib/realtime/socket-client";
import { usePartnerRealtimeStore } from "@/lib/realtime/realtime-principal";
import { useGameSessionStore } from "@/stores/gameSession.store";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useRankedMatchmakingStore } from "@/stores/rankedMatchmaking.store";
import type { MatchResultSummary } from "@/features/game/results/results.types";
import type { PartnerGameApi, PartnerGameScreenProps } from "../../game-kit/types";
import { toPartnerLocale } from "../../partnerCopy";
import { usePartnerSession } from "../../PartnerSessionProvider";
import { PartnerRankedMatchResult, type PartnerRankedPoints } from "./PartnerRankedMatchResult";
import { rankedCopy } from "./rankedCopy";

interface SocketTokenResponse {
  accessToken: string;
  expiresAt: string;
  userId: string;
}

export interface PartnerRankedState {
  userId: string;
  activePlay: { playId: string; state: "searching" | "playing"; matchId: string | null } | null;
}

export interface PartnerRankedResult {
  playId: string;
  matchId: string | null;
  state: "searching" | "playing" | "settled" | "cancelled";
  score: number | null;
  outcome: "win" | "loss" | "draw" | null;
  terminalCause: string | null;
  refunded: boolean;
}

/** Refetch the handshake token this long before it expires (it lives 5 minutes). */
const TOKEN_REFRESH_LEAD_MS = 60_000;
const RESULT_POLL_MS = 1_500;
const RESULT_POLL_ATTEMPTS = 40;

/**
 * The partner socket authenticates with a short-lived partner access token from the game endpoint (the session's
 * own token never leaves the partner session core). Cached until shortly before it expires.
 */
function partnerTokenSource(api: PartnerGameApi, onRefused: () => void): RealtimeTokenSource {
  let cached: SocketTokenResponse | null = null;
  return {
    async getToken() {
      if (cached && Date.parse(cached.expiresAt) - Date.now() > TOKEN_REFRESH_LEAD_MS) return cached.accessToken;
      try {
        cached = await api.post<SocketTokenResponse>("socket-token");
        return cached.accessToken;
      } catch {
        // The session core already ended the session on a 401; anything else retries on the next attempt.
        cached = null;
        return null;
      }
    },
    onAuthRefused: () => {
      cached = null;
      onRefused();
    },
  };
}

/** Freecroco's Ranked card: the Quizball ranked flow (queue → draft → match) on a partner socket. */
export function PartnerRankedScreen({ api, onFinished, onExit }: PartnerGameScreenProps) {
  const [identity, setIdentity] = useState<{ userId: string; resumeMatchId: string | null } | null>(null);
  const [failed, setFailed] = useState(false);
  const { locale } = useLocale();
  const copy = rankedCopy(toPartnerLocale(locale));

  // A session that ended shows up as a 401 on any partner call: the session provider then shows "open again".
  const probeSession = useCallback(() => {
    void api.get("state").catch(() => undefined);
  }, [api]);

  useEffect(() => {
    let active = true;
    const source = partnerTokenSource(api, probeSession);
    setRealtimeTokenSource(source);
    void (async () => {
      try {
        const [token, ranked] = await Promise.all([
          api.post<SocketTokenResponse>("socket-token"),
          api.get<PartnerRankedState>("state"),
        ]);
        if (!active) return;
        useRealtimeMatchStore.getState().reset();
        useRankedMatchmakingStore.getState().clearRankedMatchmaking();
        const session = useGameSessionStore.getState();
        session.startSession({ mode: "ranked", matchType: "ranked", questionCount: QUESTION_COUNT });
        // A match already running (a relaunch, a reload) is rejoined, never queued again: its play is already taken.
        const resumeMatchId = ranked.activePlay?.state === "playing" ? ranked.activePlay.matchId : null;
        if (resumeMatchId) session.setStage("playing");
        else markRankedQueueIntent("mode_select");
        usePartnerRealtimeStore.getState().setUserId(token.userId);
        setIdentity({ userId: token.userId, resumeMatchId });
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
      usePartnerRealtimeStore.getState().setUserId(null);
      useGameSessionStore.getState().reset();
      setRealtimeTokenSource(null);
    };
  }, [api, probeSession]);

  useEffect(() => {
    if (!identity) return;
    const socket = getSocket();
    const onEnded = () => probeSession();
    socket.on("partner:session_ended", onEnded);
    // Rejoin explicitly (within the reconnect window the server still holds the seat); on every (re)connect until
    // the match shows up locally.
    const matchId = identity.resumeMatchId;
    const rejoin = () => {
      if (!matchId || useRealtimeMatchStore.getState().match?.matchId === matchId) return;
      socket.emit("match:rejoin", { matchId });
    };
    socket.on("connect", rejoin);
    if (socket.connected) rejoin();
    return () => {
      socket.off("partner:session_ended", onEnded);
      socket.off("connect", rejoin);
    };
  }, [identity, probeSession]);

  // A cancelled match clears the store's match; the result screen still needs its id.
  const lastMatchIdRef = useRef<string | null>(null);
  useEffect(
    () =>
      useRealtimeMatchStore.subscribe((state) => {
        const matchId = state.match?.matchId;
        if (matchId) lastMatchIdRef.current = matchId;
      }),
    [],
  );

  const partnerMode = useMemo<GameStageRouterPartnerMode>(
    () => ({
      onExit,
      renderResult: ({ matchId, summary, cancelled }) => (
        <PartnerRankedResultView
          api={api}
          matchId={matchId ?? lastMatchIdRef.current}
          summary={summary}
          cancelledHint={cancelled}
          onFinished={onFinished}
          onExit={onExit}
        />
      ),
    }),
    [api, onExit, onFinished],
  );

  if (failed) {
    return (
      <div className="mt-10 flex flex-col items-center gap-4 text-center">
        <p className="font-poppins text-sm text-white/80">{copy.unavailable}</p>
        <BackButton label={copy.back} onClick={onExit} />
      </div>
    );
  }
  if (!identity) {
    return (
      <div className="mt-16 flex justify-center" aria-busy>
        <Loader2 className="size-6 animate-spin text-white/70" aria-hidden />
      </div>
    );
  }

  // The match screens are full-screen: they cover the partner header while a game is on.
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-surface-page" data-testid="partner-ranked">
      <HideRankProvider>
        <PlayerProvider>
          <PartnerPlayerName />
          <GameConnectionIndicator />
          <GameStageRouter partner={partnerMode} />
        </PlayerProvider>
      </HideRankProvider>
    </div>
  );
}

/** The match screens show the player under the name Freecroco gave us. */
function PartnerPlayerName() {
  const { state } = usePartnerSession();
  const { setPlayer } = usePlayer();
  const name = state.status === "ready" ? state.player.displayName : null;
  useEffect(() => {
    if (name) setPlayer((current) => (current.username === name ? current : { ...current, username: name }));
  }, [name, setPlayer]);
  return null;
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-5 font-poppins text-sm font-semibold text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </button>
  );
}

/**
 * After the final whistle: the Quizball match result right away, with the Freecroco points counted up once the
 * server's partner settlement lands. A cancelled match explains whether the play came back.
 */
function PartnerRankedResultView({
  api,
  matchId,
  summary,
  cancelledHint,
  onFinished,
  onExit,
}: {
  api: PartnerGameApi;
  matchId: string | null;
  summary: MatchResultSummary | null;
  cancelledHint: boolean;
  onFinished: PartnerGameScreenProps["onFinished"];
  onExit: () => void;
}) {
  const { locale } = useLocale();
  const copy = rankedCopy(toPartnerLocale(locale));
  const { player } = usePlayer();
  const [result, setResult] = useState<PartnerRankedResult | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!matchId) return;
    let active = true;
    let attempts = 0;
    let timer: number | undefined;
    const poll = async () => {
      attempts += 1;
      try {
        const next = await api.get<PartnerRankedResult>(`matches/${matchId}/result`);
        if (!active) return;
        setResult(next);
        if (next.state === "settled" || next.state === "cancelled") return;
      } catch {
        // Not settled yet or a transient failure: poll again.
      }
      if (!active) return;
      if (attempts >= RESULT_POLL_ATTEMPTS) setGaveUp(true);
      else timer = window.setTimeout(() => void poll(), RESULT_POLL_MS);
    };
    void poll();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [api, matchId]);

  useEffect(() => {
    if (result?.state !== "settled" || result.score === null || finishedRef.current) return;
    finishedRef.current = true;
    onFinished({ playId: result.playId, score: result.score }, { ownResultScreen: true });
  }, [onFinished, result]);

  const stopped = gaveUp || !matchId;
  const cancelled = result?.state === "cancelled" || (stopped && cancelledHint);
  if (summary && !cancelled) {
    const points: PartnerRankedPoints =
      result?.state === "settled" && result.score !== null
        ? { status: "settled", score: result.score }
        : stopped
          ? { status: "unavailable" }
          : { status: "settling" };
    return <PartnerRankedMatchResult summary={summary} points={points} onExit={onExit} />;
  }
  if (!cancelled && !stopped) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center" data-testid="partner-ranked-settling">
        <Loader2 className="size-7 animate-spin text-brand-yellow" aria-hidden />
        <p className="font-poppins text-sm text-white/80">{copy.settling}</p>
      </div>
    );
  }

  const body = !cancelled || !result
    ? copy.resultUnavailable
    : result.refunded
      ? copy.cancelledReturned
      : copy.cancelledUsed;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center" data-testid="partner-ranked-cancelled">
      <p className="font-poppins text-xs font-semibold uppercase tracking-wide text-white/60">{player.username}</p>
      <h2 className="font-poppins text-2xl font-bold text-white">{cancelled ? copy.cancelledTitle : copy.resultTitle}</h2>
      <p className="max-w-sm font-poppins text-sm text-white/75">{body}</p>
      <BackButton label={copy.back} onClick={onExit} />
    </div>
  );
}
