/**
 * Shared replay engine for the Guess the Goal tactics board. A goal is a list
 * of choreographed steps (pass / carry / run / shot) on a 68×105m pitch with
 * the attack always moving toward y=105. `buildTimeline` resolves each step's
 * start position and absolute time window; `sampleTimeline` returns the full
 * scene (player positions, ball, revealed trails) at any time t, so the 2D and
 * 3D renderers stay perfectly in sync from the same data.
 */

export type TacticsTeam = "attack" | "defense" | "keeper";
export type TacticsStepKind = "pass" | "carry" | "run" | "shot";

export interface TacticsPlayerDef {
  id: string;
  team: TacticsTeam;
  at: [number, number];
}

export interface TacticsStepDef {
  kind: TacticsStepKind;
  /** Who acts: the passer/shooter, the carrier, or the off-ball runner. */
  player: string;
  to: [number, number];
  /** Optional quadratic-bezier control point for a curved path. */
  via?: [number, number];
  /** 0..1 — how high a pass/shot travels (3D arc height, 2D curve hint). */
  loft?: number;
  /** Animate concurrently with the previous main step (off-ball runs). */
  withPrev?: boolean;
  duration: number;
}

export interface TacticsBonus {
  question: string;
  options: string[];
  answerIndex: number;
}

export interface TacticsGoalDef {
  id: string;
  /** Full answer line, e.g. "Carlos Alberto — Brazil 4–1 Italy, 1970 final". */
  title: string;
  options: string[];
  answerIndex: number;
  funFact: string;
  players: TacticsPlayerDef[];
  steps: TacticsStepDef[];
  bonus: TacticsBonus;
}

export interface TimelineStep extends TacticsStepDef {
  from: [number, number];
  start: number;
  end: number;
  /** Main steps gate the reveal/scoring; withPrev runs ride along. */
  main: boolean;
}

export interface Timeline {
  steps: TimelineStep[];
  duration: number;
  mainCount: number;
}

export interface TacticsTrail {
  kind: TacticsStepKind;
  points: [number, number][];
  progress: number;
}

export interface TacticsSample {
  players: Record<string, [number, number]>;
  ball: [number, number];
  /** 0..1 normalized loft height of the ball right now. */
  ballH: number;
  trails: TacticsTrail[];
  revealedMain: number;
  done: boolean;
}

const TRAIL_SAMPLES = 32;

function lerp(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}

function easeInOut(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
}

export function pathPoint(
  from: [number, number],
  to: [number, number],
  via: [number, number] | undefined,
  p: number,
): [number, number] {
  if (!via) return [lerp(from[0], to[0], p), lerp(from[1], to[1], p)];
  const q = 1 - p;
  return [
    q * q * from[0] + 2 * q * p * via[0] + p * p * to[0],
    q * q * from[1] + 2 * q * p * via[1] + p * p * to[1],
  ];
}

export function buildTimeline(goal: TacticsGoalDef): Timeline {
  const pos = new Map<string, [number, number]>();
  goal.players.forEach((pl) => pos.set(pl.id, pl.at));

  const first = goal.steps.find((s) => s.kind !== "run");
  let ball: [number, number] = first ? pos.get(first.player) ?? [34, 50] : [34, 50];

  const steps: TimelineStep[] = [];
  let cursor = 0;
  let lastMainStart = 0;
  let mainCount = 0;

  for (const def of goal.steps) {
    const main = !def.withPrev;
    const from: [number, number] =
      def.kind === "run" ? pos.get(def.player) ?? def.to : ball;
    const start = def.withPrev ? lastMainStart : cursor;
    const end = start + def.duration;
    if (main) {
      lastMainStart = start;
      mainCount += 1;
    }
    cursor = Math.max(cursor, end);

    steps.push({ ...def, from, start, end, main });

    if (def.kind === "run" || def.kind === "carry") pos.set(def.player, def.to);
    if (def.kind !== "run") ball = def.to;
    if (def.kind === "carry") pos.set(def.player, def.to);
  }

  return { steps, duration: cursor, mainCount };
}

export function sampleTimeline(goal: TacticsGoalDef, tl: Timeline, t: number): TacticsSample {
  const players: Record<string, [number, number]> = {};
  goal.players.forEach((pl) => {
    players[pl.id] = pl.at;
  });

  let ball: [number, number] | null = null;
  let ballH = 0;
  const trails: TacticsTrail[] = [];
  let revealedMain = 0;

  for (const step of tl.steps) {
    if (t < step.start) continue;
    const p = Math.min(1, (t - step.start) / (step.end - step.start));
    const eased = easeInOut(p);
    const at = pathPoint(step.from, step.to, step.via, eased);

    if (step.main) revealedMain += 1;

    if (step.kind === "run" || step.kind === "carry") players[step.player] = at;
    if (step.kind !== "run") {
      ball = at;
      ballH = step.loft ? step.loft * 4 * eased * (1 - eased) : 0;
    }

    const count = Math.max(2, Math.ceil(TRAIL_SAMPLES * eased));
    const points: [number, number][] = [];
    for (let i = 0; i < count; i += 1) {
      points.push(pathPoint(step.from, step.to, step.via, (eased * i) / (count - 1)));
    }
    trails.push({ kind: step.kind, points, progress: p });
  }

  if (!ball) {
    const first = tl.steps.find((s) => s.kind !== "run");
    ball = first ? first.from : [34, 50];
  }

  return { players, ball, ballH, trails, revealedMain, done: t >= tl.duration };
}
