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
} from "../geometry";
import { DOT_COLORS, getCrowd, type Crowd } from "./seats";
import {
  PROP_ARMS,
  PROP_FLAG,
  PROP_LINK,
  PROP_SCARF,
  PROP_TORCH,
  PROP_TWIRL,
  SHAPE_CARD,
  SHAPE_DOT,
  createFanState,
  resetFanState,
  type DrawEnv,
  type FanState,
  type SceneInstance,
} from "./mechanics";
import { createRng } from "./rng";
import type { CrowdScene } from "./scenes";

const COLORS = {
  bowl: "#314D30",
  rim: "#38B60E",
  aisle: "#38B60E",
  track: "#0E0E0E",
} as const;

const TAU = Math.PI * 2;
const MAX_DPR = 2;
/** Card shade variants per palette colour, so a wall of cards reads hand-held rather than flat. */
const SHADES = [-0.09, 0, 0.09];

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + k))));
  const r = ch(n >> 16);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
const MAX_DT = 1 / 20;

export type FpsSample = { fps: number; frameMs: number };

/**
 * Owns the two stage canvases (base: shell + crowd, fx: particles and glows
 * above the pitch) and the single animation loop. Plain TS so React only
 * forwards inputs; nothing here reads React state.
 */
export class StadiumRenderer {
  private readonly crowd: Crowd = getCrowd();
  private readonly state: FanState = createFanState(this.crowd.count);
  private readonly bctx: CanvasRenderingContext2D;
  private readonly fctx: CanvasRenderingContext2D;
  private readonly shell = document.createElement("canvas");
  private readonly glow = document.createElement("canvas");
  private readonly colorKey = new Uint8Array(this.crowd.count);

  private w = 0;
  private h = 0;
  private dpr = 1;
  private scene: CrowdScene | null = null;
  private instance: SceneInstance | null = null;
  private palette: string[] = [];
  private colorTable: string[] = [...DOT_COLORS];
  private text = "";
  private replays = 0;
  private reducedMotion = false;

  /** Scene time advances by capped simulation steps, so a backgrounded tab resumes instead of skipping ahead. */
  private simT = 0;
  private lastNow = 0;
  private running = false;
  private raf = 0;
  private activeProps = 0;

  private fpsFrames = 0;
  private fpsMs = 0;
  private fpsWindowStart = 0;
  onFps: ((sample: FpsSample) => void) | null = null;

  constructor(
    private readonly base: HTMLCanvasElement,
    private readonly fx: HTMLCanvasElement,
  ) {
    const b = base.getContext("2d");
    const f = fx.getContext("2d");
    if (!b || !f) throw new Error("2D canvas context unavailable");
    this.bctx = b;
    this.fctx = f;
  }

  /** CSS size of the stage box; the backing store is scaled by a capped DPR. */
  resize(cssW: number, cssH: number, dpr: number) {
    const nextDpr = Math.min(MAX_DPR, dpr);
    const w = Math.round(cssW);
    const h = Math.round(cssH);
    if (w === this.w && h === this.h && nextDpr === this.dpr) return;
    this.w = w;
    this.h = h;
    this.dpr = nextDpr;
    for (const c of [this.base, this.fx, this.shell]) {
      c.width = Math.max(1, Math.round(w * nextDpr));
      c.height = Math.max(1, Math.round(h * nextDpr));
    }
    this.drawShell();
    this.buildGlow(
      Math.min(256, Math.max(32, Math.ceil(1.7 * (w / 100) * nextDpr))),
    );
    this.schedule();
  }

  setScene(scene: CrowdScene, text: string) {
    this.scene = scene;
    this.text = text;
    this.replays++;
    this.startScene();
  }

  /** Rebuilds the scene for new text without restarting its clock, so typing does not replay the reveal. */
  setText(text: string) {
    if (text === this.text || !this.scene) return;
    this.text = text;
    this.startScene(this.simT);
  }

  setReducedMotion(value: boolean) {
    if (value === this.reducedMotion) return;
    this.reducedMotion = value;
    if (this.scene) this.startScene();
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.running = false;
    this.onFps = null;
  }

  /* ------------------------------------------------------------ loop */

  private startScene(resumeAt = 0) {
    const scene = this.scene!;
    const text = (scene.usesText ? this.text : scene.text) || scene.text || "";
    const sprite =
      typeof scene.sprite === "function" ? scene.sprite(text) : scene.sprite;
    this.palette = scene.palette;
    this.colorTable = [
      ...DOT_COLORS,
      ...scene.palette.flatMap((hex) => SHADES.map((k) => shade(hex, k))),
    ];
    let seed = this.replays * 7919;
    for (let i = 0; i < scene.id.length; i++)
      seed = (seed * 31 + scene.id.charCodeAt(i)) >>> 0;
    this.instance = scene.mechanic.create({
      crowd: this.crowd,
      palette: scene.palette,
      text,
      sprite,
      rng: createRng(seed),
      variant: scene.variant,
    });
    this.lastNow = performance.now();
    this.fpsFrames = 0;
    this.fpsMs = 0;
    this.fpsWindowStart = this.lastNow;
    // Text-driven scenes are pure functions of t, so resuming at the old time is exact.
    this.simulate(resumeAt, 0);

    if (this.reducedMotion) {
      // Fast-forward to the representative frame in fixed steps.
      this.running = false;
      const step = 1 / 30;
      while (this.simT + step <= scene.mechanic.stillAt + 1e-6)
        this.simulate(this.simT + step, step);
      this.schedule();
      return;
    }
    this.running = true;
    this.schedule();
  }

  /** Schedules one frame; when the loop has stopped this is a one-off redraw (resize, text change). */
  private schedule() {
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number) => {
    this.raf = 0;
    if (this.w === 0 || !this.instance || !this.scene) return;
    const start = performance.now();

    if (this.running) {
      const dt = Math.min(MAX_DT, (now - this.lastNow) / 1000);
      this.lastNow = now;
      this.simulate(this.simT + dt, dt);
      const m = this.scene.mechanic;
      if (!m.loops && this.simT >= (m.duration ?? m.stillAt))
        this.running = false;
    }
    this.draw(this.simT);

    this.fpsFrames++;
    this.fpsMs += performance.now() - start;
    if (now - this.fpsWindowStart >= 500) {
      this.onFps?.({
        fps: (this.fpsFrames * 1000) / (now - this.fpsWindowStart),
        frameMs: this.fpsMs / this.fpsFrames,
      });
      this.fpsFrames = 0;
      this.fpsMs = 0;
      this.fpsWindowStart = now;
    }
    if (this.running) this.schedule();
  };

  private simulate(t: number, dt: number) {
    this.simT = t;
    const { state, crowd } = this;
    resetFanState(state);
    this.instance!.update(t, dt, state);
    // Aisle seats exist only for the mosaic wall; at rest they are walkways.
    for (let i = 0; i < crowd.count; i++) {
      if (crowd.aisle[i] && state.shape[i] !== SHAPE_CARD) {
        state.scale[i] = 0;
        state.prop[i] = 0;
      }
    }
  }

  /* ------------------------------------------------------------ draw */

  private env(ctx: CanvasRenderingContext2D, t: number): DrawEnv {
    return {
      ctx,
      w: this.w,
      h: this.h,
      t,
      ux: this.w / 100,
      uy: this.h / 100,
      palette: this.palette,
      crowd: this.crowd,
    };
  }

  private draw(t: number) {
    const { bctx, fctx, dpr, w, h } = this;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, w, h);
    bctx.drawImage(this.shell, 0, 0, w, h);
    this.drawFans(this.env(bctx, t));
    this.instance?.drawBase?.(this.env(bctx, t));

    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fctx.clearRect(0, 0, w, h);
    this.instance?.drawFx?.(this.env(fctx, t));
    this.drawTorchGlow(this.env(fctx, t));
  }

  private drawFans(env: DrawEnv) {
    const { ctx, ux, uy, t } = env;
    const { crowd, state, colorKey } = this;
    const table = this.colorTable;
    const paletteMax = this.palette.length - 1;
    let activeProps = 0;
    for (let i = 0; i < crowd.count; i++) {
      const c = state.color[i];
      colorKey[i] =
        c === 0
          ? crowd.color[i]
          : DOT_COLORS.length +
            Math.min(c - 1, paletteMax) * SHADES.length +
            (crowd.seed[i] % SHADES.length);
      activeProps |= 1 << state.prop[i];
    }
    this.activeProps = activeProps;
    const r = DOT_RADIUS * ux;
    // Cards overlap their cell and sit at slightly different angles, like sheets held up by hand.
    const cardW = DOT_PITCH.x * ux * 1.28;
    const cardH = DOT_PITCH.y * uy * 1.18;

    // One path per colour: a few fills instead of thousands.
    for (let k = 0; k < table.length; k++) {
      ctx.fillStyle = table[k];
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < crowd.count; i++) {
        if (colorKey[i] !== k || state.scale[i] <= 0) continue;
        const x = crowd.x[i] * ux + state.ox[i] * ux;
        const y = crowd.y[i] * uy + state.oy[i] * ux;
        if (state.shape[i] === SHAPE_DOT) {
          const rr = r * state.scale[i];
          ctx.moveTo(x + rr, y);
          ctx.arc(x, y, rr, 0, TAU);
        } else if (state.shape[i] === SHAPE_CARD) {
          const seed = crowd.seed[i];
          const a =
            ((seed % 21) - 10) * 0.011 +
            Math.sin(t * 1.6 + seed * 0.02) * 0.035;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          const hw = cardW / 2;
          const hh = (cardH * state.scale[i]) / 2;
          ctx.moveTo(x - hw * ca + hh * sa, y - hw * sa - hh * ca);
          ctx.lineTo(x + hw * ca + hh * sa, y + hw * sa - hh * ca);
          ctx.lineTo(x + hw * ca - hh * sa, y + hw * sa + hh * ca);
          ctx.lineTo(x - hw * ca - hh * sa, y - hw * sa + hh * ca);
          ctx.closePath();
        }
        any = true;
      }
      if (any) ctx.fill();
    }

    if (this.activeProps > 1) this.drawProps(env, t);
  }

  private has(prop: number) {
    return (this.activeProps & (1 << prop)) !== 0;
  }

  /** One batched path per prop type and colour; passes for absent props are skipped. */
  private drawProps(env: DrawEnv, t: number) {
    const { ctx, ux, uy } = env;
    const { crowd, state } = this;
    const palette = this.palette.length ? this.palette : ["#FFFFFF"];
    ctx.lineCap = "round";

    for (let k = 0; this.has(PROP_SCARF) && k < palette.length; k++) {
      ctx.fillStyle = palette[k];
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < crowd.count; i++) {
        if (
          state.prop[i] !== PROP_SCARF ||
          state.propColor[i] % palette.length !== k
        )
          continue;
        const x = crowd.x[i] * ux + (state.ox[i] + state.propB[i]) * ux;
        const y =
          crowd.y[i] * uy +
          state.oy[i] * ux -
          (0.45 + state.propA[i] * 0.85) * ux;
        ctx.rect(x - 0.6 * ux, y - 0.16 * ux, 1.2 * ux, 0.32 * ux);
        any = true;
      }
      if (any) ctx.fill();
    }

    ctx.lineWidth = 0.26 * ux;
    for (let k = 0; this.has(PROP_TWIRL) && k < palette.length; k++) {
      ctx.strokeStyle = palette[k];
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < crowd.count; i++) {
        if (
          state.prop[i] !== PROP_TWIRL ||
          state.propColor[i] % palette.length !== k
        )
          continue;
        const x = crowd.x[i] * ux;
        const y = crowd.y[i] * uy;
        const a = state.propA[i];
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * 0.95 * ux, y + Math.sin(a) * 0.95 * ux);
        any = true;
      }
      if (any) ctx.stroke();
    }

    if (this.has(PROP_FLAG)) {
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = Math.max(1, 0.09 * ux);
      ctx.beginPath();
      for (let i = 0; i < crowd.count; i++) {
        if (state.prop[i] !== PROP_FLAG) continue;
        const x = crowd.x[i] * ux;
        const y = crowd.y[i] * uy;
        ctx.moveTo(x, y);
        ctx.lineTo(x, y - 1.35 * ux);
      }
      ctx.stroke();
    }
    for (let k = 0; this.has(PROP_FLAG) && k < palette.length; k++) {
      ctx.fillStyle = palette[k];
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < crowd.count; i++) {
        if (
          state.prop[i] !== PROP_FLAG ||
          state.propColor[i] % palette.length !== k
        )
          continue;
        const x = crowd.x[i] * ux;
        const top = crowd.y[i] * uy - 1.35 * ux;
        const wv = Math.sin(t * 6 + state.propA[i]) * 0.28 * ux;
        ctx.moveTo(x, top);
        ctx.lineTo(x + 1.4 * ux, top + wv);
        ctx.lineTo(x + 1.4 * ux, top + 0.85 * ux + wv);
        ctx.lineTo(x, top + 0.85 * ux);
        ctx.closePath();
        any = true;
      }
      if (any) ctx.fill();
    }

    if (this.has(PROP_ARMS)) {
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = Math.max(1, 0.12 * ux);
      ctx.beginPath();
      for (let i = 0; i < crowd.count; i++) {
        if (state.prop[i] !== PROP_ARMS) continue;
        const x = crowd.x[i] * ux;
        const y = crowd.y[i] * uy + state.oy[i] * ux;
        const len = 0.75 * ux * state.propA[i];
        ctx.moveTo(x, y);
        ctx.lineTo(x - 0.3 * ux, y - len);
        ctx.moveTo(x, y);
        ctx.lineTo(x + 0.3 * ux, y - len);
      }
      ctx.stroke();
    }

    if (this.has(PROP_LINK)) {
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = Math.max(1, 0.1 * ux);
      ctx.beginPath();
      for (let i = 0; i < crowd.count; i++) {
        if (state.prop[i] !== PROP_LINK) continue;
        const j = crowd.right[i];
        if (j < 0 || state.prop[j] !== PROP_LINK) continue;
        ctx.moveTo(crowd.x[i] * ux, crowd.y[i] * uy + state.oy[i] * ux);
        ctx.lineTo(crowd.x[j] * ux, crowd.y[j] * uy + state.oy[j] * ux);
      }
      ctx.stroke();
    }
  }

  private drawTorchGlow({ ctx, ux, uy }: DrawEnv) {
    if (!this.has(PROP_TORCH)) return;
    const { crowd, state } = this;
    const size = 1.7 * ux;
    // Quantise alpha so we change globalAlpha a handful of times, not per fan.
    for (let bucket = 1; bucket <= 4; bucket++) {
      ctx.globalAlpha = (bucket / 4) * 0.55;
      for (let i = 0; i < crowd.count; i++) {
        if (state.prop[i] !== PROP_TORCH) continue;
        if (Math.min(4, Math.ceil(state.propA[i] * 4)) !== bucket) continue;
        ctx.drawImage(
          this.glow,
          crowd.x[i] * ux - size / 2,
          crowd.y[i] * uy - size / 2,
          size,
          size,
        );
      }
    }
    ctx.globalAlpha = 1;
  }

  /* --------------------------------------------------------- caches */

  private buildGlow(s: number) {
    if (this.glow.width === s) return;
    this.glow.width = s;
    this.glow.height = s;
    const g = this.glow.getContext("2d")!;
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, "rgba(255,247,214,0.95)");
    grad.addColorStop(0.3, "rgba(255,247,214,0.35)");
    grad.addColorStop(1, "rgba(255,247,214,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  }

  /** Bowl, rim, aisles and track. Static, so drawn once per resize. */
  private drawShell() {
    const ctx = this.shell.getContext("2d")!;
    const { w, h, dpr } = this;
    const ux = w / 100;
    const uy = h / 100;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const bowl = (inset: number) => {
      ctx.beginPath();
      roundedRect(
        ctx,
        (BOWL.left + inset) * ux,
        BOWL.top * uy + inset * ux,
        (BOWL.width - inset * 2) * ux,
        BOWL.height * uy - inset * 2 * ux,
        Math.max(0, (BOWL.radius - inset) * ux),
      );
    };
    bowl(0);
    ctx.fillStyle = COLORS.rim;
    ctx.fill();
    bowl(RIM_WIDTH);
    ctx.fillStyle = COLORS.bowl;
    ctx.fill();

    ctx.save();
    bowl(RIM_WIDTH);
    ctx.clip();
    ctx.strokeStyle = COLORS.aisle;
    ctx.lineWidth = AISLE_WIDTH * ux;
    ctx.lineCap = "butt";
    ctx.beginPath();
    for (const ax of END_AISLES_X) {
      ctx.moveTo(ax * ux, 0);
      ctx.lineTo(ax * ux, TRACK.top * uy);
      ctx.moveTo(ax * ux, (TRACK.top + TRACK.height) * uy);
      ctx.lineTo(ax * ux, h);
    }
    ctx.moveTo(0, SIDE_AISLE_Y * uy);
    ctx.lineTo(TRACK.left * ux, SIDE_AISLE_Y * uy);
    ctx.moveTo((TRACK.left + TRACK.width) * ux, SIDE_AISLE_Y * uy);
    ctx.lineTo(w, SIDE_AISLE_Y * uy);
    const corners = [
      [TRACK.left, TRACK.top],
      [TRACK.left + TRACK.width, TRACK.top],
      [TRACK.left, TRACK.top + TRACK.height],
      [TRACK.left + TRACK.width, TRACK.top + TRACK.height],
    ];
    for (const [cx, cy] of corners) {
      const diagonal = Math.atan2(
        cy / STAGE_ASPECT - 50 / STAGE_ASPECT,
        cx - 50,
      );
      for (const deg of CORNER_AISLE_ANGLES) {
        const a = diagonal + (deg * Math.PI) / 180;
        ctx.moveTo(cx * ux, cy * uy);
        ctx.lineTo(
          (cx + Math.cos(a) * 60) * ux,
          (cy + Math.sin(a) * 60 * STAGE_ASPECT) * uy,
        );
      }
    }
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    roundedRect(
      ctx,
      TRACK.left * ux,
      TRACK.top * uy,
      TRACK.width * ux,
      TRACK.height * uy,
      TRACK.radius * ux,
    );
    ctx.fillStyle = COLORS.track;
    ctx.fill();
  }
}

/** arcTo-based rounded rect; `roundRect` is missing on iOS < 16.4 and older WebViews. */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
