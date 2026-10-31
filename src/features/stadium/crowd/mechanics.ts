import { BOWL, DOT_PITCH, RIM_WIDTH, STAGE_ASPECT, TRACK } from "../geometry";
import { STANDS, type Crowd } from "./seats";
import type { Rng } from "./rng";
import type { MosaicSprite } from "./sprites";

/*
 * A mechanic is one way of animating the crowd. Each frame it fills the
 * per-fan `FanState` arrays (offsets, dot/card shape, colour, prop) and the
 * renderer draws them in batches. Effects that are not per-fan (paper,
 * smoke, balloons, painted banners) draw themselves via drawFx/drawBase.
 */

export const SHAPE_DOT = 0;
export const SHAPE_CARD = 1;

export const PROP_NONE = 0;
export const PROP_SCARF = 1;
export const PROP_FLAG = 2;
export const PROP_TORCH = 3;
export const PROP_ARMS = 4;
export const PROP_LINK = 5;
export const PROP_TWIRL = 6;

export type FanState = {
  /** Offsets in stage-width percent (the renderer converts to px). */
  ox: Float32Array;
  oy: Float32Array;
  scale: Float32Array;
  /** 0 = the fan's own dot colour, n = palette[n-1]. */
  color: Uint8Array;
  shape: Uint8Array;
  prop: Uint8Array;
  propA: Float32Array;
  propB: Float32Array;
  propColor: Uint8Array;
};

export function createFanState(count: number): FanState {
  return {
    ox: new Float32Array(count),
    oy: new Float32Array(count),
    scale: new Float32Array(count),
    color: new Uint8Array(count),
    shape: new Uint8Array(count),
    prop: new Uint8Array(count),
    propA: new Float32Array(count),
    propB: new Float32Array(count),
    propColor: new Uint8Array(count),
  };
}

export function resetFanState(s: FanState) {
  s.ox.fill(0);
  s.oy.fill(0);
  s.scale.fill(1);
  s.color.fill(0);
  s.shape.fill(SHAPE_DOT);
  s.prop.fill(PROP_NONE);
  s.propA.fill(0);
  s.propB.fill(0);
  s.propColor.fill(0);
}

export type SceneEnv = {
  crowd: Crowd;
  palette: string[];
  text: string;
  sprite?: MosaicSprite;
  rng: Rng;
  variant?: string;
};

export type DrawEnv = {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  t: number;
  /** Pixels per percent of stage width / height. */
  ux: number;
  uy: number;
  palette: string[];
  crowd: Crowd;
};

export type SceneInstance = {
  update(t: number, dt: number, out: FanState): void;
  /** Drawn on the effects canvas, above the pitch and the dim layer. */
  drawFx?(env: DrawEnv): void;
  /** Drawn on the base canvas after the fans. */
  drawBase?(env: DrawEnv): void;
};

export type Mechanic = {
  id: string;
  label: string;
  blurb: string;
  /** Opacity of the dark overlay the scene wants over shell and pitch. */
  dim?: number;
  /** Seconds after which the scene is representative; reduced motion shows this frame. */
  stillAt: number;
  /** Keep animating after `stillAt`. */
  loops: boolean;
  /** Non-looping scenes stop simulating after this many seconds (defaults to `stillAt`). */
  duration?: number;
  create(env: SceneEnv): SceneInstance;
};

const TAU = Math.PI * 2;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (p: number) => 1 - (1 - p) * (1 - p);
const easeOutBack = (p: number) =>
  1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
const frac = (v: number) => v - Math.floor(v);

const NORTH = STANDS.indexOf("north");
const SOUTH = STANDS.indexOf("south");
const WEST = STANDS.indexOf("west");
const EAST = STANDS.indexOf("east");

/** Vertical extent of the south stand's seating, percent of stage height. */
function southBand(crowd: Crowd) {
  const y0 = crowd.south.row0 * DOT_PITCH.y;
  const y1 = (crowd.south.row0 + crowd.south.rows) * DOT_PITCH.y;
  return { y0, y1 };
}

function bob(
  out: FanState,
  crowd: Crowd,
  t: number,
  amp: number,
  speed: number,
) {
  for (let i = 0; i < crowd.count; i++) {
    out.oy[i] = -Math.abs(Math.sin(t * speed + crowd.seed[i] * 0.001)) * amp;
  }
}

/* ---------------------------------------------------------------- idle */

export const idle: Mechanic = {
  id: "idle",
  label: "Idle",
  blurb: "Crowd at rest.",
  stillAt: 0,
  loops: false,
  create: () => ({ update() {} }),
};

/* ---------------------------------------------------------------- wave */

export const wave: Mechanic = {
  id: "wave",
  label: "Mexican wave",
  blurb: "A lift that travels round the whole bowl.",
  stillAt: 1.2,
  loops: true,
  create({ crowd }) {
    const WIDTH = 0.08;
    return {
      update(t, _dt, out) {
        const head = frac(t / 3.4);
        for (let i = 0; i < crowd.count; i++) {
          const a = crowd.angle[i] / TAU;
          const d = frac(head - a);
          if (d < WIDTH) {
            const k = Math.sin((d / WIDTH) * Math.PI);
            out.oy[i] = -k * 1.5;
            out.scale[i] = 1 + 0.7 * k;
          }
        }
      },
    };
  },
};

/* -------------------------------------------------------------- mosaic */

export const mosaic: Mechanic = {
  id: "mosaic",
  label: "Card mosaic",
  blurb: "Cards ripple up across the south stand and form a picture.",
  stillAt: 2.4,
  loops: true,
  create({ crowd, sprite }) {
    const { south } = crowd;
    if (!sprite) return { update() {} };
    const cols = sprite.full ? south.cols : sprite.cols;
    const rows = sprite.full ? south.rows : sprite.rows;
    const offC = Math.floor((south.cols - cols) / 2);
    const offR = Math.floor((south.rows - rows) / 2);
    // Reveal delay per cell: a ripple from the bottom centre of the wall.
    const delay = new Float32Array(south.cols * south.rows);
    for (let r = 0; r < south.rows; r++) {
      for (let c = 0; c < south.cols; c++) {
        const dx = (c - (south.cols - 1) / 2) * 0.6;
        const dy = (south.rows - 1 - r) * 1.35;
        delay[r * south.cols + c] = 0.35 + Math.hypot(dx, dy) * 0.022;
      }
    }
    const cellAt = (c: number, r: number, t: number) => {
      const sc = c - offC;
      const sr = r - offR;
      const inside = sc >= 0 && sc < cols && sr >= 0 && sr < rows;
      return inside ? sprite.cell(sc, sr, t, cols, rows) : 0;
    };
    // Static art is rasterised once; only animated sprites are sampled per frame.
    let still: Uint8Array | null = null;
    if (!sprite.animated) {
      still = new Uint8Array(south.cols * south.rows);
      for (let r = 0; r < south.rows; r++)
        for (let c = 0; c < south.cols; c++)
          still[r * south.cols + c] = cellAt(c, r, 0);
    }
    return {
      update(t, _dt, out) {
        bob(out, crowd, t, 0.12, 2.4);
        for (let r = 0; r < south.rows; r++) {
          for (let c = 0; c < south.cols; c++) {
            const i = south.index[r * south.cols + c];
            if (i < 0) continue;
            const p = clamp01((t - delay[r * south.cols + c]) / 0.5);
            if (p <= 0) continue;
            const idx = still ? still[r * south.cols + c] : cellAt(c, r, t);
            out.shape[i] = SHAPE_CARD;
            out.scale[i] = easeOutBack(p);
            out.color[i] = idx + 1;
            out.oy[i] =
              p >= 1
                ? -Math.abs(Math.sin(t * 2.2 + c * 0.11 + r * 0.3)) * 0.15
                : 0;
          }
        }
      },
    };
  },
};

/* ---------------------------------------------------------- scarf wall */

export const scarfWall: Mechanic = {
  id: "scarfWall",
  label: "Scarf wall",
  blurb: "Scarves rise row by row, then sway together for the anthem.",
  stillAt: 2.2,
  loops: true,
  create({ crowd }) {
    return {
      update(t, _dt, out) {
        for (let i = 0; i < crowd.count; i++) {
          const delay =
            (crowd.seed[i] / 65536) * 0.5 + (crowd.row[i] % 13) * 0.06;
          const p = easeOut(clamp01((t - delay) / 0.6));
          if (p <= 0) continue;
          out.prop[i] = PROP_SCARF;
          out.propA[i] = p;
          out.propB[i] =
            p >= 1 ? Math.sin(t * 1.7 + crowd.col[i] * 0.22) * 0.45 : 0;
          out.propColor[i] = crowd.seed[i] % 2;
          out.oy[i] = -p * 0.25;
        }
      },
    };
  },
};

export const scarfTwirl: Mechanic = {
  id: "scarfTwirl",
  label: "Scarf twirl",
  blurb: "Half the crowd swings scarves overhead, the rest bounce.",
  stillAt: 1,
  loops: true,
  create({ crowd }) {
    return {
      update(t, _dt, out) {
        for (let i = 0; i < crowd.count; i++) {
          if (crowd.seed[i] % 2 === 0) {
            out.prop[i] = PROP_TWIRL;
            out.propA[i] = t * 7 + crowd.seed[i] * 0.01;
            out.propColor[i] = (crowd.seed[i] >> 1) % 2;
          } else {
            out.oy[i] =
              -Math.abs(Math.sin(t * 4.2 + crowd.seed[i] * 0.002)) * 0.45;
          }
        }
      },
    };
  },
};

/* ------------------------------------------------------------- torches */

export const torches: Mechanic = {
  id: "torches",
  label: "Phone torches",
  blurb: "Lights down, phone torches come on one by one.",
  dim: 0.78,
  stillAt: 3,
  loops: true,
  create({ crowd, variant }) {
    const byWave = variant === "wave";
    return {
      update(t, _dt, out) {
        for (let i = 0; i < crowd.count; i++) {
          const onAt = byWave
            ? 0.3 + (crowd.angle[i] / TAU) * 2.6
            : (crowd.seed[i] / 65536) * 2.2;
          if (t < onAt) {
            out.scale[i] = 0.7;
            continue;
          }
          const p = clamp01((t - onAt) / 0.25);
          out.prop[i] = PROP_TORCH;
          out.propA[i] =
            p * (0.72 + 0.28 * Math.sin(t * 11 + crowd.seed[i] * 0.03));
          out.color[i] = 1;
          out.scale[i] = 0.55 + 0.35 * p;
        }
      },
    };
  },
};

/* --------------------------------------------------------------- paper */

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: number;
  w: number;
  h: number;
  alive: boolean;
};

type Pool = { items: Particle[]; take(): Particle | null };

/** Fixed-size particle pool; `take` scans from a rotating cursor so allocation stays O(1) amortised. */
function makePool(n: number): Pool {
  const items: Particle[] = Array.from({ length: n }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    age: 0,
    life: 0,
    color: 0,
    w: 0,
    h: 0,
    alive: false,
  }));
  let cursor = 0;
  return {
    items,
    take() {
      for (let k = 0; k < n; k++) {
        const p = items[(cursor + k) % n];
        if (!p.alive) {
          cursor = (cursor + k + 1) % n;
          return p;
        }
      }
      return null;
    },
  };
}

export const paper: Mechanic = {
  id: "paper",
  label: "Paper shower",
  blurb: "Ticker tape thrown from every stand as the team walks out.",
  stillAt: 5,
  loops: false,
  duration: 6,
  create({ crowd, rng, palette }) {
    // Sized for the whole shower: landed paper stays on the turf, so pieces are never recycled.
    const pool = makePool(900);
    let spawnDebt = 0;
    const throwers: number[] = [];
    for (let i = 0; i < crowd.count; i++) {
      const s = crowd.stand[i];
      if (s === NORTH || s === SOUTH || s === WEST || s === EAST)
        throwers.push(i);
    }
    const spawn = () => {
      const p = pool.take();
      if (!p) return;
      const i = throwers[Math.floor(rng() * throwers.length)];
      const s = crowd.stand[i];
      p.x = crowd.x[i];
      p.y = crowd.y[i];
      const speed = 10 + rng() * 9;
      const spread = (rng() - 0.5) * 8;
      p.vx = s === WEST ? speed : s === EAST ? -speed : spread;
      p.vy = s === NORTH ? speed : s === SOUTH ? -speed : spread;
      p.age = 0;
      p.life = 1.1 + rng() * 1.3;
      p.color = Math.floor(rng() * palette.length);
      const long = rng() < 0.5;
      p.w = long ? 0.9 : 0.45;
      p.h = long ? 0.45 : 0.9;
      p.alive = true;
    };
    return {
      update(t, dt, out) {
        if (t < 3.2) {
          spawnDebt += dt * 260;
          while (spawnDebt >= 1) {
            spawn();
            spawnDebt -= 1;
          }
        }
        for (const p of pool.items) {
          if (!p.alive || p.age >= p.life) continue;
          p.age += dt;
          const drag = Math.exp(-dt * 1.6);
          p.vx *= drag;
          p.vy *= drag;
          p.x += (p.vx + Math.sin(p.age * 9 + p.life) * 1.2) * dt;
          p.y +=
            (p.vy + Math.cos(p.age * 7 + p.life) * 1.2) * dt * STAGE_ASPECT;
        }
        if (t < 4.5) bob(out, crowd, t, 0.4, 5);
      },
      drawFx({ ctx, ux, uy, palette }) {
        for (let k = 0; k < palette.length; k++) {
          ctx.fillStyle = palette[k];
          ctx.beginPath();
          for (const p of pool.items) {
            if (!p.alive || p.color !== k) continue;
            ctx.rect(p.x * ux, p.y * uy, p.w * ux, p.h * ux);
          }
          ctx.fill();
        }
      },
    };
  },
};

/* --------------------------------------------------------- thunderclap */

export const thunderclap: Mechanic = {
  id: "thunderclap",
  label: "Thunderclap",
  blurb: "Arms up on a beat that speeds up until the bowl is bouncing.",
  stillAt: 4,
  loops: true,
  create({ crowd }) {
    const beats: number[] = [];
    let interval = 1.5;
    for (let b = 0; b < 40; b += interval) {
      beats.push(b);
      interval = Math.max(0.26, interval * 0.86);
    }
    let cursor = 0;
    return {
      update(t, _dt, out) {
        while (cursor + 1 < beats.length && beats[cursor + 1] <= t) cursor++;
        const since = t - beats[cursor];
        const env =
          cursor >= beats.length - 1
            ? Math.abs(Math.sin(t * 9))
            : Math.max(0, 1 - since / 0.24);
        for (let i = 0; i < crowd.count; i++) {
          out.oy[i] = -env * 1.1;
          if (env > 0.25) {
            out.prop[i] = PROP_ARMS;
            out.propA[i] = env;
          }
        }
      },
    };
  },
};

/* -------------------------------------------------------------- poznan */

export const poznan: Mechanic = {
  id: "poznan",
  label: "Poznań bounce",
  blurb: "Backs to the pitch, arms linked, bouncing in unison.",
  stillAt: 0.3,
  loops: true,
  create({ crowd }) {
    return {
      update(t, _dt, out) {
        const lift = -Math.abs(Math.sin(Math.PI * t * 2.3)) * 0.9;
        for (let i = 0; i < crowd.count; i++) {
          out.oy[i] = lift;
          out.prop[i] = PROP_LINK;
        }
      },
    };
  },
};

/* ---------------------------------------------------------------- pyro */

export const pyro: Mechanic = {
  id: "pyro",
  label: "Pyro and smoke",
  blurb:
    "Flares in the corners and behind the goals, smoke rolling over the stands.",
  dim: 0.35,
  stillAt: 2.5,
  loops: true,
  create({ crowd, rng, palette }) {
    const sources = [
      { x: 8.5, y: 13 },
      { x: 91.5, y: 13 },
      { x: 8.5, y: 87 },
      { x: 91.5, y: 87 },
      { x: 50, y: 9 },
      { x: 50, y: 91 },
    ];
    const smoke = makePool(320);
    let debt = 0;
    let flare: HTMLCanvasElement | null = null;
    // One radial-gradient texture per scene instead of six gradients per frame.
    const flareTexture = () => {
      if (flare) return flare;
      const s = 128;
      flare = document.createElement("canvas");
      flare.width = s;
      flare.height = s;
      const g = flare.getContext("2d")!;
      const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grad.addColorStop(0, palette[0]);
      grad.addColorStop(0.35, palette[1] ?? palette[0]);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, s, s);
      return flare;
    };
    return {
      update(t, dt, out) {
        debt += dt * 55;
        while (debt >= 1) {
          debt -= 1;
          const p = smoke.take();
          if (!p) break;
          const s = sources[Math.floor(rng() * sources.length)];
          p.x = s.x + (rng() - 0.5) * 2;
          p.y = s.y + (rng() - 0.5) * 2;
          p.vx = (rng() - 0.5) * 2.5;
          p.vy = -(1.5 + rng() * 2.2);
          p.age = 0;
          p.life = 2.6 + rng() * 1.6;
          p.w = 1.5 + rng() * 1.5;
          p.alive = true;
        }
        for (const p of smoke.items) {
          if (!p.alive) continue;
          p.age += dt;
          if (p.age >= p.life) {
            p.alive = false;
            continue;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.w += dt * 1.4;
        }
        bob(out, crowd, t, 0.3, 3.5);
      },
      drawFx({ ctx, ux, uy, t }) {
        ctx.save();
        for (const p of smoke.items) {
          if (!p.alive) continue;
          const k = p.age / p.life;
          ctx.globalAlpha = 0.28 * (1 - k);
          ctx.fillStyle = "#9a9a9a";
          ctx.beginPath();
          ctx.arc(p.x * ux, p.y * uy, p.w * ux, 0, TAU);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "lighter";
        for (let s = 0; s < sources.length; s++) {
          const src = sources[s];
          const pulse =
            0.55 + 0.45 * Math.sin(t * 9 + s * 1.7) * Math.sin(t * 3.1 + s);
          const r = (4.2 + 1.3 * pulse) * ux;
          ctx.globalAlpha = 0.4 + 0.25 * pulse;
          ctx.drawImage(
            flareTexture(),
            src.x * ux - r,
            src.y * uy - r,
            r * 2,
            r * 2,
          );
          ctx.globalAlpha = 1;
          ctx.fillStyle = "#fff6d5";
          ctx.beginPath();
          ctx.arc(src.x * ux, src.y * uy, 0.45 * ux, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      },
    };
  },
};

/* --------------------------------------------------------------- flags */

export const flags: Mechanic = {
  id: "flags",
  label: "Flag sea",
  blurb:
    "Every third fan waves a flag on a pole; the stands turn into moving cloth.",
  stillAt: 1,
  loops: true,
  create({ crowd, palette }) {
    return {
      update(t, _dt, out) {
        for (let i = 0; i < crowd.count; i++) {
          if (crowd.seed[i] % 3 === 0) {
            out.prop[i] = PROP_FLAG;
            out.propA[i] = crowd.seed[i] * 0.02;
            out.propColor[i] = (crowd.seed[i] >> 2) % palette.length;
          } else {
            out.oy[i] =
              -Math.abs(Math.sin(t * 3 + crowd.seed[i] * 0.002)) * 0.2;
          }
        }
      },
    };
  },
};

/* -------------------------------------------------------------- banner */

function bannerRect(crowd: Crowd) {
  const { y0 } = southBand(crowd);
  return {
    x: TRACK.left,
    y: y0 - 0.3,
    w: TRACK.width,
    h: BOWL.top + BOWL.height - RIM_WIDTH * STAGE_ASPECT - y0 - 0.2,
  };
}

function drawBannerText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  const size = Math.min(h * 0.5, (w * 0.86) / Math.max(1, text.length * 0.66));
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px Poppins, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), x + w / 2, y + h / 2);
}

export const banner: Mechanic = {
  id: "banner",
  label: "Giant banner",
  blurb: "A painted sheet unrolls down the south stand and holds.",
  stillAt: 1.6,
  loops: false,
  create({ crowd, text }) {
    const rect = bannerRect(crowd);
    return {
      update(t, _dt, out) {
        const p = easeOut(clamp01(t / 1.3));
        const covered = rect.y + rect.h * p;
        for (let i = 0; i < crowd.count; i++) {
          if (crowd.stand[i] !== SOUTH) continue;
          if (crowd.y[i] < covered) out.scale[i] = 0;
          else out.oy[i] = -0.2;
        }
      },
      drawBase({ ctx, ux, uy, t, palette }) {
        const p = easeOut(clamp01(t / 1.3));
        const x = rect.x * ux;
        const y = rect.y * uy;
        const w = rect.w * ux;
        const h = rect.h * uy * p;
        ctx.fillStyle = palette[0];
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(x, y + h - 0.35 * ux, w, 0.35 * ux);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        drawBannerText(ctx, text, x, y, w, rect.h * uy, palette[1] ?? "#fff");
        ctx.restore();
      },
    };
  },
};

export const surfBanner: Mechanic = {
  id: "surfBanner",
  label: "Crowd-surfing banner",
  blurb: "A wide banner passed hand over hand across the south stand.",
  stillAt: 2,
  loops: true,
  create({ crowd, text }) {
    const band = bannerRect(crowd);
    const w = 24;
    const h = band.h * 0.62;
    const y = band.y + (band.h - h) / 2;
    const period = 7;
    const xAt = (t: number) => band.x - w + frac(t / period) * (band.w + w);
    return {
      update(t, _dt, out) {
        const x = xAt(t);
        for (let i = 0; i < crowd.count; i++) {
          if (crowd.stand[i] !== SOUTH) continue;
          const fx = crowd.x[i];
          if (fx > x - 1 && fx < x + w + 1)
            out.oy[i] = -0.5 - Math.abs(Math.sin(t * 6 + fx)) * 0.3;
        }
      },
      drawBase({ ctx, ux, uy, t, palette }) {
        const x = xAt(t);
        const slices = 16;
        ctx.save();
        ctx.beginPath();
        ctx.rect(band.x * ux, band.y * uy, band.w * ux, band.h * uy);
        ctx.clip();
        ctx.fillStyle = palette[0];
        const sw = (w / slices) * ux;
        for (let s = 0; s < slices; s++) {
          const dy = Math.sin(t * 5 + s * 0.55) * 0.3 * uy;
          ctx.fillRect(
            (x + (s * w) / slices) * ux,
            y * uy + dy,
            sw + 0.5,
            h * uy,
          );
        }
        drawBannerText(
          ctx,
          text,
          x * ux,
          y * uy,
          w * ux,
          h * uy,
          palette[1] ?? "#000",
        );
        ctx.restore();
      },
    };
  },
};

/* ------------------------------------------------------------ balloons */

export const balloons: Mechanic = {
  id: "balloons",
  label: "Balloon release",
  blurb: "Balloons in club colours drift up out of every stand.",
  stillAt: 4.5,
  loops: false,
  duration: 12,
  create({ crowd, rng, palette }) {
    const pool = makePool(420);
    let debt = 0;
    return {
      update(t, dt) {
        if (t < 1.8) {
          debt += dt * 230;
          while (debt >= 1) {
            debt -= 1;
            const p = pool.take();
            if (!p) break;
            const i = Math.floor(rng() * crowd.count);
            p.x = crowd.x[i];
            p.y = crowd.y[i];
            p.vx = (rng() - 0.5) * 1.5;
            p.vy = -(5 + rng() * 6);
            p.age = 0;
            p.life = 9;
            p.w = 0.45 + rng() * 0.3;
            p.color = Math.floor(rng() * palette.length);
            p.alive = true;
          }
        }
        for (const p of pool.items) {
          if (!p.alive) continue;
          p.age += dt;
          p.x += (p.vx + Math.sin(p.age * 2.2 + p.life) * 0.8) * dt;
          p.y += p.vy * dt;
          if (p.y < -4 || p.age > p.life) p.alive = false;
        }
      },
      drawFx({ ctx, ux, uy, palette }) {
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = Math.max(1, 0.08 * ux);
        ctx.beginPath();
        for (const p of pool.items) {
          if (!p.alive) continue;
          ctx.moveTo(p.x * ux, p.y * uy + p.w * ux);
          ctx.lineTo(p.x * ux, p.y * uy + p.w * ux * 2.4);
        }
        ctx.stroke();
        for (let k = 0; k < palette.length; k++) {
          ctx.fillStyle = palette[k];
          ctx.beginPath();
          for (const p of pool.items) {
            if (!p.alive || p.color !== k) continue;
            ctx.moveTo(p.x * ux + p.w * ux, p.y * uy);
            ctx.arc(p.x * ux, p.y * uy, p.w * ux, 0, TAU);
          }
          ctx.fill();
        }
      },
    };
  },
};

/* ------------------------------------------------------------ confetti */

export const confetti: Mechanic = {
  id: "confetti",
  label: "Confetti cannons",
  blurb: "Bursts from the four track corners, then a second volley.",
  stillAt: 3.5,
  loops: false,
  duration: 5,
  create({ rng, palette }) {
    const pool = makePool(700);
    const corners = [
      { x: TRACK.left + 1, y: TRACK.top + 1 },
      { x: TRACK.left + TRACK.width - 1, y: TRACK.top + 1 },
      { x: TRACK.left + 1, y: TRACK.top + TRACK.height - 1 },
      { x: TRACK.left + TRACK.width - 1, y: TRACK.top + TRACK.height - 1 },
    ];
    const fired = [false, false];
    const burst = () => {
      for (let n = 0; n < 300; n++) {
        const p = pool.take();
        if (!p) return;
        const c = corners[n % 4];
        const towardX = c.x < 50 ? 1 : -1;
        const towardY = c.y < 50 ? 1 : -1;
        const a = Math.atan2(towardY, towardX) + (rng() - 0.5) * 1.3;
        const v = 22 + rng() * 26;
        p.x = c.x;
        p.y = c.y;
        p.vx = Math.cos(a) * v;
        p.vy = Math.sin(a) * v;
        p.age = rng() * 0.3;
        p.life = 2.4 + rng() * 1.2;
        p.w = 0.5 + rng() * 0.5;
        p.h = 0.35;
        p.color = Math.floor(rng() * palette.length);
        p.alive = true;
      }
    };
    return {
      update(t, dt) {
        if (!fired[0] && t >= 0) {
          fired[0] = true;
          burst();
        }
        if (!fired[1] && t >= 1.1) {
          fired[1] = true;
          burst();
        }
        for (const p of pool.items) {
          if (!p.alive) continue;
          p.age += dt;
          if (p.age >= p.life) {
            p.alive = false;
            continue;
          }
          const drag = Math.exp(-dt * 2.4);
          p.vx *= drag;
          p.vy = p.vy * drag + 9 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt * STAGE_ASPECT;
        }
      },
      drawFx({ ctx, ux, palette, uy }) {
        for (let k = 0; k < palette.length; k++) {
          ctx.fillStyle = palette[k];
          ctx.beginPath();
          for (const p of pool.items) {
            if (!p.alive || p.color !== k) continue;
            const spin = Math.abs(Math.cos(p.age * 11 + p.life));
            ctx.rect(
              p.x * ux,
              p.y * uy,
              p.w * ux * (0.3 + 0.7 * spin),
              p.h * ux,
            );
          }
          ctx.fill();
        }
      },
    };
  },
};

/* --------------------------------------------------------- empty seats */

export const emptySeats: Mechanic = {
  id: "emptySeats",
  label: "Shirts on seats",
  blurb: "No fans, just shirts and scarves laid over the seats.",
  stillAt: 0,
  loops: false,
  create({ crowd }) {
    return {
      update(_t, _dt, out) {
        for (let i = 0; i < crowd.count; i++) {
          out.shape[i] = SHAPE_CARD;
          out.scale[i] = 0.8;
        }
      },
    };
  },
};
