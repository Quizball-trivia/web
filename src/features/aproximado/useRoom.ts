"use client";

import { useCallback, useMemo } from "react";
import { useRoomConnection, type RoomClientRules } from "@/features/room/useRoomConnection";

export type RoomCommand = { type: "guess"; round: number; value: number };

/** One guess per round, settled once the round shows my answer or is no longer open. */
export const aproximadoRoomRules: RoomClientRules<RoomCommand> = {
  slot: (command) => String(command.round),
  settled: (raw, command) => {
    const view = raw as { phase?: string; round?: number; myGuess?: number | null };
    return view.phase !== "guess" || view.round !== command.round || view.myGuess != null;
  },
};

type Connection = ReturnType<typeof useRoomConnection<RoomCommand>>;

/** The room connection as the Aproximado screens use it: a guess per round, and the kept guess to retry. */
export function useAproximadoRoom(room: Connection) {
  const { send, retained } = room;
  const guess = useCallback((round: number, value: number) => send({ type: "guess", round, value }), [send]);
  const kept = useMemo(() => (retained ? { round: retained.round, value: retained.value } : null), [retained]);
  return { ...room, guess, retained: kept };
}

const GAMES = ["aproximado"] as const;
const rulesFor = (game: string) => (game === "aproximado" ? aproximadoRoomRules : null);

export function useRoom(matchId: string) {
  return useAproximadoRoom(useRoomConnection(matchId, GAMES, rulesFor));
}
