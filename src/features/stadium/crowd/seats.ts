import {
  AISLE_WIDTH,
  BOWL,
  CORNER_AISLE_ANGLES,
  DOT_PITCH,
  DOT_RADIUS,
  END_AISLES_X,
  RIM_WIDTH,
  SIDE_AISLE_Y,
  STAGE_ASPECT,
  TRACK,
  roundedRectDistance,
} from "../geometry";

export const STANDS = [
  "north",
  "south",
  "west",
  "east",
  "nw",
  "ne",
  "sw",
  "se",
] as const;
export type StandId = (typeof STANDS)[number];

/** Figma dot colours, weighted so most of the crowd reads green with colour sprinkled in. */
export const DOT_COLORS = [
  "#3AB014",
  "#FFE500",
  "#FB3101",
  "#1645FF",
  "#FFFFFF",
] as const;
const DOT_WEIGHTS = [52, 15, 12, 10, 11];

/**
 * Struct-of-arrays crowd on a global lattice. Positions are percent of the
 * stage so the canvas can resize without rebuilding. The south stand's
 * lattice cells between the track edges form the mosaic grid (`south`).
 */
export type Crowd = {
  count: number;
  x: Float32Array;
  y: Float32Array;
  /** Global lattice indices. */
  col: Uint16Array;
  row: Uint16Array;
  stand: Uint8Array;
  color: Uint8Array;
  seed: Uint16Array;
  /** 1 when the seat sits on a south-stand aisle: hidden at rest, but part of the mosaic wall. */
  aisle: Uint8Array;
  /** Angle around the stage centre, 0..2π, for effects that travel round the bowl. */
  angle: Float32Array;
  /** Index of the fan one lattice column to the right in the same stand, or -1. */
  right: Int32Array;
  south: {
    col0: number;
    row0: number;
    cols: number;
    rows: number;
    index: Int32Array;
  };
};

const SOUTH_ID = STANDS.indexOf("south");

function standFor(x: number, y: number): StandId {
  const left = x < TRACK.left;
  const right = x > TRACK.left + TRACK.width;
  if (y < TRACK.top) return left ? "nw" : right ? "ne" : "north";
  if (y > TRACK.top + TRACK.height) return left ? "sw" : right ? "se" : "south";
  return left ? "west" : "east";
}

/** Distance (percent of width) from a point to the nearest aisle centre line. */
function aisleDistance(x: number, y: number, stand: StandId): number {
  // Work in width-percent units so distances are isotropic.
  const ya = y / STAGE_ASPECT;
  let best = Infinity;
  if (stand === "north" || stand === "south") {
    for (const ax of END_AISLES_X) best = Math.min(best, Math.abs(x - ax));
  } else if (stand === "west" || stand === "east") {
    best = Math.abs(ya - SIDE_AISLE_Y / STAGE_ASPECT);
  } else {
    const cx =
      stand === "nw" || stand === "sw" ? TRACK.left : TRACK.left + TRACK.width;
    const cy =
      (stand === "nw" || stand === "ne"
        ? TRACK.top
        : TRACK.top + TRACK.height) / STAGE_ASPECT;
    const diagonal = Math.atan2(cy - 50 / STAGE_ASPECT, cx - 50);
    for (const deg of CORNER_AISLE_ANGLES) {
      const a = diagonal + (deg * Math.PI) / 180;
      const dx = x - cx;
      const dy = ya - cy;
      const along = dx * Math.cos(a) + dy * Math.sin(a);
      if (along < 0) continue;
      best = Math.min(best, Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)));
    }
  }
  return best;
}

function pickColor(seed: number): number {
  let r = seed % 100;
  for (let i = 0; i < DOT_WEIGHTS.length; i++) {
    r -= DOT_WEIGHTS[i];
    if (r < 0) return i;
  }
  return 0;
}

/** Lattice columns the south mosaic wall spans, derived from the track edges. */
const SOUTH_COL0 = Math.ceil(TRACK.left / DOT_PITCH.x);
const SOUTH_COL1 = Math.floor((TRACK.left + TRACK.width) / DOT_PITCH.x) - 1;
export const SOUTH_COLS = SOUTH_COL1 - SOUTH_COL0 + 1;

let cached: Crowd | null = null;

/** The lattice is deterministic, so one crowd serves every renderer (StrictMode mounts two). */
export function getCrowd(): Crowd {
  cached ??= buildCrowd();
  return cached;
}

function buildCrowd(): Crowd {
  const cols = Math.floor(100 / DOT_PITCH.x);
  const rows = Math.floor(100 / DOT_PITCH.y);
  const max = cols * rows;
  const x = new Float32Array(max);
  const y = new Float32Array(max);
  const col = new Uint16Array(max);
  const row = new Uint16Array(max);
  const stand = new Uint8Array(max);
  const color = new Uint8Array(max);
  const seed = new Uint16Array(max);
  const aisle = new Uint8Array(max);
  const angle = new Float32Array(max);
  const lattice = new Int32Array(max).fill(-1);
  let n = 0;

  const seatInset = RIM_WIDTH + DOT_RADIUS + 0.35;
  const trackInset = DOT_RADIUS + 0.45;
  const aisleClear = AISLE_WIDTH / 2 + DOT_RADIUS + 0.1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fx = (c + 0.5) * DOT_PITCH.x;
      const fy = (r + 0.5) * DOT_PITCH.y;
      // Rounded-rect tests in width-percent units so corners stay circular on screen.
      const ya = fy / STAGE_ASPECT;
      const inBowl =
        roundedRectDistance(
          fx,
          ya,
          BOWL.left,
          BOWL.top / STAGE_ASPECT,
          BOWL.width,
          BOWL.height / STAGE_ASPECT,
          BOWL.radius,
        ) < -seatInset;
      if (!inBowl) continue;
      const onTrack =
        roundedRectDistance(
          fx,
          ya,
          TRACK.left,
          TRACK.top / STAGE_ASPECT,
          TRACK.width,
          TRACK.height / STAGE_ASPECT,
          TRACK.radius,
        ) < trackInset;
      if (onTrack) continue;
      const standId = standFor(fx, fy);
      const onAisle = aisleDistance(fx, fy, standId) < aisleClear;
      // Mosaic text needs every column, so the south stand keeps its aisle seats and hides them at rest.
      if (onAisle && standId !== "south") continue;

      const s = (c * 7919 + r * 104729 + c * r * 31) % 65536;
      x[n] = fx;
      y[n] = fy;
      col[n] = c;
      row[n] = r;
      stand[n] = STANDS.indexOf(standId);
      color[n] = pickColor(s);
      seed[n] = s;
      aisle[n] = onAisle ? 1 : 0;
      angle[n] = Math.atan2(fy - 50, fx - 50) + Math.PI;
      lattice[r * cols + c] = n;
      n++;
    }
  }

  const right = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const j = lattice[row[i] * cols + col[i] + 1];
    if (j >= 0 && stand[j] === stand[i]) right[i] = j;
  }

  // South mosaic grid: lattice cells between the track's side edges, below the track.
  const col0 = SOUTH_COL0;
  let row0 = rows;
  let row1 = -1;
  for (let i = 0; i < n; i++) {
    if (stand[i] !== SOUTH_ID) continue;
    row0 = Math.min(row0, row[i]);
    row1 = Math.max(row1, row[i]);
  }
  const southCols = SOUTH_COLS;
  const southRows = row1 - row0 + 1;
  const index = new Int32Array(southCols * southRows).fill(-1);
  for (let i = 0; i < n; i++) {
    if (stand[i] !== SOUTH_ID) continue;
    const c = col[i] - col0;
    const r = row[i] - row0;
    if (c >= 0 && c < southCols) index[r * southCols + c] = i;
  }

  return {
    count: n,
    x: x.subarray(0, n),
    y: y.subarray(0, n),
    col: col.subarray(0, n),
    row: row.subarray(0, n),
    stand: stand.subarray(0, n),
    color: color.subarray(0, n),
    seed: seed.subarray(0, n),
    aisle: aisle.subarray(0, n),
    angle: angle.subarray(0, n),
    right,
    south: { col0, row0, cols: southCols, rows: southRows, index },
  };
}
