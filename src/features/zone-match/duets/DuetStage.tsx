'use client';

/**
 * Two player cards side by side playing one playstyle's duet (zoneMatch.duets): each card's avatar plays its part on
 * time, and the props (the ball, the mud, the fog…) fly across an overlay from one card to the other.
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';
import { CARD_BY_ID, type CardId } from '../zoneMatch.cards';
import { DUETS, type DuetActor, type DuetAnchor, type DuetProp } from '../zoneMatch.duets';
import { FRAME_ASPECT, FutCard, type FutReaction, type FutSeat } from '../ZoneMatchFutCard';
import { BallArt } from '../ZoneMatchFutReactions';
import { CardArt } from '../ZoneMatchCardFace';
import type { DuelSide } from '@/features/numeric-question/numericDuel';

const other = (side: DuelSide): DuelSide => (side === 'player' ? 'opponent' : 'player');
/** The figure's art box on the card (FutCard's cut-out area, then the art inside it). */
const AREA = { left: 0.27, top: 0.13, width: 0.66, height: 0.6 };
const ART = { left: 0.1207, width: 0.7585, top: 0.12, height: 0.88 };

function toReaction(actor: DuetActor, key: number, duet: boolean): FutReaction {
  return 'card' in actor
    ? { kind: CARD_BY_ID[actor.card].type, key, seed: key, card: actor.card, ballFrom: actor.ballFrom, ballUntil: actor.ballUntil, ball2From: actor.ball2From, duet }
    : { kind: 'tactical', key, seed: key, move: actor.move, goldBall: actor.goldBall };
}

export function DuetStage({
  card,
  owner,
  seats,
  width,
  playKey,
  solo = false,
}: {
  card: CardId;
  /** Who plays the card. */
  owner: DuelSide;
  seats: Record<DuelSide, FutSeat>;
  /** One card's width. */
  width: number;
  /** Bump to play it again. */
  playKey: number;
  /** Today's reveal: only the owner's own card reaction, nothing on the other card. */
  solo?: boolean;
}) {
  const duet = DUETS[card];
  const gap = Math.round(width * 0.22);
  const height = Math.round(width * FRAME_ASPECT);
  const [reactions, setReactions] = useState<Record<DuelSide, FutReaction | null>>({ player: null, opponent: null });
  /** Which card has landed on whose card (kept between replays). */
  const [landed, setLanded] = useState<string | null>(null);
  const landedKey = `${card}:${owner}`;

  useEffect(() => {
    const rival = other(owner);
    const parts: [DuelSide, DuetActor][] = solo ? [[owner, { card, at: 0 }]] : [[owner, duet.owner], [rival, duet.rival]];
    // Both back to idle, then each part on its cue.
    const reset = window.setTimeout(() => setReactions({ player: null, opponent: null }), 0);
    const timers = parts.map(([side, actor], i) =>
      window.setTimeout(() => {
        setReactions((r) => ({ ...r, [side]: toReaction(actor, playKey * 10 + i, !solo) }));
        if (side === owner) setLanded(`${card}:${owner}`);
      }, 20 + actor.at * 1000),
    );
    return () => [reset, ...timers].forEach((t) => window.clearTimeout(t));
  }, [playKey, owner, card, duet, solo]);

  /** An anchor → px on the stage. */
  const scale = (width * AREA.width * ART.width) / 496;
  const point = (a: DuetAnchor): [number, number] => {
    const y = width * AREA.top + height * AREA.height * (ART.top + (a.y / 840) * ART.height);
    if (a.on === 'mid') return [width + gap / 2 + a.x * scale, y];
    const side = a.on === 'owner' ? owner : other(owner);
    const left = side === 'player' ? 0 : width + gap;
    // The right-hand card is mirrored: its figure faces left.
    const x = side === 'player' ? a.x : 496 - a.x;
    return [left + width * AREA.left + width * AREA.width * (ART.left + (x / 496) * ART.width), y];
  };
  const rivalLeft = other(owner) === 'player' ? 0 : width + gap;
  // The playstyle lands on the owner's card as its reaction starts, and stays for replays unless the duet wants it fresh.
  const onCard = !!reactions[owner] || (landed === landedKey && !duet.freshSlot);
  const slotsOf = (side: DuelSide) => [side === owner && onCard ? card : null, null, null];

  return (
    <div className="relative" style={{ width: width * 2 + gap, height }}>
      <div className="absolute left-0 top-0">
        <FutCard key={`p-${card}`} seat={seats.player} width={width} slots={slotsOf('player')} reaction={reactions.player} />
      </div>
      <div className="absolute top-0" style={{ left: width + gap }}>
        <FutCard key={`o-${card}`} seat={seats.opponent} width={width} slots={slotsOf('opponent')} reaction={reactions.opponent} mirror />
      </div>
      <div className="pointer-events-none absolute self-center text-3xl font-black italic text-white/25" style={{ left: width + gap / 2, top: height * 0.45, transform: 'translate(-50%, -50%)' }}>
        VS
      </div>

      {!solo && playKey > 0 && (
        <div key={playKey} className="pointer-events-none absolute inset-0" style={{ zIndex: 20 }}>
          {duet.blackout && (
            <motion.div
              className="absolute rounded-[18%]"
              style={{ left: rivalLeft, top: 0, width, height, background: 'radial-gradient(ellipse at 50% 40%, rgba(5,8,20,0.75), rgba(0,0,0,0.92))' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0.6, 0.85, 0.85, 0] }}
              transition={{ delay: duet.blackout.at, duration: duet.blackout.dur, times: [0, 0.08, 0.14, 0.2, 0.85, 1] }}
            />
          )}
          {duet.props.map((prop, i) => (
            <Prop key={i} prop={prop} point={point} scale={scale} />
          ))}
        </div>
      )}
    </div>
  );
}

const STEPS = 14;

/** A prop is only mounted once its time comes: a keyframed one would otherwise sit on its first frame meanwhile. */
function Prop(props: { prop: DuetProp; point: (a: DuetAnchor) => [number, number]; scale: number }) {
  const [due, setDue] = useState(false);
  useEffect(() => {
    // On the avatars' clock: their parts start 20 ms in and pick up their first frame a frame or two later, so a ball
    // handed on from a card's own ball takes over just as that one goes.
    const id = window.setTimeout(() => setDue(true), 60 + props.prop.at * 1000);
    return () => window.clearTimeout(id);
  }, [props.prop.at]);
  return due ? <PropFlight {...props} /> : null;
}

function PropFlight({ prop, point, scale }: { prop: DuetProp; point: (a: DuetAnchor) => [number, number]; scale: number }) {
  const [fx, fy] = point(prop.from);
  const [tx, ty] = prop.to ? point(prop.to) : [fx, fy];
  const arc = (prop.arc ?? 0) * scale;
  const us = Array.from({ length: STEPS + 1 }, (_, i) => i / STEPS);
  const travels = !!prop.to;
  const xs = us.map((u) => fx + (tx - fx) * u);
  const ys = us.map((u) => fy + (ty - fy) * u - 4 * arc * u * (1 - u));
  const size = (prop.size ?? SIZE[prop.kind]) * scale;
  // A thing that travels shows throughout and fades as it arrives; a pop grows, holds and fades.
  const peak = prop.kind === 'fog' ? 0.7 : 1;
  // A solid prop is whole from its first frame and gone on its last, so the next one takes over in place.
  const opacity = prop.solid ? us.map((u) => (u < 1 ? 1 : 0)) : (travels ? us.map((u) => (u < 0.06 ? u / 0.06 : u > 0.9 ? (1 - u) / 0.1 : 1)) : us.map((u) => (u < 0.12 ? u / 0.12 : u > 0.8 ? (1 - u) / 0.2 : 1))).map((o) => o * peak);
  const grow = prop.solid ? us.map(() => 1) : prop.kind === 'fog' ? us.map((u) => 0.5 + 1.2 * u) : travels ? us.map(() => 1) : us.map((u) => (u < 0.15 ? 0.3 + (u / 0.15) * 0.9 : u < 0.25 ? 1.2 - (u - 0.15) * 2 : 1));
  const spin = travels && (prop.kind === 'ball' || prop.kind === 'gold-ball' || prop.kind === 'mud') ? us.map((u) => u * 720) : us.map(() => 0);
  // A rocket leaves a flame behind it: copies on the same path a moment later, smaller and fainter.
  const echoes = prop.kind === 'gold-ball' && travels ? [0.04, 0.08, 0.12, 0.16] : [];
  return (
    <>
      {echoes.map((lag, i) => (
        <motion.div
          key={lag}
          className="absolute left-0 top-0"
          initial={{ opacity: 0, x: fx, y: fy }}
          animate={{ x: xs, y: ys, opacity: opacity.map((o) => o * (0.55 - i * 0.12)) }}
          transition={{ duration: prop.dur, ease: 'linear', delay: lag }}
        >
          <div className="rounded-full" style={{ width: size * (0.85 - i * 0.14), height: size * (0.85 - i * 0.14), marginLeft: (-size * (0.85 - i * 0.14)) / 2, marginTop: (-size * (0.85 - i * 0.14)) / 2, background: 'radial-gradient(closest-side, rgba(255,226,90,0.95), rgba(255,120,0,0.5) 70%, transparent)' }} />
        </motion.div>
      ))}
    <motion.div
      className="absolute left-0 top-0"
      initial={{ opacity: 0, x: fx, y: fy }}
      animate={{ x: xs, y: ys, opacity, scale: grow, rotate: spin }}
      transition={{ duration: prop.dur, ease: 'linear' }}
    >
      <div style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }}>
        <PropArt prop={prop} />
      </div>
    </motion.div>
    </>
  );
}

/** Each prop's size (art units, as on the figure). */
const SIZE: Record<DuetProp['kind'], number> = { ball: 92, 'gold-ball': 92, mud: 110, fog: 300, notes: 150, clang: 170, bolt: 120, icon: 150, flash: 260 };

function PropArt({ prop }: { prop: DuetProp }) {
  switch (prop.kind) {
    case 'ball':
      return <BallArt />;
    case 'gold-ball':
      return (
        <div className="size-full" style={{ filter: 'sepia(1) saturate(6) hue-rotate(-12deg) brightness(1.15) drop-shadow(0 0 8px #FFC107)' }}>
          <BallArt />
        </div>
      );
    case 'mud':
      return (
        <svg viewBox="-50 -50 100 100" className="size-full overflow-visible" aria-hidden>
          <path d="M-30-8C-38-30-10-44 6-34 22-46 46-26 34-6 48 10 30 40 8 30-8 46-40 34-32 12-46 6-40-4-30-8Z" fill="#5B3A1D" stroke="#2E1C0B" strokeWidth={4} />
          <circle cx="-8" cy="-12" r="9" fill="#8A5A2E" />
          <circle cx="44" cy="-34" r="6" fill="#5B3A1D" />
          <circle cx="-44" cy="30" r="5" fill="#5B3A1D" />
        </svg>
      );
    case 'fog':
      return <div className="size-full rounded-full" style={{ background: 'radial-gradient(circle, rgba(235,240,250,0.95), rgba(220,228,240,0.6) 45%, transparent 70%)', filter: 'blur(4px)' }} />;
    case 'notes':
      return (
        <div className="flex size-full items-center justify-center gap-1 text-brand-yellow drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" style={{ fontSize: '2.2em' }}>
          <span className="-translate-y-2">♪</span>
          <span>♫</span>
          <span className="-translate-y-3">♪</span>
        </div>
      );
    case 'clang':
      return (
        <svg viewBox="-50 -50 100 100" className="size-full overflow-visible" aria-hidden>
          <polygon
            points={Array.from({ length: 20 }, (_, i) => {
              const r = i % 2 ? 22 : 46;
              const a = (i / 20) * Math.PI * 2;
              return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
            }).join(' ')}
            fill="#FFE500"
            stroke="#C98B00"
            strokeWidth={3}
          />
        </svg>
      );
    case 'bolt':
      return <Zap className="size-full text-brand-yellow drop-shadow-[0_0_8px_rgba(255,229,0,0.8)]" fill="currentColor" strokeWidth={1.5} />;
    case 'icon':
      return prop.card ? <CardArt id={prop.card} /> : null;
    case 'flash':
      // Where it goes in: a white burst and a ring.
      return (
        <div className="relative size-full">
          <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,226,90,0.6) 35%, transparent 70%)' }} />
          <div className="absolute inset-[15%] rounded-full border-4 border-white/90" />
        </div>
      );
  }
}
