import type { TriviaMinesAnswerResult, TriviaMinesPickResult, TriviaMinesState } from "@/lib/repositories/triviaMines.repo";
import type { SampleQuestion } from "../types";
import { seededRandom, shuffleWith } from "../rng";

/**
 * Trivia Mines sample engine — the live rules (trivia-mines.constants.ts /
 * .service.ts on the backend) ported to the browser: 25 tiles, 4 defenders,
 * 3 scouts, per-state fair step unknown/(unknown−hidden) in basis points,
 * milli-coin pots, fair pot capped at 50,000, 97% taken once at cash-out,
 * 21 safe picks auto-bank. Deterministic per round from its seed.
 */
export const BOARD_SIZE = 25;
export const DEFENDERS = 4;
export const SCOUTS_PER_ROUND = 3;
export const MAX_SAFE_PICKS = BOARD_SIZE - DEFENDERS;
export const MIN_STAKE = 5;
export const MAX_STAKE = 500;
export const POT_CAP = 50_000;
export const MARGIN_BP = 9_700;
export const QUESTION_WINDOW_MS = 12_000;
const MILLI = 1_000;

export function fairStepBp(unknownTiles: number, hiddenDefenders: number): number {
  const safe = unknownTiles - hiddenDefenders;
  if (safe <= 0 || hiddenDefenders < 0) throw new Error("No safe tile left to price");
  return Math.round((10_000 * unknownTiles) / safe);
}
export function fairPotAfterPick(fairPotMilli: number, unknownTiles: number, hiddenDefenders: number): number {
  return Math.min(POT_CAP * MILLI, Math.floor((fairPotMilli * fairStepBp(unknownTiles, hiddenDefenders)) / 10_000));
}
export function cashoutValue(fairPotMilli: number): number {
  return Math.floor((fairPotMilli * MARGIN_BP) / 10_000 / MILLI);
}

class SampleError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "TriviaMinesApiError";
  }
}

interface Round {
  id: string;
  status: TriviaMinesState["status"];
  phase: TriviaMinesState["phase"];
  version: number;
  stake: number;
  potMilli: number;
  opened: number[];
  flagged: number[];
  defenders: number[];
  bustTile: number | null;
  scoutsLeft: number;
  question: { id: string; correct: string; dealtAt: number; deadlineAt: number; options: SampleQuestion["options"]; prompt: SampleQuestion["prompt"] } | null;
  payout: number | null;
  next: () => number;
  questionCursor: number;
}

export interface TriviaMinesSampleClient {
  start(stake: number, clientNonce: string): Promise<TriviaMinesState>;
  current(): Promise<TriviaMinesState | null>;
  latest(): Promise<TriviaMinesState | null>;
  pick(roundId: string, tile: number, expectedVersion: number): Promise<TriviaMinesPickResult>;
  deal(roundId: string, expectedVersion: number): Promise<TriviaMinesState>;
  answer(roundId: string, questionId: string, optionId: string, expectedVersion: number): Promise<TriviaMinesAnswerResult>;
  cashout(roundId: string, expectedVersion: number): Promise<TriviaMinesState>;
  heartbeat(): Promise<void>;
  stats(): Promise<{ playing_now: number; recent_wins: never[]; top_runs: never[] }>;
}

export interface SampleWalletPort { coins: number; debit: (amount: number) => boolean; credit: (amount: number) => void }

export function createTriviaMinesSample(input: { questions: SampleQuestion[]; wallet: SampleWalletPort; seed: number; onSettled?: (r: { stake: number; payout: number; status: "cashed" | "lost" }) => void; now?: () => number }): TriviaMinesSampleClient {
  const now = input.now ?? (() => Date.now());
  let round: Round | null = null;
  let last: Round | null = null;
  let roundCounter = 0;
  const bank = shuffleWith(input.questions, seededRandom(input.seed ^ 0x9e3779b9));

  const toState = (r: Round): TriviaMinesState => {
    const safePicks = r.opened.length;
    const unknown = BOARD_SIZE - r.opened.length - r.flagged.length;
    const hidden = DEFENDERS - r.flagged.length;
    const potNow = r.status === "active" ? (safePicks > 0 ? cashoutValue(r.potMilli) : r.stake) : r.status === "cashed" ? r.payout ?? 0 : r.status === "expired" ? r.stake : 0;
    const potNext = r.status === "active" && safePicks < MAX_SAFE_PICKS ? cashoutValue(fairPotAfterPick(r.potMilli, unknown, hidden)) : potNow;
    return {
      round_id: r.id, status: r.status, phase: r.phase, state_version: r.version, stake_coins: r.stake,
      pot_coins: potNow, next_pot_coins: potNext, mult_bp: Math.round((r.potMilli / (r.stake * MILLI)) * 10_000),
      opened: [...r.opened], flagged: [...r.flagged], bust_tile: r.bustTile, scouts_left: r.scoutsLeft,
      board_size: BOARD_SIZE, defender_count: DEFENDERS, commit_hash: "sample", fairness_version: 0,
      question: r.question ? { question_id: r.question.id, prompt: r.question.prompt, options: r.question.options, deadline_at: new Date(r.question.deadlineAt).toISOString() } : null,
      payout_coins: r.payout,
      reveal: r.status === "active" ? null : { defenders: [...r.defenders], server_seed: "sample", hmac_input: "sample" },
      server_now: new Date(now()).toISOString(),
    };
  };
  const settle = (r: Round, status: "cashed" | "lost", payout: number) => {
    r.status = status; r.phase = "settled"; r.payout = status === "cashed" ? payout : null; r.question = null; r.version += 1;
    if (status === "cashed") { r.potMilli = payout * MILLI; input.wallet.credit(payout); } else r.potMilli = 0;
    last = r; round = null;
    input.onSettled?.({ stake: r.stake, payout: status === "cashed" ? payout : 0, status });
  };
  const requireRound = (roundId: string, version: number): Round => {
    if (!round) throw new SampleError("No active round", 404);
    if (round.id !== roundId) throw new SampleError("Round mismatch", 409);
    if (round.version !== version) throw new SampleError("Round state changed", 409);
    return round;
  };
  const expireQuestionIfLate = (r: Round) => {
    if (r.phase === "question" && r.question && now() > r.question.deadlineAt) {
      r.phase = "picking"; r.scoutsLeft = Math.max(0, r.scoutsLeft - 1); r.question = null; r.version += 1;
    }
  };

  return {
    async start(stake) {
      if (round) throw new SampleError("A round is already active", 409);
      const clean = Math.floor(stake);
      if (!Number.isFinite(clean) || clean < MIN_STAKE || clean > MAX_STAKE) throw new SampleError("Stake out of range", 400);
      if (!input.wallet.debit(clean)) throw new SampleError("Not enough practice coins", 402);
      roundCounter += 1;
      const next = seededRandom((input.seed + roundCounter * 7919) >>> 0);
      const defenders = shuffleWith(Array.from({ length: BOARD_SIZE }, (_, i) => i), next).slice(0, DEFENDERS).sort((a, b) => a - b);
      round = { id: `sample-mines-${roundCounter}`, status: "active", phase: "picking", version: 1, stake: clean, potMilli: clean * MILLI, opened: [], flagged: [], defenders, bustTile: null, scoutsLeft: SCOUTS_PER_ROUND, question: null, payout: null, next, questionCursor: (roundCounter - 1) * SCOUTS_PER_ROUND };
      return toState(round);
    },
    async current() { if (!round) return null; expireQuestionIfLate(round); return toState(round); },
    async latest() { return last ? toState(last) : round ? toState(round) : null; },
    async pick(roundId, tile, expectedVersion) {
      const r = requireRound(roundId, expectedVersion);
      expireQuestionIfLate(r);
      if (r.phase === "question") throw new SampleError("Answer the pending question first", 409);
      if (!Number.isInteger(tile) || tile < 0 || tile >= BOARD_SIZE) throw new SampleError("Tile out of range", 400);
      if (r.opened.includes(tile) || r.flagged.includes(tile)) throw new SampleError("Tile already resolved", 400);
      if (r.defenders.includes(tile)) { r.bustTile = tile; settle(r, "lost", 0); return { safe: false, state: toState(r) }; }
      const unknown = BOARD_SIZE - r.opened.length - r.flagged.length;
      const hidden = DEFENDERS - r.flagged.length;
      r.potMilli = fairPotAfterPick(r.potMilli, unknown, hidden); r.opened = [...r.opened, tile]; r.version += 1;
      if (r.opened.length >= MAX_SAFE_PICKS) settle(r, "cashed", cashoutValue(r.potMilli));
      return { safe: true, state: toState(r) };
    },
    async deal(roundId, expectedVersion) {
      const r = requireRound(roundId, expectedVersion);
      if (r.phase !== "picking") throw new SampleError("Cannot scout now", 409);
      if (r.scoutsLeft <= 0) throw new SampleError("No scouts left", 409);
      const q = bank[r.questionCursor % bank.length]; r.questionCursor += 1;
      const options = shuffleWith(q.options, r.next);
      const dealtAt = now();
      r.question = { id: q.id, correct: q.correctOptionId, dealtAt, deadlineAt: dealtAt + QUESTION_WINDOW_MS, options, prompt: q.prompt };
      r.phase = "question"; r.version += 1;
      return toState(r);
    },
    async answer(roundId, questionId, optionId, expectedVersion) {
      const r = requireRound(roundId, expectedVersion);
      if (r.phase !== "question" || !r.question) throw new SampleError("No question pending", 409);
      if (r.question.id !== questionId) throw new SampleError("Answer targets a stale question", 409);
      const late = now() > r.question.deadlineAt;
      const correct = !late && optionId === r.question.correct;
      let flagged: number | null = null;
      if (correct) {
        const hidden = r.defenders.filter((d) => !r.flagged.includes(d));
        if (hidden.length) { flagged = hidden[Math.floor(r.next() * hidden.length)]; r.flagged = [...r.flagged, flagged]; }
      }
      const correctOption = r.question.correct;
      r.scoutsLeft -= 1; r.question = null; r.phase = "picking"; r.version += 1;
      return { outcome: late ? "late" : correct ? "correct" : "wrong", correct_option_id: correctOption, flagged_tile: flagged, state: toState(r) };
    },
    async cashout(roundId, expectedVersion) {
      const r = requireRound(roundId, expectedVersion);
      expireQuestionIfLate(r);
      if (r.phase !== "picking") throw new SampleError("Answer the pending question first", 409);
      if (r.opened.length === 0) throw new SampleError("Open a tile before cashing out", 409);
      settle(r, "cashed", cashoutValue(r.potMilli));
      return toState(r);
    },
    async heartbeat() { /* nothing to keep alive */ },
    async stats() { return { playing_now: 0, recent_wins: [], top_runs: [] }; },
  };
}
