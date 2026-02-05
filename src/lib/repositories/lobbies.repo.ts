import { api } from "@/lib/api/api";
import type { paths } from "@/types/api.generated";
import type { PublicLobby } from "@/lib/domain/lobby";

export type ListPublicLobbiesQuery =
  paths["/api/v1/lobbies/public"]["get"]["parameters"]["query"];

export const lobbiesRepo = {
  listPublicLobbies: async (query?: ListPublicLobbiesQuery) => {
    return api.GET("/api/v1/lobbies/public", { query });
  },
};
