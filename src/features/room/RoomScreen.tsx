"use client";

import { RotateCw } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { useRealtimePrincipal } from "@/lib/realtime/realtime-principal";
import { AproximadoFrame } from "@/features/aproximado/AproximadoRoom";
import { aproximadoCopy } from "@/features/aproximado/aproximado.copy";
import { AproximadoRoomMatch } from "@/features/aproximado/RoomMatchScreen";
import { useAproximadoRoom, type RoomCommand } from "@/features/aproximado/useRoom";
import { nameChainScreens } from "@/features/name-chain/NameChainRoom";
import type { NameChainCommand } from "@/features/name-chain/nameChain.view";
import { sharedPlayerScreens } from "@/features/shared-player/SharedPlayerRoom";
import type { SharedPlayerCommand } from "@/features/shared-player/sharedPlayer.view";
import { RoomGameShell } from "@/features/wordgames/RoomGameShell";
import { ROOM_CLIENT_GAMES, roomClientRulesFor } from "./roomGames";
import { useRoomConnection } from "./useRoomConnection";

const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

/** Same remount rule as the duel screen: a principal or match change never inherits the previous screen's state. */
export function RoomScreen({ matchId }: { matchId: string }) {
  const principal = useRealtimePrincipal();
  return <Room key={`${principal.kind}:${principal.userId ?? "none"}:${matchId}`} matchId={matchId} />;
}

type Connection<C> = ReturnType<typeof useRoomConnection<C>>;

/** One connection per match screen; the first state says which game's screen draws it. */
function Room({ matchId }: { matchId: string }) {
  const room = useRoomConnection<unknown>(matchId, ROOM_CLIENT_GAMES, roomClientRulesFor);
  const game = room.snapshot?.game ?? "aproximado";
  if (game === "aproximado") return <Aproximado room={room as Connection<RoomCommand>} />;
  if (game === "shared_player") return <RoomGameShell room={room as Connection<SharedPlayerCommand>} screens={sharedPlayerScreens} />;
  if (game === "name_chain") return <RoomGameShell room={room as Connection<NameChainCommand>} screens={nameChainScreens} />;
  return <Outdated />;
}

function Aproximado({ room }: { room: Connection<RoomCommand> }) {
  return <AproximadoRoomMatch room={useAproximadoRoom(room)} />;
}

/** A game newer than this tab: the page was loaded before it shipped. */
function Outdated() {
  const { locale } = useLocale();
  const copy = aproximadoCopy(locale);
  return (
    <AproximadoFrame wide={false}>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p role="alert" className="text-white/80">{copy.errors.default}</p>
        <button type="button" onClick={() => window.location.reload()} className="flex h-11 items-center gap-2 rounded-full bg-white/10 px-6 text-sm font-bold uppercase" style={poppins}>
          <RotateCw className="size-4" aria-hidden />{copy.retry}
        </button>
      </div>
    </AproximadoFrame>
  );
}
