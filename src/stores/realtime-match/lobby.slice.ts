import type { StateCreator } from 'zustand';
import { logger } from '@/utils/logger';
import type {
  LobbyState,
  PresenceOnlineCountPayload,
  SessionStatePayload,
} from '@/lib/realtime/socket.types';
import type {
  LobbyBannerSuppressionReason,
  LobbyChallengeInvite,
  RealtimeState,
} from './types';
import { shouldClearLobbyOnSessionChange } from './reducers';

/**
 * Lobby / matchmaking / session state. Owns lobby snapshot, challenge invite
 * inbox, lobby-banner suppression flags, online count, session state, and
 * self user id.
 *
 * Cross-slice writes:
 * - setSessionState may clear draft + draft-pause fields (presence slice)
 *   when the server-reported session scope no longer contains the active
 *   lobby. Safe via Zustand's typed StateCreator (`set` accepts a partial
 *   of the full RealtimeState).
 */
export interface LobbySlice {
  lobby: LobbyState | null;
  challengeInvites: LobbyChallengeInvite[];
  pendingLobbyHandoffCode: string | null;
  suppressLobbyBannerUntil: number | null;
  suppressLobbyBannerReason: LobbyBannerSuppressionReason | null;
  onlineUsers: number | null;
  sessionState: SessionStatePayload | null;
  selfUserId: string | null;
  setSelfUserId: (userId: string | null) => void;
  setLobby: (lobby: LobbyState) => void;
  addChallengeInvite: (invite: LobbyChallengeInvite) => void;
  removeChallengeInvite: (invitationId: string) => void;
  beginLobbyHandoff: (inviteCode: string) => void;
  clearLobbyHandoff: () => void;
  suppressLobbyBanner: (durationMs?: number, reason?: LobbyBannerSuppressionReason) => void;
  clearLobbyBannerSuppression: () => void;
  setOnlineUsers: (data: PresenceOnlineCountPayload) => void;
  setSessionState: (payload: SessionStatePayload) => void;
}

export const lobbyInitialState = {
  lobby: null,
  challengeInvites: [],
  pendingLobbyHandoffCode: null,
  suppressLobbyBannerUntil: null,
  suppressLobbyBannerReason: null,
  onlineUsers: null,
  sessionState: null,
  selfUserId: null,
} as const satisfies Pick<
  LobbySlice,
  | 'lobby'
  | 'challengeInvites'
  | 'pendingLobbyHandoffCode'
  | 'suppressLobbyBannerUntil'
  | 'suppressLobbyBannerReason'
  | 'onlineUsers'
  | 'sessionState'
  | 'selfUserId'
>;

export const createLobbySlice: StateCreator<RealtimeState, [], [], LobbySlice> = (set) => ({
  ...lobbyInitialState,

  setSelfUserId: (userId) => {
    logger.info('Realtime store set self user id', { selfUserId: userId });
    set({ selfUserId: userId });
  },

  setLobby: (lobby) => {
    logger.info('Realtime store set lobby', {
      lobbyId: lobby.lobbyId,
      status: lobby.status,
      memberCount: lobby.members.length,
    });
    set({
      lobby,
      forfeitPending: null,
    });
  },

  addChallengeInvite: (invite) => {
    logger.info('Realtime store add challenge invite', {
      invitationId: invite.invitationId,
      lobbyId: invite.lobbyId,
      fromUserId: invite.fromUser.id,
    });
    set((state) => {
      const withoutDuplicate = state.challengeInvites.filter(
        (item) => item.invitationId !== invite.invitationId,
      );
      return { challengeInvites: [invite, ...withoutDuplicate] };
    });
  },

  removeChallengeInvite: (invitationId) => {
    logger.info('Realtime store remove challenge invite', { invitationId });
    set((state) => ({
      challengeInvites: state.challengeInvites.filter((invite) => invite.invitationId !== invitationId),
    }));
  },

  beginLobbyHandoff: (inviteCode) => {
    if (typeof inviteCode !== 'string' || inviteCode.length === 0) return;
    set({
      pendingLobbyHandoffCode: inviteCode.toUpperCase(),
      suppressLobbyBannerUntil: Date.now() + 8000,
      suppressLobbyBannerReason: 'challenge',
    });
  },

  clearLobbyHandoff: () => {
    set({ pendingLobbyHandoffCode: null });
  },

  suppressLobbyBanner: (durationMs = 5000, reason = 'challenge') => {
    set({
      suppressLobbyBannerUntil: Date.now() + durationMs,
      suppressLobbyBannerReason: reason,
    });
  },

  clearLobbyBannerSuppression: () => {
    set({
      suppressLobbyBannerUntil: null,
      suppressLobbyBannerReason: null,
    });
  },

  setOnlineUsers: (data) => {
    logger.info('Realtime store set online users', { onlineUsers: data.onlineUsers });
    set({ onlineUsers: data.onlineUsers });
  },

  setSessionState: (payload) => {
    logger.info('Realtime store set session state', payload);
    set((state) => {
      const shouldClearLobby = shouldClearLobbyOnSessionChange(state.lobby?.lobbyId ?? null, payload);
      return {
        sessionState: payload,
        ...(shouldClearLobby
          ? {
              lobby: null,
              draft: null,
              draftPaused: false,
              draftPauseUntil: null,
              draftDisconnectedUserId: null,
            }
          : {}),
      };
    });
  },
});
