import { api } from "@/lib/api/api";
import { CLIENT_ROOM_GAMES } from "@/lib/realtime/clientGames";
import type { paths } from "@/types/api.generated";

export type ListPublicLobbiesQuery =
  paths["/api/v1/lobbies/public"]["get"]["parameters"]["query"];

export const lobbiesRepo = {
  /** Declares the room games this page can draw: rooms of a newer game are listed only to pages that can open them. */
  listPublicLobbies: async (query?: ListPublicLobbiesQuery) => {
    return api.GET("/api/v1/lobbies/public", { query: { ...query, games: CLIENT_ROOM_GAMES.join(",") } as ListPublicLobbiesQuery });
  },
};
