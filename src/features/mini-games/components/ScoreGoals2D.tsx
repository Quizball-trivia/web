'use client';

/**
 * SCORE! — 2D top-down view. Attacking goal at the top; the whole scene is an
 * SVG in pitch metres so drag input maps 1:1 to the shared coordinate system
 * (see data/scoreGoals.ts). The flight loop mirrors the 3D view via
 * lib/scoreGoalsFlight so both versions play identically.
 */

import { useEffect, useRef, useState } from 'react';
import { GOAL_HALF_W, type GoalPlayer } from '../data/scoreGoals';
import {
  drawnCurveOf,
  easeInOut01,
  flightPos,
  type ScoreGoalsViewProps,
} from '../lib/scoreGoalsFlight';

const VB_X = -27;
const VB_W = 54;
const GOAL_LINE_Y = 3.5;
const NET_DEPTH = 2;

const toSvg = (x: number, z: number): [number, number] => [x, z + GOAL_LINE_Y];

export function ScoreGoals2D({
  goal,
  stepIndex,
  positions,
  phase,
  flight,
  showHint,
  onAim,
  onFlightEnd,
}: ScoreGoalsViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<[number, number][] | null>(null);
  const dragRef = useRef<[number, number][] | null>(null);
  const downTimeRef = useRef(0);
  const [anim, setAnim] = useState<{ flight: unknown; t: number } | null>(null);
  const endedRef = useRef(false);

  const step = goal.steps[stepIndex];
  const vbH = goal.depth + GOAL_LINE_Y + 5;

  useEffect(() => {
    if (phase !== 'fly' || !flight) return;
    endedRef.current = false;
    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / (flight.duration * 1000));
      setAnim({ flight, t: p });
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else if (!endedRef.current) {
        endedRef.current = true;
        onFlightEnd();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, flight, onFlightEnd]);

  const t = phase === 'done' ? 1 : phase === 'fly' && anim?.flight === flight ? anim.t : 0;

  const toPitch = (e: React.PointerEvent): [number, number] | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = new DOMPoint(e.clientX, e.clientY);
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = pt.matrixTransform(ctm.inverse());
    return [p.x, p.y - GOAL_LINE_Y];
  };

  const setDragBoth = (p: [number, number][] | null) => {
    dragRef.current = p;
    setDrag(p);
  };
  const handleDown = (e: React.PointerEvent) => {
    if (phase !== 'aim') return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    downTimeRef.current = performance.now();
    const p = toPitch(e);
    if (p) setDragBoth([p]);
  };
  const handleMove = (e: React.PointerEvent) => {
    if (phase !== 'aim' || !dragRef.current) return;
    const p = toPitch(e);
    if (!p) return;
    const path = dragRef.current;
    const last = path[path.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.4) return;
    setDragBoth([...path.slice(-63), p]);
  };
  const handleUp = () => {
    if (phase !== 'aim' || !dragRef.current) return;
    const path = dragRef.current;
    setDragBoth(null);
    const aim = path[path.length - 1];
    if (!aim) return;
    const dx = aim[0] - step.from[0];
    const dz = aim[1] - step.from[1];
    if (Math.hypot(dx, dz) < 1.5) return;
    onAim(aim, drawnCurveOf(path), performance.now() - downTimeRef.current);
  };

  const sample =
    flight && (phase === 'fly' || phase === 'done') ? flightPos(flight, t) : null;
  const ballX = sample ? sample.x : step.from[0];
  const ballZ = sample ? sample.z : step.from[1];
  const ballH = sample ? sample.h : 0.11;
  const run = easeInOut01(t);

  const playerPos = (p: GoalPlayer): [number, number] => {
    const base = positions[p.id] ?? p.pos;
    if (flight && (phase === 'fly' || phase === 'done') && flight.success) {
      if (step.kind === 'pass' && step.receiverId === p.id) {
        return [
          base[0] + (step.to[0] - base[0]) * run,
          base[1] + (step.to[1] - base[1]) * run,
        ];
      }
      for (const n of step.nudges ?? []) {
        if (n.id === p.id) {
          return [base[0] + (n.to[0] - base[0]) * run, base[1] + (n.to[1] - base[1]) * run];
        }
      }
    }
    if (step.kind === 'dribble' && flight && (phase === 'fly' || phase === 'done') && p.id === step.actorId) {
      return [ballX - 0.4, ballZ + 0.7];
    }
    return base;
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`${VB_X} 0 ${VB_W} ${vbH}`}
      className="absolute inset-0 h-full w-full touch-none select-none"
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={() => setDrag(null)}
    >
      <defs>
        <pattern id="sg-net" width="0.55" height="0.55" patternUnits="userSpaceOnUse">
          <path d="M0 0H0.55V0.55" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.05" />
        </pattern>
        <radialGradient id="sg-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE500" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFE500" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Turf with mow stripes */}
      <rect x={VB_X} y={0} width={VB_W} height={vbH} fill="#0f5c30" />
      {Array.from({ length: Math.ceil(vbH / 5) }, (_, i) => (
        <rect
          key={i}
          x={VB_X}
          y={GOAL_LINE_Y + i * 5}
          width={VB_W}
          height={2.5}
          fill="rgba(255,255,255,0.045)"
        />
      ))}

      {/* Markings */}
      <g stroke="rgba(255,255,255,0.75)" strokeWidth="0.16" fill="none">
        <line x1={VB_X + 1} y1={GOAL_LINE_Y} x2={VB_X + VB_W - 1} y2={GOAL_LINE_Y} />
        {/* Penalty area (16.5m deep, 40.3m wide) */}
        <rect x={-20.16} y={GOAL_LINE_Y} width={40.32} height={16.5} />
        {/* Six-yard box */}
        <rect x={-9.16} y={GOAL_LINE_Y} width={18.32} height={5.5} />
        {/* Penalty arc */}
        <path d="M -7.3 27.3 A 9.15 9.15 0 0 0 7.3 27.3" />
      </g>
      <circle cx={0} cy={GOAL_LINE_Y + 11} r={0.25} fill="rgba(255,255,255,0.75)" />

      {/* Goal + net */}
      <rect
        x={-GOAL_HALF_W}
        y={GOAL_LINE_Y - NET_DEPTH}
        width={GOAL_HALF_W * 2}
        height={NET_DEPTH}
        fill="url(#sg-net)"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="0.2"
      />

      {/* Completed-step trail */}
      {goal.steps.slice(0, stepIndex).map((s, i) => {
        const [x1, y1] = toSvg(s.from[0], s.from[1]);
        const [x2, y2] = toSvg(s.to[0], s.kind === 'shot' ? 0 : s.to[1]);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="0.22"
            strokeDasharray="0.5 0.7"
          />
        );
      })}

      {/* Hint pulse at the historic destination */}
      {showHint && phase === 'aim' && (
        <g>
          {(() => {
            const target: [number, number] =
              step.kind === 'shot' ? [step.shotTarget?.[0] ?? 0, -1] : step.to;
            const [hx, hy] = toSvg(target[0], target[1]);
            return (
              <>
                <circle cx={hx} cy={hy} r={4.5} fill="url(#sg-glow)" />
                <circle cx={hx} cy={hy} r={2} fill="none" stroke="#FFE500" strokeWidth="0.25">
                  <animate attributeName="r" values="1.4;2.6;1.4" dur="1.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.35;1" dur="1.4s" repeatCount="indefinite" />
                </circle>
              </>
            );
          })()}
        </g>
      )}

      {/* Players */}
      {goal.players.map((p) => {
        const [px, pz] = playerPos(p);
        const [sx, sy] = toSvg(px, pz);
        const kit = p.team === 'atk' ? goal.atkKit : p.team === 'gk' ? goal.gkKit : goal.defKit;
        const isActor = p.id === step.actorId;
        return (
          <g key={p.id}>
            {isActor && phase === 'aim' && (
              <circle cx={sx} cy={sy} r={1.7} fill="none" stroke="#FFE500" strokeWidth="0.18" opacity="0.8" />
            )}
            <circle cx={sx} cy={sy} r={1.15} fill={kit.shirt} stroke="rgba(0,0,0,0.45)" strokeWidth="0.12" />
            <text
              x={sx}
              y={sy + 0.42}
              textAnchor="middle"
              fontSize="1.15"
              fontWeight="800"
              fill={kit.shirt === '#f4f4f4' || kit.shirt === '#ffdc00' || kit.shirt === '#98c5e9' || kit.shirt === '#9ec7e8' || kit.shirt === '#d9cf3e' || kit.shirt === '#caced4' ? '#111' : '#fff'}
              style={{ pointerEvents: 'none' }}
            >
              {p.number}
            </text>
            {p.team === 'atk' && (
              <text
                x={sx}
                y={sy + 2.5}
                textAnchor="middle"
                fontSize="1"
                fontWeight="700"
                fill="rgba(255,255,255,0.72)"
                style={{ pointerEvents: 'none' }}
              >
                {p.name}
              </text>
            )}
          </g>
        );
      })}

      {/* Drawn swipe path */}
      {drag && drag.length > 0 && phase === 'aim' && (
        <g>
          <polyline
            points={[[step.from[0], step.from[1]] as [number, number], ...drag]
              .map((p) => `${p[0]},${p[1] + GOAL_LINE_Y}`)
              .join(' ')}
            fill="none"
            stroke="#FFE500"
            strokeWidth="0.3"
            strokeDasharray="0.9 0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={drag[drag.length - 1][0]}
            cy={drag[drag.length - 1][1] + GOAL_LINE_Y}
            r={0.7}
            fill="none"
            stroke="#FFE500"
            strokeWidth="0.25"
          />
        </g>
      )}

      {/* Ball (scaled up slightly with height) + shadow */}
      <ellipse
        cx={ballX}
        cy={ballZ + GOAL_LINE_Y + 0.25}
        rx={0.5}
        ry={0.3}
        fill="rgba(0,0,0,0.35)"
      />
      <circle
        cx={ballX}
        cy={ballZ + GOAL_LINE_Y - ballH * 0.35}
        r={0.5 * (1 + Math.min(ballH, 6) * 0.07)}
        fill="#ffffff"
        stroke="#1a1a1a"
        strokeWidth="0.1"
      />
    </svg>
  );
}
