import type { AvatarCustomization } from "@/types/game";
import type { DuelGameId, LobbyGameMode } from "@/lib/realtime/socket.types";

export interface PublicLobby {
  lobbyId: string;
  inviteCode: string;
  displayName: string;
  host: {
    id: string;
    username: string;
    avatarUrl?: string;
    avatarCustomization?: AvatarCustomization | null;
  };
  memberCount: number;
  maxMembers: number;
  createdAt: string;
  gameMode: LobbyGameMode;
  /** The game of a duel room; null for every other mode. */
  duelGame: DuelGameId | null;
  isPublic: boolean;
}
