"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";
import type { Locale } from "@/lib/i18n/locale";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useRealtimePrincipal } from "@/lib/realtime/realtime-principal";
import { useActiveDuelStore } from "@/stores/activeDuel.store";
import type { DuelSeatPayload, DuelStatePayload } from "@/lib/realtime/socket.types";
import { duelCopy, type DuelCopy } from "./duel.copy";
import { SEAT_BG, SEAT_LABEL, SEAT_TEXT } from "./duel.seats";
import type { BuscaminasDuelView, PistasDuelView, Seat, UltimoDuelView } from "./duel.views";
import { BuscaminasDuelBoard } from "./BuscaminasDuelBoard";
import { PistasDuelBoard } from "./PistasDuelBoard";
import { UltimoDuelBoard } from "./UltimoDuelBoard";
import { useDuel, useSecondsLeft } from "./useDuel";
import { DuelIntro } from "./DuelIntro";
import { DuelAvatar, seatAvatar } from "./DuelAvatar";

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

  const mySeat = snapshot.mySeat as Seat;
  const names = seatNames(snapshot, copy);
  const view = snapshot.view as BuscaminasDuelView | PistasDuelView | UltimoDuelView | null;
  const turnSeat = (snapshot.game === "buscaminas" || snapshot.game === "ultimo") && view && (view as BuscaminasDuelView | UltimoDuelView).phase === "turn"
    ? (view as BuscaminasDuelView | UltimoDuelView).turn : null;
  // The clock is shown only while someone can act; a reveal's few seconds are not a countdown to worry about.
  const actionable = snapshot.status === "active" && !!view && (
    ((snapshot.game === "buscaminas" || snapshot.game === "ultimo") && (view as BuscaminasDuelView | UltimoDuelView).phase === "turn")
    || (snapshot.game === "pistas" && (view as PistasDuelView).phase === "clue"));
  const introPhase = snapshot.status === "ready" || snapshot.status === "countdown" || (snapshot.status === "paused" && snapshot.pausedFrom === "countdown");
  const awaySeat = snapshot.status === "paused" ? snapshot.seats.find((s) => !s.connected) : undefined;
  const finished = snapshot.status === "completed" || snapshot.status === "cancelled";
  // Último has no idle rule: a seat that stops answering simply loses each category to the clock.
  const idle = !view || snapshot.game === "ultimo" ? 0
    : snapshot.game === "buscaminas" ? (view as BuscaminasDuelView).timeouts[mySeat] : (view as PistasDuelView).idle[mySeat] >= 2 ? 1 : 0;

  return (
    <Shell>
      <header className="relative z-40 flex items-center gap-3">
        <button type="button" onClick={exit} aria-label={live ? copy.forfeit.button : copy.result.exit} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>
        <p className="min-w-0 flex-1 truncate text-[13px] font-black uppercase tracking-wide" style={poppins}>{copy.games[snapshot.game]}</p>
        {live && actionable && secondsLeft !== null && <Clock seconds={secondsLeft} copy={copy} />}
      </header>

      {!duel.connected && live && <p role="status" className="mt-2 rounded-xl bg-brand-orange/15 px-3 py-2 text-center text-xs font-semibold text-brand-orange-light">{copy.offline}</p>}

      {!introPhase && <Scoreboard snapshot={snapshot} names={names} turnSeat={turnSeat} copy={copy} />}

      {live && idle > 0 && <p className="mt-2 rounded-xl bg-brand-orange/15 px-3 py-2 text-center text-xs font-semibold text-brand-orange-light">{copy.idleWarning}</p>}

      <div className="mt-3 flex flex-1 flex-col">
        {introPhase && <DuelIntro snapshot={snapshot} names={names} copy={copy} secondsLeft={snapshot.status === "countdown" ? secondsLeft : null} />}
        {view && !introPhase && snapshot.game === "buscaminas" && (
          <BuscaminasDuelBoard view={view as BuscaminasDuelView} mySeat={mySeat} names={names} copy={copy} finished={finished || snapshot.status === "paused"}
            onPick={(cardId) => duel.send({ type: "pick", round: (view as BuscaminasDuelView).round, at: (view as BuscaminasDuelView).pickIndex, cardId })} />
        )}
        {view && !introPhase && snapshot.game === "ultimo" && (
          <UltimoDuelBoard key={(view as UltimoDuelView).category} view={view as UltimoDuelView} mySeat={mySeat} names={names} copy={copy} finished={finished || snapshot.status === "paused"}
            secondsLeft={secondsLeft} busy={duel.inFlight > 0}
            onAnswer={(text) => {
              const { category, k } = view as UltimoDuelView;
              // Held until a snapshot shows the answer judged (a new attempt, another category, or the end).
              duel.send({ type: "answer", cat: category, k, text }, (next) => {
                const shownView = next.view as UltimoDuelView | null;
                return !shownView || shownView.category !== category || shownView.k !== k || shownView.phase !== "turn";
              });
            }} />
        )}
        {view && !introPhase && snapshot.game === "pistas" && (
          <PistasDuelBoard key={(view as PistasDuelView).round} view={view as PistasDuelView} mySeat={mySeat} names={names} copy={copy} locale={locale as Locale} finished={finished || snapshot.status === "paused"}
            onGuess={(text) => duel.send({ type: "guess", round: (view as PistasDuelView).round, text })}
            onPass={() => duel.send({ type: "pass", round: (view as PistasDuelView).round, clue: (view as PistasDuelView).clue })} />
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p key={error} role="alert" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm rounded-xl bg-brand-red-soft/90 px-3 py-2 text-center text-sm font-semibold text-white">
            {copy.errors[error] ?? copy.errors.default}
          </motion.p>
        )}
      </AnimatePresence>

      {awaySeat && (
        <PauseOverlay mine={awaySeat.seat === mySeat} name={names[awaySeat.seat]} copy={copy} secondsLeft={secondsLeft} />
      )}

      {(snapshot.status === "completed" || snapshot.status === "cancelled") && (
        <ResultCard snapshot={snapshot} names={names} copy={copy} onRoom={() => router.push(roomPath)} onExit={() => router.push("/play")} />
      )}

      {confirmLeave && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-3xl bg-surface-page-deep p-5 text-center">
            <p className="text-base font-bold">{copy.forfeit.confirm}</p>
            <button type="button" onClick={() => { setConfirmLeave(false); duel.forfeit(); }} className="mt-4 h-12 w-full rounded-full bg-brand-red-soft text-sm font-black uppercase text-white" style={poppins}>{copy.forfeit.yes}</button>
            <button type="button" onClick={() => setConfirmLeave(false)} className="mt-2 h-11 w-full rounded-full bg-white/10 text-sm font-bold uppercase" style={poppins}>{copy.forfeit.no}</button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-page-alt text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-4 pt-[max(env(safe-area-inset-top),16px)]">{children}</div>
    </div>
  );
}

function seatNames(snapshot: DuelStatePayload, copy: DuelCopy): [string, string] {
  const name = (seat: DuelSeatPayload | undefined) => seat?.username?.trim() || copy.you;
  return [name(snapshot.seats.find((s) => s.seat === 0)), name(snapshot.seats.find((s) => s.seat === 1))];
}

function Scoreboard({ snapshot, names, turnSeat, copy }: { snapshot: DuelStatePayload; names: [string, string]; turnSeat: Seat | null; copy: DuelCopy }) {
  const view = snapshot.view as { scores?: [number, number] } | null;
  const scores = snapshot.result?.scores ?? view?.scores ?? [0, 0];
  const order: Seat[] = [snapshot.mySeat, snapshot.mySeat === 0 ? 1 : 0];
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {order.map((seat) => {
        const me = seat === snapshot.mySeat;
        const side = me ? "me" : "rival";
        return (
          <div key={seat} className={cn("flex items-center gap-2.5 rounded-2xl px-3 py-2 transition-colors", turnSeat === seat ? SEAT_BG[side] : "bg-white/[0.05]", !me && "flex-row-reverse text-right")}>
            <DuelAvatar size="xs"
              customization={seatAvatar(snapshot.seats.find((s) => s.seat === seat) ?? { userId: `seat-${seat}`, avatarCustomization: null, avatarUrl: null, isGuest: true })} />
            <div className="min-w-0 flex-1">
              <p className={cn("truncate text-xs font-bold", SEAT_LABEL[side])}>{me ? copy.you : names[seat]}</p>
              <p className="text-2xl font-black leading-none tabular-nums" style={poppins}>{scores[seat]}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Quiet until the last 10 seconds: the clock is there so a match ends, not to rush anyone. */
function Clock({ seconds, copy }: { seconds: number; copy: DuelCopy }) {
  const urgent = seconds <= 10;
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-black tabular-nums transition-colors", urgent ? "bg-brand-red-soft/20 text-brand-red-light" : "bg-white/[0.06] text-white/50")} style={poppins}>
      {copy.secondsLeft(seconds)}
    </span>
  );
}

/** A seat has gone (the server paused the match): the clock is its reconnect window, not a game clock. */
function PauseOverlay({ mine, name, copy, secondsLeft }: { mine: boolean; name: string; copy: DuelCopy; secondsLeft: number | null }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-6" role="status" aria-live="polite">
      <div className="w-full max-w-sm rounded-3xl bg-surface-page-deep p-6 text-center">
        <Loader2 className="mx-auto size-7 animate-spin text-brand-blue" />
        {mine ? (
          <p className="mt-3 text-base font-bold">{copy.pause.reconnecting}</p>
        ) : (
          <>
            <p className="mt-3 text-lg font-black" style={poppins}>{copy.pause.rivalGone(name)}</p>
            <p className="mt-1 text-sm text-white/70">{copy.pause.waiting}</p>
            {secondsLeft !== null && <p className="mt-3 text-4xl font-black tabular-nums text-white" style={poppins}>{`0:${String(secondsLeft).padStart(2, "0")}`}</p>}
            <p className="mt-2 text-xs text-white/55">{copy.pause.ifNotBack}</p>
          </>
        )}
      </div>
    </div>
  );
}

function ResultCard({ snapshot, names, copy, onRoom, onExit }: { snapshot: DuelStatePayload; names: [string, string]; copy: DuelCopy; onRoom: () => void; onExit: () => void }) {
  const result = snapshot.result;
  const me = snapshot.mySeat;
  const headline = !result || result.reason === "cancelled" ? copy.result.cancelled
    : result.winnerSeat === null ? copy.result.draw
    : result.winnerSeat === me ? copy.result.win : copy.result.lose;
  const left = result?.leftSeat ?? null;
  const leftName = left === null ? "" : left === me ? copy.you : names[left];
  const byMe = left === me;
  const reason = !result || left === null ? null
    : result.reason === "forfeit" ? (byMe ? copy.result.youForfeit : copy.result.forfeit(leftName))
    : result.reason === "idle" ? (byMe ? copy.result.youIdle : copy.result.idle(leftName))
    : result.reason === "disconnect" ? (byMe ? copy.result.youDisconnect : copy.result.disconnect(leftName))
    : result.reason === "cancelled" ? (byMe ? copy.result.youNoShow : copy.result.noShow(leftName)) : null;
  const won = result?.winnerSeat === me && result.reason !== "cancelled";
  return (
    <>
    <div aria-hidden className="fixed inset-0 z-30 bg-black/55" />
    <motion.div role="dialog" aria-modal="true" initial={{ y: 40 }} animate={{ y: 0 }}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md rounded-t-3xl border-t border-white/10 bg-surface-page-deep px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-5 shadow-[0_-12px_40px_rgba(0,0,0,0.5)]">
      <p className={cn("text-center text-3xl font-black uppercase", won ? "text-brand-green" : "text-white")} style={poppins}>{headline}</p>
      {result && result.reason !== "cancelled" && (
        <p className="mt-1 text-center text-4xl font-black tabular-nums" style={poppins}>
          <span className={SEAT_TEXT.me}>{result.scores[me]}</span>
          <span className="mx-2 text-white/30">–</span>
          <span className={SEAT_TEXT.rival}>{result.scores[me === 0 ? 1 : 0]}</span>
        </p>
      )}
      {reason && <p className="mt-1 text-center text-sm text-white/65">{reason}</p>}
      <button type="button" onClick={onRoom} className="mt-5 h-14 w-full rounded-full bg-brand-green text-base font-black uppercase tracking-wide text-white hover:bg-brand-green-deep" style={poppins}>{copy.result.backToRoom}</button>
      <button type="button" onClick={onExit} className="mt-2 h-11 w-full rounded-full bg-white/10 text-sm font-bold uppercase text-white/85 hover:bg-white/15" style={poppins}>{copy.result.exit}</button>
    </motion.div>
    </>
  );
}
