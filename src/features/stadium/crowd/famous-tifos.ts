import { textToGrid } from "./pixel-font";
import type { MosaicSprite } from "./sprites";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const progress = (t: number, start: number, duration: number) => clamp((t - start) / duration);
const ellipse = (x: number, y: number, rx: number, ry: number) => (x / rx) ** 2 + (y / ry) ** 2 <= 1;

function stroke(x: number, y: number, ax: number, ay: number, bx: number, by: number, width: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const p = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(x - ax - dx * p, y - ay - dy * p) <= width;
}

function wall(cell: MosaicSprite["cell"]): MosaicSprite {
  return { cols: 0, rows: 0, full: true, animated: true, cell };
}

function lettering(text: string) {
  const grid = textToGrid(text);
  return (x: number, y: number) => grid.on(Math.floor(x + grid.cols / 2), Math.floor(y));
}

const devilArt = [
  "..#...................#..",
  "..##.................##..",
  "...###...#######...###...",
  "....#################....",
  ".....###############.....",
  ".....#yy###.###yy###.....",
  ".....###y##.##y#####.....",
  "......#####.######......",
  "......###.....####......",
  ".......#wwwww####.......",
  "........#www####........",
  ".........######.........",
  "...........##...........",
];

export const devilReveal = wall((c, r, t, cols) => {
  const x = c - Math.floor(cols / 2);
  const ch = devilArt[r]?.[x + 12];
  if (ch === "y") return 2;
  if (t < 1.15 + Math.abs(r - 5) * 0.13) return 0;
  if (ch === "w") return 3;
  if (ch === "#") return 1;
  const wave = (t - 2) * 24;
  return t > 2 && Math.abs(Math.abs(x) - wave) < 2 && r > 2 && r < 11 ? 1 : 0;
});

export const roaringLion = wall((c, r, t, cols) => {
  const x = (c - (cols - 1) / 2) * 0.85;
  const y = r - 6;
  const ax = Math.abs(x);
  const eye = ax > 2 && ax < 4.7 && y > -2 && y < -0.3;
  if (eye) return 3;
  if (t < 1.1 + Math.abs(y) * 0.12) return 0;
  if (ellipse(x, y, 11.8, 6.3)) {
    if (!ellipse(x, y + 0.3, 7, 4.9)) return (Math.floor(ax + r) % 3 === 0) ? 2 : 1;
    const mouthHeight = 0.5 + progress(t, 2.1, 0.8) * 1.6;
    if (ellipse(x, y - 2.1, 2.9, mouthHeight)) {
      if (Math.abs(y - (2.1 - mouthHeight)) < 0.8 && ax > 1.1) return 4;
      return 0;
    }
    if (Math.abs(y) < 0.8 && ax < 1.8) return 0;
    if (y > 0.4 && y < 2.1 && ax < 4.5) return 4;
    return 2;
  }
  const breath = progress(t, 2.8, 1.1) * 15;
  if (t > 2.8 && t < 4.7 && ax > 12 && ax < 12 + breath && Math.abs(y - 2 - Math.sin(ax * 0.4)) < 0.8) return 1;
  return 0;
});

export const boxerVictory = wall((c, r, t, cols) => {
  const x = (c - (cols - 1) / 2) * 0.85;
  const lift = progress(t, 1.2, 1.3);
  const y = r - Math.round((1 - progress(t, 0.6, 0.7)) * 13);
  const gx = 6 + lift * 2;
  const gy = 7 - lift * 6;
  if (ellipse(Math.abs(x) - gx, y - gy, 2, 1.5)) return 1;
  if (stroke(Math.abs(x), y, 2, 6, 5.5, 7 - lift * 2, 0.85) || stroke(Math.abs(x), y, 5.5, 7 - lift * 2, gx, gy + 1, 0.85)) return 2;
  if (ellipse(x, y - 3.4, 2.1, 2)) {
    if (y < 3) return 3;
    return y === 4 && Math.abs(x) < 1 ? 3 : 2;
  }
  if (Math.abs(x) < 2.6 && y >= 5 && y <= 9) return 2;
  if (Math.abs(x) < 3.2 && y > 9 && y < 12) return y === 10 ? 4 : 1;
  if (y === 12 && Math.abs(x) > 0.7 && Math.abs(x) < 2.8) return 3;
  if (t > 2.8 && Math.abs(x) > 14 && Math.abs(x) < 33 && (c + r * 7) % 17 === 0 && r === Math.floor((t * 3 + c) % 13)) return 4;
  return 0;
});

const hero = [
  ".......y..y.........",
  "......yyyyy.y.......",
  ".....yyyyyyyy.......",
  "......yyyyyy........",
  "......sssss.........",
  ".......s.s..........",
  "....sssoooosss......",
  "....s..oooob.s......",
  ".......oooob........",
  ".......bbbbb........",
  "......ooo.ooo.......",
  "......ooo.ooo.......",
  "......bbb.bbb.......",
];

export const powerHero = wall((c, r, t, cols) => {
  const x = c - Math.floor(cols / 2);
  const p = progress(t, 0.9, 1.7);
  const ch = hero[r]?.[x + 10];
  if (t > 1.15 && ch && ch !== ".") return ({ y: 1, s: 3, o: 2, b: 4 } as Record<string, number>)[ch];
  const edge = 7 + p * 13 + Math.sin(r * 1.7 + t * 5) * 1.5;
  if (Math.abs(x) < edge && Math.abs(x) > 5 && r > 1 - p) return Math.abs(x) > edge - 2 ? 1 : 5;
  if (t > 2.6 && t < 4.6 && Math.abs(Math.abs(x) - (t - 2.6) * 24) < 1.6) return 1;
  return 0;
});

const year = lettering("1967");
const lions = lettering("LIONS");
export const lisbonTribute = wall((c, r, t, cols) => {
  const x = c - Math.floor(cols / 2);
  const ax = Math.abs(x);
  if (t < 0.8 + c * 0.012) return 0;
  if (t > 2 && ((x < -13 && year(x + 29, r - 3)) || (x > 13 && lions(x - 29, r - 3)))) return 2;
  if (ax < 6 - r * 0.35 && r < 7 && r > 0) return ax > 3 ? 3 : 2;
  if (r >= 7 && r <= 10 && ax < 1.5) return 2;
  if (r === 11 && ax < 6) return 2;
  if (r > 1 && r < 7 && ellipse(ax - 6, r - 3.5, 3.2, 2.7) && !ellipse(ax - 6, r - 3.5, 1.5, 1.5)) return 2;
  // A solid green centre keeps gold lettering legible; hoops frame the edges.
  return r >= 2 && r <= 10 ? 1 : Math.floor(r / 2) % 2 ? 1 : 0;
});

const goal = lettering("GOAL");
export const cannonGoal = wall((c, r, t, cols) => {
  const x = c - Math.floor(cols / 2);
  if (t >= 3.8) {
    if (goal(x, r - 3)) return 2;
    return (r === 1 || r === 11) && Math.abs(x) < 33 ? 1 : 0;
  }
  if (ellipse(x + 30, r - 9, 2.5, 2.5)) return ellipse(x + 30, r - 9, 0.9, 0.9) ? 2 : 1;
  if (x >= -35 && x <= -21 && r >= 5 && r <= 7) return r === 5 ? 2 : 1;
  if (x >= 26 && x <= 39 && r >= 4 && r <= 11) return r === 4 || x === 26 || x === 39 ? 2 : ((r + c) % 3 === 0 ? 1 : 0);
  const flight = progress(t, 1.3, 1.7);
  const bx = -19 + flight * 49;
  const by = 6 - Math.sin(flight * Math.PI) * 3;
  if (t >= 1.3 && t < 3 && ellipse(x - bx, r - by, 1.8, 1.5)) return (c + r) % 3 === 0 ? 1 : 2;
  if (t >= 3) {
    const radius = (t - 3) * 22;
    if (Math.abs(Math.hypot(x - 30, (r - 6) * 1.3) - radius) < 2.5) return 3;
  }
  return 0;
});

const scarfText = lettering("QUIZBALL");
export const giantScarf = wall((c, r, t, cols) => {
  const x = c - Math.floor(cols / 2);
  const y = r - Math.round((1 - progress(t, 0.6, 1.4)) * 8);
  const ax = Math.abs(x);
  if (ax >= 30 && ax <= 33 && y >= 8) return 3;
  if (ax >= 29 && ax <= 34 && y >= 6 && y <= 8) return 3;
  if (ax <= 35 && y >= 1 && y <= 9) {
    if (scarfText(x, y - 2)) return 2;
    return y === 1 || y === 9 ? 2 : 1;
  }
  if (ax > 35 && ax <= 39 && y >= 2 && y <= 10) return (c + Math.floor(t * 2)) % 2 ? 2 : 1;
  return 0;
});

const keeper = [
  ".....hhh..........",
  ".....sss..........",
  ".....bwb.....s....",
  "......s......s....",
  "....gggg....ss....",
  "...gggggggggg.....",
  "...g.gggg.........",
  "...s.gggg.........",
  ".....ggggg........",
  ".....gggggg.......",
  ".....gg..gg.......",
  ".....gg..gg.......",
  ".....bb..bb.......",
];
export const matrixSave = wall((c, r, t, cols) => {
  const x = c - Math.floor(cols / 2);
  const ch = keeper[r]?.[x + 23];
  if (t > 0.8 && ch && ch !== ".") return ({ h: 1, s: 3, b: 1, w: 2, g: 4 } as Record<string, number>)[ch];
  const bx = 34 - progress(t, 1.2, 1.6) * 41;
  if (t > 1.2 && ellipse(x - bx, r - 3.5, 1.8, 1.6)) return (c + r) % 3 ? 2 : 1;
  if (t > 2.8 && t < 4 && Math.abs(x + 9) < 0.8 && r < 8) return 2;
  if (x > 0 && (c * 7) % 11 < 2 && r === Math.floor((t * 3 + c) % 13)) return 4;
  return 0;
});
