import {
  GOAL_HALF_W,
  PASS_TOLERANCE,
  SHOT_TOLERANCE_GX,
  goalLineCrossing,
  type FamousGoal,
  type GoalStep,
  type StepKind,
} from "../data/scoreGoals";

export interface Flight {
  kind: StepKind;
  from: [number, number];
  end: [number, number];
  success: boolean;
  lofted: boolean;
  curve: number;
  /** Ball height at the end of the flight (shots into the net). */
  gy: number;
  duration: number;
}

export type ViewPhase = "aim" | "fly" | "done";

export interface ScoreGoalsViewProps {
  goal: FamousGoal;
  stepIndex: number;
  positions: Record<string, [number, number]>;
  phase: ViewPhase;
  flight: Flight | null;
  showHint: boolean;
  /** aim = release point; drawnCurve = signed lateral bend of the drawn swipe
   *  (m); swipeMs = how long the swipe took (fast flick = harder ball). */
  onAim: (aim: [number, number], drawnCurve?: number, swipeMs?: number) => void;
  onFlightEnd: () => void;
}

/** Swipe speed → power: a fast flick shortens the flight, a slow drag floats it. */
function powerScale(dist: number, swipeMs: number | undefined): number {
  if (!swipeMs || swipeMs <= 0) return 1;
  const mps = dist / Math.max(0.12, swipeMs / 1000);
  return Math.min(1.35, Math.max(0.72, mps / 26));
}

const dist2 = (a: [number, number], b: [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

function flightDuration(kind: StepKind, d: number, lofted: boolean): number {
  if (kind === "dribble") return Math.min(2.2, 0.5 + d * 0.11);
  const s = 0.45 + d * (lofted ? 0.026 : 0.017);
  return Math.min(1.6, Math.max(0.55, s));
}

/** The ball follows the swipe you drew (Score! style): a drawn bend overrides
 *  the historic curve; straight swipes fall back to the goal's real curve. */
function resolveCurve(drawn: number | undefined, historic: number | undefined): number {
  if (drawn !== undefined && Math.abs(drawn) > 0.35) {
    return Math.max(-6, Math.min(6, drawn));
  }
  return historic ?? 0;
}

/** Judge a released aim point against the current step and build the flight. */
export function judgeAim(
  step: GoalStep,
  aim: [number, number],
  drawnCurve?: number,
  swipeMs?: number,
): Flight {
  const power = step.kind === "dribble" ? 1 : powerScale(dist2(step.from, aim), swipeMs);
  if (step.kind === "shot") {
    const target = step.shotTarget ?? [0, 1];
    const gx = goalLineCrossing(step.from, aim);
    const onTarget =
      gx !== null && Math.abs(gx - target[0]) <= SHOT_TOLERANCE_GX && Math.abs(gx) <= GOAL_HALF_W + 0.2;
    if (onTarget) {
      const end: [number, number] = [target[0], 0];
      return {
        kind: "shot",
        from: step.from,
        end,
        success: true,
        lofted: step.lofted ?? false,
        curve: resolveCurve(drawnCurve, step.curve),
        gy: target[1],
        duration: flightDuration("shot", dist2(step.from, end), step.lofted ?? false) / power,
      };
    }
    const missEnd: [number, number] = gx !== null ? [gx, 0] : [aim[0], Math.max(0, aim[1])];
    const saved = gx !== null && Math.abs(gx) <= GOAL_HALF_W + 1.2;
    return {
      kind: "shot",
      from: step.from,
      end: missEnd,
      success: false,
      lofted: step.lofted ?? false,
      curve: drawnCurve !== undefined ? Math.max(-6, Math.min(6, drawnCurve)) * 0.7 : 0,
      gy: saved ? 1.1 : 0.4,
      duration: flightDuration("shot", dist2(step.from, missEnd), step.lofted ?? false) / power,
    };
  }

  const tolerance = step.tolerance ?? PASS_TOLERANCE;
  const success = dist2(aim, step.to) <= tolerance;
  const end = success ? step.to : aim;
  const lofted =
    (step.lofted ?? false) || (step.kind === "pass" && dist2(step.from, end) > 20);
  return {
    kind: step.kind,
    from: step.from,
    end,
    success,
    lofted,
    curve:
      step.kind === "dribble"
        ? 0
        : success
          ? resolveCurve(drawnCurve, step.curve)
          : drawnCurve !== undefined
            ? Math.max(-6, Math.min(6, drawnCurve)) * 0.7
            : 0,
    gy: 0,
    duration: flightDuration(step.kind, dist2(step.from, end), lofted) / power,
  };
}

export interface BallSample {
  x: number;
  z: number;
  /** Centre height above the ground. */
  h: number;
}

const BALL_R = 0.11;

/** Ball position along a flight at t ∈ [0,1] (shared by the 2D and 3D views). */
export function flightPos(f: Flight, t: number): BallSample {
  const tt = Math.min(1, Math.max(0, t));
  const d = dist2(f.from, f.end);
  const x = f.from[0] + (f.end[0] - f.from[0]) * tt + f.curve * Math.sin(Math.PI * tt);
  const z = f.from[1] + (f.end[1] - f.from[1]) * tt;
  if (f.kind === "dribble") {
    return { x, z, h: BALL_R + Math.abs(Math.sin(tt * d * 2.2)) * 0.06 };
  }
  if (f.lofted) {
    const apex = Math.max(1.4, d * 0.22);
    if (f.kind === "pass") {
      // Main arc lands at 86% of the flight, then a small dying bounce.
      const main = 0.86;
      const h =
        tt < main
          ? Math.sin((Math.PI * tt) / main) * apex
          : Math.sin((Math.PI * (tt - main)) / (1 - main)) * apex * 0.09;
      return { x, z, h: BALL_R + Math.max(0, h) };
    }
    return { x, z, h: BALL_R + Math.sin(Math.PI * tt) * apex + f.gy * tt * tt };
  }
  const lowApex = f.kind === "shot" ? 0.25 : 0.5;
  return { x, z, h: BALL_R + Math.sin(Math.PI * tt) * lowApex + f.gy * tt * tt };
}

/** Ease for the receiver / dribbler run that meets the ball. */
export const easeInOut01 = (t: number) => {
  const v = Math.min(1, Math.max(0, t));
  return v * v * (3 - 2 * v);
};

/** World-x bend of a drawn swipe: how far the path midpoint sits off the
 *  straight chord. Matches flightPos's +x curve term, so the ball follows
 *  the line the player actually drew. */
export function drawnCurveOf(path: Array<[number, number]>): number {
  if (path.length < 3) return 0;
  const a = path[0];
  const b = path[path.length - 1];
  const mid = path[Math.floor(path.length / 2)];
  const abx = b[0] - a[0];
  const abz = b[1] - a[1];
  const len2 = abx * abx + abz * abz;
  if (len2 < 1) return 0;
  const t = Math.min(1, Math.max(0, ((mid[0] - a[0]) * abx + (mid[1] - a[1]) * abz) / len2));
  return mid[0] - (a[0] + abx * t);
}
