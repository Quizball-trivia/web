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
import { motion } from 'motion/react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import type { AvatarCustomization } from '@/types/game';
import { PITCH_BALL_IMAGE_URL } from './pitch.helpers';

type ActorPosition = { left: string | string[]; top: string | string[] };

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
  mirrored: boolean;
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
  mirrored,
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
            style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
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
            style={{ transform: mirrored ? undefined : 'scaleX(-1)' }}
          >
            <AvatarDisplay customization={opponentAvatarCustomization ?? {}} size="xs" className="size-full" />
          </div>
        </motion.div>
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
