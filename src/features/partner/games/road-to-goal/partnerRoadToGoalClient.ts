import { RoadToGoalApiError, type RoadToGoalAnswerResult, type RoadToGoalState } from "@/lib/repositories/roadToGoal.repo";
import type { RoadToGoalPartnerClient } from "@/features/mini-games/components/RoadToGoal";
import { PartnerApiError } from "../../api/partnerApiClient";
import type { PartnerGameApi } from "../../game-kit/types";

/** Wire shape of `/partner/v1/games/road-to-goal/runs*` (backend partner-road-to-goal.service.ts). */
export interface PartnerRoadToGoalWireState {
  run_id: string;
  play_id: string;
  status: RoadToGoalState["status"] | "cancelled";
  phase: RoadToGoalState["phase"];
  state_version: number;
  start_points: number;
  cleared_zones: number;
  total_zones: number;
  zone_multipliers_bp: number[];
  current_multiplier_bp: number;
  next_multiplier_bp: number | null;
  current_points: number;
  next_points: number | null;
  decision_deadline_at: string | null;
  question: {
    question_id: string;
    zone: number;
    difficulty: "easy" | "medium" | "hard";
    prompt: Record<string, string>;
    image: { url: string; width: number; height: number; aspect_ratio?: string } | null;
    options: Array<{ id: string; text: Record<string, string> }>;
    duration_ms: number;
    deadline_at: string;
  } | null;
  score: number | null;
  settlement_reason: string | null;
  server_now: string;
}

interface WireAnswer {
  outcome: "correct" | "wrong" | "late";
  correct_option_id: string;
  state: PartnerRoadToGoalWireState;
}

/** The Road to Goal screen reads the site's round shape; points stand in for coins and the luck fields stay empty. */
export function toRoadToGoalState(wire: PartnerRoadToGoalWireState): RoadToGoalState {
  return {
    round_id: wire.run_id,
    // Only a block cancels a Road to Goal play (the screen never shows it: the client hands over to the home first).
    status: wire.status === "cancelled" ? "lost" : wire.status,
    phase: wire.phase,
    state_version: wire.state_version,
    stake_coins: wire.start_points as RoadToGoalState["stake_coins"],
    cleared_zones: wire.cleared_zones,
    total_zones: 11,
    current_multiplier_bp: wire.current_multiplier_bp,
    next_multiplier_bp: wire.next_multiplier_bp,
    current_return_coins: wire.current_points,
    next_return_coins: wire.next_points,
    zone_multipliers_bp: wire.zone_multipliers_bp,
    calibration_version_id: null,
    commitment_version: null,
    commit_hash: null,
    rules_manifest_hash: null,
    question_set_hash: null,
    client_seed: null,
    server_seed: null,
    auto_cashout_zone: null,
    decision_deadline_at: wire.decision_deadline_at,
    settlement_reason: wire.settlement_reason,
    question: wire.question
      ? {
          ...wire.question,
          expected_accuracy_bp: 0,
          target_survival_bp: 0,
          correct_survival_bp: 0,
          wrong_survival_bp: 0,
        }
      : null,
    payout_coins: wire.score,
    server_now: wire.server_now,
  } as RoadToGoalState;
}

/** The screen's recovery logic keys on RoadToGoalApiError statuses (409 = reconcile, other 4xx = final). */
async function translated<T>(request: Promise<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof PartnerApiError) throw new RoadToGoalApiError(error.message, error.status);
    throw error;
  }
}

export interface PartnerRoadToGoalClient extends RoadToGoalPartnerClient {
  /** Called when the server reports the play cancelled by a block. */
  onCancelled(fn: () => void): void;
  /** The last run state the server returned (its play id is what the host reports). */
  last(): PartnerRoadToGoalWireState | null;
  leave(roundId: string): Promise<RoadToGoalState>;
}

export function createPartnerRoadToGoalClient(api: PartnerGameApi): PartnerRoadToGoalClient {
  let cancelled: (() => void) | null = null;
  let last: PartnerRoadToGoalWireState | null = null;
  const seen = (wire: PartnerRoadToGoalWireState) => {
    if (!last || last.run_id !== wire.run_id || wire.state_version >= last.state_version) last = wire;
    if (wire.status === "cancelled") cancelled?.();
    return wire;
  };
  const state = async (request: Promise<PartnerRoadToGoalWireState>) => toRoadToGoalState(seen(await translated(request)));
  return {
    last: () => last,
    onCancelled: (fn) => { cancelled = fn; },
    start: (startId) => state(api.post("runs", { start_id: startId })),
    async current() {
      try {
        return await state(api.get("runs/current"));
      } catch (error) {
        if (error instanceof RoadToGoalApiError && error.status === 404) return null;
        throw error;
      }
    },
    get: (roundId) => state(api.get(`runs/${roundId}`)),
    async answer(input): Promise<RoadToGoalAnswerResult> {
      const result = await translated(api.post<WireAnswer>(`runs/${input.roundId}/answer`, {
        question_id: input.questionId,
        option_id: input.optionId,
        expected_version: input.expectedVersion,
      }));
      return {
        outcome: result.outcome,
        correct_option_id: result.correct_option_id,
        survived: result.outcome === "correct",
        expected_accuracy_bp: 0,
        target_survival_bp: 0,
        correct_survival_bp: 0,
        wrong_survival_bp: 0,
        applied_survival_bp: 0,
        roll_bp: 0,
        state: toRoadToGoalState(seen(result.state)),
      } as RoadToGoalAnswerResult;
    },
    continue: (input) => state(api.post(`runs/${input.roundId}/continue`, { expected_version: input.expectedVersion })),
    cashout: (input) => state(api.post(`runs/${input.roundId}/cashout`, { expected_version: input.expectedVersion })),
    leave: (roundId) => state(api.post(`runs/${roundId}/leave`)),
  };
}
