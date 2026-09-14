import type { SquadSpinAnswerResult, SquadSpinState } from "@/lib/repositories/squadSpin.repo";
import { normalizeGridAnswerText } from "@/lib/football-grid/typeahead";
import { levenshtein } from "@/lib/answerMatching";
import type { SampleSquadSpinCombo } from "../types";
import { seededRandom, shuffleWith } from "../rng";
import type { SampleWalletPort } from "./triviaMines";

/**
 * Squad Spin sample engine — a frozen snapshot of the live rules
 * (squad-spin.constants.ts / .calibration.ts / .service.ts / .resolver.ts):
 * three-reel runs, tier steps priced from the cold-start accuracy priors plus
 * the 1,000 bp skill gap (capped at 99%), the launch-haircut margin (97% × 90%),
 * milli-coin pots, run cap = min(50,000, 40 × stake) on the FAIR pot, ten
 * correct answers auto-bank, decision before the next combo is shown.
 * Answers resolve like live: exact normalized alias, typo tolerance only
 * through `safe_typo` aliases with a 0/1/2 edit limit by length.
 */
export const MIN_STAKE = 5;
export const MAX_STAKE = 500;
export const POT_CAP = 50_000;
export const MAX_SPINS_PER_RUN = 10;
export const RUN_MULT_CAP_BP = 400_000;
export const QUESTION_WINDOW_MS = 15_000;
export const DECISION_MS = 5 * 60_000;
const MILLI = 1_000;
const MARGIN_BP = 9_700;
const LAUNCH_HAIRCUT_BP = 9_000;
const PRICING_SKILL_GAP_BP = 1_000;
const PRICING_MAX_ACCURACY_BP = 9_900;
const TIER_PRIOR_ACCURACY_BP = { t3e: 7_000, t3m: 5_500, t4: 4_500, t5: 3_500 } as const;

export function fairStepBp(accuracyBp: number): number {
  return Math.max(10_000, Math.round((10_000 * 10_000) / accuracyBp));
}
const priced = (tier: keyof typeof TIER_PRIOR_ACCURACY_BP) => fairStepBp(Math.min(PRICING_MAX_ACCURACY_BP, TIER_PRIOR_ACCURACY_BP[tier] + PRICING_SKILL_GAP_BP));
/** The pricing snapshot the sample plays under (labelled as such in the UI). */
export const SAMPLE_STEPS = { t3e: priced("t3e"), t3m: priced("t3m"), t4: priced("t4"), t5: priced("t5"), margin: Math.floor((MARGIN_BP * LAUNCH_HAIRCUT_BP) / 10_000) } as const;
export function runPotCap(stakeCoins: number): number {
  return Math.min(POT_CAP, Math.floor((stakeCoins * RUN_MULT_CAP_BP) / 10_000));
}
export function fairPotAfterSpin(fairPotMilli: number, stepBp: number, stakeCoins: number): number {
  return Math.min(runPotCap(stakeCoins) * MILLI, Math.floor((fairPotMilli * stepBp) / 10_000));
}
export function cashoutValue(fairPotMilli: number, marginBp: number): number {
  return Math.floor((fairPotMilli * marginBp) / 10_000 / MILLI);
}
export function typoDistanceLimit(normalizedInput: string): number {
  if (normalizedInput.length < 4) return 0;
  if (normalizedInput.length <= 7) return 1;
  return 2;
}
export function resolveSampleAnswer(text: string, aliases: SampleSquadSpinCombo["aliases"]): string | null {
  const input = normalizeGridAnswerText(text);
  if (!input) return null;
  const exact = aliases.find((a) => a.alias === input);
  if (exact) return exact.player_id;
  const limit = typoDistanceLimit(input);
  if (limit === 0) return null;
  let best: { playerId: string; distance: number } | null = null;
  for (const alias of aliases) {
    if (alias.policy !== "safe_typo") continue;
    if (Math.abs(alias.alias.length - input.length) > limit) continue;
    const distance = levenshtein(input, alias.alias);
    if (distance <= limit && (!best || distance < best.distance)) best = { playerId: alias.player_id, distance };
  }
  return best?.playerId ?? null;
}

class SampleError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "SquadSpinApiError";
  }
}

interface Round {
  id: string; status: SquadSpinState["status"]; phase: SquadSpinState["phase"]; version: number; stake: number; reels: 3;
  potMilli: number; spinsCleared: number; combo: SampleSquadSpinCombo | null; dealtAt: number; deadlineAt: number; decisionDeadlineAt: number | null;
  payout: number | null; lostCombo: SampleSquadSpinCombo | null; order: SampleSquadSpinCombo[]; cursor: number; next: () => number;
}

export interface SquadSpinSampleClient {
  start(stake: number, reels: number, clientNonce: string): Promise<SquadSpinState>;
  current(): Promise<SquadSpinState | null>;
  latest(): Promise<SquadSpinState | null>;
  answer(roundId: string, text: string, expectedVersion: number): Promise<SquadSpinAnswerResult>;
  continue(roundId: string, expectedVersion: number): Promise<SquadSpinState>;
  cashout(roundId: string, expectedVersion: number): Promise<SquadSpinState>;
  heartbeat(): Promise<void>;
  stats(): Promise<{ playing_now: number; recent_wins: never[]; top_runs: never[] }>;
}

export function createSquadSpinSample(input: { combos: SampleSquadSpinCombo[]; wallet: SampleWalletPort; seed: number; onSettled?: (r: { stake: number; payout: number; status: "cashed" | "lost" }) => void; now?: () => number }): SquadSpinSampleClient {
  const now = input.now ?? (() => Date.now());
  let round: Round | null = null; let last: Round | null = null; let counter = 0;
  const reelView = (r: SampleSquadSpinCombo["reels"][number]) => ({ family: r.family, id: r.id, key: r.key, label_en: r.label_en, label_ka: r.label_ka, asset_key: r.asset_key });
  const toState = (r: Round): SquadSpinState => ({
    round_id: r.id, status: r.status, phase: r.phase, state_version: r.version, stake_coins: r.stake, reels: r.reels,
    pot_coins: r.status === "active" ? (r.spinsCleared > 0 ? cashoutValue(r.potMilli, SAMPLE_STEPS.margin) : r.stake) : r.status === "cashed" ? r.payout ?? 0 : 0,
    mult_bp: Math.round((r.potMilli / (r.stake * MILLI)) * 10_000), spins_cleared: r.spinsCleared, steps_bp: { ...SAMPLE_STEPS },
    spin: r.status === "active" && r.phase === "question" && r.combo ? { index: r.spinsCleared + 1, tier: r.combo.tier, step_bp: SAMPLE_STEPS[r.combo.tier], next_pot_coins: cashoutValue(fairPotAfterSpin(r.potMilli, SAMPLE_STEPS[r.combo.tier], r.stake), SAMPLE_STEPS.margin), reels: r.combo.reels.map(reelView), dealt_at: new Date(r.dealtAt).toISOString(), deadline_at: new Date(r.deadlineAt).toISOString() } : null,
    decision_deadline_at: r.phase === "decision" && r.decisionDeadlineAt ? new Date(r.decisionDeadlineAt).toISOString() : null,
    payout_coins: r.payout, commit_hash: "sample", fairness_version: 0,
    reveal: r.status === "lost" && r.lostCombo ? { answers: r.lostCombo.answers.slice(0, 6), server_seed: "sample", hmac_input: "sample" } : null,
    server_now: new Date(now()).toISOString(),
  });
  const settle = (r: Round, status: "cashed" | "lost") => {
    const payout = status === "cashed" ? cashoutValue(r.potMilli, SAMPLE_STEPS.margin) : 0;
    r.status = status; r.phase = "settled"; r.payout = status === "cashed" ? payout : null; r.potMilli = status === "cashed" ? payout * MILLI : 0; r.combo = null; r.decisionDeadlineAt = null; r.version += 1;
    if (payout > 0) input.wallet.credit(payout);
    last = r; round = null;
    input.onSettled?.({ stake: r.stake, payout, status });
  };
  const deal = (r: Round) => {
    r.combo = r.order[r.cursor % r.order.length]; r.cursor += 1;
    r.dealtAt = now(); r.deadlineAt = r.dealtAt + QUESTION_WINDOW_MS; r.phase = "question"; r.decisionDeadlineAt = null; r.version += 1;
  };
  const resolveExpiry = (r: Round) => {
    if (r.phase === "question" && now() > r.deadlineAt) { r.lostCombo = r.combo; settle(r, "lost"); }
    else if (r.phase === "decision" && r.decisionDeadlineAt && now() > r.decisionDeadlineAt) settle(r, "cashed");
  };
  const requireRound = (roundId: string, version: number): Round => {
    if (!round) throw new SampleError("No active round", 404);
    if (round.id !== roundId) throw new SampleError("Round mismatch", 409);
    if (round.version !== version) throw new SampleError("Round state changed", 409);
    return round;
  };
  return {
    async start(stake, reels) {
      if (round) throw new SampleError("A round is already active", 409);
      if (reels !== 3) throw new SampleError("The sample plays three reels", 400);
      const clean = Math.floor(stake);
      if (!Number.isFinite(clean) || clean < MIN_STAKE || clean > MAX_STAKE) throw new SampleError("Stake out of range", 400);
      if (!input.wallet.debit(clean)) throw new SampleError("Not enough practice coins", 402);
      counter += 1;
      const next = seededRandom((input.seed + counter * 104_729) >>> 0);
      round = { id: `sample-spin-${counter}`, status: "active", phase: "question", version: 1, stake: clean, reels: 3, potMilli: clean * MILLI, spinsCleared: 0, combo: null, dealtAt: 0, deadlineAt: 0, decisionDeadlineAt: null, payout: null, lostCombo: null, order: shuffleWith(input.combos, next), cursor: 0, next };
      deal(round); round.version = 1;
      return toState(round);
    },
    async current() { if (!round) return null; resolveExpiry(round); return round ? toState(round) : last ? toState(last) : null; },
    async latest() { return last ? toState(last) : round ? toState(round) : null; },
    async answer(roundId, text, expectedVersion) {
      const r = requireRound(roundId, expectedVersion);
      if (r.phase !== "question" || !r.combo) throw new SampleError("No spin is pending", 409);
      const combo = r.combo;
      const late = now() > r.deadlineAt;
      const playerId = late ? null : resolveSampleAnswer(text, combo.aliases);
      if (!playerId) {
        r.lostCombo = combo; settle(r, "lost");
        return { outcome: late ? "late" : "wrong", player: null, answers: combo.answers.slice(0, 1), state: toState(r) };
      }
      const player = combo.answers.find((a) => a.id === playerId) ?? null;
      r.potMilli = fairPotAfterSpin(r.potMilli, SAMPLE_STEPS[combo.tier], r.stake); r.spinsCleared += 1; r.combo = null;
      r.phase = "decision"; r.decisionDeadlineAt = now() + DECISION_MS; r.version += 1;
      if (r.potMilli >= runPotCap(r.stake) * MILLI || r.spinsCleared >= MAX_SPINS_PER_RUN) settle(r, "cashed");
      return { outcome: "correct", player, answers: [], state: toState(r) };
    },
    async continue(roundId, expectedVersion) {
      const r = requireRound(roundId, expectedVersion);
      if (r.phase !== "decision") throw new SampleError("Round cannot continue now", 409);
      deal(r);
      return toState(r);
    },
    async cashout(roundId, expectedVersion) {
      const r = requireRound(roundId, expectedVersion);
      if (r.phase !== "decision") throw new SampleError("Nothing to cash out yet", 409);
      settle(r, "cashed");
      return toState(r);
    },
    async heartbeat() { /* nothing to keep alive */ },
    async stats() { return { playing_now: 0, recent_wins: [], top_runs: [] }; },
  };
}
