/**
 * Zone match 3D view: the playstyle (card) effects drawn in the duel scene. One imperative engine, updated every frame
 * from the CardFx (zoneMatch3d.fx) and the director's outcome-script effects:
 *
 * - card moments (in step with the 2D pop-up): Yellow Card held up over the victim, the VAR screen (check → cancelled
 *   card crossed out), the Shin Pads shield, the substitution board, the Dummy Run decoy, and a ring + icon flourish
 *   for the rest (First Touch, 50/50, Second Ball…);
 * - standing effects: Muddy Pitch patches round the victim, Fog rolling over the pitch (the armband, gloves and gold
 *   boots glow on the players' cut-outs: ZoneMatch3DCutouts);
 * - outcome effects from the script: ghost players (Tiki-Taka one-two, Park the Bus wall, which a Golden Boot bursts —
 *   drawn as translucent avatar cut-outs from `ghostRequests`), speed trails (sprints, Counter-Attack), the golden
 *   ball trail, the Offside linesman's flag, and the speed lines.
 *
 * Everything is sprites and flat meshes: no extra assets.
 */

import * as THREE from 'three';
import { CARD_BY_ID, type CardId } from './zoneMatch.cards';
import { otherZoneSide, type ZoneSide } from './zoneMatch.rules';
import { CARD_TYPE_THEME } from './ZoneMatchCardFace';
import type { DuelDirector, GhostFx } from './zoneMatch3d.director';
import type { CardFx } from './zoneMatch3d.fx';
import { CardExtras } from './zoneMatch3d.cardExtras';
import { PITCH_HALF_W, SIDE_COLOR, attackDir } from './zoneMatch3d.layout';

const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
const POPPINS = "Poppins, 'Arial Black', Arial, sans-serif";

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => { const u = clamp01(t); return u * u * (3 - 2 * u); };
/** 0 → 1 with a little overshoot: a pop. */
const pop = (t: number) => { const u = clamp01(t); return 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2; };
const fadeOut = (age: number, life: number, tail = 0.3) => 1 - smooth((age - (life - tail)) / tail);

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function crossOut(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.strokeStyle = '#FF3B3B';
  ctx.lineWidth = r * 0.22;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - r);
  ctx.lineTo(cx + r, cy + r);
  ctx.moveTo(cx + r, cy - r);
  ctx.lineTo(cx - r, cy + r);
  ctx.stroke();
}

/** A card's icon as a round token in its type colour (optionally crossed out). */
function iconTexture(card: CardId, crossed = false): THREE.CanvasTexture {
  return canvasTexture(160, 160, (ctx) => {
    const def = CARD_BY_ID[card];
    ctx.fillStyle = CARD_TYPE_THEME[def.type].color;
    ctx.beginPath();
    ctx.arc(80, 80, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.font = `76px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, 80, 86);
    if (crossed) crossOut(ctx, 80, 80, 46);
  });
}

function makeSprite(texture: THREE.Texture | null, order = 20): THREE.Sprite {
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = order;
  sprite.visible = false;
  return sprite;
}

/** A fading ribbon behind a moving point (speed trails, the Golden Boot's ball trail). */
class Ribbon {
  readonly mesh: THREE.Mesh;
  private points: THREE.Vector3[] = [];
  private level = 0;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  constructor(
    color: string,
    private readonly count: number,
    private readonly below: number,
    private readonly above: number,
    private readonly strength: number,
    private readonly absolute: boolean,
  ) {
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 2 * 3);
    this.colors = new Float32Array(count * 2 * 4);
    const c = new THREE.Color(color);
    for (let i = 0; i < count * 2; i++) this.colors.set([c.r, c.g, c.b, 0], i * 4);
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));
    const index: number[] = [];
    for (let i = 0; i < count - 1; i++) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    geometry.setIndex(index);
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 3;
  }

  update(point: THREE.Vector3 | null, on: boolean, dt: number) {
    if (on && point && (this.points.length === 0 || this.points[0].distanceToSquared(point) > 0.004)) {
      this.points.unshift(point.clone());
      if (this.points.length > this.count) this.points.pop();
    }
    this.level = THREE.MathUtils.damp(this.level, on ? 1 : 0, on ? 10 : 5, dt);
    if (!on && this.level < 0.02) this.points = [];
    const n = this.points.length;
    this.mesh.visible = n > 1;
    if (n < 2) return;
    for (let i = 0; i < this.count; i++) {
      const p = this.points[Math.min(i, n - 1)];
      const lo = this.absolute ? this.below : p.y - this.below;
      const hi = this.absolute ? this.above : p.y + this.above;
      this.positions.set([p.x, lo, p.z, p.x, hi, p.z], i * 6);
      const alpha = i < n ? this.level * this.strength * (1 - i / (n - 1)) : 0;
      this.colors[i * 8 + 3] = alpha;
      this.colors[i * 8 + 7] = alpha;
    }
    const geometry = this.mesh.geometry;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

interface Shot {
  start: number;
  side: ZoneSide;
  card: CardId;
  against: CardId | null;
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

export class CardEffectsEngine {
  readonly root = new THREE.Group();
  private trails: Record<ZoneSide, Ribbon>;
  private ballTrails = { gold: new Ribbon('#FFC21A', 22, 0.11, 0.11, 0.85, false), white: new Ribbon('#DDEBFF', 26, 0.07, 0.07, 0.6, false) };
  private flag = new THREE.Group();
  private flagCloth: THREE.Mesh;
  private fogSprites: THREE.Sprite[] = [];
  private fogLevel = 0;
  private mud = new THREE.Group();
  private mudFor: string | null = null;
  private yellow: THREE.Sprite;
  private varScreen: THREE.Sprite;
  private shield: THREE.Sprite;
  private blocked = makeSprite(null, 21);
  private subBoard: THREE.Sprite;
  private textures: THREE.Texture[] = [];
  private iconCache = new Map<string, THREE.CanvasTexture>();
  private varCheck: THREE.CanvasTexture;
  private varResult: THREE.CanvasTexture | null = null;
  private lastMoment = -1;
  private shots: Partial<Record<'yellow' | 'var' | 'shield' | 'sub' | 'dummy', Shot>> = {};
  /** The per-card pieces, the activation beats and the reason arrow. */
  readonly extras: CardExtras;
  private dummyFrom = { x: 0, z: 0 };
  /** Translucent avatar copies to draw this frame (ZoneMatch3D draws them as cut-outs). */
  ghostRequests: GhostFx[] = [];

  constructor(private readonly director: DuelDirector) {
    this.extras = new CardExtras(director);
    this.root.add(this.extras.root);
    if (typeof window !== 'undefined' && window.matchMedia) this.extras.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.trails = {
      player: new Ribbon(SIDE_COLOR.player, 16, 0.7, 2.3, 0.32, true),
      opponent: new Ribbon(SIDE_COLOR.opponent, 16, 0.7, 2.3, 0.32, true),
    };
    this.root.add(this.trails.player.mesh, this.trails.opponent.mesh, this.ballTrails.gold.mesh, this.ballTrails.white.mesh);

    // Offside: the linesman's flag on the far touchline.
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 8), new THREE.MeshStandardMaterial({ color: '#202833' }));
    pole.position.y = 1.3;
    const flagTexture = canvasTexture(128, 96, (ctx) => {
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#FFE500' : '#FF3B3B';
        ctx.fillRect(x * 32, y * 24, 32, 24);
      }
    });
    this.textures.push(flagTexture);
    this.flagCloth = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.9),
      new THREE.MeshBasicMaterial({ map: flagTexture, side: THREE.DoubleSide, toneMapped: false }),
    );
    this.flagCloth.position.set(0.6, 2.15, 0);
    const pivot = new THREE.Group();
    pivot.add(pole, this.flagCloth);
    this.flag.add(pivot);
    this.flag.visible = false;
    this.root.add(this.flag);

    // Fog banks.
    const cloud = canvasTexture(128, 128, (ctx) => {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(225,232,240,0.9)');
      g.addColorStop(0.5, 'rgba(210,220,230,0.45)');
      g.addColorStop(1, 'rgba(200,210,220,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
    });
    this.textures.push(cloud);
    for (let i = 0; i < 9; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloud, transparent: true, depthWrite: false, opacity: 0, fog: false }));
      sprite.userData.seed = i;
      sprite.scale.set(13, 5.5, 1);
      sprite.renderOrder = 4;
      sprite.visible = false;
      this.fogSprites.push(sprite);
      this.root.add(sprite);
    }

    // Muddy Pitch patches.
    const mudTexture = canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = 'rgba(70,42,20,0.95)';
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const r = 26 + ((i * 37) % 17);
        ctx.beginPath();
        ctx.ellipse(64 + Math.cos(a) * 18, 64 + Math.sin(a) * 18, r, r * 0.7, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(40,24,12,0.6)';
      ctx.beginPath();
      ctx.arc(58, 60, 18, 0, Math.PI * 2);
      ctx.fill();
    });
    this.textures.push(mudTexture);
    for (let i = 0; i < 7; i++) {
      const patch = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshStandardMaterial({ map: mudTexture, transparent: true, depthWrite: false, roughness: 0.3, opacity: 0 }),
      );
      patch.rotation.x = -Math.PI / 2;
      patch.renderOrder = 2;
      this.mud.add(patch);
    }
    this.mud.visible = false;
    this.root.add(this.mud);

    // Card-moment pieces.
    const yellowTexture = canvasTexture(128, 176, (ctx) => {
      roundRect(ctx, 10, 10, 108, 156, 14);
      ctx.fillStyle = '#FFD60A';
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#FFF6C2';
      ctx.stroke();
    });
    this.varCheck = canvasTexture(512, 300, (ctx) => {
      roundRect(ctx, 8, 8, 496, 284, 26);
      ctx.fillStyle = '#0B1830';
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#1CB0F6';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 120px ${POPPINS}`;
      ctx.textAlign = 'center';
      ctx.fillText('VAR', 256, 150);
      ctx.font = `800 54px ${POPPINS}`;
      ctx.fillStyle = '#1CB0F6';
      ctx.fillText('CHECKING…', 256, 236);
    });
    const shieldTexture = canvasTexture(200, 220, (ctx) => {
      ctx.beginPath();
      ctx.moveTo(100, 12);
      ctx.lineTo(186, 44);
      ctx.quadraticCurveTo(184, 160, 100, 208);
      ctx.quadraticCurveTo(16, 160, 14, 44);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, 220);
      g.addColorStop(0, 'rgba(120,220,255,0.85)');
      g.addColorStop(1, 'rgba(22,69,255,0.75)');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.font = `86px ${EMOJI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛡️', 100, 106);
    });
    const subTexture = canvasTexture(256, 220, (ctx) => {
      roundRect(ctx, 6, 6, 244, 208, 18);
      ctx.fillStyle = '#0d0f14';
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#3a4150';
      ctx.stroke();
      ctx.font = `900 84px ${POPPINS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#FF3B3B';
      ctx.fillStyle = '#FF4B4B';
      ctx.fillText('9', 128, 64);
      ctx.shadowColor = '#58CC02';
      ctx.fillStyle = '#7CFC3A';
      ctx.fillText('14', 128, 158);
    });
    this.textures.push(yellowTexture, this.varCheck, shieldTexture, subTexture);
    this.yellow = makeSprite(yellowTexture);
    this.varScreen = makeSprite(this.varCheck);
    this.shield = makeSprite(shieldTexture);
    this.subBoard = makeSprite(subTexture);
    this.root.add(this.yellow, this.varScreen, this.shield, this.blocked, this.subBoard);
  }

  private iconFor(card: CardId, crossed = false): THREE.CanvasTexture {
    const key = `${card}-${crossed}`;
    let texture = this.iconCache.get(key);
    if (!texture) {
      texture = iconTexture(card, crossed);
      this.iconCache.set(key, texture);
    }
    return texture;
  }

  /** Is anything animating that wants the full frame rate? */
  busy = false;
  private busyUntil = 0;

  /** Something outside the engine (the cut-outs' gloves) is animating until `until`. */
  keepBusyUntil(until: number) {
    this.busyUntil = Math.max(this.busyUntil, until);
  }

  update(fx: CardFx, now: number, dt: number, scene: THREE.Scene, speedLines: HTMLDivElement | null) {
    this.busy = false;
    this.takeMoment(fx, now);
    const sfx = this.director.scriptFx;

    // Ghost players: the script's (Tiki-Taka, the bus) plus a Dummy Run decoy.
    const requests: GhostFx[] = [...sfx.ghosts];
    const dummy = this.shots.dummy;
    if (dummy) {
      const age = now - dummy.start;
      if (age < 1.6) {
        const d = attackDir(dummy.side);
        const k = smooth(age / 1.5);
        const dx = d * 0.55;
        const dz = 0.85;
        requests.push({ side: dummy.side, x: this.dummyFrom.x + dx * 7 * k, y: 0, z: this.dummyFrom.z + dz * 7 * k, yaw: Math.atan2(dx, dz), clip: 'dribble', time: age * 1.5, opacity: 0.55 * (1 - smooth((age - 0.9) / 0.7)), bluff: true });
      } else delete this.shots.dummy;
    }
    this.ghostRequests = requests;
    if (requests.length > 0) this.busy = true;

    // Speed trails and the golden ball.
    for (const side of ['player', 'opponent'] as const) {
      const on = sfx.trail.includes(side);
      this.trails[side].update(on ? this.director.pelvisOf(side, _v) : null, on, dt);
      if (on) this.busy = true;
    }
    for (const kind of ['gold', 'white'] as const) {
      const on = sfx.ballTrail === kind;
      this.ballTrails[kind].update(on ? this.director.ballPosition() : null, on, dt);
    }
    if (speedLines) {
      const rush = this.director.rushLevel();
      speedLines.style.opacity = rush > 0.02 ? (rush * 0.85).toFixed(2) : '0';
      if (rush > 0.02) speedLines.style.transform = `rotate(${((now * 40) % 6).toFixed(1)}deg) scale(1.2)`;
    }

    this.updateFlag(sfx.flag, now);
    this.updateFog(fx.fog, dt, now, scene);
    this.updateMud(fx);
    this.updateShots(now);
    this.extras.update(fx, now);
    if (this.extras.busy || now < this.busyUntil) this.busy = true;
  }

  /** A new card moment on screen: start its one-shot effect. */
  private takeMoment(fx: CardFx, now: number) {
    const m = fx.moment;
    if (!m || m.id === this.lastMoment) return;
    this.lastMoment = m.id;
    const shot: Shot = { start: now, side: m.side, card: m.card, against: m.against?.card ?? null };
    this.extras.onMoment(m, fx.duelNo, now);
    switch (m.card) {
      case 'yellow-card':
        this.shots.yellow = shot;
        break;
      case 'var-review':
        this.shots.var = shot;
        this.varResult?.dispose();
        this.varResult = shot.against
          ? canvasTexture(512, 300, (ctx) => {
              roundRect(ctx, 8, 8, 496, 284, 26);
              ctx.fillStyle = '#0B1830';
              ctx.fill();
              ctx.lineWidth = 10;
              ctx.strokeStyle = '#FF4B4B';
              ctx.stroke();
              ctx.font = `110px ${EMOJI_FONT}`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(CARD_BY_ID[shot.against!].icon, 256, 128);
              crossOut(ctx, 256, 128, 74);
              ctx.font = `800 50px ${POPPINS}`;
              ctx.fillStyle = '#ffffff';
              ctx.fillText(shot.against === 'dummy-run' ? 'ONLY A BLUFF' : 'CANCELLED', 256, 250);
            })
          : null;
        break;
      case 'shin-pads':
        this.shots.shield = shot;
        break;
      case 'substitution':
        this.shots.sub = shot;
        break;
      case 'dummy-run': {
        this.shots.dummy = shot;
        const place = this.director.placeOf(m.side);
        this.dummyFrom = place ? { x: place.x, z: place.z } : { x: 0, z: 0 };
        break;
      }
      default:
        // Every other card: the shared activation beat and its own piece (CardExtras).
        break;
    }
  }

  private updateFlag(flag: { x: number; up: number } | null, now: number) {
    this.flag.visible = Boolean(flag && flag.up > 0.01);
    if (!flag || !this.flag.visible) return;
    this.busy = true;
    this.flag.position.set(flag.x, 0, -PITCH_HALF_W + 4.5);
    // Up from the hip to straight overhead, then waved.
    const pivot = this.flag.children[0];
    pivot.rotation.z = (1 - flag.up) * 1.9 + Math.sin(now * 11) * 0.12 * flag.up;
    this.flagCloth.rotation.y = Math.sin(now * 14) * 0.35;
    this.flag.scale.setScalar(1.1 + 0.5 * flag.up);
  }

  private updateFog(on: boolean, dt: number, now: number, scene: THREE.Scene) {
    this.fogLevel = THREE.MathUtils.damp(this.fogLevel, on ? 1 : 0, 1.8, dt);
    const level = this.fogLevel;
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.near = THREE.MathUtils.lerp(45, 4, level);
      fog.far = THREE.MathUtils.lerp(90, 30, level);
      fog.color.setRGB(THREE.MathUtils.lerp(0.027, 0.42, level), THREE.MathUtils.lerp(0.067, 0.47, level), THREE.MathUtils.lerp(0.114, 0.53, level), THREE.SRGBColorSpace);
    }
    const focus = this.director.focus;
    for (const sprite of this.fogSprites) {
      sprite.visible = level > 0.01;
      if (!sprite.visible) continue;
      const seed = sprite.userData.seed as number;
      // Banks rolling slowly across the pitch, low over the grass.
      const drift = ((now * 1.3 + seed * 5.3) % 30) - 15;
      sprite.position.set(focus.x + drift, 1.1 + (seed % 3) * 0.7, focus.z - 5 + (seed % 4) * 3);
      (sprite.material as THREE.SpriteMaterial).opacity = level * 0.55;
    }
  }

  private updateMud(fx: CardFx) {
    const victim = fx.mud[0] ?? null;
    const key = victim ? `${fx.duelNo}-${victim}` : null;
    if (key !== this.mudFor) {
      this.mudFor = key;
      const place = victim ? this.director.placeOf(victim) : null;
      if (place) {
        this.mud.children.forEach((patch, i) => {
          const a = i * 2.39;
          const r = i === 0 ? 0.3 : 1.1 + (i % 3) * 0.7;
          patch.position.set(place.x + Math.cos(a) * r, 0.015 + i * 0.001, place.z + Math.sin(a) * r);
          patch.scale.setScalar(1.1 + (i % 4) * 0.45);
          patch.rotation.z = a;
        });
      }
    }
    this.mud.visible = key !== null;
    if (!this.mud.visible) return;
    for (const patch of this.mud.children) {
      const material = (patch as THREE.Mesh).material as THREE.MeshStandardMaterial;
      material.opacity = Math.min(0.92, material.opacity + 0.05);
    }
  }

  private updateShots(now: number) {
    const headOf = (side: ZoneSide) => this.director.headOf(side, _v);
    let any = false;

    const y = this.shots.yellow;
    const yAge = y ? now - y.start : Infinity;
    this.yellow.visible = yAge < 1.8;
    if (y && this.yellow.visible && headOf(otherZoneSide(y.side))) {
      any = true;
      const k = pop(yAge / 0.35);
      // Held up beside the victim's head, on the side of the card's owner.
      const toward = Math.sign((this.director.placeOf(y.side)?.x ?? 0) - _v.x) || 1;
      this.yellow.position.copy(_v).add(_v2.set(toward * 0.9, -0.2 + 0.45 * k, 0.4));
      this.yellow.scale.set(1.0 * k, 1.38 * k, 1);
      const material = this.yellow.material as THREE.SpriteMaterial;
      material.rotation = Math.sin(yAge * 9) * 0.14 * (1 - yAge / 1.8);
      material.opacity = fadeOut(yAge, 1.8);
    }

    const v = this.shots.var;
    const vAge = v ? now - v.start : Infinity;
    this.varScreen.visible = vAge < 1.9;
    if (v && this.varScreen.visible) {
      any = true;
      const a = this.director.headOf('player', _v);
      const b = this.director.headOf('opponent', _v2);
      if (a && b) this.varScreen.position.lerpVectors(a, b, 0.5).add(_v2.set(0, 0.55, 1.2));
      const k = pop(vAge / 0.3);
      this.varScreen.scale.set(3.0 * k, 1.75 * k, 1);
      const material = this.varScreen.material as THREE.SpriteMaterial;
      const map = vAge < 0.8 || !this.varResult ? this.varCheck : this.varResult;
      if (material.map !== map) {
        material.map = map;
        material.needsUpdate = true;
      }
      // A little broadcast flicker while it checks.
      material.opacity = fadeOut(vAge, 1.9) * (vAge < 0.8 ? 0.85 + 0.15 * Math.sin(vAge * 60) : 1);
    }

    const s = this.shots.shield;
    const sAge = s ? now - s.start : Infinity;
    this.shield.visible = sAge < 1.4;
    this.blocked.visible = this.shield.visible && Boolean(s?.against);
    if (s && this.shield.visible && headOf(s.side)) {
      any = true;
      const k = pop(sAge / 0.3);
      this.shield.position.copy(_v).add(_v2.set(0, -0.7, 0));
      this.shield.scale.set(1.5 * k, 1.65 * k, 1);
      (this.shield.material as THREE.SpriteMaterial).opacity = fadeOut(sAge, 1.4) * 0.95;
      if (s.against) {
        const material = this.blocked.material as THREE.SpriteMaterial;
        const map = this.iconFor(s.against, true);
        if (material.map !== map) {
          material.map = map;
          material.needsUpdate = true;
        }
        // The sabotage card flies in at the shield and bounces off it.
        const toward = Math.sign((this.director.placeOf(otherZoneSide(s.side))?.x ?? 0) - _v.x) || 1;
        const reduced = this.extras.reduced;
        const inK = reduced ? 1 : smooth(sAge / 0.35);
        const outK = reduced ? 0 : smooth((sAge - 0.35) / 0.8);
        this.blocked.position.copy(_v).add(_v2.set(toward * (2.6 * (1 - inK) + 2.2 * outK), -0.2 + 1.6 * outK, 0.4));
        this.blocked.scale.setScalar(0.85);
        material.rotation = outK * 5 * toward;
        material.opacity = fadeOut(sAge, 1.4);
      }
    }

    const sub = this.shots.sub;
    const subAge = sub ? now - sub.start : Infinity;
    this.subBoard.visible = subAge < 1.9;
    const place = sub ? this.director.placeOf(sub.side) : null;
    if (sub && this.subBoard.visible && place) {
      any = true;
      const rise = smooth(subAge / 0.35);
      this.subBoard.position.set(place.x + attackDir(sub.side) * -1.8, 0.4 + 2.4 * rise, place.z - 2.2);
      this.subBoard.scale.set(1.5, 1.3, 1);
      (this.subBoard.material as THREE.SpriteMaterial).opacity = fadeOut(subAge, 1.9);
    }

    if (any) this.busy = true;
  }

  dispose() {
    this.trails.player.dispose();
    this.trails.opponent.dispose();
    this.ballTrails.gold.dispose();
    this.ballTrails.white.dispose();
    // Own meshes (not the ghosts: their geometry is the loader's) and every sprite's material.
    const own = [this.flagCloth, this.flag.children[0].children[0], ...this.mud.children] as THREE.Mesh[];
    for (const mesh of own) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    for (const sprite of [...this.fogSprites, this.yellow, this.varScreen, this.shield, this.blocked, this.subBoard]) sprite.material.dispose();
    for (const texture of [...this.textures, ...this.iconCache.values()]) texture.dispose();
    this.varResult?.dispose();
    this.extras.dispose();
  }
}
