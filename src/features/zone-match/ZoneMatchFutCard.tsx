'use client';

/**
 * A FIFA Ultimate Team–style player card for a seat, on its tier's own card design (the rank frame art the match HUD
 * and the profile use, coloured by the tier's accent) with a soft sheen and a 3D tilt that follow the pointer (a
 * gentle sway on touch), the seat's RP and tier,
 * the player's own avatar art as a paper cut-out (AvatarPreview), and the three PlayStyle slots down the
 * side, FUT-style. Picking a playstyle lands it on its slot with a burst; the card answers with a shine sweep, a
 * little spin and a reaction from the player.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { AvatarFullBody, applyFullBodyPose, type FullBodyEls } from './AvatarFullBody';
import { celebratePose, crouchPose, divePose, idlePose, keeperSetPose, mixPose, stepOverPose, strikePose } from './zoneMatch.fullBody';
import type { AvatarCustomization } from '@/types/game';
import { tierFromRp } from '@/utils/rankedTier';
import { getTierAccent, getTierFrameSrc } from '@/utils/tierVisuals';
import { cn } from '@/lib/utils';
import { CARD_BY_ID, DECK_SIZE, type CardId, type CardType } from './zoneMatch.cards';
import { CARD_TYPE_THEME, PlaystyleBadge } from './ZoneMatchCardFace';
import {
  ARMBAND,
  ArmbandArt,
  BallArt,
  CARD_REACTION_S,
  CardReactionFx,
  DISCARD_S,
  BUS,
  BusArt,
  FLAG,
  FlagShape,
  GLOVE_HANDS,
  GOLD_BOOTS,
  MATES,
  ScarfArt,
  ShinPadShape,
  HeldYellowCard,
  PUDDLE,
  REACTION_BALL_R,
  SECOND_BALL_REST,
  YELLOW,
  YellowCardShape,
  cardMotion,
  discardBody,
  discardSprite,
  seatedPose,
  type Discard,
  type ReactionBall,
  type ReactionFrame,
} from './ZoneMatchFutReactions';
import { CardArt } from './ZoneMatchCardFace';
import { getSkinPart } from '@/lib/avatars/parts';
import { resolveAvatarCustomization } from '@/lib/avatars';
import { FULL_H, FULL_W } from './zoneMatch.fullBody';


const poppins = { fontFamily: "'Poppins', sans-serif" } as const;

const HEX = 'polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%)';

/** The tier frame art's proportions (public/assets/ranks/*_frame.png, 200×321). */
const FRAME_ASPECT = 321 / 200;
/** Light text on every tier frame: the frames run from pale cream to near black, so a soft dark shadow carries it. */
const CARD_TEXT = '#FFFFFF';
const CARD_TEXT_SHADOW = '0 1px 2px rgba(0,0,0,0.55), 0 0 6px rgba(0,0,0,0.25)';

/** The seat's tier card: its frame art (the same design as the match HUD and the profile) and its accent colour. */
function tierLook(rankPoints: number | null) {
  const tier = tierFromRp(rankPoints ?? 0);
  return { tier, frame: getTierFrameSrc(tier), accent: getTierAccent(tier) };
}

export interface FutSeat {
  name: string;
  avatarCustomization: AvatarCustomization | null;
  rankPoints: number | null;
}

/** A landing burst on a slot. */
export interface SlotBurst {
  slot: number;
  key: number;
  type: CardType;
}

/**
 * What the card does when a playstyle lands: that card's own reaction (ZoneMatchFutReactions), then — when it was
 * the last one — a jump-spin with confetti for the full loadout. Without a card, the type's general move.
 */
export interface FutReaction {
  kind: CardType | 'complete';
  key: number;
  /** Which way a dive goes. */
  seed: number;
  card?: CardId;
  /** The loadout is full: the celebration follows the card's reaction. */
  complete?: boolean;
}

export function reactionFor(type: CardType | 'complete', key: number, seed = 0, card?: CardId, complete = false): FutReaction {
  return { kind: type, key, seed, card, complete };
}

/** When the full-loadout celebration starts, and how long a reaction lasts in all (s). */
const celebrationAt = (r: FutReaction) => (r.card ? CARD_REACTION_S[r.card] : 0);
const reactionLength = (r: FutReaction) => (r.card ? CARD_REACTION_S[r.card] + (r.complete ? REACTION_S.complete : 0) : REACTION_S[r.kind]);

const CONFETTI_COLORS = ['#FFE500', '#1CB0F6', '#FF4B4B', '#58CC02', '#FFFFFF', '#FF9600'];
/** How long each reaction plays (s). */
const REACTION_S: Record<FutReaction['kind'], number> = { boost: 1.5, defense: 1.6, tactical: 1.4, sabotage: 1.3, complete: 1.7 };

/**
 * One frame of a card reaction: the legs' pose and the whole figure's lift / tilt / spin (lift in % of the figure's
 * height, kept small enough that the head never leaves the card).
 */
function reactionFrame(reaction: FutReaction | null, t: number, now: number): ReactionFrame {
  const still = { lift: 0, tilt: 0, spin: 0, shift: 0, blur: 0, fade: 1 };
  if (!reaction || t >= reactionLength(reaction)) return { body: idlePose(now), ...still };
  if (reaction.card) {
    if (t < celebrationAt(reaction)) return cardMotion(reaction.card, t, now, reaction.seed);
    return { ...reactionFrame({ ...reaction, card: undefined, kind: 'complete' }, t - celebrationAt(reaction), now) };
  }
  const fade = 1 - Math.max(0, (t - REACTION_S[reaction.kind] + 0.25) / 0.25);
  switch (reaction.kind) {
    case 'boost':
      // Plant, wind up, kick through, follow through.
      return { body: strikePose(t * 1.1), ...still, shift: 2 * Math.sin(Math.min(1, t) * Math.PI) };
    case 'defense': {
      // Crouch, then a full-stretch dive to one side, and back up.
      const dir = reaction.seed % 2 ? -1 : 1;
      const k = Math.min(1, t / 0.7);
      const back = Math.max(0, (t - 1.1) / 0.45);
      const out = Math.min(1, k) * (1 - Math.min(1, back));
      return { body: t < 0.25 ? keeperSetPose(now) : divePose(k), lift: 7 * Math.sin(Math.PI * Math.min(1, t / 0.8)) * (1 - Math.min(1, back)), tilt: 62 * dir * out, spin: 0, shift: 12 * dir * out, blur: 0, fade: 1 };
    }
    case 'tactical':
      // Two step-overs.
      return { body: stepOverPose((t * 1.45) % 1), ...still, shift: 3 * Math.sin(t * Math.PI * 2.9) * fade };
    case 'sabotage': {
      const k = Math.sin(Math.PI * Math.min(1, t / 1.2));
      return { body: crouchPose(k), ...still, tilt: 4 * Math.sin(t * 22) * k };
    }
    case 'complete': {
      // Two jumps with the knees up, a spin on the first.
      const c = (t % 0.85) / 0.85;
      return { body: celebratePose(t), lift: 9 * Math.sin(Math.PI * Math.min(1, Math.max(0, (c - 0.25) / 0.55))), tilt: 0, spin: t < 0.85 ? 360 * Math.min(1, t / 0.85) : 0, shift: 0, blur: 0, fade: 1 };
    }
  }
}

/**
 * The avatar on the card, full body: idling (weight shifting), and reacting with its legs when a playstyle lands.
 * Posed in a requestAnimationFrame loop with SVG / CSS transforms only, ~30 fps, nothing while off screen.
 */
/** Gear the loadout puts on the player: the golden boot (left foot) and the captain's armband. */
interface Gear {
  goldBoot: boolean;
  armband: boolean;
  /** Second Ball: the two balls resting on the floor at his feet. */
  balls: boolean;
  /** Muddy Pitch: muddy boots and socks, a puddle under him. */
  mud: boolean;
  /** Fog: a low mist round his feet. */
  fog: boolean;
  /** Yellow Card: held up in his hand. */
  yellowCard: boolean;
  /** Offside Trap: the linesman's flag in his hand. */
  flag: boolean;
  /** Goalkeeper Gloves: on both hands. */
  gloves: boolean;
  /** Park the Bus: the bus parked behind him, him sat on its roof. */
  bus: boolean;
  /** Home Advantage: the club scarf round his neck. */
  scarf: boolean;
  /** Shin Pads: strapped on his shins. */
  shinPads: boolean;
}

/**
 * The figure's art box inside the card's cut-out area (the figure box is 88 % of the area's height, bottom-aligned,
 * the art centred in it at 496 : 840): % across / down the area, from art units.
 */
const ART_IN_AREA = { left: 12.07, width: 75.85, top: 12, height: 88 };
const areaX = (x: number) => ART_IN_AREA.left + (x / 496) * ART_IN_AREA.width;
const areaY = (y: number) => ART_IN_AREA.top + (y / 840) * ART_IN_AREA.height;

/** % of the upper body's box, from its art units. */
const pctX = (x: number) => `${((x / 496) * 100).toFixed(2)}%`;
const pctY = (y: number) => `${((y / 543) * 100).toFixed(2)}%`;

/**
 * A keeper glove on one hand: the hand's own outline from the skin art (so it fits whatever the skin), a touch bigger
 * — blue, lime over the fingers, a white wrist strap.
 */
function Glove({ hand, skinUrl }: { hand: 'L' | 'R'; skinUrl: string }) {
  const g = GLOVE_HANDS[hand];
  const [x0, y0, x1, y1] = g.box;
  const rect = (r: readonly number[]) => ({ left: pctX(r[0]), top: pctY(r[1]), width: pctX(r[2] - r[0]), height: pctY(r[3] - r[1]) });
  return (
    <div
      className="absolute inset-x-0 top-0"
      style={{
        aspectRatio: '496 / 543',
        WebkitMaskImage: `url(${skinUrl})`,
        maskImage: `url(${skinUrl})`,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        clipPath: `inset(${pctY(y0)} ${pctX(496 - x1)} ${pctY(543 - y1)} ${pctX(x0)})`,
        transform: 'scale(1.07)',
        transformOrigin: `${pctX(g.centre[0])} ${pctY(g.centre[1])}`,
      }}
    >
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #3B74FF, #1645FF 45%, #0E2FB0)' }} />
      <div className="absolute rounded-[30%]" style={{ ...rect(g.fingers), background: 'linear-gradient(170deg, #8EE53F, #58CC02 60%, #3E9A00)' }} />
      <div className="absolute" style={{ ...rect(g.strap), background: '#F4F6F8', boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.18)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(40% 30% at 45% 30%, rgba(255,255,255,0.35), transparent 70%)' }} />
    </div>
  );
}

/** Gear that, taken off the loadout, gets thrown away (and the item it throws). */
const THROWN: [keyof Gear, Discard][] = [
  ['yellowCard', 'yellow-card'],
  ['flag', 'offside-trap'],
  ['goldBoot', 'golden-boot'],
  ['shinPads', 'shin-pads'],
];

/** Places a ball element (figure art units → % of the figure's box). */
function placeBall(el: HTMLElement, spin: HTMLElement | null, b: ReactionBall) {
  el.style.left = `${(((b.x - REACTION_BALL_R) / FULL_W) * 100).toFixed(2)}%`;
  el.style.top = `${(((b.y - REACTION_BALL_R) / FULL_H) * 100).toFixed(2)}%`;
  el.style.opacity = b.opacity.toFixed(2);
  if (spin) spin.style.transform = `rotate(${b.rot.toFixed(0)}deg)`;
}
const GOLD_LEFT = { L: GOLD_BOOTS };

function CardCutout({ customization, reaction, mirror, seed, gear }: { customization: AvatarCustomization | null; reaction: FutReaction | null; mirror: boolean; seed: number; gear: Gear }) {
  const [els, setEls] = useState<FullBodyEls | null>(null);
  const figure = useRef<HTMLDivElement>(null);
  const ball = useRef<HTMLDivElement>(null);
  const ballSpin = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement>(null);
  const armband = useRef<SVGGElement>(null);
  const ball2 = useRef<HTMLDivElement>(null);
  const ball2Spin = useRef<HTMLDivElement>(null);
  const restBalls = useRef<HTMLDivElement>(null);
  const puddle = useRef<HTMLDivElement>(null);
  const held = useRef<SVGGElement>(null);
  const flag = useRef<SVGGElement>(null);
  const gloves = useRef<HTMLDivElement>(null);
  const scarf = useRef<SVGGElement>(null);
  const mates = useRef<HTMLDivElement>(null);
  const mateEls = useRef<(FullBodyEls | null)[]>([null, null]);
  const setMateA = useCallback((e: FullBodyEls) => {
    mateEls.current[0] = e;
  }, []);
  const setMateB = useCallback((e: FullBodyEls) => {
    mateEls.current[1] = e;
  }, []);
  const bus = useRef<HTMLDivElement>(null);
  const busWheelNow = useRef(0);
  const [busWheel, setBusWheel] = useState(0);
  // How far he's sat on the bus (eased, so he hops down for another card's reaction and back up after it).
  const seated = useRef(0);
  const skinUrl = useMemo(() => getSkinPart(resolveAvatarCustomization(customization ?? {}).skin).asset, [customization]);
  // Taking a card off: what was worn gets thrown away (started here, drawn by the loop).
  const gearSeen = useRef<Gear | null>(null);
  const discards = useRef<{ item: Discard; at: number }[]>([]);
  const discardEls = useRef<Partial<Record<Discard, HTMLDivElement | null>>>({});
  const [muddy, setMuddy] = useState(false);
  const [pads, setPads] = useState(false);
  const padsNow = useRef(false);
  const muddyNow = useRef(false);
  // Golden Boot: the boots turn gold for a while (a re-render only when that changes).
  const [goldBoots, setGoldBoots] = useState(false);
  const goldNow = useRef(false);
  const started = useRef<{ key: number; at: number }>({ key: -1, at: 0 });
  useEffect(() => {
    if (!els) return;
    let raf = 0;
    let last = 0;
    let visible = true;
    const node = figure.current;
    const observer = typeof IntersectionObserver !== 'undefined' && node ? new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)) : null;
    if (observer && node) observer.observe(node);
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || ms - last < 30) return;
      last = ms;
      const now = ms / 1000;
      if (reaction && started.current.key !== reaction.key) started.current = { key: reaction.key, at: now };
      const t = reaction ? now - started.current.at : Infinity;
      let f = reactionFrame(reaction, t, now);
      // Gear taken off since the last frame: throw it away.
      const before = gearSeen.current;
      if (before) for (const [key, item] of THROWN) if (before[key] && !gear[key]) discards.current.push({ item, at: now });
      gearSeen.current = gear;
      discards.current = discards.current.filter((d) => now - d.at < DISCARD_S);
      const throwing = discards.current[discards.current.length - 1];
      // The throw moves him only when no card's own reaction is playing.
      if (throwing && (!reaction || t >= reactionLength(reaction))) f = { ...f, body: discardBody(throwing.item, now - throwing.at, now) };
      for (const [, item] of THROWN) {
        const el = discardEls.current[item];
        if (!el) continue;
        const d = discards.current.find((x) => x.item === item);
        el.style.display = d ? '' : 'none';
        if (!d) continue;
        const sprite = discardSprite(item, now - d.at);
        el.style.left = `${((sprite.x / FULL_W) * 100).toFixed(2)}%`;
        el.style.top = `${((sprite.y / FULL_H) * 100).toFixed(2)}%`;
        el.style.opacity = sprite.opacity.toFixed(2);
        el.style.transform = `translate(-50%, -50%) rotate(${sprite.rot.toFixed(0)}deg)`;
      }
      // Park the Bus: parked behind him while it's in the loadout, him sat on the roof — off it while another card
      // reacts (he hops down and back up).
      {
        const own = f.bus;
        const want = own ? own.seat : gear.bus && !(reaction && t < reactionLength(reaction)) ? 1 : 0;
        if (!own) seated.current += Math.max(-1, Math.min(1, (want - seated.current) * 6)) * 0.033;
        const sit = own ? own.seat : seated.current;
        if (!own && sit > 0.001) {
          f = {
            ...f,
            body: mixPose(f.body, seatedPose(now), sit),
            lift: f.lift * (1 - sit) + sit * BUS.sitLift + 10 * Math.sin(Math.PI * sit) * (sit < 0.999 ? 1 : 0),
            shift: f.shift * (1 - sit) + sit * BUS.sitShift,
          };
        }
        if (bus.current) {
          const busX = own ? own.x : 0;
          bus.current.style.display = own || gear.bus ? '' : 'none';
          bus.current.style.transform = `translateX(${((busX / 496) * 100).toFixed(2)}%)`;
          const turn = own && busX < -1 ? Math.round(busX * 0.9) : 0;
          if (Math.abs(turn - busWheelNow.current) > 15) {
            busWheelNow.current = turn;
            setBusWheel(turn);
          }
        }
      }
      applyFullBodyPose(els, f.body);
      if (figure.current) {
        figure.current.style.transform = `translate(${f.shift.toFixed(1)}%, ${(-f.lift).toFixed(1)}%) rotate(${f.tilt.toFixed(1)}deg) rotateY(${f.spin.toFixed(0)}deg) scale(${(f.scale ?? 1).toFixed(3)})`;
        figure.current.style.filter = f.blur > 0.05 ? `blur(${f.blur.toFixed(1)}px)` : '';
        figure.current.style.opacity = f.fade < 0.999 ? f.fade.toFixed(2) : '';
      }
      // A ball the move plays with, in the figure's own frame (so it sits exactly on the boot).
      if (ball.current && ballSpin.current && ring.current) {
        const b = f.ball;
        ball.current.style.display = b ? '' : 'none';
        if (b) {
          ball.current.style.left = `${(((b.x - REACTION_BALL_R) / FULL_W) * 100).toFixed(2)}%`;
          ball.current.style.top = `${(((b.y - REACTION_BALL_R) / FULL_H) * 100).toFixed(2)}%`;
          ball.current.style.opacity = b.opacity.toFixed(2);
          ballSpin.current.style.transform = `rotate(${b.rot.toFixed(0)}deg)`;
          ball.current.style.transform = b.scale && b.scale !== 1 ? `scale(${b.scale.toFixed(3)})` : '';
          ring.current.style.opacity = b.ring > 0 ? (1 - b.ring).toFixed(2) : '0';
          ring.current.style.transform = `scale(${(1 + b.ring * 1.6).toFixed(2)})`;
          ballSpin.current.style.filter = b.gold ? 'sepia(1) saturate(6) hue-rotate(-12deg) brightness(1.15) drop-shadow(0 0 6px #FFC107)' : '';
        }
        if (trail.current) {
          const dots = Array.from(trail.current.children) as HTMLElement[];
          dots.forEach((dot, i) => {
            const at = b?.trail?.[i];
            dot.style.display = at && b ? '' : 'none';
            if (at && b) {
              dot.style.left = `${(((at[0] - REACTION_BALL_R) / FULL_W) * 100).toFixed(2)}%`;
              dot.style.top = `${(((at[1] - REACTION_BALL_R) / FULL_H) * 100).toFixed(2)}%`;
              dot.style.opacity = ((b.opacity * (dots.length - i)) / (dots.length + 1)).toFixed(2);
            }
          });
        }
      }
      if (ball2.current) {
        ball2.current.style.display = f.ball2 ? '' : 'none';
        if (f.ball2) placeBall(ball2.current, ball2Spin.current, f.ball2);
      }
      // Second Ball's pair lies on the floor while it's in the loadout (its own reaction moves them).
      if (restBalls.current) restBalls.current.style.display = gear.balls && !f.hideRestBalls ? '' : 'none';
      // Muddy Pitch: the puddle spreads in its reaction and stays while it's in the loadout; so does the mud on the kit.
      if (puddle.current) {
        const size = f.puddle ?? (gear.mud ? 1 : 0);
        puddle.current.style.opacity = size > 0 ? '1' : '0';
        puddle.current.style.transform = `scale(${size.toFixed(3)})`;
      }
      const padsOn = f.shinPads ? f.shinPads.on : gear.shinPads;
      if (padsOn !== padsNow.current) {
        padsNow.current = padsOn;
        setPads(padsOn);
      }
      const mud = f.muddy ?? gear.mud;
      if (mud !== muddyNow.current) {
        muddyNow.current = mud;
        setMuddy(mud);
      }
      // Yellow Card: held up in his hand while it's in the loadout (in its reaction, once it's caught).
      if (held.current) {
        const y = f.yellowCard;
        held.current.style.opacity = (y ? y.held : gear.yellowCard) ? '1' : '0';
        const scale = y ? 1 + 0.45 * y.pop * y.pop : 1;
        held.current.setAttribute('transform', `translate(${YELLOW.x} ${YELLOW.y}) scale(${scale.toFixed(3)}) translate(${-YELLOW.x} ${-YELLOW.y})`);
      }
      // Home Advantage: the scarf round his neck while it's in the loadout.
      if (scarf.current) {
        const sc = f.scarf;
        scarf.current.style.opacity = (sc ? sc.on : gear.scarf) ? '1' : '0';
        const k = sc ? 1 + 0.35 * sc.pop * sc.pop : 1;
        scarf.current.setAttribute('transform', `translate(235 245) scale(${k.toFixed(3)}) translate(-235 -245)`);
      }
      // Tiki-Taka: the team-mates.
      if (mates.current) {
        const m = f.mates;
        mates.current.style.display = m && m.shown > 0.001 ? '' : 'none';
        if (m) {
          mates.current.style.opacity = (0.6 * m.shown).toFixed(2);
          m.poses.forEach((pose, i) => {
            const el = mateEls.current[i];
            if (el) applyFullBodyPose(el, pose);
          });
        }
      }
      // Goalkeeper Gloves: on his hands while they're in the loadout (in their reaction, from the moment they go on).
      if (gloves.current) {
        const gl = f.gloves;
        gloves.current.style.opacity = (gl ? gl.on : gear.gloves) ? '1' : '0';
        gloves.current.style.transform = gl && gl.pop > 0 ? `scale(${(1 + 0.08 * gl.pop).toFixed(3)})` : '';
      }
      // Offside Trap: the flag in his hand while it's in the loadout, waved in its reaction, swaying gently otherwise.
      if (flag.current) {
        const fl = f.flag;
        flag.current.style.opacity = (fl ? fl.held : gear.flag) ? '1' : '0';
        const scale = fl ? 1 + 0.4 * fl.pop * fl.pop : 1;
        const wave = fl ? fl.wave : 3 * Math.sin(now * 2.2);
        flag.current.setAttribute('transform', `translate(${FLAG.gripX} ${FLAG.gripY}) rotate(${wave.toFixed(1)}) scale(${scale.toFixed(3)})`);
      }
      // Captain's Armband: worn while it's in the loadout; during its reaction, from the moment it's put on.
      if (armband.current) {
        const a = f.armband;
        armband.current.style.opacity = (a ? a.fitted : gear.armband) ? '1' : '0';
        const scale = a ? 1 + 0.5 * a.pop * a.pop : 1;
        armband.current.setAttribute('transform', `translate(${ARMBAND.x} ${ARMBAND.y}) scale(${scale.toFixed(3)}) translate(${-ARMBAND.x} ${-ARMBAND.y})`);
      }
      // The golden boot: worn while it's in the loadout; during its reaction, from the moment it lands on his foot.
      const gold = f.goldBoots ?? gear.goldBoot;
      if (gold !== goldNow.current) {
        goldNow.current = gold;
        setGoldBoots(gold);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [els, reaction, gear]);
  return (
    <div className="absolute inset-0">
      {/* Park the Bus: the bus behind him (it doesn't move with him). */}
      <div
        ref={bus}
        className="pointer-events-none absolute"
        style={{
          display: 'none',
          left: `${areaX(BUS.x)}%`,
          top: `${areaY(BUS.y)}%`,
          width: `${(BUS.w / 496) * ART_IN_AREA.width}%`,
          height: `${(BUS.h / 840) * ART_IN_AREA.height}%`,
          transform: mirror ? 'scaleX(-1)' : undefined,
        }}
      >
        <BusArt wheelTurn={busWheel} />
      </div>
      <div ref={figure} className="absolute inset-x-0 bottom-0 flex h-[88%] justify-center" style={{ transformOrigin: '50% 98%' }}>
        <div className="relative" style={{ height: '100%', transform: mirror ? 'scaleX(-1)' : undefined }}>
          {/* Tiki-Taka's team-mates, further back (behind him): see-through copies, the right one facing him. */}
          <div ref={mates} className="pointer-events-none absolute inset-0" style={{ display: 'none', filter: 'saturate(0.55) brightness(1.25) drop-shadow(0 0 3px #1CB0F6)' }}>
            {(['a', 'b'] as const).map((key) => (
              <div
                key={key}
                className="absolute"
                style={{ left: `${(MATES[key].left / 496) * 100}%`, top: `${(MATES[key].top / 840) * 100}%`, width: `${MATES.scale * 100}%`, transform: key === 'b' ? 'scaleX(-1)' : undefined }}
              >
                <AvatarFullBody customization={customization} seed={seed} onEls={key === 'a' ? setMateA : setMateB} style={{ width: '100%' }} />
              </div>
            ))}
          </div>
          {/* Muddy Pitch's puddle, under his feet. */}
          <div
            ref={puddle}
            className="absolute rounded-[50%]"
            style={{
              opacity: 0,
              left: `${((PUDDLE.x - PUDDLE.w / 2) / FULL_W) * 100}%`,
              top: `${((PUDDLE.y - PUDDLE.h / 2) / FULL_H) * 100}%`,
              width: `${(PUDDLE.w / FULL_W) * 100}%`,
              height: `${(PUDDLE.h / FULL_H) * 100}%`,
              background: 'radial-gradient(ellipse at 40% 35%, rgba(170,120,70,0.95), #5B3A1D 55%, #3B2511 100%)',
              boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.25), inset 8px 4px 0 rgba(255,255,255,0.12)',
              transformOrigin: '50% 50%',
            }}
          />
          <AvatarFullBody
            customization={customization}
            seed={seed}
            onEls={setEls}
            style={{ height: '100%' }}
            bootColors={goldBoots ? GOLD_LEFT : undefined}
            muddy={muddy}
            shinPads={pads}
            upperUnderlay={
              // Held in his raised hand, behind the fingers (CardCutout's loop shows it).
              <svg className="pointer-events-none absolute inset-x-0 top-0 w-full overflow-visible" style={{ aspectRatio: '496 / 543' }} viewBox="0 0 496 543" aria-hidden>
                <g ref={held} style={{ opacity: 0 }}>
                  <HeldYellowCard />
                </g>
                <g ref={flag} style={{ opacity: 0 }}>
                  <FlagShape />
                </g>
              </svg>
            }
            upperOverlay={
              <>
                <div ref={gloves} className="pointer-events-none absolute inset-x-0 top-0" style={{ opacity: 0, aspectRatio: '496 / 543', transformOrigin: '50% 30%' }}>
                  <Glove hand="L" skinUrl={skinUrl} />
                  <Glove hand="R" skinUrl={skinUrl} />
                </div>
                <svg className="pointer-events-none absolute inset-x-0 top-0 w-full overflow-visible" style={{ aspectRatio: '496 / 543' }} viewBox="0 0 496 543" aria-hidden>
                  <g ref={scarf} style={{ opacity: 0 }}>
                    <ScarfArt />
                  </g>
                </svg>
                {/* Worn on the arm, moving with the upper body (CardCutout's loop shows it). */}
                <svg className="pointer-events-none absolute inset-x-0 top-0 w-full overflow-visible" style={{ aspectRatio: '496 / 543' }} viewBox="0 0 496 543" aria-hidden>
                <g ref={armband} style={{ opacity: 0 }}>
                  <ArmbandArt />
                </g>
              </svg>
              </>
            }
          />
          {/* A struck ball's glowing trail. */}
          <div ref={trail} className="pointer-events-none absolute inset-0">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="absolute block rounded-full"
                style={{ display: 'none', width: `${((2 * REACTION_BALL_R) / FULL_W) * 100 * (1 - i * 0.15)}%`, aspectRatio: '1', background: 'radial-gradient(closest-side, rgba(255,226,90,0.9), rgba(255,170,0,0.35) 70%, transparent)' }}
              />
            ))}
          </div>
          {/* Fog: a low mist drifting round his feet. */}
          {gear.fog && (
            <div className="pointer-events-none absolute inset-x-[-10%] bottom-[-2%] h-[16%]">
              {[0, 1].map((i) => (
                <motion.span
                  key={i}
                  className="absolute block h-full w-[70%] rounded-full bg-white/70 blur-md"
                  style={{ left: i ? '35%' : '0%' }}
                  animate={{ x: i ? ['0%', '-18%', '0%'] : ['0%', '18%', '0%'], opacity: [0.55, 0.85, 0.55] }}
                  transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
            </div>
          )}
          {/* Gear thrown away as its card comes off (figure art units; the loop flies it). */}
          {THROWN.map(([, item]) => (
            <div
              key={item}
              ref={(el) => {
                discardEls.current[item] = el;
              }}
              className="pointer-events-none absolute"
              style={{ display: 'none', width: `${((item === 'golden-boot' ? 120 : item === 'offside-trap' ? 110 : item === 'shin-pads' ? 110 : 64) / FULL_W) * 100}%`, aspectRatio: item === 'offside-trap' ? '0.75' : item === 'golden-boot' || item === 'shin-pads' ? '1' : '0.7' }}
            >
              {item === 'golden-boot' ? (
                <CardArt id="golden-boot" />
              ) : item === 'shin-pads' ? (
                <svg viewBox="-60 -60 120 120" className="size-full overflow-visible" aria-hidden>
                  <g transform="translate(-24 0) rotate(-12)">
                    <ShinPadShape />
                  </g>
                  <g transform="translate(24 4) rotate(10)">
                    <ShinPadShape />
                  </g>
                </svg>
              ) : (
                <svg viewBox={item === 'offside-trap' ? '-40 -180 120 220' : '-32 -46 64 92'} className="size-full overflow-visible" aria-hidden>
                  {item === 'offside-trap' ? <FlagShape /> : <YellowCardShape />}
                </svg>
              )}
            </div>
          ))}
          <div ref={restBalls} className="pointer-events-none absolute inset-0" style={{ display: 'none' }}>
            {SECOND_BALL_REST.map(([x, y]) => (
              <div key={x} className="absolute" style={{ left: `${((x - REACTION_BALL_R) / FULL_W) * 100}%`, top: `${((y - REACTION_BALL_R) / FULL_H) * 100}%`, width: `${((2 * REACTION_BALL_R) / FULL_W) * 100}%`, aspectRatio: '1' }}>
                <BallArt />
              </div>
            ))}
          </div>
          <div ref={ball2} className="absolute" style={{ display: 'none', width: `${((2 * REACTION_BALL_R) / FULL_W) * 100}%`, aspectRatio: '1' }}>
            <div ref={ball2Spin} className="size-full">
              <BallArt />
            </div>
          </div>
          <div ref={ball} className="absolute" style={{ display: 'none', width: `${((2 * REACTION_BALL_R) / FULL_W) * 100}%`, aspectRatio: '1' }}>
            {/* The touch killing the ball's pace: a soft ring. */}
            <div ref={ring} className="absolute inset-[-30%] rounded-full border-2 border-white/90 shadow-[0_0_10px_rgba(255,255,255,0.8)]" style={{ opacity: 0 }} />
            <div ref={ballSpin} className="size-full">
              <BallArt />
            </div>
          </div>
        </div>
      </div>
      {(reaction?.kind === 'complete' || reaction?.complete) && (
        <div key={`confetti-${reaction.key}`} className="pointer-events-none absolute inset-0">
          {Array.from({ length: 16 }, (_, i) => {
            const angle = -Math.PI / 2 + (i / 15 - 0.5) * 2.6;
            return (
              <motion.span
                key={i}
                className="absolute block"
                style={{ left: '50%', top: '30%', width: 6, height: 10, borderRadius: 2, background: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                animate={{ x: Math.cos(angle) * 80, y: [0, Math.sin(angle) * 70, Math.sin(angle) * 40 + 90], opacity: [1, 1, 0], rotate: 540 }}
                transition={{ duration: 1.6, ease: 'easeOut', delay: reaction.card ? CARD_REACTION_S[reaction.card] : 0 }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Slot geometry, as fractions of the card width (left/size) and height (top). */
export function slotLayout(index: number) {
  return { left: 0.075, top: 0.335 + index * 0.13, size: 0.175 };
}

export function FutCard({
  seat,
  width,
  slots,
  slotRef,
  onSlotClick,
  blockedSlots,
  emptyClosed = false,
  bursts = [],
  shineKey = 0,
  reaction = null,
  mirror = false,
  footer,
  className,
}: {
  seat: FutSeat;
  width: number;
  /** What each of the 3 slots shows (null: empty, or a playstyle still flying in). */
  slots: (CardId | null)[];
  /** Registers each slot's element, for the fly-in / fly-out animation. */
  slotRef?: (index: number, element: HTMLDivElement | null) => void;
  onSlotClick?: (index: number) => void;
  /** Slots that can't be clicked right now (mid-swap, where the newcomer doesn't fit): greyed. */
  blockedSlots?: boolean[];
  /** The loadout budget is spent: empty slots can't be filled, so they grey out. */
  emptyClosed?: boolean;
  bursts?: SlotBurst[];
  /** Bump to sweep a shine across the card with a little spin. */
  shineKey?: number;
  reaction?: FutReaction | null;
  /** The opponent's card faces the other way. */
  mirror?: boolean;
  footer?: ReactNode;
  className?: string;
}) {
  const height = Math.round(width * FRAME_ASPECT);
  const hasGoldBoot = slots.includes('golden-boot');
  const hasArmband = slots.includes('captains-armband');
  const hasBalls = slots.includes('second-ball');
  const hasMud = slots.includes('muddy-pitch');
  const hasFog = slots.includes('fog');
  const hasYellow = slots.includes('yellow-card');
  const hasFlag = slots.includes('offside-trap');
  const hasGloves = slots.includes('goalkeeper-gloves');
  const hasBus = slots.includes('park-the-bus');
  const hasScarf = slots.includes('home-advantage');
  const hasPads = slots.includes('shin-pads');
  const gear = useMemo(
    () => ({ goldBoot: hasGoldBoot, armband: hasArmband, balls: hasBalls, mud: hasMud, fog: hasFog, yellowCard: hasYellow, flag: hasFlag, gloves: hasGloves, bus: hasBus, scarf: hasScarf, shinPads: hasPads }),
    [hasGoldBoot, hasArmband, hasBalls, hasMud, hasFog, hasYellow, hasFlag, hasGloves, hasBus, hasScarf, hasPads],
  );
  const { tier, frame, accent } = tierLook(seat.rankPoints);
  // The sheen and the shine sweep are cut to the frame art's own outline, and only lighten it (never recolour it).
  const frameMask = { WebkitMaskImage: `url(${frame})`, maskImage: `url(${frame})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' };

  // Pointer tilt + sheen; an idle sway when nothing points at the card (touch screens).
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spin = useMotionValue(0);
  const tiltY = useSpring(useTransform(px, [0, 1], [-15, 15]), { stiffness: 160, damping: 18 });
  const rotateX = useSpring(useTransform(py, [0, 1], [11, -11]), { stiffness: 160, damping: 18 });
  const rotateY = useTransform(() => tiltY.get() + spin.get() + (mirror ? -4 : 4));
  const sheenPos = useTransform(() => `${px.get() * 100}% ${py.get() * 100}%`);
  const glarePos = useTransform(() => `${(1 - px.get()) * 100}% ${(1 - py.get()) * 100}%`);
  const hovering = useRef(false);
  // Idle sway (restarted from wherever the pointer left it).
  const [idleKey, setIdleKey] = useState(0);
  useEffect(() => {
    const a = animate(px, [px.get(), 0.3, 0.7], { duration: 3.4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' });
    const b = animate(py, [py.get(), 0.4, 0.6], { duration: 4.6, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' });
    return () => {
      a.stop();
      b.stop();
    };
  }, [idleKey, px, py]);

  // A landing: shine + a little spin.
  useEffect(() => {
    if (shineKey === 0) return;
    const a = animate(spin, [0, -24, 12, 0], { duration: 0.8, ease: 'easeOut' });
    return () => a.stop();
  }, [shineKey, spin]);

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    if (!hovering.current) {
      hovering.current = true;
      px.stop();
      py.stop();
    }
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width);
    py.set((event.clientY - rect.top) / rect.height);
  };
  const onPointerLeave = () => {
    if (!hovering.current) return;
    hovering.current = false;
    setIdleKey((k) => k + 1);
  };

  const rp = seat.rankPoints ?? 0;
  const s = (fraction: number) => Math.round(width * fraction);

  return (
    <div
      className={className}
      style={{ width, height, perspective: 900 }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-label={`${seat.name} player card`}
    >
      <motion.div className="relative size-full" style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}>
        {/* Glow behind the card, in the tier's accent. */}
        <div className="absolute inset-[4%] rounded-[30%] blur-2xl" style={{ background: accent, opacity: 0.4 }} />
        {/* The tier's own card design. */}
        <div className="absolute inset-0" style={{ backgroundImage: `url(${frame})`, backgroundSize: '100% 100%' }} data-fut-frame={frame} />
        {/* A soft sheen and glare that follow the tilt, on the frame's outline. */}
        <div className="absolute inset-0 overflow-hidden" style={frameMask}>
          <motion.div
            className="absolute inset-0 mix-blend-soft-light"
            style={{
              opacity: 0.55,
              backgroundImage: 'linear-gradient(115deg, transparent 25%, rgba(255,255,255,0.75) 45%, rgba(255,255,255,0.35) 55%, transparent 75%)',
              backgroundSize: '260% 260%',
              backgroundPosition: sheenPos,
            }}
          />
          <motion.div
            className="absolute inset-0 mix-blend-soft-light"
            style={{ backgroundImage: 'radial-gradient(40% 30% at center, rgba(255,255,255,0.6), transparent 70%)', backgroundSize: '200% 200%', backgroundPosition: glarePos }}
          />
          {/* The shine sweep when a playstyle lands. */}
          {shineKey > 0 && (
            <motion.div
              key={shineKey}
              className="absolute inset-y-[-20%] w-[45%]"
              style={{ background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.7), transparent)', rotate: 18 }}
              initial={{ left: '-60%' }}
              animate={{ left: '130%' }}
              transition={{ duration: 0.75, ease: 'easeInOut' }}
            />
          )}
        </div>

        {/* The player: their own avatar art, as a paper cut-out that reacts to each landing. */}
        {/* Full body between the RP column and the edge, feet on the name plate; jumps stay inside the card. */}
        <div className="absolute" style={{ left: s(0.27), top: s(0.13), width: s(0.66), height: Math.round(height * 0.6), transform: 'translateZ(14px)' }}>
          <CardCutout customization={seat.avatarCustomization} reaction={reaction} mirror={mirror} seed={mirror ? 3 : 0} gear={gear} />
        </div>
        {/* The landing card's own effect on the card. */}
        {reaction?.card && <CardReactionFx key={reaction.key} card={reaction.card} customization={seat.avatarCustomization} frameMask={frameMask} mirror={mirror} />}

        {/* RP and tier, top left: below the frame's sloping shoulder, so the number sits fully inside the card. */}
        <div className="absolute flex flex-col items-center leading-none" style={{ left: s(0.1), top: s(0.17), color: CARD_TEXT, textShadow: CARD_TEXT_SHADOW, ...poppins }}>
          <span className="font-black tracking-tight" style={{ fontSize: s(rp >= 10000 ? 0.085 : rp >= 1000 ? 0.1 : 0.125) }}>{rp}</span>
          <span className="font-extrabold opacity-90" style={{ fontSize: s(0.055) }}>RP</span>
          <span className="mt-1 h-0.5 w-full rounded-full" style={{ background: accent, boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} />
          {/* On a dark chip: some frames are near white at the top. */}
          <span className="mt-1 max-w-[5.5em] rounded-md px-1 py-px text-center font-extrabold uppercase" style={{ fontSize: s(0.042), background: 'rgba(0,0,0,0.32)' }}>{tier}</span>
        </div>

        {/* PlayStyle slots down the side. */}
        {Array.from({ length: DECK_SIZE }, (_, index) => {
          const layout = slotLayout(index);
          const id = slots[index] ?? null;
          const size = s(layout.size);
          const burst = bursts.filter((b) => b.slot === index);
          return (
            <div
              key={index}
              ref={(el) => slotRef?.(index, el)}
              className="absolute"
              style={{ left: s(layout.left), top: Math.round(height * layout.top), width: size, height: size * 0.9, transform: 'translateZ(24px)' }}
            >
              {id ? (
                <button
                  type="button"
                  onClick={() => onSlotClick?.(index)}
                  aria-label={`Remove ${CARD_BY_ID[id].name}`}
                  disabled={!onSlotClick || blockedSlots?.[index] === true}
                  className={cn(blockedSlots?.[index] === true && 'opacity-35')}
                >
                  <PlaystyleBadge id={id} size={size} showName={false} />
                </button>
              ) : (
                <div className={cn('size-full transition-opacity', emptyClosed && 'opacity-30')} style={{ clipPath: HEX, background: accent }}>
                  <div className="absolute grid place-items-center" style={{ inset: 2, clipPath: HEX, background: 'rgba(8,14,22,0.55)', color: 'rgba(255,255,255,0.7)', fontSize: size * 0.32, ...poppins, fontWeight: 800 }}>
                    {emptyClosed ? '–' : index + 1}
                  </div>
                </div>
              )}
              {burst.map((b) => (
                <SlotBurstFx key={b.key} color={CARD_TYPE_THEME[b.type].color} size={size} />
              ))}
            </div>
          );
        })}

        {/* Name plate. */}
        <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: Math.round(height * 0.72), color: CARD_TEXT, textShadow: CARD_TEXT_SHADOW, ...poppins }}>
          <span className="max-w-[78%] truncate font-black uppercase leading-tight" style={{ fontSize: s(0.085) }}>{seat.name}</span>
          <span className="my-1 h-0.5 w-[62%] rounded-full" style={{ background: accent, boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }} />
          <span className="rounded-full px-2 py-px font-extrabold uppercase tracking-wide" style={{ fontSize: s(0.042), background: 'rgba(0,0,0,0.32)' }}>
            {tier}
          </span>
          {footer && <div className="mt-1" style={{ fontSize: s(0.042) }}>{footer}</div>}
        </div>
      </motion.div>
    </div>
  );
}

/** A ring and a spray of sparks in the playstyle's type colour. */
function SlotBurstFx({ color, size }: { color: string; size: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <motion.div
        className="absolute inset-0"
        style={{ clipPath: HEX, background: color }}
        initial={{ scale: 1, opacity: 0.9 }}
        animate={{ scale: 2.4, opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 block rounded-full"
            style={{ width: size * 0.12, height: size * 0.12, marginLeft: -size * 0.06, marginTop: -size * 0.06, background: i % 2 ? color : '#ffffff' }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * size * 1.3, y: Math.sin(angle) * size * 1.3, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
