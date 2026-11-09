/**
 * The goal net as cloth: a grid of light particles joined by slightly slack strings (Verlet + distance constraints),
 * tied to the box frame — the ground bars, the posts, the back stanchions, the crossbar and the top bars — and sagging
 * under its own weight between them. The ball pushes it from inside: every particle near the ball is kept on the far side of it
 * along the panel's outward normal (one-sided, so a fast ball can't slip through between the knots), so a goal
 * bulges the net where the ball actually hits, and the bulge throws the ball back and ripples out across the panels.
 *
 * Goal-local frame (the Goal group's): x across the mouth (±W), y up, z from the goal line (0) back to −D.
 * Drawn as a surface with a string-grid texture, so the strings shade and thin out with distance like a real net.
 */

import * as THREE from 'three';

const W = 4.25;
const H = 3.2;
const D = 1.8;
/** Panel cells: across the back, up, and front-to-back (sides and roof). About 30 cm each. */
const NX = 28;
const NY = 11;
const NZ = 6;
/** Strings are this much longer than the frame they span, so the net hangs. */
const SLACK = 1.035;
const GRAVITY = -6;
const DAMP = 0.99;
const STEP = 1 / 120;
const ITERATIONS = 8;
/** How close a particle may come to the ball's centre (the ball plus half a cell, so the strings between stay clear). */
const BALL_REACH = 0.22;
/** One mesh square of the drawn net, in metres. */
const MESH_SIZE = 0.16;

export class GoalNet {
  readonly geometry = new THREE.BufferGeometry();
  private readonly count: number;
  private readonly pos: Float32Array;
  private readonly prev: Float32Array;
  private readonly rest: Float32Array;
  private readonly pinned: Uint8Array;
  /** Outward normal of each particle's panel (for the one-sided ball push). */
  private readonly normal: Float32Array;
  private readonly links: Uint16Array;
  private readonly lengths: Float32Array;
  private carry = 0;
  private calm = 0;

  constructor() {
    const pts: number[] = [];
    const normals: number[] = [];
    const pins: number[] = [];
    const add = (x: number, y: number, z: number, n: [number, number, number], pin: boolean) => {
      pts.push(x, y, z);
      normals.push(...n);
      pins.push(pin ? 1 : 0);
      return pts.length / 3 - 1;
    };
    // The U round the back: the left side front→back, the back left→right, the right side back→front; rows up.
    const cols = 2 * NZ + NX;
    const u: number[][] = [];
    for (let c = 0; c <= cols; c++) {
      const col: number[] = [];
      let x: number, z: number, n: [number, number, number];
      if (c <= NZ) [x, z, n] = [-W, (-D * c) / NZ, [-1, 0, 0]];
      else if (c <= NZ + NX) [x, z, n] = [-W + (2 * W * (c - NZ)) / NX, -D, [0, 0, -1]];
      else [x, z, n] = [W, -D + (D * (c - NZ - NX)) / NZ, [1, 0, 0]];
      // Tied along the ground and the top bars, to the posts at the front and to the stanchions at the back corners.
      const tiedCol = c === 0 || c === cols || c === NZ || c === NZ + NX;
      for (let r = 0; r <= NY; r++) col.push(add(x, 0.04 + ((H - 0.04) * r) / NY, z, n, r === 0 || r === NY || tiedCol));
      u.push(col);
    }
    // The roof shares its edges with the top of the U; its front edge is tied along the crossbar.
    const roof: number[][] = [];
    for (let i = 0; i <= NX; i++) {
      const row: number[] = [];
      for (let j = 0; j <= NZ; j++) {
        if (j === NZ) row.push(u[NZ + i][NY]);
        else if (i === 0) row.push(u[j][NY]);
        else if (i === NX) row.push(u[cols - j][NY]);
        else row.push(add(-W + (2 * W * i) / NX, H, (-D * j) / NZ, [0, 1, 0], j === 0));
      }
      roof.push(row);
    }

    this.count = pts.length / 3;
    this.rest = new Float32Array(pts);
    this.pos = new Float32Array(pts);
    this.prev = new Float32Array(pts);
    this.normal = new Float32Array(normals);
    this.pinned = new Uint8Array(pins);

    const links: number[] = [];
    const lengths: number[] = [];
    const link = (a: number, b: number) => {
      if (this.pinned[a] && this.pinned[b]) return;
      links.push(a, b);
      const dx = pts[a * 3] - pts[b * 3], dy = pts[a * 3 + 1] - pts[b * 3 + 1], dz = pts[a * 3 + 2] - pts[b * 3 + 2];
      lengths.push(Math.hypot(dx, dy, dz) * SLACK);
    };
    const grid = (g: number[][]) => {
      for (let a = 0; a < g.length; a++) {
        for (let b = 0; b < g[a].length; b++) {
          if (a + 1 < g.length) link(g[a][b], g[a + 1][b]);
          if (b + 1 < g[a].length) link(g[a][b], g[a][b + 1]);
        }
      }
    };
    grid(u);
    grid(roof);
    this.links = new Uint16Array(links);
    this.lengths = new Float32Array(lengths);

    // Surface: each panel's cells as two triangles, UVs in metres along the net so the mesh squares are true size.
    const uv = new Float32Array(this.count * 2);
    const index: number[] = [];
    const surface = (g: number[][], uvOf: (a: number, b: number) => [number, number]) => {
      for (let a = 0; a < g.length; a++) {
        for (let b = 0; b < g[a].length; b++) {
          const [s, t] = uvOf(a, b);
          uv[g[a][b] * 2] = s / MESH_SIZE;
          uv[g[a][b] * 2 + 1] = t / MESH_SIZE;
          if (a + 1 < g.length && b + 1 < g[a].length) index.push(g[a][b], g[a + 1][b], g[a + 1][b + 1], g[a][b], g[a + 1][b + 1], g[a][b + 1]);
        }
      }
    };
    // The roof's shared edge particles keep the U's UVs; the mesh squares line up closely enough at the seam.
    surface(roof, (i, j) => [(2 * W * i) / NX, (D * j) / NZ]);
    surface(u, (c, r) => [c <= NZ ? (D * c) / NZ : c <= NZ + NX ? D + (2 * W * (c - NZ)) / NX : D + 2 * W + (D * (c - NZ - NX)) / NZ, ((H - 0.04) * r) / NY]);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geometry.setIndex(index);

    // Let it hang before anyone sees it.
    for (let i = 0; i < 240; i++) this.step(null);
    this.geometry.computeVertexNormals();
  }

  /** Advance by dt; `ball` is the ball's centre in goal-local coordinates (or null). */
  update(dt: number, ball: THREE.Vector3 | null) {
    const near = ball !== null && ball.z < 0.6 && Math.abs(ball.x) < W + 0.6 && ball.y < H + 0.6;
    // Asleep once it has stopped moving and the ball is elsewhere.
    if (!near && this.calm > 1.5) return;
    this.carry = Math.min(this.carry + dt, 0.1);
    let moved = 0;
    while (this.carry >= STEP) {
      this.carry -= STEP;
      moved = Math.max(moved, this.step(near ? ball : null));
    }
    this.calm = moved < 2e-4 && !near ? this.calm + dt : 0;
    (this.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private step(ball: THREE.Vector3 | null): number {
    const { pos, prev, pinned, count } = this;
    let moved = 0;
    for (let i = 0; i < count; i++) {
      if (pinned[i]) continue;
      const k = i * 3;
      for (let a = 0; a < 3; a++) {
        const v = (pos[k + a] - prev[k + a]) * DAMP;
        prev[k + a] = pos[k + a];
        pos[k + a] += v + (a === 1 ? GRAVITY * STEP * STEP : 0);
        moved = Math.max(moved, Math.abs(v));
      }
    }
    for (let it = 0; it < ITERATIONS; it++) {
      for (let l = 0; l < this.lengths.length; l++) {
        const a = this.links[l * 2] * 3, b = this.links[l * 2 + 1] * 3;
        const dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2];
        const dist = Math.hypot(dx, dy, dz);
        // Strings pull, they don't push: a slack string just hangs.
        if (dist <= this.lengths[l] || dist === 0) continue;
        const pa = pinned[a / 3], pb = pinned[b / 3];
        const f = (dist - this.lengths[l]) / dist / (pa || pb ? 1 : 2);
        if (!pa) { pos[a] += dx * f; pos[a + 1] += dy * f; pos[a + 2] += dz * f; }
        if (!pb) { pos[b] -= dx * f; pos[b + 1] -= dy * f; pos[b + 2] -= dz * f; }
      }
      if (ball) this.pushBall(ball);
      // The net lies on the grass, it doesn't sink into it.
      for (let i = 0; i < count; i++) if (pos[i * 3 + 1] < 0.03) pos[i * 3 + 1] = 0.03;
    }
    return moved;
  }

  /** Keep every particle near the ball on the outside of it, measured along its panel's outward normal. */
  private pushBall(ball: THREE.Vector3) {
    const { pos, normal, pinned, count } = this;
    for (let i = 0; i < count; i++) {
      if (pinned[i]) continue;
      const k = i * 3;
      const dx = pos[k] - ball.x, dy = pos[k + 1] - ball.y, dz = pos[k + 2] - ball.z;
      const nx = normal[k], ny = normal[k + 1], nz = normal[k + 2];
      const along = dx * nx + dy * ny + dz * nz;
      const lx = dx - along * nx, ly = dy - along * ny, lz = dz - along * nz;
      const lateral2 = lx * lx + ly * ly + lz * lz;
      if (lateral2 >= BALL_REACH * BALL_REACH) continue;
      const need = Math.sqrt(BALL_REACH * BALL_REACH - lateral2);
      // Only a particle the ball has reached (or passed) is pushed; one well behind it is left alone.
      if (along >= need || along < -0.6) continue;
      const push = need - along;
      pos[k] += nx * push;
      pos[k + 1] += ny * push;
      pos[k + 2] += nz * push;
    }
  }

  dispose() {
    this.geometry.dispose();
  }
}

/** The net's string pattern: square mesh with soft-edged strings and a knot at each crossing (white; alpha = string). */
export function makeNetTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  const mid = size / 2;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, mid);
  ctx.lineTo(size, mid);
  ctx.moveTo(mid, 0);
  ctx.lineTo(mid, size);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(mid, mid, 4.5, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
