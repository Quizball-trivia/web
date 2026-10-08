"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { useRealtimePrincipal } from "@/lib/realtime/realtime-principal";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import { useFriendRoomHandoffStore } from "@/stores/friendRoomHandoff.store";
import { DuelAvatar, seatAvatar } from "@/features/duel/DuelAvatar";
import { useSecondsLeft } from "@/features/duel/useDuel";
import { AproximadoBoard, AproximadoFrame, AproximadoIntro, AproximadoNotice, AproximadoPodium } from "./AproximadoRoom";
import { AproximadoPartyResults } from "./AproximadoParty";
import { aproximadoCopy } from "./aproximado.copy";
import type { AproximadoRoomView, RoomSeatView } from "./aproximado.views";
import { useRoom } from "./useRoom";
import { MotionConfig } from "motion/react";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;
const LOADING_LIMIT_MS = 8_000;

/** The server's per-viewer view (allow-listed: no value or exact window before a reveal). */
type ServerView = Omit<AproximadoRoomView, "seats"> & {
  seats: Array<Pick<RoomSeatView, "seat" | "status" | "answered" | "idle" | "score">>;
  deadline: string | null;
};

/** Server snapshot → the screens' view: the seat list gets names and avatars from the envelope. */
export function toRoomView(snapshot: RoomStatePayload): AproximadoRoomView | null {
  const view = snapshot.view as ServerView | null;
  if (!view) return null;
  const bySeat = new Map(snapshot.seats.filter((s) => s.seat !== null).map((s) => [s.seat!, s]));
  return {
    ...view,
    seats: view.seats.map((s) => {
      const who = bySeat.get(s.seat);
      return { ...s, name: who?.username ?? "—", avatar: seatAvatar(who ?? { userId: String(s.seat), avatarCustomization: null, avatarUrl: null, isGuest: true }) };
    }),
  };
}

/** Same remount rule as the duel screen: a principal or match change never inherits the previous screen's state. */
export function RoomMatchScreen({ matchId }: { matchId: string }) {
  const principal = useRealtimePrincipal();
  return <RoomMatch key={`${principal.kind}:${principal.userId ?? "none"}:${matchId}`} matchId={matchId} />;
}

function RoomMatch({ matchId }: { matchId: string }) {
  return <AproximadoRoomMatch room={useRoom(matchId)} />;
}

/** The Aproximado match on a room connection (also every room's screen until its first state says which game it is). */
export function AproximadoRoomMatch({ room }: { room: ReturnType<typeof useRoom> }) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = aproximadoCopy(locale);
  // Party Quiz layout by default; ?ui=classic shows the earlier seat-strip layout (for comparing).
  const layout = useSearchParams().get("ui") === "classic" ? "classic" : "party";
  const { snapshot, error, fatal, clearError } = room;
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const roomPath = snapshot?.lobbyId && lobby?.lobbyId === snapshot.lobbyId && lobby.inviteCode ? `/friend/room/${lobby.inviteCode}?source=rematch` : "/play/friend";
  const view = useMemo(() => (snapshot ? toRoomView(snapshot) : null), [snapshot]);
  // Out of a live match (left it, or left out at the gate): the room screen shows the room, not a "preparing" hand-off.
  const setSittingOut = useFriendRoomHandoffStore((state) => state.setSittingOut);
  const sittingOut = Boolean(snapshot && snapshot.lobbyId && (snapshot.status === "ready" || snapshot.status === "active") && !snapshot.me.active);
  useEffect(() => {
    if (sittingOut && snapshot?.lobbyId) setSittingOut({ matchId: snapshot.matchId, lobbyId: snapshot.lobbyId });
  }, [sittingOut, snapshot?.matchId, snapshot?.lobbyId, setSittingOut]);
  const live = snapshot?.status === "ready" || snapshot?.status === "active";
  const deadline = snapshot?.status === "ready" ? snapshot.phaseDeadlineAt : view && live ? (snapshot?.view as ServerView).deadline : null;
  const secondsLeft = useSecondsLeft(deadline ?? null, room.nowMs);

  const hasSnapshot = snapshot !== null;
  useEffect(() => {
    if (!error || !hasSnapshot) return;
    const id = window.setTimeout(clearError, 3_000);
    return () => window.clearTimeout(id);
  }, [error, clearError, hasSnapshot]);

  const [stalled, setStalled] = useState(false);
  const loading = !hasSnapshot && !fatal;
  useEffect(() => {
    if (!loading) return;
    const id = window.setTimeout(() => setStalled(true), LOADING_LIMIT_MS);
    return () => window.clearTimeout(id);
  }, [loading]);

  const [leavingGate, setLeavingGate] = useState(false);
  // An unconfirmed leave asks for the state (the confirming snapshot may have been lost), then frees the button.
  const { resync } = room;
  useEffect(() => {
    if (!leavingGate) return;
    const ask = window.setTimeout(resync, 2_000);
    const free = window.setTimeout(() => setLeavingGate(false), 5_000);
    return () => { window.clearTimeout(ask); window.clearTimeout(free); };
  }, [leavingGate, resync]);
  // A refused leave frees the gate's button again (adjusted while rendering, not in an effect).
  const [seenError, setSeenError] = useState(error);
  if (error !== seenError) {
    setSeenError(error);
    if (error) setLeavingGate(false);
  }
  const toRoom = () => router.push(roomPath);
  const exit = () => router.push("/play");

  let body: React.ReactNode;
  if (fatal && snapshot) {
    // The match is gone or not this player's any more: whatever was on screen is not playable.
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p role="alert" className="text-white/80">{copy.errors[fatal] ?? copy.errors.default}</p>
        <button type="button" onClick={toRoom} className="h-11 rounded-full bg-white/10 px-6 text-sm font-bold uppercase" style={poppins}>{copy.backToRoom}</button>
      </div>
    );
  } else if (!snapshot) {
    const stuck = fatal ?? (error || stalled || room.guestStatus === "refused" ? error ?? "default" : null);
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        {stuck ? <p className="text-white/80">{copy.errors[stuck] ?? copy.errors.default}</p> : <Loader2 className="size-8 animate-spin text-white/60" />}
        {!stuck && <p className="text-sm text-white/60">{copy.connecting}</p>}
        {stuck && (
          <div className="flex gap-2">
            <button type="button" onClick={() => (room.connected ? room.resync() : window.location.reload())} className="h-11 rounded-full bg-white/10 px-6 text-sm font-bold uppercase" style={poppins}>{copy.retry}</button>
            <button type="button" onClick={exit} className="h-11 rounded-full bg-white/10 px-6 text-sm font-bold uppercase" style={poppins}>{copy.exit}</button>
          </div>
        )}
      </div>
    );
  } else if (snapshot.status === "cancelled") {
    body = <AproximadoNotice kind="cancelled" locale={locale} onRoom={toRoom} />;
  } else if (snapshot.status === "ready" && !snapshot.me.active) {
    body = <AproximadoNotice kind="left" locale={locale} onRoom={toRoom} />;
  } else if (snapshot.status === "ready") {
    // Leaving the gate waits for the server: its next state shows the "you left" notice (or the cancelled one).
    body = <Gate snapshot={snapshot} locale={locale} secondsLeft={secondsLeft} error={error} leaving={leavingGate}
      onLeave={() => { clearError(); setLeavingGate(true); room.leave(); }} />;
  } else if (snapshot.status === "completed" && !view && snapshot.me.admitted) {
    // A finished match whose questions are gone (retention): the result stands, the board cannot be rebuilt.
    body = <AproximadoNotice kind="finished" locale={locale} onRoom={toRoom} />;
  } else if (!snapshot.me.admitted && !snapshot.me.left) {
    body = <AproximadoNotice kind="excluded" locale={locale} onRoom={toRoom} />;
  } else if (snapshot.status === "completed" && view) {
    // Its own full screen, outside AproximadoFrame: it needs the same reduced-motion policy.
    if (layout === "party") return <MotionConfig reducedMotion="user"><AproximadoPartyResults view={{ ...view, phase: "over" }} locale={locale} onRoom={toRoom} onExit={exit} /></MotionConfig>;
    body = <AproximadoPodium view={{ ...view, phase: "over" }} locale={locale} onRoom={toRoom} onExit={exit} />;
  } else if (!snapshot.me.active) {
    body = <AproximadoNotice kind="left" locale={locale} onRoom={toRoom} />;
  } else if (view?.phase === "intro") {
    body = <AproximadoIntro seats={view.seats} mySeat={view.mySeat} scoring={view.scoring} locale={locale} secondsLeft={secondsLeft} />;
  } else if (view) {
    body = (
      <AproximadoBoard view={view} locale={locale} secondsLeft={secondsLeft} busy={room.inFlight > 0} connected={room.connected} error={error}
        onGuess={(value) => room.guess(view.round, value)} onLeave={room.leave} retry={room.retained?.round === view.round ? room.retained.value : null} layout={layout} />
    );
  } else {
    body = <div className="flex flex-1 items-center justify-center"><Loader2 className="size-8 animate-spin text-white/60" /></div>;
  }
  const boardShown = snapshot?.status === "active" && snapshot.me.active && view && view.phase !== "intro" && !fatal;
  return <AproximadoFrame wide={layout === "party" && Boolean(boardShown)}>{body}</AproximadoFrame>;
}

/** The ready gate: everyone in the room, who has joined the match screen, and the clock. */
function Gate({ snapshot, locale, secondsLeft, onLeave, leaving, error }: {
  snapshot: RoomStatePayload; locale: string; secondsLeft: number | null; onLeave: () => void; leaving: boolean; error: string | null;
}) {
  const copy = aproximadoCopy(locale);
  const seats = snapshot.seats.filter((s) => s.active).sort((a, b) => a.slot - b.slot);
  return (
    <div className="flex flex-1 flex-col justify-center gap-6">
      <div className="text-center">
        <p className="text-4xl font-black leading-none" style={poppins}><span className="text-white">{copy.brandA} </span><span className="text-brand-yellow">{copy.brandB}</span></p>
        <p className="mt-3 text-sm font-black uppercase tracking-[0.2em] text-white/60" style={poppins} aria-live="polite">{copy.gateTitle}</p>
      </div>
      <ul className={cn("mx-auto grid w-full max-w-sm gap-3", seats.length === 2 || seats.length === 4 ? "grid-cols-2" : "grid-cols-3")}>
        {seats.map((s) => (
          <li key={s.userId} className={cn("flex min-w-0 flex-col items-center gap-1.5", !s.ready && "opacity-60")}>
            <DuelAvatar size="md" customization={seatAvatar(s)} />
            <span className={cn("w-full text-center text-xs font-black break-words [overflow-wrap:anywhere] leading-tight", s.userId === snapshot.me.userId && "text-brand-green-light")} style={poppins}>
              {s.userId === snapshot.me.userId ? copy.you : s.username}
            </span>
            <span className={cn("flex items-center gap-1 text-[11px] font-bold", s.ready ? "text-brand-green-light" : "text-white/60")}>
              {s.ready ? <><Check className="size-3" aria-hidden />{copy.gateReady}</> : copy.gateWaiting}
            </span>
          </li>
        ))}
      </ul>
      {secondsLeft !== null && <p className="text-center text-lg font-black tabular-nums text-brand-yellow" style={poppins}>{copy.seconds(secondsLeft)}</p>}
      {error && <p role="alert" className="text-center text-sm font-semibold text-brand-red-light">{copy.errors[error] ?? copy.errors.default}</p>}
      <button type="button" onClick={onLeave} disabled={leaving} aria-busy={leaving} className="mx-auto h-11 w-full max-w-xs rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15 disabled:opacity-60" style={poppins}>
        {leaving ? <Loader2 className="mx-auto size-4 animate-spin" aria-label={copy.sending} /> : copy.leaveYes}
      </button>
    </div>
  );
}
