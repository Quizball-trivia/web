import type { PartnerGameId } from "../api/partnerApi.types";

/** What a game screen calls on its own partner endpoints: `/partner/v1/games/{gameId}/{path}`. */
export interface PartnerGameApi {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
}

export interface PartnerFinishedPlay {
  playId: string;
  /** Points as calculated by the server. */
  score: number;
}

export interface PartnerGameScreenProps {
  gameId: PartnerGameId;
  api: PartnerGameApi;
  /**
   * The game reports a finished play; the host shows the points screen, unless the game keeps its own result
   * screen on (`ownResultScreen`, e.g. Ranked's match result).
   */
  onFinished: (play: PartnerFinishedPlay, options?: { ownResultScreen?: boolean }) => void;
  /** Leave the game for the Freecroco home (the play, if started, stays used). */
  onExit: () => void;
}
