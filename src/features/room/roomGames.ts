import { aproximadoRoomRules } from "@/features/aproximado/useRoom";
import { nameChainRoomRules } from "@/features/name-chain/nameChain.view";
import { sharedPlayerRoomRules } from "@/features/shared-player/sharedPlayer.view";
import type { RoomClientRules } from "./useRoomConnection";

/** Command rules of every room game this build can draw. */
const RULES: Record<string, RoomClientRules<never>> = {
  aproximado: aproximadoRoomRules as RoomClientRules<never>,
  shared_player: sharedPlayerRoomRules as RoomClientRules<never>,
  name_chain: nameChainRoomRules as RoomClientRules<never>,
};

export const roomClientRulesFor = (game: string): RoomClientRules<unknown> | null => (RULES[game] as RoomClientRules<unknown> | undefined) ?? null;

/** The room games this build can draw: sent to the server, which seats nobody in a game their screen did not list. */
export const ROOM_CLIENT_GAMES: readonly string[] = Object.keys(RULES);
