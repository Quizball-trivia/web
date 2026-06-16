'use client';

/**
 * HTML-actor overlay — the player + opponent + ball drawn as absolutely
 * positioned <motion.div>s on top of the SVG pitch. This is the
 * production rendering path; the SVG-avatar variants in
 * PossessionTrackScene are kept for legacy preview paths only.
 *
 * Coordinates come from the scene model's `actorPosition()` factory
 * which maps the pitch's local SVG units into the page's percentages.
 */

import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import type { AvatarCustomization } from '@/types/game';
import { PITCH_BALL_IMAGE_URL } from './pitch.helpers';

type ActorPosition = { left: string | string[]; top: string | string[] };

// When the opponent answers wrong, the real "+0" score-flight is retargeted to
// the "?" badge. This is roughly when that ghost reaches the badge (the failed
// flight impacts its target around its 0.52 keyframe); the badge holds until
// then, then gets kicked. Keep in rough sync with FAILED_FLIGHT_TOTAL_MS in
// BarBattleFlightOverlay (~2s total, impact ~1s in).
const KICK_DELAY_S = 1.0;
// Correct answer: the "+N" detours THROUGH the "?" (kickVia) and reaches it
// faster than the failed flight — roughly KICK_HOLD_S + KICK_TO_BADGE_S in
// BarBattleFlightOverlay. Knock the badge then, before the +N moves on.
const CORRECT_KICK_DELAY_S = 0.5;

interface PitchHtmlActorsProps {
  playerActorPosition: ActorPosition;
  opponentActorPosition: ActorPosition;
  ballActorPosition: ActorPosition | null;
  actorAvatarSize: string;
  actorBallSize: string;
  playerAvatarAlt: string;
  opponentAvatarAlt: string;
  playerAvatarCustomization: AvatarCustomization | null;
  opponentAvatarCustomization: AvatarCustomization | null;
  playerFlipX: boolean;
  opponentFlipX: boolean;
  isPortrait: boolean;
  hideBall: boolean;
  ballOpacity: number;
  ballTransition: Parameters<typeof motion.div>[0]['transition'];
  playerHtmlActorMotion: Parameters<typeof motion.div>[0]['animate'];
  opponentHtmlActorMotion: Parameters<typeof motion.div>[0]['animate'];
  playerHtmlActorTransition: Parameters<typeof motion.div>[0]['transition'];
  opponentHtmlActorTransition: Parameters<typeof motion.div>[0]['transition'];
  useMarkerActors: boolean;
  htmlActorResultActive: boolean;
  playerHtmlIsShooter: boolean;
  opponentHtmlIsShooter: boolean;
  /** Live round, opponent hasn't answered — float a "?" above their head. */
  opponentThinking?: boolean;
  /** Opponent just answered wrong — kick the "?" with a "+0" and drop both. */
  opponentAnsweredWrong?: boolean;
  /** Opponent just answered correct — the "+N" detours through the "?" and
   *  knocks it off (then continues to the bars). */
  opponentAnsweredCorrect?: boolean;
}

export function PitchHtmlActors({
  playerActorPosition,
  opponentActorPosition,
  ballActorPosition,
  actorAvatarSize,
  actorBallSize,
  playerAvatarAlt,
  opponentAvatarAlt,
  playerAvatarCustomization,
  opponentAvatarCustomization,
  playerFlipX,
  opponentFlipX,
  isPortrait,
  hideBall,
  ballOpacity,
  ballTransition,
  playerHtmlActorMotion,
  opponentHtmlActorMotion,
  playerHtmlActorTransition,
  opponentHtmlActorTransition,
  useMarkerActors,
  htmlActorResultActive,
  playerHtmlIsShooter,
  opponentHtmlIsShooter,
  opponentThinking = false,
  opponentAnsweredWrong = false,
  opponentAnsweredCorrect = false,
}: PitchHtmlActorsProps) {
  const playerShooterStyle: CSSProperties | undefined =
    !isPortrait && useMarkerActors && htmlActorResultActive && playerHtmlIsShooter
      ? { transformOrigin: '50% 100%' }
      : undefined;
  const opponentShooterStyle: CSSProperties | undefined =
    !isPortrait && useMarkerActors && htmlActorResultActive && opponentHtmlIsShooter
      ? { transformOrigin: '50% 100%' }
      : undefined;

  return (
    <>
      <motion.div
        data-pitch-avatar="player"
        initial={false}
        animate={playerActorPosition}
        transition={{ type: 'spring', stiffness: 160, damping: 12, mass: 0.7 }}
        className="pointer-events-none absolute z-20"
        style={{
          width: actorAvatarSize,
          aspectRatio: '1 / 1',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <motion.div
          animate={playerHtmlActorMotion}
          transition={playerHtmlActorTransition}
          className="size-full rounded-full"
          style={playerShooterStyle}
        >
          <div
            aria-label={playerAvatarAlt}
            className="size-full overflow-hidden rounded-full"
            style={{ transform: playerFlipX ? 'scaleX(-1)' : undefined }}
          >
            <AvatarDisplay customization={playerAvatarCustomization ?? {}} size="xs" className="size-full" />
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        data-pitch-avatar="opponent"
        initial={false}
        animate={opponentActorPosition}
        transition={{ type: 'spring', stiffness: 160, damping: 12, mass: 0.7 }}
        className="pointer-events-none absolute z-20"
        style={{
          width: actorAvatarSize,
          aspectRatio: '1 / 1',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <motion.div
          animate={opponentHtmlActorMotion}
          transition={opponentHtmlActorTransition}
          className="size-full rounded-full"
          style={opponentShooterStyle}
        >
          <div
            aria-label={opponentAvatarAlt}
            className="size-full overflow-hidden rounded-full"
            style={{ transform: opponentFlipX ? 'scaleX(-1)' : undefined }}
          >
            <AvatarDisplay customization={opponentAvatarCustomization ?? {}} size="xs" className="size-full" />
          </div>
        </motion.div>

        {/* "?" thinking badge above the opponent's head.
            • While they think: it floats and bobs.
            • Wrong answer: the real opponent "+0" score-flight is retargeted to
              this badge (via the data-pitch-question-badge anchor). When the +0
              ghost reaches it (KICK_DELAY_S), the badge is knocked sideways and
              tumbles off-screen — the +0 then continues falling too, so both
              drop together.
            • Correct answer: the badge just unmounts (clean clear, no kick). */}
        <AnimatePresence>
          {opponentThinking && (
            <motion.div
              key="opp-think-badge"
              data-pitch-question-badge="opponent"
              initial={{ opacity: 0, scale: 0.5, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: [0, -3, 0] }}
              exit={{ opacity: 0, scale: 0.6, y: 14, rotate: 35 }}
              transition={{
                opacity: { duration: 0.18 },
                scale: { duration: 0.18 },
                y: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
                default: { duration: 0.18 },
              }}
              className="pointer-events-none absolute left-1/2 bottom-full mb-1.5 flex size-7 -translate-x-1/2 items-center justify-center rounded-full bg-brand-yellow font-fun text-base font-black leading-none text-surface-page shadow-[0_2px_6px_rgba(0,0,0,0.35)] sm:size-9 sm:text-lg"
            >
              ?
            </motion.div>
          )}
          {opponentAnsweredWrong && (
            <motion.div
              key="opp-kicked-badge"
              data-pitch-question-badge="opponent"
              initial={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
              // Hold at rest until the +0 ghost arrives (KICK_DELAY_S), then a
              // sharp sideways snap + accelerating tumble downward off-screen.
              animate={{
                x: [0, 0, -10, 26],
                y: [0, 0, -6, 120],
                rotate: [0, 0, -22, 90],
                opacity: [1, 1, 1, 0],
                scale: [1, 1, 1.1, 0.7],
              }}
              transition={{
                duration: KICK_DELAY_S + 0.5,
                times: [0, KICK_DELAY_S / (KICK_DELAY_S + 0.5), (KICK_DELAY_S + 0.08) / (KICK_DELAY_S + 0.5), 1],
                ease: [0.36, 0, 0.66, 1],
              }}
              className="pointer-events-none absolute left-1/2 bottom-full mb-1.5 flex size-7 -translate-x-1/2 items-center justify-center rounded-full bg-brand-yellow font-fun text-base font-black leading-none text-surface-page shadow-[0_2px_6px_rgba(0,0,0,0.35)] sm:size-9 sm:text-lg"
            >
              ?
            </motion.div>
          )}
          {opponentAnsweredCorrect && (
            <motion.div
              key="opp-correct-knock"
              data-pitch-question-badge="opponent"
              initial={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
              // Hold until the "+N" detours through (CORRECT_KICK_DELAY_S), then
              // get bumped up-and-aside and spun off as the flight continues on.
              animate={{
                x: [0, 0, 18, 40],
                y: [0, 0, -14, -34],
                rotate: [0, 0, 28, 80],
                opacity: [1, 1, 1, 0],
                scale: [1, 1, 1.15, 0.6],
              }}
              transition={{
                duration: CORRECT_KICK_DELAY_S + 0.45,
                times: [0, CORRECT_KICK_DELAY_S / (CORRECT_KICK_DELAY_S + 0.45), (CORRECT_KICK_DELAY_S + 0.06) / (CORRECT_KICK_DELAY_S + 0.45), 1],
                ease: [0.36, 0, 0.66, 1],
              }}
              className="pointer-events-none absolute left-1/2 bottom-full mb-1.5 flex size-7 -translate-x-1/2 items-center justify-center rounded-full bg-brand-yellow font-fun text-base font-black leading-none text-surface-page shadow-[0_2px_6px_rgba(0,0,0,0.35)] sm:size-9 sm:text-lg"
            >
              ?
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {!hideBall && ballActorPosition && (
        <motion.div
          key="portrait-html-ball"
          initial={false}
          animate={{
            ...ballActorPosition,
            opacity: ballOpacity,
          }}
          transition={ballTransition}
          className="pointer-events-none absolute z-30"
          style={{
            width: actorBallSize,
            aspectRatio: '1 / 1',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="absolute inset-[-18%] rounded-full bg-white/10 blur-sm" />
          <img
            src={PITCH_BALL_IMAGE_URL}
            alt=""
            className="relative size-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.32)]"
          />
        </motion.div>
      )}
    </>
  );
}
