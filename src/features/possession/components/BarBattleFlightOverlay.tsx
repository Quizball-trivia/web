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

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Zap } from 'lucide-react';

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
  /** 2× speed-streak boost: the +N detours through this point (the 2× badge),
   *  where the number doubles, then continues to the target. */
  boostVia?: { x: number; y: number };
  /** When 'badge', this flight carries the "2×" token from the answer source
   *  to the HUD badge slot (target) and lands there instead of "+N" to pitch. */
  kind?: 'score' | 'badge';
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
// PERF: every ghost is its own composited layer whose stroked text must be
// rasterized at DPR scale the moment the flight mounts. 6 ghosts × 2
// simultaneous landing flights caused a 14-layer raster storm that froze
// mobile Blink for a few frames at every launch. 3 ghosts read the same
// (they overlap heavily) at half the cost.
const TRAIL_GHOST_COUNT = 3;

export function BarBattleFlightOverlay({
  flights,
  onArrive,
}: BarBattleFlightOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = overlayRef.current;
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

  return (
    <div
      ref={overlayRef}
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      style={{
        '--scroll-pin-x': '0px',
        '--scroll-pin-y': '0px',
      } as React.CSSProperties}
    >
      <AnimatePresence>
        {flights.map((flight) => (
          <Flight key={flight.id} flight={flight} onArrive={onArrive} />
        ))}
      </AnimatePresence>
    </div>
  );
}



const SCROLL_PIN_TRANSFORM = 'translate3d(var(--scroll-pin-x, 0px), var(--scroll-pin-y, 0px), 0)';

function Flight({
  flight,
  onArrive,
}: {
  flight: FlightSpec;
  onArrive: (id: number) => void;
}) {
  if (flight.kind === 'badge') {
    return <Badge2xFlight flight={flight} onArrive={onArrive} />;
  }
  if (flight.failed || flight.points <= 0) {
    return <FailedFlight flight={flight} onArrive={onArrive} />;
  }
  return <SuccessFlight flight={flight} onArrive={onArrive} />;
}

/** The "2×" token flying from the answer source to the HUD badge slot, where
 *  it lands and the sticky badge takes over. Mirrors the +N flight motion. */
function Badge2xFlight({
  flight,
  onArrive,
}: {
  flight: FlightSpec;
  onArrive: (id: number) => void;
}) {
  const dx = flight.target.x - flight.source.x;
  const dy = flight.target.y - flight.source.y;
  const total = SOURCE_HOLD_S + FLIGHT_DURATION_S;
  return (
    <div className="pointer-events-none absolute left-0 top-0 will-change-transform" style={{ transform: SCROLL_PIN_TRANSFORM }}>
      <motion.div
        className="absolute"
        style={{
          left: flight.source.x,
          top: flight.source.y,
          width: 0,
          height: 0,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
        initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
        animate={{
          opacity: [0, 1, 1, 1],
          // overshoot a touch bigger en route, settle to exact badge size (1).
          scale: [0.4, 1.3, 1.1, 1],
          x: [0, 0, 0, dx],
          y: [0, 0, 0, dy],
        }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={{
          opacity: { duration: total, times: [0, 0.2, 0.5, 1], ease: 'easeOut' },
          scale: { duration: total, times: [0, 0.25, 0.5, 1], ease: 'easeOut' },
          x: { duration: total, times: [0, 0.4, SOURCE_HOLD_S / total, 1], ease: [0.4, 0, 0.15, 1] },
          y: { duration: total, times: [0, 0.4, SOURCE_HOLD_S / total, 1], ease: [0.4, 0, 0.15, 1] },
        }}
        onAnimationComplete={() => onArrive(flight.id)}
      >
        <div className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2">
          <Badge2xToken />
        </div>
      </motion.div>
    </div>
  );
}

// Matches the sticky badge in PossessionHUD (same padding/sizes) so the token
// lands at the exact size + position the badge takes over at.
function Badge2xToken() {
  return (
    <div
      className="inline-flex w-max items-center gap-1 whitespace-nowrap rounded-xl bg-brand-yellow px-2.5 py-1 shadow-[0_3px_10px_rgba(0,0,0,0.35)] sm:gap-1.5 sm:px-3 sm:py-1.5"
      style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
    >
      <Zap className="size-4 fill-black text-black sm:size-5" />
      <span className="text-lg font-black leading-none text-black sm:text-2xl">2×</span>
    </div>
  );
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

  // 2× boost flights detour through the badge and double the number there.
  if (flight.boostVia) {
    return (
      <BoostFlightSprite
        flight={flight}
        mode={mode}
        lag={lag}
        maxOpacity={maxOpacity}
        settledScale={settledScale}
        onArrive={onArrive}
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 will-change-transform"
      style={{
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
      <PlusNText points={flight.points} ghost={isTrail} />
    </motion.div>
    </div>
  );
}

// Timing for the boost detour (seconds): hold at source, fly to badge, pause
// while the number doubles, then fly to the target.
const BOOST_HOLD_S = 0.3;
const BOOST_TO_BADGE_S = 0.45;
const BOOST_PAUSE_S = 0.35;
const BOOST_TO_TARGET_S = 0.6;

/** +N flight that detours through the 2× badge, doubling the number there
 *  before continuing to the pitch. The badge itself stays put. */
function BoostFlightSprite({
  flight,
  mode,
  lag = 0,
  maxOpacity = 1,
  settledScale = 1,
  onArrive,
}: {
  flight: FlightSpec;
  mode: 'main' | 'trail';
  lag?: number;
  maxOpacity?: number;
  settledScale?: number;
  onArrive?: (id: number) => void;
}) {
  const via = flight.boostVia!;
  const [doubled, setDoubled] = useState(false);
  const isTrail = mode === 'trail';

  // Offsets relative to the source (the motion div is anchored at source).
  const bx = via.x - flight.source.x;
  const by = via.y - flight.source.y;
  const tx = flight.target.x - flight.source.x;
  const ty = flight.target.y - flight.source.y;

  const total = BOOST_HOLD_S + BOOST_TO_BADGE_S + BOOST_PAUSE_S + BOOST_TO_TARGET_S + lag;
  // keyframe time fractions: [start, atBadge, afterPause, atTarget]
  const tBadge = (BOOST_HOLD_S + BOOST_TO_BADGE_S) / total;
  const tPause = (BOOST_HOLD_S + BOOST_TO_BADGE_S + BOOST_PAUSE_S) / total;

  return (
    <div className="pointer-events-none absolute left-0 top-0 will-change-transform" style={{ transform: SCROLL_PIN_TRANSFORM }}>
      <motion.div
        className="absolute"
        style={{ left: flight.source.x, top: flight.source.y, transform: 'translate(-50%, -50%)', willChange: 'transform' }}
        initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
        animate={{
          opacity: [0, maxOpacity, maxOpacity, maxOpacity, isTrail ? 0 : maxOpacity],
          // pop bigger at the badge, then settle
          scale: [0.4, 1, 1.5 * settledScale, settledScale, settledScale],
          x: [0, 0, bx, bx, tx],
          y: [0, 0, by, by, ty],
        }}
        exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.18 } }}
        transition={{
          opacity: { duration: total, times: [0, 0.12, tBadge, tPause, 1], ease: 'easeOut', delay: lag },
          scale: { duration: total, times: [0, 0.12, tBadge, tPause, 1], ease: 'easeOut', delay: lag },
          x: { duration: total, times: [0, BOOST_HOLD_S / total, tBadge, tPause, 1], ease: [0.4, 0, 0.15, 1], delay: lag },
          y: { duration: total, times: [0, BOOST_HOLD_S / total, tBadge, tPause, 1], ease: [0.4, 0, 0.15, 1], delay: lag },
        }}
        onUpdate={(latest) => {
          // Flip to the doubled number once we've reached the badge.
          if (!doubled && typeof latest.x === 'number' && Math.abs((latest.x as number) - bx) < 4 && Math.abs((latest.y as number) - by) < 4) {
            setDoubled(true);
          }
        }}
        onAnimationComplete={() => onArrive?.(flight.id)}
      >
        <PlusNText points={doubled ? flight.points * 2 : flight.points} ghost={isTrail} />
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

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 will-change-transform"
      style={{
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
 *  flight reads as the brightest element on screen.
 *
 *  PERF: only the lead sprite gets the stroke + layered shadows. Trail
 *  ghosts are ≤55% opacity and stacked on top of each other, so their
 *  stroke/shadow is visually indistinguishable — but rasterizing stroked
 *  text for every ghost layer at mobile DPR was the bulk of the launch
 *  raster storm (lag/tearing on mobile Chrome). Ghosts render plain text. */
function PlusNText({
  points,
  dim = false,
  ghost = false,
}: {
  points: number;
  dim?: boolean;
  /** Trail ghosts skip stroke/shadows entirely (see PERF note above). */
  ghost?: boolean;
}) {
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
        color: ghost ? 'rgba(214, 184, 0, 0.9)' : dim ? 'rgba(255, 229, 0, 0.85)' : '#FFE500',
        ...(ghost
          ? null
          : {
              textShadow: dim
                ? '0 4px 0 rgba(0,0,0,0.6), 0 8px 14px rgba(0,0,0,0.3)'
                : '0 6px 0 rgba(0,0,0,0.78), 0 10px 18px rgba(0,0,0,0.4)',
              WebkitTextStrokeWidth: 3,
              WebkitTextStrokeColor: 'rgba(0,0,0,0.92)',
              paintOrder: 'stroke fill',
            }),
      }}
    >
      +{points}
    </motion.div>
  );
}
