import { textToGrid } from "./pixel-font";

/**
 * A mosaic sprite tells each south-stand cell which palette entry to show.
 * 0 is the background card; higher indices are figure colours. `cols`/`rows`
 * size the figure, which is centred on the wall; `full` sprites cover the
 * whole wall and receive wall-sized dimensions instead.
 */
export type MosaicSprite = {
  cols: number;
  rows: number;
  full?: boolean;
  animated?: boolean;
  cell: (c: number, r: number, t: number, cols: number, rows: number) => number;
};

/** Hand-drawn rows; `scaleX` repeats each column so small art fills more of the wall. */
function fromRows(rows: string[], scaleX = 1): MosaicSprite {
  const map: Record<string, number> = { ".": 0, "#": 1, "+": 2, "*": 3 };
  return {
    cols: rows[0].length * scaleX,
    rows: rows.length,
    cell: (c, r) => map[rows[r]?.[Math.floor(c / scaleX)] ?? "."] ?? 0,
  };
}

/** Half-width of the trophy body per wall row, in row units (cells are ~1.18× wider than tall). */
const HENKELPOTT_BODY = [
  26, 27, 26, 24, 21.5, 18.5, 15, 11.5, 8, 3.5, 3.5, 15, 18,
];

/**
 * The reference's gold cap, round lenses, hands and grin need separate values.
 * Keep the portrait compact: stretching it across the stand flattens the face.
 * # gold, x charcoal outline, o lens gold, + skin, * teeth, / lens reflection.
 */
const BINOCULARS_FIGURE = [
  ".........xxxxxxxxxx.........",
  ".........##########.........",
  ".........###x##x###.........",
  ".......xxxxxxxxxxxxxx.......",
  "....+++xxxxxx..xxxxxx+++....",
  "...+++xx/oooxxxx/oooxx+++...",
  "..++++x/ooooxxxxoooox+++++..",
  "..++++xxoooxx++xxoooxx++++..",
  "...++++xxxxx++++xxxxx+++....",
  "....+++++x++xxxx++x+++++....",
  ".........x+******+x.........",
  "..........x+****+x..........",
  "...........x++++x...........",
];
const FIGURE_MAP: Record<string, number> = {
  "#": 1, x: 2, o: 4, "+": 5, "*": 3, "/": 6,
};

/** Trophy cards first, then the portrait rises through successive card changes. */
export const binocularsMan: MosaicSprite = {
  cols: 0,
  rows: 0,
  full: true,
  animated: true,
  cell(c, r, t, cols, rows) {
    const reveal = Math.max(0, Math.min(1, (t - 0.85) / 1.35));
    const lift = Math.ceil((1 - reveal) * BINOCULARS_FIGURE.length);
    const fc = c - Math.floor((cols - BINOCULARS_FIGURE[0].length) / 2);
    const fr = r - (rows - BINOCULARS_FIGURE.length) - lift;
    const ch = BINOCULARS_FIGURE[fr]?.[fc];
    if (ch && ch !== ".") return FIGURE_MAP[ch];

    const xu = (c - (cols - 1) / 2) * 1.18;
    const yu = (r / (rows - 1)) * (HENKELPOTT_BODY.length - 1);
    const body = HENKELPOTT_BODY[Math.round(yu)] ?? 0;
    // The cup's lower middle stays dark behind the figure.
    if (Math.abs(xu) <= 23 && yu >= 2.5) return 0;
    if (Math.abs(xu) <= body) return 1;
    const dx = Math.abs(xu) - 41;
    const dy = yu - 4.8;
    const outer = (dx / 16) ** 2 + (dy / 5.4) ** 2 <= 1;
    const inner = (dx / 10) ** 2 + (dy / 2.7) ** 2 <= 1;
    return outer && !inner ? 1 : 0;
  },
};

/** Shirt with "12" on the back. `#` shirt, `+` number. */
export const shirtTwelve = fromRows(
  [
    "..####...####..",
    ".#####.#.#####.",
    "###############",
    "#.###########.#",
    "...#########...",
    "...#.+.#+++#...",
    "...#++.#..+#...",
    "...#.+.#+++#...",
    "...#.+.#+..#...",
    "...#+++#+++#...",
    "...#########...",
    "...#########...",
    "...#########...",
  ],
  2,
);

export function textSprite(text: string): MosaicSprite {
  const grid = textToGrid(text);
  return {
    cols: grid.cols,
    rows: grid.rows,
    cell: (c, r) => (grid.on(c, r) ? 1 : 0),
  };
}

/** Georgian five-cross flag: a large cross with a small bolnur-katskhuri cross in each quarter. */
export const fiveCrossFlag: MosaicSprite = {
  cols: 42,
  rows: 13,
  cell(c, r, _t, cols, rows) {
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    if (Math.abs(c - cx) <= 1.5 || Math.abs(r - cy) <= 0.5) return 1;
    const qx = c < cx ? cx / 2 : cx + cx / 2;
    const qy = r < cy ? cy / 2 : cy + cy / 2;
    const dx = Math.abs(c - qx);
    const dy = Math.abs(r - qy);
    return (dx <= 0.6 && dy <= 1.5) || (dx <= 2.6 && dy <= 0.5) ? 1 : 0;
  },
};

/** Crescent and star on a red field. Cells are ~1.2× wider than tall; `ax` corrects for it. */
export const crescentStar: MosaicSprite = {
  cols: 24,
  rows: 13,
  cell(c, r, _t, cols, rows) {
    const ax = 1.2;
    const x = c * ax;
    const y = r;
    const cy = (rows - 1) / 2;
    const outer = Math.hypot(x - 8.5 * ax, y - cy) <= 6.2;
    const inner = Math.hypot(x - 10.3 * ax, y - cy) <= 5;
    if (outer && !inner) return 1;
    const sx = 16.5 * ax;
    const dx = Math.abs(x - sx);
    const dy = Math.abs(y - cy);
    if (
      dx + dy * 1.4 <= 2.4 ||
      (dx <= 3.4 && dy <= 0.6) ||
      (dx <= 0.8 && dy <= 2.2)
    )
      return 1;
    return 0;
  },
};

/** Two-row hoops across the whole wall. */
export const hoops: MosaicSprite = {
  cols: 0,
  rows: 0,
  full: true,
  cell: (_c, r) => (Math.floor(r / 2) % 2 === 0 ? 1 : 0),
};

/** Two sinister eyes: white with dark pupils, slit lids. */
function eye(c: number, r: number, ex: number, cy: number): number {
  const dx = (c - ex) / 9;
  const dy = (r - cy) / 4;
  if (dx * dx + dy * dy > 1) return 0;
  // Heavy upper lid so the eyes narrow.
  if (r < cy - 2.2 + Math.abs(dx) * 2.2) return 0;
  if (Math.hypot((c - ex) / 1.2, r - cy) <= 1.6) return 2;
  return 1;
}

export const eyes: MosaicSprite = {
  cols: 44,
  rows: 13,
  cell(c, r, _t, cols, rows) {
    const cy = (rows - 1) / 2 + 1;
    return Math.max(eye(c, r, cols * 0.28, cy), eye(c, r, cols * 0.72, cy));
  },
};

/** Animated flames rising from the bottom of the wall. 1 red, 2 orange, 3 yellow core. */
export const flames: MosaicSprite = {
  cols: 0,
  rows: 0,
  full: true,
  animated: true,
  cell(c, r, t, _cols, rows) {
    const h =
      0.42 +
      0.22 * Math.sin(c * 0.33 + t * 2.6) +
      0.14 * Math.sin(c * 0.91 - t * 4.1 + 1.3) +
      0.1 * Math.sin(c * 2.3 + t * 6.7);
    const v = (rows - 1 - r) / rows;
    if (v < h - 0.3) return 3;
    if (v < h - 0.12) return 2;
    if (v < h) return 1;
    return 0;
  },
};

/** Flames with a text line laid over the top rows. */
export function flamesWithText(text: string): MosaicSprite {
  const grid = textToGrid(text);
  return {
    cols: 0,
    rows: 0,
    full: true,
    animated: true,
    cell(c, r, t, cols, rows) {
      const tc = c - Math.floor((cols - grid.cols) / 2);
      const tr = r - 1;
      if (grid.on(tc, tr)) return 4;
      return flames.cell(c, r, t, cols, rows);
    },
  };
}
