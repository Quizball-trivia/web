/**
 * Zone match 3D view: the per-card pieces and the "why the ball moved" beat, on top of CardEffectsEngine.
 *
 * - The reason arrow: chevrons travel along the pitch from where the ball was won to where it ends up (a swap ring
 *   for a turn change on the spot, a stop sign for no ground); its label and the ✓ / ✗ marks are DOM (ZoneMatch3D).
 * - Every card's activation beat on its owner (or a sabotage's victim): a ground ring in the card's colour and its icon
 *   popping over the head (the cut-out does a fist-pump hop from `activation`).
 * - Card pieces: Park the Bus's bus, Long Ball's dotted flight path, the Offside Trap line, Tiki-Taka's passing
 *   triangle and duel counter, VAR's scan line, Second Ball's spare ball, 50/50's scissors and vanishing balls,
 *   First Touch sparkles, Home Advantage's flags, Goalkeeper Gloves' marker by the goal, Substitution's whoosh.
 *
 * All sprites and simple meshes; every texture, geometry and material made here is disposed in `dispose`.
 */

import * as THREE from 'three';
import { CARD_BY_ID, type CardId } from './zoneMatch.cards';
import type { CardEvent } from './zoneMatch.machine';
import type { OutcomeReason } from './zoneMatch.reason';
import { otherZoneSide, type ZoneSide } from './zoneMatch.rules';
import { CARD_TYPE_THEME } from './ZoneMatchCardFace';
import type { DuelDirector } from './zoneMatch3d.director';
import type { CardFx } from './zoneMatch3d.fx';
import { BALL_R, GOAL_X, PITCH_HALF_W, SIDE_COLOR, columnX } from './zoneMatch3d.layout';

const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
const SIDES: ZoneSide[] = ['player', 'opponent'];
const SABOTAGE_LANDS_ON_VICTIM = new Set<CardId>(['yellow-card', 'offside-trap', 'floodlight-failure', 'fog', 'muddy-pitch']);
/** The reason arrow runs along the front of the pitch, nearest the camera. */
const ARROW_Z = 2.4;
const CHEVRONS = 8;
const ARC_DOTS = 22;
const SPARKLES = 10;
/** One-shot pieces wait for the 2D card pop-up (CardMoments, ~1.6 s), which covers the view on phones. */
const AFTER_POPUP = 1.8;
/** The activation beat outlasts the pop-up, so its ring and icon are seen. */
const BEAT_S = 2.8;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => {
  const u = clamp01(t);
  return u * u * (3 - 2 * u);
};
const pop = (t: number) => {
  const u = clamp01(t);
  return 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2;
};
const fadeOut = (age: number, life: number, tail = 0.3) => 1 - smooth((age - (life - tail)) / tail);

const _v = new THREE.Vector3();
const _up = new THREE.Vector3();

/** Owns everything it creates, so `dispose` frees it all. */
class Bag {
  readonly textures: THREE.Texture[] = [];
  readonly geometries: THREE.BufferGeometry[] = [];
  readonly materials: THREE.Material[] = [];
  texture<T extends THREE.Texture>(t: T): T {
    this.textures.push(t);
    return t;
  }
  geometry<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }
  material<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }
  dispose() {
    for (const t of this.textures) t.dispose();
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function emojiTexture(emoji: string, size = 128): THREE.CanvasTexture {
  return canvasTexture(size, size, (ctx) => {
    ctx.font = `${Math.round(size * 0.78)}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + size * 0.05);
  });
}

/** A round token with a card's icon, in its type colour. */
function iconTexture(card: CardId): THREE.CanvasTexture {
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
  });
}

interface Beat {
  ring: THREE.Mesh;
  icon: THREE.Sprite;
  start: number;
  card: CardId | null;
  side: ZoneSide;
}

export class CardExtras {
  readonly root = new THREE.Group();
  /** When each side's latest card activated (performance clock, s): the cut-out hops / fist-pumps. */
  readonly activation: Record<ZoneSide, number> = { player: -10, opponent: -10 };
  /** prefers-reduced-motion: travelling and bursting pieces are skipped; marks, labels and static pieces stay. */
  reduced = false;
  busy = false;

  private bag = new Bag();
  private iconCache = new Map<CardId, THREE.CanvasTexture>();
  private seen = new Set<string>();
  private beats: Record<ZoneSide, Beat>;

  private reasonKey = '';
  private reasonStart = 0;
  private chevrons: THREE.Group[] = [];
  private swapRing: THREE.Mesh;
  private swapIcon: THREE.Sprite;
  private stopIcon: THREE.Sprite;

  private bus = new THREE.Group();
  private busParts: THREE.MeshStandardMaterial[] = [];
  private busStripe: THREE.MeshStandardMaterial;
  private busWheels: THREE.Mesh[] = [];
  private busGlass!: THREE.MeshStandardMaterial;
  private busIn = 0;
  /** The side standing behind its bus right now, or null; where (world, on the ground), and how far it has stepped
   * there (0–1, with the bus driving in). */
  busRider: ZoneSide | null = null;
  readonly busSeat = new THREE.Vector3();
  busStandK = 1;

  private arcDots: THREE.Sprite[] = [];
  private offsideDashes = new THREE.Group();
  private tiki = new THREE.Group();
  private tikiDots: THREE.Sprite[] = [];
  private varBar: THREE.Sprite;
  private varShot: { start: number; target: ZoneSide } | null = null;
  private spare: THREE.Sprite;
  private spareUsed: { start: number; side: ZoneSide; from: THREE.Vector3 } | null = null;
  private lastSpare = new THREE.Vector3();
  private scissors: THREE.Sprite;
  private ghostBalls: THREE.Sprite[] = [];
  private fifty: { start: number; side: ZoneSide } | null = null;
  private sparkles: THREE.Sprite[] = [];
  private sparkle: { start: number; side: ZoneSide } | null = null;
  private flags = new THREE.Group();
  private flagTextures: Record<ZoneSide, THREE.CanvasTexture>;
  private gloveMarkers: Record<ZoneSide, THREE.Sprite>;
  private whoosh: THREE.Sprite;
  private whooshStart = -10;

  constructor(private readonly director: DuelDirector) {
    const b = this.bag;

    // Activation beats: a ring on the ground and the card's icon over the head, one per side.
    const ringGeometry = b.geometry(new THREE.RingGeometry(0.8, 1.05, 48));
    const beat = (side: ZoneSide): Beat => {
      const ring = new THREE.Mesh(ringGeometry, b.material(new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide })));
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 3;
      ring.visible = false;
      const icon = this.sprite(null, 22);
      this.root.add(ring, icon);
      return { ring, icon, start: -10, card: null, side };
    };
    this.beats = { player: beat('player'), opponent: beat('opponent') };

    // The reason arrow's chevrons (a group each, so they can face either way).
    const chevronShape = new THREE.Shape();
    chevronShape.moveTo(-0.45, 0.6);
    chevronShape.lineTo(0.15, 0);
    chevronShape.lineTo(-0.45, -0.6);
    chevronShape.lineTo(-0.05, -0.6);
    chevronShape.lineTo(0.55, 0);
    chevronShape.lineTo(-0.05, 0.6);
    chevronShape.closePath();
    const chevronGeometry = b.geometry(new THREE.ShapeGeometry(chevronShape));
    for (let i = 0; i < CHEVRONS; i++) {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(chevronGeometry, b.material(new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false })));
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 4;
      group.add(mesh);
      group.visible = false;
      group.scale.setScalar(1.6);
      this.chevrons.push(group);
      this.root.add(group);
    }
    this.swapRing = new THREE.Mesh(ringGeometry, b.material(new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })));
    this.swapRing.rotation.x = -Math.PI / 2;
    this.swapRing.renderOrder = 4;
    this.swapRing.visible = false;
    this.swapIcon = this.sprite(b.texture(emojiTexture('🔄')), 22);
    this.stopIcon = this.sprite(b.texture(emojiTexture('⛔')), 22);
    this.root.add(this.swapRing);

    // Park the Bus: the blue team coach from the card (nose along +x): lower body, a glass band with pillars, roof,
    // windscreen, a white stripe, the badge, headlights.
    const blue = b.material(new THREE.MeshStandardMaterial({ color: '#1645FF', roughness: 0.45, transparent: true }));
    const roof = b.material(new THREE.MeshStandardMaterial({ color: '#3B74FF', roughness: 0.5, transparent: true }));
    const glass = b.material(new THREE.MeshStandardMaterial({ color: '#5FD3FF', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.38, depthWrite: false }));
    const white = b.material(new THREE.MeshStandardMaterial({ color: '#F4F6F8', roughness: 0.6, transparent: true }));
    const yellow = b.material(new THREE.MeshStandardMaterial({ color: '#FFE500', roughness: 0.4, emissive: '#FFE500', emissiveIntensity: 0.25, transparent: true }));
    this.busStripe = b.material(new THREE.MeshStandardMaterial({ color: '#1CB0F6', roughness: 0.5, transparent: true }));
    const tyre = b.material(new THREE.MeshStandardMaterial({ color: '#15171C', roughness: 0.9, transparent: true }));
    const hub = b.material(new THREE.MeshStandardMaterial({ color: '#C9D1DA', roughness: 0.4, transparent: true }));
    this.busParts = [blue, roof, white, yellow, this.busStripe, tyre, hub];
    this.busGlass = glass;
    const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(b.geometry(new THREE.BoxGeometry(w, h, d)), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      this.bus.add(mesh);
      return mesh;
    };
    const L = 5.2;
    const W = 1.95;
    box(L, 0.95, W, blue, 0, 0.82, 0);
    box(L + 0.02, 0.16, W + 0.02, white, 0, 1.12, 0);
    box(L, 0.86, W - 0.04, glass, 0, 1.72, 0);
    // Pillars between the windows, front and back posts.
    for (const x of [-2.55, -1.55, -0.5, 0.55, 1.45, 2.55]) for (const z of [-W / 2 + 0.05, W / 2 - 0.05]) box(0.14, 0.86, 0.1, blue, x, 1.72, z);
    box(L, 0.24, W, roof, 0, 2.27, 0);
    // A sign in the owner's colour on the roof, over the cab.
    box(0.5, 0.22, 1.2, this.busStripe, L / 2 - 0.4, 2.48, 0);
    // Headlights and the badge on each side.
    for (const z of [-0.65, 0.65]) box(0.06, 0.2, 0.36, yellow, L / 2 + 0.01, 0.62, z);
    for (const z of [-W / 2 - 0.01, W / 2 + 0.01]) box(0.42, 0.42, 0.02, yellow, -0.6, 0.7, z);
    const wheel = b.geometry(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 20));
    const cap = b.geometry(new THREE.CylinderGeometry(0.18, 0.18, 0.32, 12));
    for (const [x, z] of [[-1.7, 0.86], [1.7, 0.86], [-1.7, -0.86], [1.7, -0.86]]) {
      const w = new THREE.Mesh(wheel, tyre);
      w.rotation.x = Math.PI / 2;
      w.position.set(x, 0.42, z);
      w.add(new THREE.Mesh(cap, hub));
      this.bus.add(w);
      this.busWheels.push(w);
    }
    this.bus.visible = false;
    this.root.add(this.bus);

    // Long Ball's dotted flight path.
    const dot = b.texture(canvasTexture(32, 32, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(16, 16, 12, 0, Math.PI * 2);
      ctx.fill();
    }));
    for (let i = 0; i < ARC_DOTS; i++) {
      const s = this.sprite(dot, 5);
      s.scale.setScalar(0.22);
      this.arcDots.push(s);
    }

    // Offside Trap: a dashed line across the pitch.
    const dash = b.geometry(new THREE.PlaneGeometry(0.16, 0.9));
    const dashMaterial = b.material(new THREE.MeshBasicMaterial({ color: '#FFE500', transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false }));
    for (let z = -PITCH_HALF_W + 0.8; z < PITCH_HALF_W; z += 1.7) {
      const d = new THREE.Mesh(dash, dashMaterial);
      d.rotation.x = -Math.PI / 2;
      d.position.set(0, 0.02, z);
      d.renderOrder = 3;
      this.offsideDashes.add(d);
    }
    this.offsideDashes.visible = false;
    this.root.add(this.offsideDashes);

    // Tiki-Taka: a passing triangle on the ground and a three-dot counter.
    const edge = b.geometry(new THREE.PlaneGeometry(1, 0.1));
    for (let i = 0; i < 3; i++) {
      const line = new THREE.Mesh(edge, b.material(new THREE.MeshBasicMaterial({ color: '#FFC800', transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false })));
      line.rotation.x = -Math.PI / 2;
      line.renderOrder = 3;
      this.tiki.add(line);
    }
    const tikiDot = b.texture(canvasTexture(64, 64, (ctx) => {
      ctx.fillStyle = '#FFC800';
      ctx.beginPath();
      ctx.arc(32, 32, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }));
    for (let i = 0; i < 3; i++) {
      const s = this.sprite(tikiDot, 21);
      s.scale.setScalar(0.42);
      this.tikiDots.push(s);
    }
    this.tiki.visible = false;
    this.root.add(this.tiki);

    // VAR's scan line.
    this.varBar = this.sprite(b.texture(canvasTexture(16, 128, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 16, 0);
      g.addColorStop(0, 'rgba(28,176,246,0)');
      g.addColorStop(0.5, 'rgba(220,250,255,1)');
      g.addColorStop(1, 'rgba(28,176,246,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 16, 128);
    })), 23);
    (this.varBar.material as THREE.SpriteMaterial).blending = THREE.AdditiveBlending;

    // Second Ball, 50/50, First Touch.
    const ball = b.texture(emojiTexture('⚽'));
    this.spare = this.sprite(ball, 6);
    this.spare.scale.setScalar(0.48);
    this.scissors = this.sprite(b.texture(emojiTexture('✂️')), 23);
    for (let i = 0; i < 2; i++) {
      const s = this.sprite(ball, 6);
      this.ghostBalls.push(s);
    }
    const star = b.texture(emojiTexture('✨', 64));
    for (let i = 0; i < SPARKLES; i++) this.sparkles.push(this.sprite(star, 22));

    // Home Advantage: flags in the stand behind the owner.
    const flagTexture = (side: ZoneSide) =>
      b.texture(canvasTexture(96, 64, (ctx) => {
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = i % 2 ? '#ffffff' : SIDE_COLOR[side];
          ctx.fillRect(0, i * 16, 96, 16);
        }
      }));
    this.flagTextures = { player: flagTexture('player'), opponent: flagTexture('opponent') };
    const flagGeometry = b.geometry(new THREE.PlaneGeometry(1.5, 1));
    const pole = b.geometry(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 6));
    const poleMaterial = b.material(new THREE.MeshStandardMaterial({ color: '#d8dde4' }));
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const p = new THREE.Mesh(pole, poleMaterial);
      p.position.y = 1.2;
      const cloth = new THREE.Mesh(flagGeometry, b.material(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false })));
      cloth.position.set(0.75, 2.0, 0);
      g.add(p, cloth);
      this.flags.add(g);
    }
    this.flags.visible = false;
    this.root.add(this.flags);

    // Goalkeeper Gloves: a glove hovering by the owner's goal while they're on.
    const glove = b.texture(emojiTexture('🧤'));
    this.gloveMarkers = { player: this.sprite(glove, 21), opponent: this.sprite(glove, 21) };

    // Substitution's whoosh.
    this.whoosh = this.sprite(b.texture(canvasTexture(256, 32, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 256, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.8, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 10, 256, 12);
    })), 24);
    (this.whoosh.material as THREE.SpriteMaterial).blending = THREE.AdditiveBlending;
  }

  private sprite(map: THREE.Texture | null, order: number): THREE.Sprite {
    const s = new THREE.Sprite(this.bag.material(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest: false, toneMapped: false })));
    s.renderOrder = order;
    s.visible = false;
    this.root.add(s);
    return s;
  }

  private iconFor(card: CardId): THREE.CanvasTexture {
    let t = this.iconCache.get(card);
    if (!t) {
      t = iconTexture(card);
      this.iconCache.set(card, t);
    }
    return t;
  }

  /** A card moment from the 2D pop-up (CardMoments). */
  onMoment(m: CardEvent, duelNo: number, now: number) {
    this.activate(m.side, m.card, duelNo, now);
    if (m.card === 'var-review') this.varShot = { start: now, target: otherZoneSide(m.side) };
    if (m.card === 'substitution') this.whooshStart = now + AFTER_POPUP;
    if (m.card === 'second-ball') this.spareUsed = { start: now, side: m.side, from: this.lastSpare.clone() };
  }

  /** The activation beat, once per card per duel (from its pop-up or from it coming into play, whichever is first). */
  private activate(side: ZoneSide, card: CardId, duelNo: number, now: number) {
    const key = `${duelNo}-${side}-${card}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    // Sabotage lands on its victim.
    const target = SABOTAGE_LANDS_ON_VICTIM.has(card) ? otherZoneSide(side) : side;
    const beat = this.beats[target];
    beat.start = now;
    beat.card = card;
    this.activation[side] = now;
    if (card === 'first-touch') this.sparkle = { start: now + AFTER_POPUP, side };
    if (card === 'fifty-fifty') this.fifty = { start: now + AFTER_POPUP, side };
    if (card === 'park-the-bus') this.busIn = now;
  }

  update(fx: CardFx, now: number) {
    this.busy = false;
    for (const { side, card } of fx.active) this.activate(side, card, fx.duelNo, now);
    if (this.seen.size > 200) this.seen.clear();
    this.updateBeats(now);
    this.updateReason(fx.reason, fx.duelNo, now);
    this.updateBus(fx, now);
    this.updateArc();
    this.updateOffside(fx);
    this.updateTiki(fx, now);
    this.updateVar(now);
    this.updateSpare(fx, now);
    this.updateFifty(now);
    this.updateSparkles(now);
    this.updateFlags(fx, now);
    this.updateGloveMarkers(fx, now);
    this.updateWhoosh(now);
  }

  private updateBeats(now: number) {
    for (const side of SIDES) {
      const beat = this.beats[side];
      const age = now - beat.start;
      const on = beat.card !== null && age < BEAT_S;
      beat.ring.visible = on;
      beat.icon.visible = on;
      if (!on || !beat.card) continue;
      this.busy = true;
      const color = CARD_TYPE_THEME[CARD_BY_ID[beat.card].type].color;
      const place = this.director.placeOf(side);
      const ringMaterial = beat.ring.material as THREE.MeshBasicMaterial;
      ringMaterial.color.set(color);
      ringMaterial.opacity = 0.95 * (1 - age / BEAT_S);
      if (place) beat.ring.position.set(place.x, 0.04, place.z);
      // Pulses out twice: once under the pop-up, once after it.
      beat.ring.scale.setScalar(this.reduced ? 1.3 : 0.8 + ((age % 1.4) / 1.4) * 2.2);
      const material = beat.icon.material as THREE.SpriteMaterial;
      const map = this.iconFor(beat.card);
      if (material.map !== map) {
        material.map = map;
        material.needsUpdate = true;
      }
      const head = this.director.headOf(side, _v);
      if (head) beat.icon.position.copy(head).add(_up.set(0, 0.75 + (this.reduced ? 0 : age * 0.3), 0.3));
      beat.icon.scale.setScalar(1.05 * (this.reduced ? 1 : pop(age / 0.3)));
      material.opacity = fadeOut(age, BEAT_S, 0.4);
    }
  }

  /** x of a reason column: −1 / 3 are inside the goals. */
  private columnToX(column: number): number {
    return column <= -1 ? -GOAL_X + 1.2 : column >= 3 ? GOAL_X - 1.2 : columnX(column);
  }

  private updateReason(reason: OutcomeReason | null, duelNo: number, now: number) {
    const key = reason ? `${duelNo}-${reason.line}` : '';
    if (key !== this.reasonKey) {
      this.reasonKey = key;
      this.reasonStart = now;
    }
    for (const c of this.chevrons) c.visible = false;
    this.swapRing.visible = false;
    this.swapIcon.visible = false;
    this.stopIcon.visible = false;
    if (!reason) return;
    const age = now - this.reasonStart;
    const color = SIDE_COLOR[reason.side];
    const x0 = this.columnToX(reason.fromColumn);
    if (reason.kind === 'forward' || reason.kind === 'goal') {
      const x1 = this.columnToX(reason.toColumn);
      const dir = Math.sign(x1 - x0) || 1;
      const n = Math.max(2, Math.min(CHEVRONS, Math.round(Math.abs(x1 - x0) / 2.6)));
      // The arrow head travels from where it was won to where it lands, lighting chevrons as it passes.
      const head = this.reduced ? 1 : (age - 0.25) / 1.0;
      for (let i = 0; i < n; i++) {
        const c = this.chevrons[i];
        const at = (i + 0.5) / n;
        const lit = head >= at;
        c.visible = lit;
        if (!lit) continue;
        c.position.set(THREE.MathUtils.lerp(x0, x1, at), 0.03, ARROW_Z);
        c.rotation.y = dir > 0 ? 0 : Math.PI;
        const material = (c.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.color.set(color);
        // A pulse runs along the arrow after it has drawn.
        const pulse = this.reduced ? 0 : Math.max(0, Math.sin((age * 3 - at * 2) * Math.PI)) * 0.3;
        material.opacity = (age < 2.6 ? 0.95 : 0.6) * (0.75 + pulse);
      }
      if (head < 1.2) this.busy = true;
    } else if (reason.kind === 'spot') {
      // The turn changes on the spot: a pulsing ring with a swap icon where the ball is.
      this.swapRing.visible = true;
      this.swapIcon.visible = true;
      this.swapRing.position.set(x0, 0.04, ARROW_Z - 1.2);
      const k = this.reduced ? 1 : pop((age - 0.2) / 0.35);
      this.swapRing.scale.setScalar(1.4 * Math.max(0.01, k));
      const ringMaterial = this.swapRing.material as THREE.MeshBasicMaterial;
      ringMaterial.color.set(color);
      ringMaterial.opacity = 0.9;
      this.swapIcon.position.set(x0, 1.0, ARROW_Z - 1.2);
      this.swapIcon.scale.setScalar(1.1 * Math.max(0.01, k));
      (this.swapIcon.material as THREE.SpriteMaterial).rotation = this.reduced ? 0 : -age * 2.2;
      if (age < 1.2) this.busy = true;
    } else {
      // No ground: a stop sign in front of the attacker.
      this.stopIcon.visible = true;
      const k = this.reduced ? 1 : pop((age - 0.2) / 0.35);
      const place = this.director.placeOf(reason.side);
      this.stopIcon.position.set((place?.x ?? x0) + (reason.side === 'player' ? 1.6 : -1.6), 1.6, ARROW_Z - 1.6);
      this.stopIcon.scale.setScalar(1.2 * Math.max(0.01, k));
      if (age < 1.2) this.busy = true;
    }
  }

  private updateBus(fx: CardFx, now: number) {
    const scripted = this.director.scriptFx.bus;
    const owner = fx.bus;
    if (!scripted && !owner) {
      this.bus.visible = false;
      this.busRider = null;
      return;
    }
    const spots = this.director.spots;
    const d = spots.dir;
    const x = scripted?.x ?? (spots.keeper ? spots.ball.x + d * 3.6 : spots.attacker.x + d * 2.9);
    const parkZ = scripted?.z ?? spots.ball.z;
    // Out on the pitch the bus waits on the far side until the attacker goes, then drives across his path; across a
    // shot it is parked in front of goal at once.
    const waitZ = parkZ - 7;
    let z: number;
    let moving: number;
    if (spots.keeper || (scripted && scripted.enter === undefined)) {
      const roll = this.reduced ? 1 : smooth((now - this.busIn) / 0.9);
      z = parkZ + (1 - roll) * 14;
      moving = 1 - roll;
    } else if (scripted) {
      const e = scripted.enter ?? 1;
      z = waitZ + (parkZ - waitZ) * e;
      moving = e > 0 && e < 1 ? 1 : 0;
    } else {
      const roll = this.reduced ? 1 : smooth((now - this.busIn) / 1.2);
      z = waitZ - (1 - roll) * 12;
      moving = 1 - roll;
    }
    const burst = scripted?.burst ?? 0;
    this.bus.visible = true;
    this.bus.scale.setScalar(0.8);
    this.bus.position.set(x + d * burst * 3, 0, z);
    // Nose towards the camera (it drives in from the far side), turned a little to show its side; a rock as it brakes.
    const brake = scripted?.enter !== undefined ? Math.sin(Math.PI * Math.min(1, Math.max(0, ((scripted.enter ?? 1) - 0.85) / 0.15))) : 0;
    this.bus.rotation.set(0, -Math.PI / 2 - 0.5 * d, burst * 0.9 * d + 0.06 * brake);
    for (const w of this.busWheels) w.rotation.y += moving * 0.5;
    const tint = owner ?? otherZoneSide(spots.dir > 0 ? 'player' : 'opponent');
    this.busStripe.color.set(SIDE_COLOR[tint]);
    const opacity = 1 - burst;
    for (const m of this.busParts) m.opacity = opacity;
    this.busGlass.opacity = 0.38 * opacity;
    // When the bus blocks the attack (the held duel's script), the defender steps across behind it — the bus between
    // him and the attacker — as it drives in. (In front of goal the keeper stays on his line.)
    const attacker: ZoneSide = d > 0 ? 'player' : 'opponent';
    this.busRider = scripted && !spots.keeper && burst < 0.3 ? otherZoneSide(attacker) : null;
    this.busStandK = scripted?.enter ?? 1;
    if (this.busRider) this.busSeat.set(x + d * 2.0, 0, z - 0.4);
    if (moving > 0 || (burst > 0 && burst < 1)) this.busy = true;
  }

  private updateArc() {
    const arc = this.director.scriptFx.arc;
    for (let i = 0; i < ARC_DOTS; i++) {
      const s = this.arcDots[i];
      s.visible = Boolean(arc);
      if (!arc) continue;
      const k = (i + 0.5) / ARC_DOTS;
      s.position.set(THREE.MathUtils.lerp(arc.x0, arc.x1, k), BALL_R + 4 * arc.height * k * (1 - k), THREE.MathUtils.lerp(arc.z0, arc.z1, k));
      (s.material as THREE.SpriteMaterial).opacity = 0.85 * arc.fade;
    }
  }

  private updateOffside(fx: CardFx) {
    const owner = fx.offside;
    this.offsideDashes.visible = owner !== null;
    if (!owner) return;
    const spots = this.director.spots;
    // At the trapping side's defensive line, just in front of the defender.
    this.offsideDashes.position.x = spots.keeper ? spots.ball.x + spots.dir * 4 : spots.defender.x - spots.dir * 0.9;
  }

  private updateTiki(fx: CardFx, now: number) {
    const tiki = fx.tiki;
    this.tiki.visible = tiki !== null;
    for (const d of this.tikiDots) d.visible = false;
    if (!tiki) return;
    const place = this.director.placeOf(tiki.side);
    if (!place) return;
    // A triangle of passing lines round the owner, turning slowly.
    const r = 2.4;
    const turn = this.reduced ? 0 : now * 0.4;
    const corners = [0, 1, 2].map((i) => {
      const a = turn + (i * Math.PI * 2) / 3;
      return new THREE.Vector3(place.x + Math.cos(a) * r, 0.03, place.z + Math.sin(a) * r);
    });
    this.tiki.children.forEach((line, i) => {
      const a = corners[i];
      const b = corners[(i + 1) % 3];
      line.position.set((a.x + b.x) / 2, 0.03, (a.z + b.z) / 2);
      line.scale.x = a.distanceTo(b);
      line.rotation.z = -Math.atan2(b.z - a.z, b.x - a.x);
    });
    // Three dots on the grass in front of the owner: one goes out per duel used.
    this.tikiDots.forEach((dot, i) => {
      dot.visible = true;
      dot.position.set(place.x - 0.55 + i * 0.55, 0.3, place.z + 1.5);
      (dot.material as THREE.SpriteMaterial).opacity = i < tiki.left ? 1 : 0.2;
    });
  }

  private updateVar(now: number) {
    const shot = this.varShot;
    const age = shot ? now - shot.start : Infinity;
    this.varBar.visible = age > 0.1 && age < 0.85;
    if (!shot || !this.varBar.visible) return;
    this.busy = true;
    // A scan line sweeps across the player whose card is under review.
    const pelvis = this.director.pelvisOf(shot.target, _v);
    if (!pelvis) return;
    const k = this.reduced ? 0.5 : (age - 0.1) / 0.75;
    this.varBar.position.set(pelvis.x - 1.3 + 2.6 * k, pelvis.y + 0.4, pelvis.z + 0.5);
    // Taller and wider than the figure, so it shows round the cut-out (which is drawn over the canvas).
    this.varBar.scale.set(0.6, 4.6, 1);
    (this.varBar.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * clamp01(k));
  }

  private updateSpare(fx: CardFx, now: number) {
    const used = this.spareUsed;
    const usedAge = used ? now - used.start : Infinity;
    if (used && usedAge < 0.9) {
      // The spare ball rolls in to the feet for the second try.
      const place = this.director.placeOf(used.side);
      this.spare.visible = true;
      if (place) this.spare.position.lerpVectors(used.from, _v.set(place.x + Math.sin(place.yaw) * 0.9, BALL_R + 0.1, place.z + 0.6), smooth(usedAge / 0.6));
      (this.spare.material as THREE.SpriteMaterial).opacity = 1 - smooth((usedAge - 0.6) / 0.3);
      (this.spare.material as THREE.SpriteMaterial).rotation = -usedAge * 10;
      this.busy = true;
      return;
    }
    const side = fx.secondBall;
    this.spare.visible = side !== null;
    if (!side) return;
    const place = this.director.placeOf(side);
    if (!place) return;
    // Bouncing beside the owner, ready for a retry.
    const behind = side === 'player' ? -1 : 1;
    const bounce = this.reduced ? 0 : Math.abs(Math.sin(now * 3.4)) * 0.5;
    this.spare.position.set(place.x + behind * 1.1, BALL_R + 0.1 + bounce, place.z + 0.9);
    this.lastSpare.copy(this.spare.position);
    (this.spare.material as THREE.SpriteMaterial).opacity = 1;
    (this.spare.material as THREE.SpriteMaterial).rotation = 0;
  }

  private updateFifty(now: number) {
    const f = this.fifty;
    const age = f ? now - f.start : Infinity;
    this.scissors.visible = age >= 0 && age < 0.7;
    for (const g of this.ghostBalls) g.visible = age > 0.35 && age < 1.2;
    if (!f || age > 1.2) return;
    this.busy = true;
    if (age < 0) return;
    this.busy = true;
    // The cut-outs are drawn over the canvas: these pieces go round the figure, not across it.
    const head = this.director.headOf(f.side, _v);
    if (!head) return;
    const place = this.director.placeOf(f.side);
    // Scissors snip across over the owner's head…
    if (this.scissors.visible) {
      const k = this.reduced ? 0.5 : age / 0.7;
      this.scissors.position.set(head.x - 1.5 + 3 * k, head.y + 0.9, head.z + 0.4);
      this.scissors.scale.setScalar(1.0);
      const m = this.scissors.material as THREE.SpriteMaterial;
      m.rotation = Math.sin(age * 30) * 0.35;
      m.opacity = fadeOut(age, 0.7, 0.15);
    }
    // …and two answers go: two faint balls pop and vanish.
    this.ghostBalls.forEach((g, i) => {
      if (!g.visible) return;
      const k = (age - 0.35) / 0.85;
      g.position.set((place?.x ?? head.x) + (i ? 0.9 : -0.9), BALL_R + 0.3 + k * 0.6, (place?.z ?? head.z) + 1.8);
      g.scale.setScalar(0.45 * (1 + (this.reduced ? 0 : k * 1.2)));
      (g.material as THREE.SpriteMaterial).opacity = 0.7 * (1 - smooth(k));
    });
  }

  private updateSparkles(now: number) {
    const s = this.sparkle;
    const age = s ? now - s.start : Infinity;
    if (s && age < 0) this.busy = true;
    const on = age >= 0 && age < 0.9 && !this.reduced;
    for (const sp of this.sparkles) sp.visible = on;
    if (!s || !on) return;
    this.busy = true;
    const place = this.director.placeOf(s.side);
    if (!place) return;
    this.sparkles.forEach((sp, i) => {
      const a = (i / SPARKLES) * Math.PI * 2;
      const r = 0.3 + age * 2.2;
      sp.position.set(place.x + Math.cos(a) * r * 1.3, 0.2 + Math.sin(age * Math.PI) * 0.6 + (i % 2) * 0.3, place.z + 1.4 + Math.sin(a) * r * 0.4);
      sp.scale.setScalar(0.42 * (1 - age / 0.9) + 0.1);
      (sp.material as THREE.SpriteMaterial).opacity = 1 - age / 0.9;
    });
  }

  private updateFlags(fx: CardFx, now: number) {
    const home = fx.home;
    this.flags.visible = home !== null;
    if (!home) return;
    const place = this.director.placeOf(home);
    const cx = place?.x ?? 0;
    this.flags.children.forEach((g, i) => {
      g.position.set(cx - 7 + i * 2.3, 0, -PITCH_HALF_W - 2.4);
      const cloth = g.children[1] as THREE.Mesh;
      const m = cloth.material as THREE.MeshBasicMaterial;
      if (m.map !== this.flagTextures[home]) {
        m.map = this.flagTextures[home];
        m.needsUpdate = true;
      }
      // Waved: swinging on the pole.
      g.rotation.y = this.reduced ? 0.3 : Math.sin(now * 4 + i * 1.3) * 0.6;
      cloth.scale.y = 1 + (this.reduced ? 0 : Math.sin(now * 7 + i) * 0.08);
    });
  }

  private updateGloveMarkers(fx: CardFx, now: number) {
    for (const side of SIDES) {
      const s = this.gloveMarkers[side];
      s.visible = fx.gloves[side];
      if (!s.visible) continue;
      const x = side === 'player' ? -GOAL_X + 0.4 : GOAL_X - 0.4;
      s.position.set(x, 4.0 + (this.reduced ? 0 : Math.sin(now * 2.4) * 0.15), 0);
      s.scale.setScalar(1.3);
    }
  }

  private updateWhoosh(now: number) {
    const age = now - this.whooshStart;
    if (age < 0) this.busy = true;
    this.whoosh.visible = age >= 0 && age < 0.5 && !this.reduced;
    if (!this.whoosh.visible) return;
    this.busy = true;
    const f = this.director.focus;
    this.whoosh.position.set(f.x - 7 + 14 * (age / 0.5), 2.2, f.z + 2);
    this.whoosh.scale.set(6, 0.7, 1);
    (this.whoosh.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * (age / 0.5));
  }

  dispose() {
    this.bag.dispose();
    for (const t of this.iconCache.values()) t.dispose();
  }
}
