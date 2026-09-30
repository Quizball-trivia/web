"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import type { Locale } from "@/lib/i18n/locale";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useRealtimePrincipal } from "@/lib/realtime/realtime-principal";
import { useActiveDuelStore } from "@/stores/activeDuel.store";
import { duelCopy } from "./duel.copy";
import { useDuel, useSecondsLeft } from "./useDuel";
import { DuelMatchView, Shell } from "./DuelMatchView";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
/** Without a first snapshot by then, the loading screen offers retry / exit instead of spinning forever. */
const LOADING_LIMIT_MS = 8_000;

/**
 * Everything on the duel screen belongs to one principal and one match: signing in or out, or moving to another
 * duel, remounts it, so a previous snapshot and unacknowledged commands can never be shown to (or replayed as) the next.
 */
export function DuelScreen({ matchId }: { matchId: string }) {
  const principal = useRealtimePrincipal();
  return <DuelRoom key={`${principal.kind}:${principal.userId ?? "none"}:${matchId}`} matchId={matchId} />;
}

function DuelRoom({ matchId }: { matchId: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = duelCopy(locale as Locale);
  const duel = useDuel(matchId);
  const { snapshot, error, fatal, clearError } = duel;
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const roomPath = snapshot?.lobbyId && lobby?.lobbyId === snapshot.lobbyId && lobby.inviteCode ? `/friend/room/${lobby.inviteCode}?source=rematch` : "/play/friend";
  const [confirmLeave, setConfirmLeave] = useState(false);
  const secondsLeft = useSecondsLeft(snapshot && ["ready", "countdown", "active", "paused"].includes(snapshot.status) ? snapshot.phaseDeadlineAt : null, duel.nowMs);

  // The screen keeps the browser's pointer to this duel current: live → remembered, finished → forgotten.
  const setActive = useActiveDuelStore((state) => state.set);
  const clearActive = useActiveDuelStore((state) => state.clear);
  const status = snapshot?.status;
  const game = snapshot?.game;
  const lobbyId = snapshot?.lobbyId ?? null;
  const owner = duel.principal.userId;
  useEffect(() => {
    if (!status || !game) return;
    if (status === "completed" || status === "cancelled") clearActive(matchId);
    else setActive({ matchId, game, lobbyId }, owner);
  }, [status, game, lobbyId, matchId, owner, setActive, clearActive]);

  // Before the first snapshot an error is the whole screen, so it stays until a retry.
  const hasSnapshot = snapshot !== null;
  useEffect(() => {
    if (!error || !hasSnapshot) return;
    const id = window.setTimeout(clearError, 3_000);
    return () => window.clearTimeout(id);
  }, [error, clearError, hasSnapshot]);

  useEffect(() => { if (fatal && !hasSnapshot) clearActive(matchId); }, [fatal, hasSnapshot, clearActive, matchId]);

  const [stalled, setStalled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const loading = !hasSnapshot && !fatal;
  useEffect(() => {
    if (!loading) return;
    const id = window.setTimeout(() => setStalled(true), LOADING_LIMIT_MS);
    return () => window.clearTimeout(id);
  }, [loading, attempt]);

  const live = snapshot?.status === "active" || snapshot?.status === "countdown" || snapshot?.status === "paused";
  const exit = () => {
    if (live) {
      setConfirmLeave(true);
      return;
    }
    // Leaving at the ready gate cancels on the server, so the rival is not started into a match without us.
    if (snapshot?.status === "ready") duel.forfeit();
    router.push(roomPath);
  };

  if (!snapshot) {
    const stuck = fatal ?? (error || stalled || duel.guestStatus === "refused" ? error ?? "default" : null);
    const retry = () => {
      clearError();
      setStalled(false);
      setAttempt((n) => n + 1);
      // A socket that never came up cannot resync; a fresh page load re-runs the whole connection.
      if (duel.connected) duel.resync();
      else window.location.reload();
    };
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          {stuck ? <p className="text-white/80">{copy.errors[stuck] ?? copy.errors.default}</p> : <Loader2 className="size-8 animate-spin text-white/60" />}
          {!stuck && <p className="text-sm text-white/60">{copy.connecting}</p>}
          {stuck && (
            <div className="flex gap-2">
              <button type="button" onClick={retry} className="h-11 rounded-full bg-white/10 px-6 text-sm font-bold uppercase" style={poppins}>{copy.retry}</button>
              <button type="button" onClick={() => router.push("/play")} className="h-11 rounded-full bg-white/10 px-6 text-sm font-bold uppercase" style={poppins}>{copy.result.exit}</button>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  return (
    <DuelMatchView snapshot={snapshot} locale={locale as Locale} copy={copy} secondsLeft={secondsLeft} connected={duel.connected} busy={duel.inFlight > 0}
      error={error} confirmLeave={confirmLeave} onSend={duel.send} onExit={exit}
      onConfirmForfeit={() => { setConfirmLeave(false); duel.forfeit(); }} onCancelForfeit={() => setConfirmLeave(false)}
      onRoom={() => router.push(roomPath)} onLeave={() => router.push("/play")} />
  );
}
