/**
 * Mentalista Futbolero — pure, deterministic rules engine (prototype).
 *
 * The round shape: a rotating *chooser* secretly commits a valid answer within the round's category; every other seat
 * then *predicts the chooser's exact pick*. A prediction that matches the chooser's committed pick scores
 * `config.matchPoints` (default 2). Nobody is scored for merely naming a valid player — only for reading the chooser.
 *
 * Invariants this file guarantees (the UI and, later, the server both lean on them):
 * - No I/O, no timers, no `Date` of its own. Every function that can advance time takes `now` (ms) from the caller, so
 *   a test is fully deterministic and the server can feed it the database clock after the row lock.
 * - The chooser is locked (`phase: "choosing"` → `"guessing"`) *before* any prediction is accepted, and predictions stay
 *   hidden from other seats until `phase: "reveal"` (see {@link projectView}). This is a server-authority contract; the
 *   prototype has no client-side secrecy (the simulator runs every seat in one browser).
 * - `version` increases by exactly 1 on every accepted mutation and every phase transition; a command carrying a
 *   `baseVersion` other than the current one is refused as `stale_version`.
 * - Every command carries a `commandId`; re-applying the same `commandId` returns the stored result and mutates nothing.
 *
 * Nothing here contains real football content: categories and answers are passed in by the caller (invented-universe
 * fixtures in the playground, a private pool on the server later).
 */

// ── Configuration ────────────────────────────────────────────────────────────────────────────────────────────────

export interface Category {
  /** Stable id (used for history and overlap ledgers later). */
  id: string;
  /** A label the UI localises; the engine never reads it. */
  label: string;
  /** The answers that count as "within the category". Invented names only in this repo. */
  answers: readonly string[];
}

export interface MentalistaConfig {
  /**
   * How many **complete chooser cycles** a match lasts (default 2). A match runs `roundCycles × seatCount` rounds, so
   * every seat is the chooser exactly `roundCycles` times and a predictor on every other round — equal opportunity for
   * 3–6 seats when nobody leaves. (A *fixed* round count, e.g. 6, is unfair: with 4 seats two players would choose twice
   * and two once; with 5, one player would never choose at all.) 2 cycles keeps the match bounded: 6 rounds at 3 seats,
   * 12 at 6. Use 1 for a short game.
   */
  roundCycles: number;
  /** Ms the chooser has to commit a pick before the round is voided. */
  chooseMs: number;
  /** Ms every predictor has to submit (and may revise) a prediction. */
  guessMs: number;
  /** Ms the reveal is shown before the round advances. */
  revealMs: number;
  /** Longest accepted answer (trimmed, in characters). */
  maxAnswerLen: number;
  /** Points a predictor earns for matching the chooser (default 2). */
  matchPoints: number;
  /** Points the chooser earns per predictor who matched them (default 0 — the reader wins, not the read). */
  chooserPointsPerMatch: number;
  /** One category is used per round, indexed by round number (wraps when there are more rounds than categories). */
  categories: readonly Category[];
}

export const DEFAULT_CONFIG: Omit<MentalistaConfig, "categories"> = {
  roundCycles: 2,
  chooseMs: 25_000,
  guessMs: 30_000,
  revealMs: 7_000,
  maxAnswerLen: 40,
  matchPoints: 2,
  chooserPointsPerMatch: 0,
};

/** Supported seat range to *create* a match (inclusive). A room is 3–6 players; 2 plays as the 1v1 duel (a different mode). */
export const MIN_SEATS = 3;
export const MAX_SEATS = 6;

/**
 * Fewest active seats that can still play out a round: one chooser plus one predictor. This is deliberately below
 * {@link MIN_SEATS} — a match *starts* at 3+, but if a seat later leaves, the remaining two finish the match between them
 * (a reader and someone to read) rather than having it cancelled. Fall *below* this (a lone seat with nobody to read) and
 * the match ends at the current boundary; a round already revealed keeps its awarded points (see {@link setSeatStatus}).
 */
export const MIN_ACTIVE_SEATS = 2;

// ── State ────────────────────────────────────────────────────────────────────────────────────────────────────────

export type Phase = "lobby" | "choosing" | "guessing" | "reveal" | "over";
export type SeatStatus = "active" | "dropped";
export type VoidReason = "chooser_timeout" | "chooser_dropped" | "too_few_players";

export interface SeatState {
  seat: number;
  status: SeatStatus;
  points: number;
}

export interface Prediction {
  raw: string;
  norm: string;
}

export interface RoundState {
  index: number;
  categoryId: string;
  chooserSeat: number;
  /** The chooser's committed answer — secret until `phase === "reveal"`; never leave it in a projected non-reveal view. */
  pick: string | null;
  pickNorm: string | null;
  predictions: Record<number, Prediction>;
  phase: "choosing" | "guessing" | "reveal";
  deadline: number;
  voided: VoidReason | null;
  /** Seats whose prediction matched the pick (filled at reveal). */
  matched: number[];
}

export interface RoundSummary {
  index: number;
  categoryId: string;
  chooserSeat: number;
  pick: string | null;
  predictions: Record<number, string>;
  matched: number[];
  voided: VoidReason | null;
}

/** An immutable per-request outcome: the result a `commandId` produced and a fingerprint binding it to its payload. */
export interface ProcessedEntry {
  /** The result this command produced (accepted *or* rejected) — replayed verbatim, never recomputed. */
  result: CommandResult;
  /** A stable fingerprint of the request (type, actor, answer, baseVersion) so a reused id with a changed payload is caught. */
  fp: string;
}

export interface MentalistaState {
  version: number;
  phase: Phase;
  config: MentalistaConfig;
  /** Rounds in this match = `config.roundCycles × seatCount`, frozen at creation (rotation skips dropped seats later). */
  totalRounds: number;
  seats: SeatState[];
  round: RoundState | null;
  /** The chooser of the previous round, so rotation can pick the next active seat after it. */
  prevChooser: number | null;
  /** commandId → the immutable outcome it produced, for idempotent replays. Own-keys only (see {@link getProcessed}). */
  processed: Record<string, ProcessedEntry>;
  history: RoundSummary[];
}

// ── Commands and results ─────────────────────────────────────────────────────────────────────────────────────────

interface Based {
  commandId: string;
  baseVersion: number;
}

export type Command =
  | ({ type: "start" } & Based)
  | ({ type: "commit_pick"; seat: number; answer: string } & Based)
  | ({ type: "predict"; seat: number; answer: string } & Based);

export type RejectCode =
  | "not_started"
  | "stale_version"
  | "wrong_phase"
  | "not_chooser"
  | "is_chooser"
  | "seat_dropped"
  | "unknown_seat"
  | "empty"
  | "too_long"
  | "out_of_category"
  | "already_committed"
  /** The round deadline had already passed when the command arrived (choose void / guess reveal adjudicated first). */
  | "expired"
  /** A raw field was missing or the wrong runtime type (never trust the compiler for inputs off the wire). */
  | "malformed"
  /** The `commandId` was already used for a *different* payload — a client bug or a tampered replay. */
  | "command_conflict";

export type OkCode = "started" | "committed" | "predicted";

export type CommandResult =
  | { ok: true; code: OkCode; version: number }
  | { ok: false; code: RejectCode; version: number };

// ── Answer validation and normalisation ──────────────────────────────────────────────────────────────────────────

/**
 * Fold an answer for matching: decompose (NFD), strip combining diacritics, collapse inner whitespace, trim, then
 * lower-case with the Unicode *default* (locale-independent) case mapping.
 *
 * Determinism is the contract: the same bytes must fold identically on every host and in every process locale. That is
 * why this uses {@link String.prototype.toLowerCase} and never `toLocaleLowerCase` — the latter varies by the ambient
 * locale (famously Turkish "I"→"ı" / "İ"→"i"), which would make the chooser's pick and a predictor's guess fold
 * differently on two machines. With NFD-then-strip, a dotted "İ" (U+0130) decomposes to "I"+combining-dot, loses the
 * dot, and lower-cases to "i" (so "I"/"i"/"İ" all fold to "i"); a dotless "ı" (U+0131) stays "ı" (distinct, by design);
 * Georgian has no case so its letters pass through unchanged.
 */
export function normalizeAnswer(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export type AnswerCheck =
  /** `norm` folds for matching; `canonical` is the whitespace-collapsed, case-preserved text safe to store/display. */
  | { ok: true; norm: string; canonical: string }
  | { ok: false; code: "empty" | "too_long" | "out_of_category" };

/**
 * Hard cap on the *raw* answer bytes a command may carry, enforced before any trim/normalisation/fingerprint. It sits far
 * above {@link MAX_ANSWER_LEN_CAP} so a legitimately-too-long name still gets the precise `too_long` verdict; its only job
 * is to stop a padding attack (e.g. a million spaces + a valid name, which would collapse under `maxAnswerLen` yet still
 * be stored verbatim in the pick, the predictions and the idempotency fingerprint). See {@link malformedCommand}.
 */
export const MAX_RAW_ANSWER_LEN = 1_000;

/** The single place "valid / invalid / empty / too long / out of category" is decided, so chooser and predictor agree. */
export function checkAnswer(raw: string, category: Category, maxLen: number): AnswerCheck {
  const canonical = raw.replace(/\s+/g, " ").trim();
  if (canonical.length === 0) return { ok: false, code: "empty" };
  if (canonical.length > maxLen) return { ok: false, code: "too_long" };
  const norm = normalizeAnswer(raw);
  const valid = new Set(category.answers.map(normalizeAnswer));
  if (!valid.has(norm)) return { ok: false, code: "out_of_category" };
  return { ok: true, norm, canonical };
}

// ── Runtime validation (never trust the compiler for inputs off the wire) ────────────────────────────────────────

export class MentalistaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MentalistaConfigError";
  }
}

const isFiniteNumber = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isInt = (x: unknown): x is number => isFiniteNumber(x) && Number.isInteger(x);
const isIntInRange = (x: unknown, lo: number, hi: number): x is number => isInt(x) && x >= lo && x <= hi;
const isFiniteInRange = (x: unknown, lo: number, hi: number): x is number => isFiniteNumber(x) && x >= lo && x <= hi;
const isNonEmptyString = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0;

/** Upper bounds that keep a match sane and cheap to reason about (durations in ms, counts, points, collection sizes). */
const MAX_DURATION_MS = 3_600_000; // 1h — no legitimate phase is longer
const MAX_ANSWER_LEN_CAP = 200;
const MAX_POINTS = 1_000;
const MAX_ROUND_CYCLES = 20;
const MAX_CATEGORIES = 256;
const MAX_ANSWERS_PER_CATEGORY = 1_000;
const MAX_LABEL_LEN = 200;
const MAX_CATEGORY_ID_LEN = 128;

/**
 * Validate a full {@link MentalistaConfig} before it can drive a match. Throws {@link MentalistaConfigError} on the first
 * problem with a message naming the field. This is the single gate every runtime input passes (the server's own pool
 * validator mirrors it). TypeScript guarantees nothing at runtime, so every field is re-checked here.
 */
export function validateConfig(config: MentalistaConfig): void {
  if (typeof config !== "object" || config === null) throw new MentalistaConfigError("config: must be an object");
  // Refuse the removed `rounds` knob outright rather than silently ignoring a stale caller (it meant a fixed, unfair count).
  if (OWN.call(config, "rounds")) throw new MentalistaConfigError("rounds: removed — use roundCycles (totalRounds = roundCycles × seatCount)");
  if (!isIntInRange(config.roundCycles, 1, MAX_ROUND_CYCLES)) throw new MentalistaConfigError(`roundCycles: expected an integer 1–${MAX_ROUND_CYCLES}`);
  if (!isFiniteInRange(config.chooseMs, 1, MAX_DURATION_MS)) throw new MentalistaConfigError("chooseMs: expected a finite duration in (0, 1h]");
  if (!isFiniteInRange(config.guessMs, 1, MAX_DURATION_MS)) throw new MentalistaConfigError("guessMs: expected a finite duration in (0, 1h]");
  if (!isFiniteInRange(config.revealMs, 1, MAX_DURATION_MS)) throw new MentalistaConfigError("revealMs: expected a finite duration in (0, 1h]");
  if (!isIntInRange(config.maxAnswerLen, 1, MAX_ANSWER_LEN_CAP)) throw new MentalistaConfigError(`maxAnswerLen: expected an integer 1–${MAX_ANSWER_LEN_CAP}`);
  if (!isIntInRange(config.matchPoints, 1, MAX_POINTS)) throw new MentalistaConfigError(`matchPoints: expected an integer 1–${MAX_POINTS}`);
  if (!isIntInRange(config.chooserPointsPerMatch, 0, MAX_POINTS)) throw new MentalistaConfigError(`chooserPointsPerMatch: expected an integer 0–${MAX_POINTS}`);
  if (!Array.isArray(config.categories) || config.categories.length === 0) throw new MentalistaConfigError("categories: expected a non-empty array");
  if (config.categories.length > MAX_CATEGORIES) throw new MentalistaConfigError(`categories: at most ${MAX_CATEGORIES}`);
  const seenCatIds = new Set<string>();
  config.categories.forEach((cat: Category, i) => {
    if (typeof cat !== "object" || cat === null) throw new MentalistaConfigError(`categories[${i}]: must be an object`);
    if (!isNonEmptyString(cat.id) || cat.id.length > MAX_CATEGORY_ID_LEN) throw new MentalistaConfigError(`categories[${i}].id: expected a non-empty string ≤ ${MAX_CATEGORY_ID_LEN} chars`);
    if (seenCatIds.has(cat.id)) throw new MentalistaConfigError(`categories[${i}].id: duplicate id "${cat.id}"`);
    seenCatIds.add(cat.id);
    if (typeof cat.label !== "string" || cat.label.length === 0 || cat.label.length > MAX_LABEL_LEN) throw new MentalistaConfigError(`categories[${i}].label: expected a non-empty string ≤ ${MAX_LABEL_LEN} chars`);
    if (!Array.isArray(cat.answers) || cat.answers.length === 0) throw new MentalistaConfigError(`categories[${i}].answers: expected a non-empty array`);
    if (cat.answers.length > MAX_ANSWERS_PER_CATEGORY) throw new MentalistaConfigError(`categories[${i}].answers: at most ${MAX_ANSWERS_PER_CATEGORY}`);
    const seenNorm = new Set<string>();
    cat.answers.forEach((ans: unknown, j) => {
      if (!isNonEmptyString(ans)) throw new MentalistaConfigError(`categories[${i}].answers[${j}]: expected a non-empty string`);
      if (ans.length > MAX_RAW_ANSWER_LEN) throw new MentalistaConfigError(`categories[${i}].answers[${j}]: raw string too long`);
      if (ans.replace(/\s+/g, " ").trim().length > config.maxAnswerLen) throw new MentalistaConfigError(`categories[${i}].answers[${j}]: longer than maxAnswerLen`);
      const norm = normalizeAnswer(ans);
      if (norm.length === 0) throw new MentalistaConfigError(`categories[${i}].answers[${j}]: normalises to empty`);
      if (seenNorm.has(norm)) throw new MentalistaConfigError(`categories[${i}].answers[${j}]: duplicate (normalised) answer "${ans}"`);
      seenNorm.add(norm);
    });
  });
}

// ── Construction ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A match waiting in the lobby. `seatCount` must be an integer in [{@link MIN_SEATS}, {@link MAX_SEATS}] (a 2-player
 * game is the 1v1 duel, a different mode); the config is fully validated. Throws {@link MentalistaConfigError} on any
 * malformed input rather than silently clamping — a NaN or out-of-range seat count is a bug, not a thing to round.
 */
export function createMatch(seatCount: number, config: MentalistaConfig): MentalistaState {
  if (!isIntInRange(seatCount, MIN_SEATS, MAX_SEATS)) {
    throw new MentalistaConfigError(`seatCount: expected an integer ${MIN_SEATS}–${MAX_SEATS}, got ${String(seatCount)}`);
  }
  validateConfig(config);
  return {
    version: 1,
    phase: "lobby",
    config,
    totalRounds: config.roundCycles * seatCount,
    seats: Array.from({ length: seatCount }, (_, seat) => ({ seat, status: "active", points: 0 })),
    round: null,
    prevChooser: null,
    processed: emptyProcessed(),
    history: [],
  };
}

// ── Idempotency store (own-keys only; prototype-pollution-proof) ─────────────────────────────────────────────────

const OWN = Object.prototype.hasOwnProperty;

/** A fresh, prototype-less store so no inherited key (`toString`, `constructor`, `__proto__`) is ever visible or writable. */
function emptyProcessed(): Record<string, ProcessedEntry> {
  return Object.create(null) as Record<string, ProcessedEntry>;
}

/** Read a stored outcome by command id, counting **own** keys only — never an inherited `Object.prototype` member. */
function getProcessed(processed: Record<string, ProcessedEntry>, id: string): ProcessedEntry | undefined {
  return OWN.call(processed, id) ? processed[id] : undefined;
}

/** Return a new store with `id → entry` added, rebuilt on a null prototype so even `"__proto__"` becomes a plain own key. */
function putProcessed(processed: Record<string, ProcessedEntry>, id: string, entry: ProcessedEntry): Record<string, ProcessedEntry> {
  const next = emptyProcessed();
  for (const k in processed) if (OWN.call(processed, k)) next[k] = processed[k];
  next[id] = entry;
  return next;
}

/** A stable fingerprint of a command's meaningful payload, so a reused id carrying a different request is rejected. */
function fingerprint(command: Command): string {
  const seat = (command as { seat?: unknown }).seat;
  const answer = (command as { answer?: unknown }).answer;
  return JSON.stringify([command.type, command.baseVersion, seat ?? null, answer ?? null]);
}

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────

const activeSeats = (s: MentalistaState): number[] => s.seats.filter((x) => x.status === "active").map((x) => x.seat);

function categoryFor(config: MentalistaConfig, index: number): Category {
  return config.categories[index % config.categories.length];
}

/** The next chooser after `prev`, in seat order, skipping dropped seats. `null` when nobody is active. */
function nextChooser(s: MentalistaState, prev: number | null): number | null {
  const order = [...s.seats].sort((a, b) => a.seat - b.seat);
  const n = order.length;
  const start = prev === null ? 0 : (order.findIndex((x) => x.seat === prev) + 1) % n;
  for (let i = 0; i < n; i++) {
    const seat = order[(start + i) % n];
    if (seat.status === "active") return seat.seat;
  }
  return null;
}

/** Open the round `index` as a fresh choosing phase (or end the match when there are too few active seats). */
function openRound(s: MentalistaState, index: number, now: number): MentalistaState {
  if (index >= s.totalRounds || activeSeats(s).length < MIN_ACTIVE_SEATS) {
    return { ...s, phase: "over", round: null, version: s.version + 1 };
  }
  const chooser = nextChooser(s, s.prevChooser);
  if (chooser === null) return { ...s, phase: "over", round: null, version: s.version + 1 };
  const category = categoryFor(s.config, index);
  return {
    ...s,
    phase: "choosing",
    version: s.version + 1,
    round: {
      index,
      categoryId: category.id,
      chooserSeat: chooser,
      pick: null,
      pickNorm: null,
      predictions: {},
      phase: "choosing",
      deadline: now + s.config.chooseMs,
      voided: null,
      matched: [],
    },
  };
}

/** Compute matches and apply points for a non-voided round; returns the mutated seats and matched list. */
function score(s: MentalistaState, round: RoundState): { seats: SeatState[]; matched: number[] } {
  if (round.voided || round.pickNorm === null) return { seats: s.seats, matched: [] };
  const matched: number[] = [];
  for (const [seatStr, pred] of Object.entries(round.predictions)) {
    const seat = Number(seatStr);
    const st = s.seats.find((x) => x.seat === seat);
    if (!st || st.status !== "active" || seat === round.chooserSeat) continue;
    if (pred.norm === round.pickNorm) matched.push(seat);
  }
  const bonus = s.config.chooserPointsPerMatch * matched.length;
  const seats = s.seats.map((st) => {
    if (matched.includes(st.seat)) return { ...st, points: st.points + s.config.matchPoints };
    if (st.seat === round.chooserSeat && bonus > 0) return { ...st, points: st.points + bonus };
    return st;
  });
  return { seats, matched: matched.sort((a, b) => a - b) };
}

function summarize(round: RoundState): RoundSummary {
  return {
    index: round.index,
    categoryId: round.categoryId,
    chooserSeat: round.chooserSeat,
    pick: round.pick,
    predictions: Object.fromEntries(Object.entries(round.predictions).map(([seat, p]) => [seat, p.raw])),
    matched: round.matched,
    voided: round.voided,
  };
}

/** Move an open round into its reveal phase (scoring if it was not voided), stamping the reveal deadline. */
function toReveal(s: MentalistaState, voided: VoidReason | null, now: number): MentalistaState {
  const round = s.round!;
  const finalRound: RoundState = { ...round, voided: voided ?? round.voided };
  const { seats, matched } = score(s, finalRound);
  const revealed: RoundState = { ...finalRound, phase: "reveal", deadline: now + s.config.revealMs, matched };
  return { ...s, version: s.version + 1, phase: "reveal", seats, round: revealed };
}

// ── Command application ──────────────────────────────────────────────────────────────────────────────────────────

const MAX_COMMAND_ID_LEN = 128;

/** Runtime shape check for a raw command off the wire. Returns an error code, or `null` when the fields are well-formed. */
function malformedCommand(command: Command): "malformed" | null {
  if (typeof command !== "object" || command === null) return "malformed";
  const id = (command as { commandId?: unknown }).commandId;
  if (typeof id !== "string" || id.length === 0 || id.length > MAX_COMMAND_ID_LEN) return "malformed";
  if (!isInt((command as { baseVersion?: unknown }).baseVersion)) return "malformed";
  switch (command.type) {
    case "start":
      return null;
    case "commit_pick":
    case "predict": {
      if (!isInt((command as { seat?: unknown }).seat)) return "malformed";
      const answer = (command as { answer?: unknown }).answer;
      if (typeof answer !== "string") return "malformed";
      // Bound the RAW bytes before anything trims, normalises or fingerprints them — a padded answer must never be stored.
      if (answer.length > MAX_RAW_ANSWER_LEN) return "malformed";
      return null;
    }
    default:
      return "malformed";
  }
}

/**
 * Apply one command. Returns the (possibly unchanged) state and a result.
 *
 * Contract, in order:
 * 1. **Malformed inputs** (bad runtime types/ids) are refused before anything is read — the compiler is no help off the wire.
 * 2. **Idempotency.** A replayed `commandId` returns its stored outcome verbatim (accepted *or* rejected) and mutates
 *    nothing; the same id carrying a *different* payload is a `command_conflict`, never silently re-applied.
 * 3. **Staleness.** A `baseVersion` that is not the current version is refused `stale_version` — and that rejection is
 *    **recorded**, so a request stamped at a future version cannot quietly commit once the state catches up to it.
 * 4. **Deadline adjudication.** If the round deadline has already passed, time is advanced here (choose → void,
 *    guess → reveal) and the late command is refused `expired`; a stale guess never leaks into the next phase.
 */
export function apply(state: MentalistaState, command: Command, now: number): { state: MentalistaState; result: CommandResult } {
  // 1. Malformed shape (or a non-finite clock) — cannot even be keyed into the idempotency store safely.
  if (!isFiniteNumber(now) || malformedCommand(command) !== null) {
    return { state, result: { ok: false, code: "malformed", version: state.version } };
  }

  // 2. Idempotency, bound to the exact payload.
  const prior = getProcessed(state.processed, command.commandId);
  if (prior) {
    if (prior.fp === fingerprint(command)) return { state, result: prior.result };
    return { state, result: { ok: false, code: "command_conflict", version: state.version } };
  }

  const fp = fingerprint(command);
  // Record an outcome (accepted or rejected) immutably against the command id.
  const settle = (next: MentalistaState, result: CommandResult): { state: MentalistaState; result: CommandResult } => {
    const stamped = { ...next, processed: putProcessed(next.processed, command.commandId, { result, fp }) };
    return { state: stamped, result };
  };
  const rejectWith = (s: MentalistaState, code: RejectCode) => settle(s, { ok: false, code, version: s.version });

  // 3. Staleness — recorded, so a future-stamped command cannot commit later when the version catches up.
  if (command.baseVersion !== state.version) return rejectWith(state, "stale_version");

  // 4. Deadline adjudication: resolve an already-elapsed round before acting on it.
  const open = state.round;
  if (open && (state.phase === "choosing" || state.phase === "guessing") && now >= open.deadline) {
    const advanced = tick(state, now); // choosing → void reveal, guessing → reveal (scores once)
    return rejectWith(advanced, "expired");
  }

  switch (command.type) {
    case "start": {
      if (state.phase !== "lobby") return rejectWith(state, "wrong_phase");
      const opened = openRound(state, 0, now);
      return settle(opened, { ok: true, code: "started", version: opened.version });
    }

    case "commit_pick": {
      const round = state.round;
      if (state.phase !== "choosing" || !round) return rejectWith(state, "wrong_phase");
      const seat = state.seats.find((x) => x.seat === command.seat);
      if (!seat) return rejectWith(state, "unknown_seat");
      if (seat.status !== "active") return rejectWith(state, "seat_dropped");
      if (command.seat !== round.chooserSeat) return rejectWith(state, "not_chooser");
      if (round.pick !== null) return rejectWith(state, "already_committed");
      const check = checkAnswer(command.answer, categoryFor(state.config, round.index), state.config.maxAnswerLen);
      if (!check.ok) return rejectWith(state, check.code);
      const next: MentalistaState = {
        ...state,
        version: state.version + 1,
        phase: "guessing",
        round: { ...round, pick: check.canonical, pickNorm: check.norm, phase: "guessing", deadline: now + state.config.guessMs },
      };
      return settle(next, { ok: true, code: "committed", version: next.version });
    }

    case "predict": {
      const round = state.round;
      if (state.phase !== "guessing" || !round) return rejectWith(state, "wrong_phase");
      const seat = state.seats.find((x) => x.seat === command.seat);
      if (!seat) return rejectWith(state, "unknown_seat");
      if (seat.status !== "active") return rejectWith(state, "seat_dropped");
      if (command.seat === round.chooserSeat) return rejectWith(state, "is_chooser");
      const check = checkAnswer(command.answer, categoryFor(state.config, round.index), state.config.maxAnswerLen);
      if (!check.ok) return rejectWith(state, check.code);
      // A predictor may revise until the phase ends; the latest accepted prediction replaces the earlier one.
      const next: MentalistaState = {
        ...state,
        version: state.version + 1,
        round: { ...round, predictions: { ...round.predictions, [command.seat]: { raw: check.canonical, norm: check.norm } } },
      };
      return settle(next, { ok: true, code: "predicted", version: next.version });
    }

    default:
      return rejectWith(state, "malformed");
  }
}

// ── Time and lifecycle ───────────────────────────────────────────────────────────────────────────────────────────

/**
 * Advance the clock to `now`, crossing at most the deadlines already in the past. A phase entered by this call stamps its
 * own fresh deadline relative to `now` (reveal lasts `revealMs` from when it is computed, a new round `chooseMs`), so a
 * single `tick` after a long gap resolves to the next display boundary rather than skipping the reveal a player should
 * see — call it again once that boundary passes. Deterministic and idempotent when no deadline has passed.
 */
export function tick(state: MentalistaState, now: number): MentalistaState {
  let s = state;
  // Guard only: on a forward jump each entered phase stamps a deadline > now, so the loop normally runs once.
  for (let guard = 0; guard < state.totalRounds * 4 + 8; guard++) {
    const round = s.round;
    if (!round || s.phase === "over" || s.phase === "lobby") return s;
    if (now < round.deadline) return s;
    if (round.phase === "choosing") {
      s = toReveal(s, "chooser_timeout", now);
    } else if (round.phase === "guessing") {
      s = toReveal(s, null, now);
    } else {
      // reveal elapsed → bank the summary and open the next round (or end the match)
      s = { ...s, history: [...s.history, summarize(round)], prevChooser: round.chooserSeat };
      s = openRound(s, round.index + 1, now);
    }
  }
  return s;
}

/**
 * Mark a seat present or absent (disconnect past the budget, or a deliberate leave). Dropping the current chooser while
 * it is still choosing voids the round; dropping anyone else only removes their ability to score. Rotation already skips
 * dropped seats. The server owns the absence budget and calls this with the authoritative verdict; the engine stays pure.
 */
export function setSeatStatus(state: MentalistaState, seat: number, status: SeatStatus, now: number): MentalistaState {
  const target = state.seats.find((x) => x.seat === seat);
  if (!target || target.status === status) return state;
  const seats = state.seats.map((x) => (x.seat === seat ? { ...x, status } : x));
  let s: MentalistaState = { ...state, version: state.version + 1, seats };
  const round = s.round;
  if (status === "dropped" && round && round.chooserSeat === seat && round.phase === "choosing") {
    s = toReveal(s, "chooser_dropped", now);
  }
  // Below the minimum to play a round (chooser + one predictor) no *new* round can be scored; end at this boundary.
  if (activeSeats(s).length < MIN_ACTIVE_SEATS && s.phase !== "over" && s.phase !== "lobby") {
    const open = s.round;
    if (open) {
      // A round already in `reveal` has been scored and banked into seat points; preserve its earned result exactly.
      // Only an unsettled (choosing/guessing) round is voided for the shortfall — never rewrite a round already awarded.
      const settled = open.phase === "reveal";
      const summary = summarize(settled ? open : { ...open, voided: open.voided ?? "too_few_players" });
      s = { ...s, history: [...s.history, summary], round: null };
    }
    s = { ...s, phase: "over", version: s.version + 1 };
  }
  return s;
}

// ── Standings ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface StandingRow {
  seat: number;
  points: number;
  /** Shared on ties: 1 + the number of active seats with strictly more points. */
  rank: number;
  status: SeatStatus;
}

/** Final (or running) table: by points desc, ties shared, dropped seats ranked below everyone still active. */
export function standings(state: MentalistaState): StandingRow[] {
  const active = state.seats.filter((x) => x.status === "active");
  const rows = [...state.seats]
    .sort((a, b) => Number(a.status === "dropped") - Number(b.status === "dropped") || b.points - a.points || a.seat - b.seat)
    .map((x) => ({
      seat: x.seat,
      points: x.points,
      status: x.status,
      rank:
        x.status === "dropped"
          ? active.length + 1 + state.seats.filter((o) => o.status === "dropped" && o.points > x.points).length
          : 1 + active.filter((o) => o.points > x.points).length,
    }));
  return rows;
}

// ── Projection (secrecy boundary) ────────────────────────────────────────────────────────────────────────────────

export interface SeatPublic {
  seat: number;
  status: SeatStatus;
  points: number;
  isChooser: boolean;
  /** The chooser has committed (choosing is over) — never *what* they committed. */
  hasCommitted: boolean;
  /** This seat has a prediction on file (a status dot), not its content. */
  hasPredicted: boolean;
  /** Revealed only at reveal, or to the seat itself. */
  prediction: string | null;
}

export interface PublicRound {
  index: number;
  categoryId: string;
  chooserSeat: number;
  phase: RoundState["phase"];
  deadline: number;
  voided: VoidReason | null;
  /** The chooser's pick: `null` until reveal, unless the viewer *is* the chooser. */
  pick: string | null;
  matched: number[];
}

export interface PublicView {
  version: number;
  phase: Phase;
  viewerSeat: number;
  round: PublicRound | null;
  seats: SeatPublic[];
  config: { rounds: number; matchPoints: number; chooseMs: number; guessMs: number; revealMs: number };
}

/**
 * Project the state for one seat's eyes, dropping every secret that seat is not entitled to: the chooser's pick before
 * reveal (unless the viewer is the chooser) and other seats' predictions before reveal. On the server this is what is
 * serialised to the socket; in the prototype it documents the contract (the simulator renders every seat from one store).
 */
export function projectView(state: MentalistaState, viewerSeat: number): PublicView {
  const round = state.round;
  const revealed = round?.phase === "reveal";
  const seats: SeatPublic[] = state.seats.map((st) => {
    const isChooser = round?.chooserSeat === st.seat;
    const pred = round?.predictions[st.seat];
    const canSeePred = revealed || st.seat === viewerSeat;
    return {
      seat: st.seat,
      status: st.status,
      points: st.points,
      isChooser: Boolean(isChooser),
      hasCommitted: Boolean(isChooser && round?.pick !== null),
      hasPredicted: Boolean(pred),
      prediction: pred && canSeePred ? pred.raw : null,
    };
  });
  const publicRound: PublicRound | null = round
    ? {
        index: round.index,
        categoryId: round.categoryId,
        chooserSeat: round.chooserSeat,
        phase: round.phase,
        deadline: round.deadline,
        voided: round.voided,
        pick: revealed || viewerSeat === round.chooserSeat ? round.pick : null,
        matched: round.matched,
      }
    : null;
  return {
    version: state.version,
    phase: state.phase,
    viewerSeat,
    round: publicRound,
    seats,
    config: {
      rounds: state.totalRounds,
      matchPoints: state.config.matchPoints,
      chooseMs: state.config.chooseMs,
      guessMs: state.config.guessMs,
      revealMs: state.config.revealMs,
    },
  };
}
