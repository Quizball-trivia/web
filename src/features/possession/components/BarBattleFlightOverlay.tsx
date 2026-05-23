'use client';

/**
 * Fullscreen fixed-position overlay that animates a +N "splash" ghost from a
 * source screen position (the player's ArenaScoreSplash anchor in the
 * question panel) onto the pitch SVG, then hands off to the SVG bar-battle
 * animation that expands outward from the landing point.
 *
 * Two flight modes:
 *
 *   - **Success** (`failed: false`, points > 0): the +N pops in at the
 *     source, holds briefly, then flies along an arc to the target avatar
 *     leaving a comet-style trail of fading ghost copies behind it.
 *
 *   - **Failed** (`failed: true` or points = 0): the +0 pops in, briefly
 *     rises and tilts, then accelerates downward under "gravity" and falls
 *     off the bottom of the screen — visualising a missed shot/wrong
 *     answer where no possession was earned.
 *
 * The overlay is purely visual — bar-battle state updates happen in the
 * parent via the `onArrive` callback.
 */

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export type FlightSide = 'player' | 'opponent';

export interface FlightSpec {
  id: number;
  side: FlightSide;
  source: { x: number; y: number };
  target: { x: number; y: number };
  points: number;
  /** When true, the flight falls off-screen instead of reaching the target
   *  (visualises a 0-point round — wrong answer, no possession earned). */
  failed?: boolean;
}

interface BarBattleFlightOverlayProps {
  flights: FlightSpec[];
  /** Called when a flight's main translation completes (end of flight). */
  onArrive: (id: number) => void;
}

// Brief "appear at source" hold so the splash visibly pops in at the MCQ
// prompt edge (mirroring real ranked) BEFORE flying onto the pitch.
export const SOURCE_HOLD_S = 0.32;
export const FLIGHT_DURATION_S = 0.7;
/** Total time from launch until the ghost lands at the target avatar. */
export const FLIGHT_TOTAL_MS = (SOURCE_HOLD_S + FLIGHT_DURATION_S) * 1000;
/** Total time for the failed flight: fly to target + impact + fall off-screen. */
export const FAILED_FLIGHT_TOTAL_MS = 2000;

// Number of trail ghost copies that follow the main flight. Each one
// renders the same path with a small delay offset so visually they form
// a comet smear behind the lead +N. Tune up for chunkier trail, down for
// crisper read.
const TRAIL_GHOST_COUNT = 6;

export function BarBattleFlightOverlay({
  flights,
  onArrive,
}: BarBattleFlightOverlayProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      <AnimatePresence>
        {flights.map((flight) => (
          <Flight key={flight.id} flight={flight} onArrive={onArrive} />
        ))}
      </AnimatePresence>
    </div>
  );
}



function useScrollPinTransform(): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = ref.current;
    if (!node) return;

    const initialX = window.scrollX;
    const initialY = window.scrollY;
    const apply = () => {
      const dx = initialX - window.scrollX;
      const dy = initialY - window.scrollY;
      node.style.setProperty('--scroll-pin-x', `${dx}px`);
      node.style.setProperty('--scroll-pin-y', `${dy}px`);
    };
    apply();

    const onScroll = () => apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return ref;
}

const scrollPinStyle = {
  '--scroll-pin-x': '0px',
  '--scroll-pin-y': '0px',
} as React.CSSProperties;
const SCROLL_PIN_TRANSFORM = 'translate3d(var(--scroll-pin-x, 0px), var(--scroll-pin-y, 0px), 0)';

function Flight({
  flight,
  onArrive,
}: {
  flight: FlightSpec;
  onArrive: (id: number) => void;
}) {
  if (flight.failed || flight.points <= 0) {
    return <FailedFlight flight={flight} onArrive={onArrive} />;
  }
  return <SuccessFlight flight={flight} onArrive={onArrive} />;
}

/** Successful +N flight — flies from source to target with a comet trail. */
function SuccessFlight({
  flight,
  onArrive,
}: {
  flight: FlightSpec;
  onArrive: (id: number) => void;
}) {
  return (
    <>
      {/* Trail — ghost copies that lag slightly behind the main flight.
          Each ghost mirrors the main flight's animation but starts a few
          frames later, fading and shrinking as it goes. Stacked under the
          main flight via render order. */}
      {Array.from({ length: TRAIL_GHOST_COUNT }).map((_, i) => {
        const lag = (i + 1) / (TRAIL_GHOST_COUNT + 1); // 0..1
        // Each ghost is dimmer and smaller than the one ahead of it.
        const opacity = 0.55 * (1 - lag);
        const scale = 0.95 - lag * 0.45;
        return (
          <FlightSprite
            key={`trail-${i}`}
            flight={flight}
            mode="trail"
            lag={lag * 0.18} // up to ~180ms delay for the tail-end ghost
            maxOpacity={opacity}
            settledScale={scale}
            onArrive={undefined}
          />
        );
      })}

      {/* Main flight — fires onArrive when its animation completes. */}
      <FlightSprite flight={flight} mode="main" onArrive={onArrive} />
    </>
  );
}

/** A single sprite — used for both the main flight and the trail ghosts. */
function FlightSprite({
  flight,
  mode,
  lag = 0,
  maxOpacity = 1,
  settledScale = 1,
  onArrive,
}: {
  flight: FlightSpec;
  mode: 'main' | 'trail';
  /** Delay offset (seconds) that this sprite lags behind the main flight. */
  lag?: number;
  /** Peak opacity. Trail ghosts are dimmer than the main. */
  maxOpacity?: number;
  /** Final scale at landing. Trail ghosts settle smaller than the main. */
  settledScale?: number;
  onArrive?: (id: number) => void;
}) {
  const dx = flight.target.x - flight.source.x;
  const dy = flight.target.y - flight.source.y;
  const totalDuration = SOURCE_HOLD_S + FLIGHT_DURATION_S + lag;
  const isTrail = mode === 'trail';
  const scrollPinRef = useScrollPinTransform();

  return (
    <div
      ref={scrollPinRef}
      className="pointer-events-none absolute left-0 top-0 will-change-transform"
      style={{
        ...scrollPinStyle,
        transform: SCROLL_PIN_TRANSFORM,
      }}
    >
    <motion.div
      className="absolute"
      style={{
        left: flight.source.x,
        top: flight.source.y,
        transform: 'translate(-50%, -50%)',
        willChange: 'transform',
      }}
      initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
      animate={{
        opacity: [0, maxOpacity, maxOpacity, isTrail ? 0 : maxOpacity],
        scale: [0.4, 1.15 * settledScale, settledScale, settledScale],
        x: [0, 0, 0, dx],
        y: [0, 0, 0, dy],
      }}
      exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.18 } }}
      transition={{
        opacity: {
          duration: totalDuration,
          times: [0, 0.2, 0.5, 1],
          ease: 'easeOut',
          delay: lag,
        },
        scale: {
          duration: totalDuration,
          times: [0, 0.25, 0.5, 1],
          ease: 'easeOut',
          delay: lag,
        },
        x: {
          duration: totalDuration,
          times: [0, 0.4, SOURCE_HOLD_S / (SOURCE_HOLD_S + FLIGHT_DURATION_S), 1],
          ease: [0.4, 0, 0.15, 1],
          delay: lag,
        },
        y: {
          duration: totalDuration,
          times: [0, 0.4, SOURCE_HOLD_S / (SOURCE_HOLD_S + FLIGHT_DURATION_S), 1],
          ease: [0.4, 0, 0.15, 1],
          delay: lag,
        },
      }}
      onAnimationComplete={() => onArrive?.(flight.id)}
    >
      <PlusNText points={flight.points} dim={isTrail} />
    </motion.div>
    </div>
  );
}

/** Failed flight — splash appears, flies toward the target like a success
 *  flight, but instead of landing it "hits" the pitch and falls off the
 *  bottom of the screen under gravity. Used for 0-point rounds. */
function FailedFlight({
  flight,
  onArrive,
}: {
  flight: FlightSpec;
  onArrive: (id: number) => void;
}) {
  const dx = flight.target.x - flight.source.x;
  const dy = flight.target.y - flight.source.y;
  // Final y offset so the +N falls completely past the bottom of the screen
  // (the motion div is `top: flight.source.y`, so we need to travel an
  // additional `viewportHeight - source.y + buffer` pixels downward).
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 900;
  const fallY = viewportH - flight.source.y + 200;
  const scrollPinRef = useScrollPinTransform();

  return (
    <div
      ref={scrollPinRef}
      className="pointer-events-none absolute left-0 top-0 will-change-transform"
      style={{
        ...scrollPinStyle,
        transform: SCROLL_PIN_TRANSFORM,
      }}
    >
    <motion.div
      className="absolute"
      style={{
        left: flight.source.x,
        top: flight.source.y,
        transform: 'translate(-50%, -50%)',
        willChange: 'transform',
      }}
      initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
      animate={{
        // Phases (by `times` index):
        //   0  → invisible at source
        //   1  → popped in, full opacity
        //   2  → held at source, briefly
        //   3  → arrived at the pitch target (x = dx, y = dy)
        //   4  → tiny "impact" recoil — barely past the target, dim flicker
        //   5  → fallen off the bottom of the screen, faded out, spun
        opacity: [0, 1, 1, 1, 0.75, 0],
        scale: [0.4, 1.15, 1, 1, 0.9, 0.55],
        x: [0, 0, 0, dx, dx + 6, dx - 24],
        y: [0, 0, 0, dy, dy + 14, fallY],
        rotate: [0, -6, 0, 4, 14, 42],
      }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{
        duration: FAILED_FLIGHT_TOTAL_MS / 1000,
        // Ease the fall (last segment) with cubic acceleration so the drop
        // reads as gravity, not a constant slide.
        times: [0, 0.12, 0.28, 0.52, 0.6, 1],
        ease: [0.36, 0, 0.66, 1],
      }}
      onAnimationComplete={() => onArrive(flight.id)}
    >
      <PlusNText points={flight.points} dim />
    </motion.div>
    </div>
  );
}

/** Shared +N text — Poppins Black, brand yellow, tilted -6.8° per Figma.
 *  `dim` desaturates trail ghosts and failed flights so the main success
 *  flight reads as the brightest element on screen. */
function PlusNText({ points, dim = false }: { points: number; dim?: boolean }) {
  return (
    <motion.div
      className="relative"
      initial={{ rotate: -6.8 }}
      animate={{ opacity: 1, rotate: -6.8 }}
      transition={{ duration: 0 }}
      style={{
        fontFamily: "'Poppins', system-ui, sans-serif",
        fontWeight: 900,
        fontSize: 'clamp(40px, 7vw, 64px)',
        lineHeight: 1,
        letterSpacing: 0,
        color: dim ? 'rgba(255, 229, 0, 0.85)' : '#FFE500',
        textShadow: dim
          ? '0 4px 0 rgba(0,0,0,0.6), 0 8px 14px rgba(0,0,0,0.3)'
          : '0 6px 0 rgba(0,0,0,0.78), 0 10px 18px rgba(0,0,0,0.4)',
        WebkitTextStrokeWidth: 3,
        WebkitTextStrokeColor: 'rgba(0,0,0,0.92)',
        paintOrder: 'stroke fill',
      }}
    >
      +{points}
    </motion.div>
  );
}
