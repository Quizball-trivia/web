'use client';

/**
 * A FIFA Ultimate Team–style player card for a seat, on its tier's own card design (the rank frame art the match HUD
 * and the profile use, coloured by the tier's accent) with a soft sheen and a 3D tilt that follow the pointer (a
 * gentle sway on touch), the seat's RP and tier,
 * the player's own avatar art as a paper cut-out (AvatarPreview), and the three PlayStyle slots down the
 * side, FUT-style. Picking a playstyle lands it on its slot with a burst; the card answers with a shine sweep, a
 * little spin and a reaction from the player.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { animate, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { AvatarFullBody, applyFullBodyPose, type FullBodyEls } from './AvatarFullBody';
import { celebratePose, crouchPose, divePose, idlePose, keeperSetPose, stepOverPose, strikePose, type FullBodyPose } from './zoneMatch.fullBody';
import type { AvatarCustomization } from '@/types/game';
import { tierFromRp } from '@/utils/rankedTier';
import { getTierAccent, getTierFrameSrc } from '@/utils/tierVisuals';
import { cn } from '@/lib/utils';
import { CARD_BY_ID, DECK_SIZE, type CardId, type CardType } from './zoneMatch.cards';
import { CARD_TYPE_THEME, PlaystyleBadge } from './ZoneMatchCardFace';


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

/** What the card's avatar does when a playstyle lands: boost kicks, defense dives, tactical dribbles, sabotage
 * crouches, and a jump-spin with confetti when the loadout completes. */
export interface FutReaction {
  kind: CardType | 'complete';
  key: number;
  /** Which way a defense dive goes. */
  seed: number;
}

export function reactionFor(type: CardType | 'complete', key: number, seed = 0): FutReaction {
  return { kind: type, key, seed };
}

const CONFETTI_COLORS = ['#FFE500', '#1CB0F6', '#FF4B4B', '#58CC02', '#FFFFFF', '#FF9600'];
/** How long each reaction plays (s). */
const REACTION_S: Record<FutReaction['kind'], number> = { boost: 1.5, defense: 1.6, tactical: 1.4, sabotage: 1.3, complete: 2.2 };

/**
 * One frame of a card reaction: the legs' pose and the whole figure's lift / tilt / spin (lift in % of the figure's
 * height, kept small enough that the head never leaves the card).
 */
function reactionFrame(reaction: FutReaction | null, t: number, now: number): { body: FullBodyPose; lift: number; tilt: number; spin: number; shift: number } {
  const still = { lift: 0, tilt: 0, spin: 0, shift: 0 };
  if (!reaction || t >= REACTION_S[reaction.kind]) return { body: idlePose(now), ...still };
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
      return { body: t < 0.25 ? keeperSetPose(now) : divePose(k), lift: 7 * Math.sin(Math.PI * Math.min(1, t / 0.8)) * (1 - Math.min(1, back)), tilt: 62 * dir * out, spin: 0, shift: 12 * dir * out };
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
      return { body: celebratePose(t), lift: 9 * Math.sin(Math.PI * Math.min(1, Math.max(0, (c - 0.2) / 0.65))), tilt: 0, spin: t < 0.85 ? 360 * Math.min(1, t / 0.85) : 0, shift: 0 };
    }
  }
}

/**
 * The avatar on the card, full body: idling (weight shifting), and reacting with its legs when a playstyle lands.
 * Posed in a requestAnimationFrame loop with SVG / CSS transforms only, ~30 fps, nothing while off screen.
 */
function CardCutout({ customization, reaction, mirror, seed }: { customization: AvatarCustomization | null; reaction: FutReaction | null; mirror: boolean; seed: number }) {
  const [els, setEls] = useState<FullBodyEls | null>(null);
  const figure = useRef<HTMLDivElement>(null);
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
      const f = reactionFrame(reaction, t, now);
      applyFullBodyPose(els, f.body);
      if (figure.current) figure.current.style.transform = `translate(${f.shift.toFixed(1)}%, ${(-f.lift).toFixed(1)}%) rotate(${f.tilt.toFixed(1)}deg) rotateY(${f.spin.toFixed(0)}deg)`;
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [els, reaction]);
  return (
    <div className="absolute inset-0">
      <div ref={figure} className="absolute inset-x-0 bottom-0 flex h-[88%] justify-center" style={{ transformOrigin: '50% 98%' }}>
        <div style={{ height: '100%', transform: mirror ? 'scaleX(-1)' : undefined }}>
          <AvatarFullBody customization={customization} seed={seed} onEls={setEls} style={{ height: '100%' }} />
        </div>
      </div>
      {reaction?.kind === 'complete' && (
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
                transition={{ duration: 1.6, ease: 'easeOut' }}
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
          <CardCutout customization={seat.avatarCustomization} reaction={reaction} mirror={mirror} seed={mirror ? 3 : 0} />
        </div>

        {/* RP and tier, top left. */}
        <div className="absolute flex flex-col items-center leading-none" style={{ left: s(0.08), top: s(0.12), color: CARD_TEXT, textShadow: CARD_TEXT_SHADOW, ...poppins }}>
          <span className="font-black tracking-tight" style={{ fontSize: s(rp >= 1000 ? 0.12 : 0.15) }}>{rp}</span>
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
