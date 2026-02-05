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
  gameMode: 'friendly' | 'ranked_sim';
  isPublic: boolean;
}
