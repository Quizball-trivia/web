"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { AproximadoNotice } from "@/features/aproximado/AproximadoRoom";
import { aproximadoCopy } from "@/features/aproximado/aproximado.copy";
import { DuelAvatar, seatAvatar } from "@/features/duel/DuelAvatar";
import { useSecondsLeft } from "@/features/duel/useDuel";
import type { useRoomConnection } from "@/features/room/useRoomConnection";
import type { RoomStatePayload } from "@/lib/realtime/socket.types";
import { cn } from "@/lib/utils";
import { useFriendRoomHandoffStore } from "@/stores/friendRoomHandoff.store";
import { useRealtimeMatchStore } from "@/stores/realtimeMatch.store";
import type { WordSeat } from "./party";
import { Brand, Frame, poppins } from "./ui";

export type RoomConnection<C> = ReturnType<typeof useRoomConnection<C>>;

/** Server seat rows + the game's own per-seat view → the seats the screens draw. */
export function wordSeats(snapshot: RoomStatePayload, seats: ReadonlyArray<{ seat: number; status: WordSeat["status"]; score: number }>): WordSeat[] {
  const bySeat = new Map(snapshot.seats.filter((s) => s.seat !== null).map((s) => [s.seat!, s]));
  return seats.map((s) => {
    const who = bySeat.get(s.seat);
    return { seat: s.seat, status: s.status, score: s.score, name: who?.username ?? "—", avatar: seatAvatar(who ?? { userId: String(s.seat), avatarCustomization: null, avatarUrl: null, isGuest: true }) };
  });
}

export interface RoomGameScreens<V, C> {
  brand: (locale: string) => readonly [string, string];
  /** The match in play, for an admitted seat that is still in it. */
  Board: ComponentType<{ view: V; snapshot: RoomStatePayload; room: RoomConnection<C>; locale: string; error: string | null }>;
  /** The finished match. */
  Results: ComponentType<{ view: V; snapshot: RoomStatePayload; locale: string; onRoom: () => void; onExit: () => void }>;
  /** True while the board uses the wide (standings sidebar) layout. */
  wide: (view: V) => boolean;
}

const LOADING_LIMIT_MS = 8_000;

/**
 * A room match of one of the word games: everything around the board (connecting, the ready gate, the notices for a
 * cancelled match, a seat that left or was left out, a match whose content is gone) is the same for every game.
 */
export function RoomGameShell<V, C>({ room, screens }: { room: RoomConnection<C>; screens: RoomGameScreens<V, C> }) {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = aproximadoCopy(locale);
  const { snapshot, error, fatal, clearError, resync } = room;
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const roomPath = snapshot?.lobbyId && lobby?.lobbyId === snapshot.lobbyId && lobby.inviteCode ? `/friend/room/${lobby.inviteCode}?source=rematch` : "/play/friend";
  const view = (snapshot?.view ?? null) as V | null;
  // Out of a live match (left it, or left out at the gate): the room screen shows the room, not a "preparing" hand-off.
  const setSittingOut = useFriendRoomHandoffStore((state) => state.setSittingOut);
  const sittingOut = Boolean(snapshot && snapshot.lobbyId && (snapshot.status === "ready" || snapshot.status === "active") && !snapshot.me.active);
  useEffect(() => {
    if (sittingOut && snapshot?.lobbyId) setSittingOut({ matchId: snapshot.matchId, lobbyId: snapshot.lobbyId });
  }, [sittingOut, snapshot?.matchId, snapshot?.lobbyId, setSittingOut]);
  const gateSeconds = useSecondsLeft(snapshot?.status === "ready" ? snapshot.phaseDeadlineAt : null, room.nowMs);

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
  useEffect(() => {
    if (!leavingGate) return;
    const ask = window.setTimeout(resync, 2_000);
    const free = window.setTimeout(() => setLeavingGate(false), 5_000);
    return () => { window.clearTimeout(ask); window.clearTimeout(free); };
  }, [leavingGate, resync]);
  const [seenError, setSeenError] = useState(error);
  if (error !== seenError) {
    setSeenError(error);
    if (error) setLeavingGate(false);
  }
  const toRoom = () => router.push(roomPath);
  const exit = () => router.push("/play");
  const quiet = "h-11 rounded-full bg-white/10 px-6 text-sm font-bold uppercase";

  let body: React.ReactNode;
  let wide = false;
  if (fatal && snapshot) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p role="alert" className="text-white/80">{copy.errors[fatal] ?? copy.errors.default}</p>
        <button type="button" onClick={toRoom} className={quiet} style={poppins}>{copy.backToRoom}</button>
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
            <button type="button" onClick={() => (room.connected ? room.resync() : window.location.reload())} className={quiet} style={poppins}>{copy.retry}</button>
            <button type="button" onClick={exit} className={quiet} style={poppins}>{copy.exit}</button>
          </div>
        )}
      </div>
    );
  } else if (snapshot.status === "cancelled") {
    body = <AproximadoNotice kind="cancelled" locale={locale} onRoom={toRoom} />;
  } else if (snapshot.status === "ready" && !snapshot.me.active) {
    body = <AproximadoNotice kind="left" locale={locale} onRoom={toRoom} />;
  } else if (snapshot.status === "ready") {
    const seats = snapshot.seats.filter((s) => s.active).sort((a, b) => a.slot - b.slot);
    body = (
      <div className="flex flex-1 flex-col justify-center gap-6">
        <div className="text-center">
          <Brand words={screens.brand(locale)} className="text-4xl leading-none" />
          <p className="mt-3 text-sm font-black uppercase tracking-[0.2em] text-white/60" style={poppins} aria-live="polite">{copy.gateTitle}</p>
        </div>
        <ul className={cn("mx-auto grid w-full max-w-sm gap-3", seats.length === 2 || seats.length === 4 ? "grid-cols-2" : "grid-cols-3")}>
          {seats.map((s) => (
            <li key={s.userId} className={cn("flex min-w-0 flex-col items-center gap-1.5", !s.ready && "opacity-60")}>
              <DuelAvatar size="md" customization={seatAvatar(s)} />
              <span className={cn("w-full break-words text-center text-xs font-black leading-tight [overflow-wrap:anywhere]", s.userId === snapshot.me.userId && "text-brand-green-light")} style={poppins}>
                {s.userId === snapshot.me.userId ? copy.you : s.username}
              </span>
              <span className={cn("flex items-center gap-1 text-[11px] font-bold", s.ready ? "text-brand-green-light" : "text-white/60")}>
                {s.ready ? <><Check className="size-3" aria-hidden />{copy.gateReady}</> : copy.gateWaiting}
              </span>
            </li>
          ))}
        </ul>
        {gateSeconds !== null && <p className="text-center text-lg font-black tabular-nums text-brand-yellow" style={poppins}>{copy.seconds(gateSeconds)}</p>}
        {error && <p role="alert" className="text-center text-sm font-semibold text-brand-red-light">{copy.errors[error] ?? copy.errors.default}</p>}
        <button type="button" onClick={() => { clearError(); setLeavingGate(true); room.leave(); }} disabled={leavingGate} aria-busy={leavingGate}
          className="mx-auto h-11 w-full max-w-xs rounded-full bg-white/10 text-sm font-bold uppercase tracking-wide text-white/85 hover:bg-white/15 disabled:opacity-60" style={poppins}>
          {leavingGate ? <Loader2 className="mx-auto size-4 animate-spin" aria-label={copy.sending} /> : copy.leaveYes}
        </button>
      </div>
    );
  } else if (snapshot.status === "completed" && !view && snapshot.me.admitted) {
    body = <AproximadoNotice kind="finished" locale={locale} onRoom={toRoom} />;
  } else if (!snapshot.me.admitted && !snapshot.me.left) {
    body = <AproximadoNotice kind="excluded" locale={locale} onRoom={toRoom} />;
  } else if (snapshot.status === "completed" && view) {
    return <MotionConfig reducedMotion="user"><screens.Results view={view} snapshot={snapshot} locale={locale} onRoom={toRoom} onExit={exit} /></MotionConfig>;
  } else if (!snapshot.me.active) {
    body = <AproximadoNotice kind="left" locale={locale} onRoom={toRoom} />;
  } else if (view) {
    wide = screens.wide(view);
    body = <screens.Board view={view} snapshot={snapshot} room={room} locale={locale} error={error} />;
  } else {
    body = <div className="flex flex-1 items-center justify-center"><Loader2 className="size-8 animate-spin text-white/60" /></div>;
  }
  return <MotionConfig reducedMotion="user"><Frame lang={locale} wide={wide}>{body}</Frame></MotionConfig>;
}
