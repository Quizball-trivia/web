'use client';

/**
 * GUESS THE GOAL — 2D tactics-board renderer. A landscape SVG pitch (attack
 * left→right, like the ranked pitch) in the classic coaching-diagram style:
 * flat green, white markings, ring players (red = attack, navy = defense),
 * black arrows for movement (solid = with ball, dashed = off-ball run) and
 * thin lines for passes. Everything is a pure function of the sampled replay
 * time. Engine coords are x: 0..68 (pitch width), y: 0..105 (toward the
 * attacked goal); here they map to SVG as (y, x) so the goal sits on the right.
 */

import { useMemo } from 'react';
import {
  sampleTimeline,
  type TacticsGoalDef,
  type Timeline,
  type TacticsTrail,
} from '../lib/tacticsEngine';

const L = 105;
const W = 68;
const PAD = 3;
export const BOARD_VIEW_W = L + PAD * 2 + 2.6;
export const BOARD_VIEW_H = W + PAD * 2;

function sx(y: number): number {
  return y;
}

function sy(x: number): number {
  return x;
}

function trailD(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${sx(y).toFixed(2)} ${sy(x).toFixed(2)}`).join(' ');
}

function arrowHead(points: [number, number][]): string | null {
  if (points.length < 2) return null;
  const [ex, ey] = points[points.length - 1];
  const [px, py] = points[points.length - 2];
  const dx = sx(ey) - sx(py);
  const dy = sy(ex) - sy(px);
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const size = 1.9;
  const bx = sx(ey) - ux * size;
  const by = sy(ex) - uy * size;
  const nx = -uy;
  const ny = ux;
  return `M${sx(ey).toFixed(2)} ${sy(ex).toFixed(2)} L${(bx + nx * size * 0.62).toFixed(2)} ${(by + ny * size * 0.62).toFixed(2)} L${(bx - nx * size * 0.62).toFixed(2)} ${(by - ny * size * 0.62).toFixed(2)} Z`;
}

const INK = 'rgba(15,26,20,0.82)';
export const TRAIL_COLORS: Record<TacticsTrail['kind'], string> = {
  carry: INK,
  run: INK,
  pass: '#ffffff',
  shot: '#FFE500',
};

function Trail({ trail }: { trail: TacticsTrail }) {
  const d = trailD(trail.points);
  const head = arrowHead(trail.points);
  if (trail.kind === 'pass') {
    const [ex, ey] = trail.points[trail.points.length - 1];
    return (
      <g>
        <path d={d} fill="none" stroke="#ffffff" strokeWidth={0.5} strokeLinecap="round" opacity={0.95} />
        <circle cx={sx(ey)} cy={sy(ex)} r={0.95} fill="none" stroke="#ffffff" strokeWidth={0.5} opacity={0.95} />
      </g>
    );
  }
  if (trail.kind === 'shot') {
    return (
      <g>
        <path d={d} fill="none" stroke="#FFE500" strokeWidth={0.95} strokeLinecap="round" />
        {head && <path d={head} fill="#FFE500" />}
      </g>
    );
  }
  if (trail.kind === 'run') {
    return (
      <g>
        <path d={d} fill="none" stroke={INK} strokeWidth={0.55} strokeDasharray="0.9 1.5" strokeLinecap="round" />
        {head && <path d={head} fill={INK} />}
      </g>
    );
  }
  return (
    <g>
      <path d={d} fill="none" stroke={INK} strokeWidth={1.05} strokeLinecap="round" />
      {head && <path d={head} fill={INK} />}
    </g>
  );
}

export function TacticsBoard2D({
  goal,
  timeline,
  t,
  goalFlash,
}: {
  goal: TacticsGoalDef;
  timeline: Timeline;
  t: number;
  goalFlash: boolean;
}) {
  const sample = useMemo(() => sampleTimeline(goal, timeline, t), [goal, timeline, t]);

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${BOARD_VIEW_W} ${BOARD_VIEW_H}`}
      className="h-full w-full"
      role="img"
      aria-label="Tactics board replay"
    >
      {/* Pitch */}
      <rect x={-PAD} y={-PAD} width={BOARD_VIEW_W} height={BOARD_VIEW_H} rx={2} fill="#5da95b" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={(L / 6) * i} y={0} width={L / 12} height={W} fill="rgba(255,255,255,0.045)" />
      ))}
      <g fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={0.45}>
        <rect x={0} y={0} width={L} height={W} />
        <line x1={L / 2} y1={0} x2={L / 2} y2={W} />
        <circle cx={L / 2} cy={W / 2} r={9.15} />
        {/* Attacked (right) penalty box + 6-yard */}
        <rect x={L - 16.5} y={W / 2 - 20.16} width={16.5} height={40.32} />
        <rect x={L - 5.5} y={W / 2 - 9.16} width={5.5} height={18.32} />
        {/* Defending (left) boxes */}
        <rect x={0} y={W / 2 - 20.16} width={16.5} height={40.32} />
        <rect x={0} y={W / 2 - 9.16} width={5.5} height={18.32} />
      </g>
      <circle cx={L / 2} cy={W / 2} r={0.7} fill="rgba(255,255,255,0.85)" />
      {/* Goal frame at the attacked end */}
      <rect x={L} y={W / 2 - 3.66} width={2.4} height={7.32} fill="rgba(255,255,255,0.25)" stroke="#fff" strokeWidth={0.5} />

      {/* Trails under the players */}
      {sample.trails.map((trail, i) => (
        <Trail key={i} trail={trail} />
      ))}

      {/* Players */}
      {goal.players.map((pl) => {
        const [x, y] = sample.players[pl.id];
        const ring = pl.team === 'attack' ? '#e23c34' : pl.team === 'keeper' ? '#f2a900' : '#1d3461';
        return (
          <g key={pl.id}>
            <circle cx={sx(y)} cy={sy(x) + 0.5} r={2.1} fill="rgba(0,0,0,0.18)" />
            <circle cx={sx(y)} cy={sy(x)} r={2.1} fill="#fff" stroke={ring} strokeWidth={0.9} />
          </g>
        );
      })}

      {/* Ball — scales up slightly while lofted */}
      <circle
        cx={sx(sample.ball[1])}
        cy={sy(sample.ball[0])}
        r={1 + sample.ballH * 0.9}
        fill="#fff"
        stroke="#111"
        strokeWidth={0.35}
      />

      {goalFlash && (
        <g>
          <rect x={L / 2 + 10} y={6} width={32} height={10} rx={2.4} fill="rgba(10,16,12,0.78)" />
          <text
            x={L / 2 + 26}
            y={13.2}
            textAnchor="middle"
            fontSize={7}
            fontWeight={900}
            fill="#FFE500"
            style={{ fontFamily: 'Poppins, sans-serif', letterSpacing: '0.08em' }}
          >
            GOAL!
          </text>
        </g>
      )}
    </svg>
  );
}
