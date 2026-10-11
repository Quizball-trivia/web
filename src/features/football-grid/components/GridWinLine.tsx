'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface Box { x: number; y: number; w: number; h: number }
interface Point { x: number; y: number }

const TONES = {
  self: 'hsl(var(--brand-cyan))',
  rival: 'hsl(var(--brand-red-soft))',
} as const;
// The last claim's own pop-in finishes first, then the stroke crosses.
const START_S = 0.45;
const DRAW_S = 0.42;

const at = (from: Point, to: Point, t: number): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });

/** A brush stroke: thin where the pen lands and lifts, full in between, with a slight sway. */
function brushPath(from: Point, to: Point, width: number): string {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const nx = -(to.y - from.y) / length;
  const ny = (to.x - from.x) / length;
  const steps = 14;
  const upper: string[] = [];
  const lower: string[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const centre = at(from, to, t);
    const sway = Math.sin(t * Math.PI * 2) * width * 0.12;
    const half = (width / 2) * Math.min(1, Math.sin(t * Math.PI) ** 0.45 + 0.08) * (t > 0.85 ? 1 - (t - 0.85) * 2.4 : 1);
    upper.push(`${(centre.x + nx * (sway + half)).toFixed(1)},${(centre.y + ny * (sway + half)).toFixed(1)}`);
    lower.unshift(`${(centre.x + nx * (sway - half)).toFixed(1)},${(centre.y + ny * (sway - half)).toFixed(1)}`);
  }
  return `M${upper.join(' L')} L${lower.join(' L')} Z`;
}

/**
 * Drawn over a finished board: a marker stroke crosses out the three squares that won, in the winner's colour, and
 * the rest of the board dims. Sits inside a `relative` wrapper around the board and reads the squares' positions
 * from it, so the board itself is not changed.
 */
export function GridWinLine({ cells, tone }: { cells: readonly number[]; tone: keyof typeof TONES }) {
  const ref = useRef<HTMLDivElement>(null);
  const maskId = useId();
  const still = useReducedMotion();
  const [boxes, setBoxes] = useState<Box[] | null>(null);

  useEffect(() => {
    const overlay = ref.current;
    const host = overlay?.parentElement;
    if (!overlay || !host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const next: Box[] = [];
      for (let cell = 0; cell < 9; cell += 1) {
        const square: HTMLElement | null = host.querySelector<HTMLElement>(`[data-grid-anchor="cell-${cell}"]`);
        if (!square) return;
        // Layout offsets, not client rects: a square may still be mid-transform from its own entrance.
        let x = 0;
        let y = 0;
        for (let node: HTMLElement | null = square; node && node !== host; node = node.offsetParent as HTMLElement | null) {
          x += node.offsetLeft;
          y += node.offsetTop;
        }
        next.push({ x, y, w: square.offsetWidth, h: square.offsetHeight });
      }
      setBoxes(next);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const line = boxes && cells.length === 3 ? cells.map((cell) => boxes[cell]) : null;
  if (!boxes || !line) return <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10" />;

  const colour = TONES[tone];
  const centre = (box: Box): Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
  const first = centre(line[0]);
  const last = centre(line[2]);
  const length = Math.hypot(last.x - first.x, last.y - first.y);
  const ux = (last.x - first.x) / length;
  const uy = (last.y - first.y) / length;
  // The stroke starts before the first square's centre and runs past the last one's, like a pen stroke.
  const reach = line[0].w * 0.36;
  const from: Point = { x: first.x - ux * reach, y: first.y - uy * reach };
  const to: Point = { x: last.x + ux * reach, y: last.y + uy * reach };
  const start = still ? 0 : START_S;
  const draw = still ? 0 : DRAW_S;
  // When the stroke reaches each winning square, so the square can answer it.
  const reachedAt = (index: number) => start + draw * ((reach + (length * index) / 2) / (length + reach * 2));

  return (
    <div ref={ref} aria-hidden="true" data-grid-anchor="win-line" className="pointer-events-none absolute inset-0 z-10">
      {boxes.map((box, cell) => cells.includes(cell) ? null : (
        <motion.span
          key={`dim-${cell}`}
          className="absolute rounded-[18px] bg-surface-page sm:rounded-[20px]"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: still ? 0 : 0.3, delay: start }}
        />
      ))}

      {line.map((box, index) => (
        <motion.span
          key={`win-${cells[index]}`}
          className="absolute rounded-[18px] border-[3px] sm:rounded-[20px]"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h, borderColor: colour, boxShadow: `0 0 22px ${colour}` }}
          initial={{ opacity: 0, scale: 1 }}
          animate={still ? { opacity: 1 } : { opacity: [0, 1, 1], scale: [1, 1.07, 1] }}
          transition={{ duration: still ? 0 : 0.36, ease: 'easeOut', delay: reachedAt(index) }}
        />
      ))}

      <svg className="absolute inset-0 size-full overflow-visible">
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <motion.line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="white"
              strokeWidth={line[0].w}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: draw, ease: [0.3, 0.9, 0.3, 1], delay: start }}
            />
          </mask>
        </defs>
        <g mask={`url(#${maskId})`}>
          <path d={brushPath(from, to, 26)} className="fill-surface-page" opacity={0.55} transform="translate(0 4)" />
          <path d={brushPath(from, to, 22)} fill={colour} />
          <path d={brushPath(at(from, to, 0.06), at(from, to, 0.9), 6)} className="fill-white" opacity={0.55} transform="translate(0 -4)" />
        </g>
      </svg>
    </div>
  );
}
