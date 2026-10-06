import { TriviaMinesApiError, type triviaMinesApi, type TriviaMinesState } from "@/lib/repositories/triviaMines.repo";
import { PartnerApiError } from "../../api/partnerApiClient";
import type { PartnerGameApi } from "../../game-kit/types";

/** Wire shape of `/partner/v1/games/trivia-mines/runs*` (backend partner-trivia-mines.service.ts). */
export interface PartnerTriviaMinesWireState {
  run_id: string;
  play_id: string;
  status: "active" | "cashed" | "lost" | "cancelled";
  phase: TriviaMinesState["phase"];
  state_version: number;
  start_points: number;
  max_points: number;
  points: number;
  next_points: number;
  mult_bp: number;
  opened: number[];
  flagged: number[];
  bust_tile: number | null;
  scouts_left: number;
  board_size: number;
  defender_count: number;
  question: TriviaMinesState["question"];
  score: number | null;
  settlement_reason: string | null;
  reveal: { defenders: number[] } | null;
  server_now: string;
}

/** The board screen reads the site's round shape; points stand in for coins, and there is no seed to verify. */
export function toTriviaMinesState(wire: PartnerTriviaMinesWireState): TriviaMinesState {
  return {
    round_id: wire.run_id,
    status: wire.status === "cancelled" ? "expired" : wire.status,
    phase: wire.phase,
    state_version: wire.state_version,
    stake_coins: wire.start_points,
    pot_coins: wire.points,
    next_pot_coins: wire.next_points,
    mult_bp: wire.mult_bp,
    opened: wire.opened,
    flagged: wire.flagged,
    bust_tile: wire.bust_tile,
    scouts_left: wire.scouts_left,
    board_size: wire.board_size,
    defender_count: wire.defender_count,
    commit_hash: "",
    fairness_version: 0,
    question: wire.question,
    payout_coins: wire.score,
    reveal: wire.reveal ? { defenders: wire.reveal.defenders, server_seed: "", hmac_input: "" } : null,
    server_now: wire.server_now,
  };
}

/** The screen's recovery keys on TriviaMinesApiError statuses (404/409 = re-sync). */
async function translated<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof PartnerApiError) throw new TriviaMinesApiError(error.message, error.status);
    throw error;
  }
}

export type PartnerTriviaMinesClient = typeof triviaMinesApi & {
  /** Called when the server reports the play cancelled by a block. */
  onCancelled(fn: () => void): void;
  /** The last run state the server returned (its play id is what the host reports). */
  last(): PartnerTriviaMinesWireState | null;
  leave(roundId: string): Promise<TriviaMinesState>;
};

export function createPartnerTriviaMinesClient(api: PartnerGameApi): PartnerTriviaMinesClient {
  let cancelled: (() => void) | null = null;
  let last: PartnerTriviaMinesWireState | null = null;
  const seen = (wire: PartnerTriviaMinesWireState) => {
    if (!last || last.run_id !== wire.run_id || wire.state_version >= last.state_version) last = wire;
    // A block cancelled the play (not a returned play): there is nothing to show or send.
    if (wire.status === "cancelled" && wire.settlement_reason === "play_cancelled") cancelled?.();
    return toTriviaMinesState(wire);
  };
  const state = async (request: Promise<PartnerTriviaMinesWireState>) => seen(await translated(request));
  const orNull = async (request: Promise<TriviaMinesState>) => {
    try {
      return await request;
    } catch (error) {
      if (error instanceof TriviaMinesApiError && error.status === 404) return null;
      throw error;
    }
  };
  return {
    last: () => last,
    onCancelled: (fn) => { cancelled = fn; },
    // The stake is fixed for partners (start 100 points); the client nonce is the idempotent start id.
    start: (_stake, clientNonce) => state(api.post("runs", { start_id: clientNonce })),
    current: () => orNull(state(api.get("runs/current"))),
    latest: () => orNull(state(api.get("runs/latest"))),
    async pick(roundId, tile, expectedVersion) {
      const result = await translated(api.post<{ safe: boolean; state: PartnerTriviaMinesWireState }>(`runs/${roundId}/pick`, { tile, expected_version: expectedVersion }));
      return { safe: result.safe, state: seen(result.state) };
    },
    deal: (roundId, expectedVersion) => state(api.post(`runs/${roundId}/question`, { expected_version: expectedVersion })),
    async answer(roundId, questionId, optionId, expectedVersion) {
      const result = await translated(api.post<{ outcome: "correct" | "wrong" | "late"; correct_option_id: string; flagged_tile: number | null; state: PartnerTriviaMinesWireState }>(
        `runs/${roundId}/answer`, { question_id: questionId, option_id: optionId, expected_version: expectedVersion }));
      return { ...result, state: seen(result.state) };
    },
    cashout: (roundId, expectedVersion) => state(api.post(`runs/${roundId}/cashout`, { expected_version: expectedVersion })),
    heartbeat: () => translated(api.post<void>("runs/heartbeat")),
    stats: async () => ({ playing_now: 0, recent_wins: [], top_runs: [] }),
    leave: (roundId) => state(api.post(`runs/${roundId}/leave`)),
  };
}
