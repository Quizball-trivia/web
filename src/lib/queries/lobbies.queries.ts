import { useQuery } from '@tanstack/react-query';
import type { PublicLobby } from '@/lib/domain/lobby';
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
      const normalizeGameMode = (gameMode: string): PublicLobby["gameMode"] => {
        if (gameMode === "ranked_sim") return "ranked_sim";
        if (gameMode === "friendly_party_quiz") return "friendly_party_quiz";
        return "friendly_possession";
      };
      // Map API type to Domain type
      return result.items.map(item => ({
        ...item,
        gameMode: normalizeGameMode(item.gameMode),
        host: {
          ...item.host,
          username: item.host.username ?? "Unknown Player",
          avatarUrl: item.host.avatarUrl ?? undefined,
        }
      }));
    },
    staleTime: 1000 * 10, // 10 seconds
  });
}
