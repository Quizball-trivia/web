import type { AvatarCustomization } from "@/types/game";

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
  gameMode: 'friendly_possession' | 'friendly_party_quiz' | 'ranked_sim';
  isPublic: boolean;
}
