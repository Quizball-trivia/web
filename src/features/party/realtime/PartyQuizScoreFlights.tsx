'use client';

/**
 * Renders the in-flight "+points" splashes that arc from the chosen
 * answer chip into each player's standings avatar.
 *
 * The flight DATA (start/end coords, success/failure flag, target
 * total) is owned by `usePartyScoreFlights`. This component is pure
 * rendering — it consumes `scoreFlights` and draws one `motion.div`
 * per flight at a fixed position with the success or failure keyframe
 * track.
 */

import { AnimatePresence, motion } from 'motion/react';

import type { ScoreFlight } from './partyQuizScreen.types';
import {
  PARTY_FAILED_FLIGHT_MS,
  PARTY_SUCCESS_FLIGHT_MS,
} from './partyQuizScreen.helpers';

interface PartyQuizScoreFlightsProps {
  scoreFlights: ScoreFlight[];
}

export function PartyQuizScoreFlights({ scoreFlights }: PartyQuizScoreFlightsProps) {
  return (
    <AnimatePresence>
      {scoreFlights.map((flight) => {
        const failed = flight.failed === true || flight.points <= 0;
        const dx = flight.to.x - flight.from.x;
        const dy = flight.to.y - flight.from.y;
        const fallY = (typeof window !== 'undefined' ? window.innerHeight : 900) - flight.from.y + 180;
        return (
          <div
            key={flight.id}
            className="pointer-events-none fixed z-50 select-none"
            style={{
              left: flight.from.x,
              top: flight.from.y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5, x: 0, y: 0, rotate: -7 }}
              animate={failed
                ? {
                  opacity: [0, 1, 1, 1, 0.75, 0],
                  scale: [0.5, 1.18, 1, 1, 0.9, 0.55],
                  x: [0, 0, 0, dx, dx + 6, dx - 24],
                  y: [0, 0, 0, dy, dy + 14, fallY],
                  rotate: [0, -6, 0, 4, 14, 42],
                }
                : {
                  opacity: [0, 1, 1, 1, 0],
                  scale: [0.55, 1.15, 1, 0.72, 0.55],
                  x: [0, 0, dx, dx, dx],
                  y: [0, 0, dy, dy, dy],
                  rotate: [0, -5, -2, 1, 2],
                }}
              exit={{ opacity: 0 }}
              transition={failed
                ? {
                  duration: PARTY_FAILED_FLIGHT_MS / 1000,
                  times: [0, 0.12, 0.28, 0.52, 0.6, 1],
                  ease: [0.36, 0, 0.66, 1],
                }
                : {
                  duration: PARTY_SUCCESS_FLIGHT_MS / 1000,
                  times: [0, 0.12, 0.82, 0.94, 1],
                  ease: [0.24, 0.72, 0.24, 1],
                }}
              className="font-poppins text-4xl font-black text-brand-yellow"
              style={{
                WebkitTextStroke: '2px #000000',
                paintOrder: 'stroke fill',
                color: failed ? 'rgba(255, 229, 0, 0.85)' : '#FFE500',
                textShadow: failed
                  ? '0 4px 0 rgba(0,0,0,0.6), 0 8px 14px rgba(0,0,0,0.3)'
                  : '0 6px 0 rgba(0,0,0,0.35), 0 0 16px rgba(255,229,0,0.35)',
              }}
            >
              +{flight.points}
            </motion.div>
          </div>
        );
      })}
    </AnimatePresence>
  );
}
