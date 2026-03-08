export interface PublicLobby {
  lobbyId: string;
  inviteCode: string;
  displayName: string;
  host: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  memberCount: number;
  maxMembers: number;
  createdAt: string;
  gameMode: 'friendly_possession' | 'friendly_party_quiz' | 'ranked_sim';
  isPublic: boolean;
}
