'use client';

/**
 * Fog (the opponent's sabotage): the whole question — the prompt and the answers, everything below the round / timer
 * row — is fogged over like a misted window, and the player wipes it clear with the mouse or a finger. Only the wiped
 * parts show (wiping is a drag: the mouse button held, or a finger); a tap on an answer still hidden by fog does nothing.
 *
 * The fog is a canvas over the panel that never takes pointer events itself: the panel's own pointer events wipe it
 * (destination-out with a soft brush), and clicks are caught in the capture phase and stopped where the fog is still
 * thick, so the answers underneath stay the real buttons.
 */

import { useEffect, useRef, useState, type RefObject } from 'react';
import { motion } from 'motion/react';

const BRUSH = 46;
/** Fog this opaque (0–255) at a point stops a tap there. */
const BLOCKS_TAP = 120;

function paintFog(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);
  // A grey-white base, then soft billows, then a fine grain: condensation, not a flat panel.
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, 'rgba(206,214,222,0.97)');
  base.addColorStop(1, 'rgba(176,186,196,0.97)');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 30 + rand() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.45;
    g.addColorStop(0, light ? 'rgba(245,248,252,0.55)' : 'rgba(140,152,166,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  for (let i = 0; i < (w * h) / 90; i += 1) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(110,120,132,0.12)';
    ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
  }
}

export function FogWipe({ panelRef, seed }: { panelRef: RefObject<HTMLDivElement | null>; seed: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [top, setTop] = useState(0);
  const [wiped, setWiped] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    const canvas = canvasRef.current;
    if (!panel || !canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let size = { w: 0, h: 0, top: 0 };

    // The fog starts under the round / timer row, so the clock stays readable.
    const layout = () => {
      const box = panel.getBoundingClientRect();
      const header = panel.querySelector('[data-question-panel]')?.firstElementChild;
      const t = header ? Math.max(0, header.getBoundingClientRect().bottom - box.top + 6) : 0;
      const w = Math.round(box.width);
      const h = Math.round(box.height - t);
      if (w === size.w && h === size.h && t === size.top) return;
      size = { w, h, top: t };
      setTop(t);
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintFog(ctx, w, h, seed);
    };
    layout();
    const observer = new ResizeObserver(layout);
    observer.observe(panel);

    const local = (e: PointerEvent | MouseEvent) => {
      const box = panel.getBoundingClientRect();
      return { x: e.clientX - box.left, y: e.clientY - box.top - size.top };
    };
    let last: { x: number; y: number } | null = null;
    const wipe = (x: number, y: number) => {
      ctx.globalCompositeOperation = 'destination-out';
      const from = last ?? { x, y };
      const steps = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / (BRUSH / 4)));
      for (let i = 1; i <= steps; i += 1) {
        const px = from.x + ((x - from.x) * i) / steps;
        const py = from.y + ((y - from.y) * i) / steps;
        const g = ctx.createRadialGradient(px, py, 0, px, py, BRUSH);
        g.addColorStop(0, 'rgba(0,0,0,0.9)');
        g.addColorStop(0.6, 'rgba(0,0,0,0.5)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(px - BRUSH, py - BRUSH, 2 * BRUSH, 2 * BRUSH);
      }
      last = { x, y };
      setWiped(true);
    };
    // Wiping is a drag — the mouse button held, or a finger / pen on the glass — so the fog takes some effort.
    let down: { x: number; y: number; moved: number } | null = null;
    const press = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY, moved: 0 };
      last = null;
    };
    const move = (e: PointerEvent) => {
      const dragging = e.pointerType === 'mouse' ? (e.buttons & 1) === 1 : down !== null;
      if (!dragging) {
        last = null;
        return;
      }
      if (down) down.moved = Math.max(down.moved, Math.hypot(e.clientX - down.x, e.clientY - down.y));
      const p = local(e);
      if (p.y < 0) {
        last = null;
        return;
      }
      wipe(p.x, p.y);
    };
    const leave = () => {
      last = null;
    };
    let wasDrag = false;
    const release = () => {
      wasDrag = (down?.moved ?? 0) > 12;
      down = null;
      last = null;
    };
    const fogAt = (e: MouseEvent) => {
      const p = local(e);
      if (p.y < 0 || p.x < 0 || p.x > size.w || p.y > size.h) return 0;
      return ctx.getImageData(Math.floor(p.x * dpr), Math.floor(p.y * dpr), 1, 1).data[3];
    };
    // A tap where the fog is still thick doesn't reach the answer under it, and the end of a wipe isn't a tap.
    const click = (e: MouseEvent) => {
      const drag = wasDrag;
      wasDrag = false;
      if (drag || fogAt(e) > BLOCKS_TAP) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    panel.addEventListener('pointermove', move);
    panel.addEventListener('pointerdown', press);
    panel.addEventListener('pointerleave', leave);
    window.addEventListener('pointerup', release);
    panel.addEventListener('click', click, true);
    // While fogged, a drag on a phone wipes instead of scrolling.
    const touchAction = panel.style.touchAction;
    panel.style.touchAction = 'none';
    return () => {
      observer.disconnect();
      panel.removeEventListener('pointermove', move);
      panel.removeEventListener('pointerdown', press);
      panel.removeEventListener('pointerleave', leave);
      window.removeEventListener('pointerup', release);
      panel.removeEventListener('click', click, true);
      panel.style.touchAction = touchAction;
    };
  }, [panelRef, seed]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 overflow-hidden rounded-[22px]"
      style={{ top }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.45 }}
    >
      <canvas ref={canvasRef} className="absolute left-0 top-0" style={{ filter: 'blur(1.2px)' }} />
      {!wiped && (
        <div className="absolute inset-0 grid place-items-center">
          <motion.div
            className="flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white"
            animate={{ x: [-14, 14, -14] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span aria-hidden>👋</span> Drag to wipe the fog away
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
