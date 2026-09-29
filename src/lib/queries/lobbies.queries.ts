import { useQuery } from '@tanstack/react-query';
import type { PublicLobby } from '@/lib/domain/lobby';
import { isDuelGameId, LOBBY_MODES } from '@/lib/lobby/lobbyModes';
import { lobbiesRepo } from '@/lib/repositories/lobbies.repo';

export const lobbiesKeys = {
  all: ['lobbies'] as const,
  public: () => [...lobbiesKeys.all, 'public'] as const,
};

export function usePublicLobbies() {
  return useQuery({
    queryKey: lobbiesKeys.public(),
    queryFn: async () => {
      const result = await lobbiesRepo.listPublicLobbies();
      const normalizeGameMode = (gameMode: string): PublicLobby["gameMode"] =>
        Object.prototype.hasOwnProperty.call(LOBBY_MODES, gameMode) ? gameMode as PublicLobby["gameMode"] : "friendly_possession";
      // Map API type to Domain type. `duelGame` is read defensively: the generated API types predate it.
      return result.items.map((item): PublicLobby => {
        const duelGame: unknown = (item as { duelGame?: unknown }).duelGame;
        return {
          ...item,
          gameMode: normalizeGameMode(item.gameMode),
          duelGame: isDuelGameId(duelGame) ? duelGame : null,
          host: {
            ...item.host,
            username: item.host.username ?? "Unknown Player",
            avatarUrl: item.host.avatarUrl ?? undefined,
            avatarCustomization: item.host.avatarCustomization,
          },
        };
      });
    },
    staleTime: 1000 * 10, // 10 seconds
  });
}
