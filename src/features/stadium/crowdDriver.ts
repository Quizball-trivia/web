/**
 * Runs a crowd scene without drawing it (the 2D playground's StadiumRenderer, minus the canvas): each step fills the
 * per-fan state the 3D stadium draws. The colour table matches the 2D one: the fans' own dot colours, then three
 * shades of each palette colour.
 */

import { createRng } from './crowd/rng';
import { DOT_COLORS, getCrowd, type Crowd } from './crowd/seats';
import { SHAPE_CARD, createFanState, resetFanState, type FanState, type SceneInstance } from './crowd/mechanics';
import type { CrowdScene } from './crowd/scenes';

const SHADES = [-0.09, 0, 0.09];
const MAX_DT = 1 / 20;

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + k))));
  return `#${((ch(n >> 16) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).padStart(6, '0')}`;
}

export class CrowdDriver {
  readonly crowd: Crowd = getCrowd();
  readonly state: FanState = createFanState(this.crowd.count);
  scene: CrowdScene | null = null;
  palette: string[] = [];
  colorTable: string[] = [...DOT_COLORS];
  t = 0;
  private instance: SceneInstance | null = null;
  private replays = 0;
  private done = false;

  setScene(scene: CrowdScene, text = '') {
    this.scene = scene;
    this.replays += 1;
    const words = (scene.usesText ? text : scene.text) || scene.text || '';
    const sprite = typeof scene.sprite === 'function' ? scene.sprite(words) : scene.sprite;
    this.palette = scene.palette;
    this.colorTable = [...DOT_COLORS, ...scene.palette.flatMap((hex) => SHADES.map((k) => shade(hex, k)))];
    let seed = this.replays * 7919;
    for (let i = 0; i < scene.id.length; i += 1) seed = (seed * 31 + scene.id.charCodeAt(i)) >>> 0;
    this.instance = scene.mechanic.create({ crowd: this.crowd, palette: scene.palette, text: words, sprite, rng: createRng(seed), variant: scene.variant });
    this.done = false;
    this.step(0, 0);
  }

  /** Advance by `dt` seconds (a scene that doesn't loop holds its last frame). */
  advance(dt: number) {
    if (!this.instance || !this.scene || this.done) return;
    const m = this.scene.mechanic;
    this.step(this.t + Math.min(MAX_DT, dt), Math.min(MAX_DT, dt));
    if (!m.loops && this.t >= (m.duration ?? m.stillAt)) this.done = true;
  }

  private step(t: number, dt: number) {
    this.t = t;
    const { state, crowd } = this;
    resetFanState(state);
    this.instance!.update(t, dt, state);
    // Aisle seats exist only for the mosaic wall; at rest they are walkways.
    for (let i = 0; i < crowd.count; i += 1) {
      if (crowd.aisle[i] && state.shape[i] !== SHAPE_CARD) {
        state.scale[i] = 0;
        state.prop[i] = 0;
      }
    }
  }

  /** A fan's colour this frame (index into colorTable). */
  colorIndex(i: number): number {
    const c = this.state.color[i];
    if (c === 0) return this.crowd.color[i];
    const paletteMax = this.palette.length - 1;
    return DOT_COLORS.length + Math.min(c - 1, paletteMax) * SHADES.length + (this.crowd.seed[i] % SHADES.length);
  }
}
