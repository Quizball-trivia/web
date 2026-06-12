'use client';

/**
 * "Live Score Tracker" possession scene — the centred bar showing
 * blue/red possession fills, the bar-battle overlay slot, the SVG
 * variants of the player + opponent avatars, and the vertical
 * boundary indicator line.
 *
 * Only mounted during normal play (not penalty, not non-simple shot).
 * In production `renderHtmlPitchActors` is true so the SVG avatars
 * here stay hidden; they exist for the legacy preview path.
 */

import { motion } from 'motion/react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import type { AvatarCustomization } from '@/types/game';
import { BarBattleOverlay, type BarBattleState } from '../BarBattleOverlay';

interface PossessionTrackSceneProps {
  playerPosition: number;
  mirrored: boolean;
  isPortrait: boolean;
  possessionTrackLeft: number;
  possessionTrackWidth: number;
  possessionBoundaryX: number;
  playerAvatarX: number;
  opponentAvatarX: number;
  playerAvatarVisualX: number;
  opponentAvatarVisualX: number;
  playerAvatarPulse: number | number[];
  opponentAvatarPulse: number | number[];
  avatarBox: number;
  avatarBoxOffset: number;
  avatarBoxY: number;
  playerAvatarAlt: string;
  opponentAvatarAlt: string;
  playerAvatarCustomization: AvatarCustomization | null;
  opponentAvatarCustomization: AvatarCustomization | null;
  renderHtmlPitchActors: boolean;
  barBattle?: BarBattleState | null;
  barBattleVariant?: 'ranked_sim' | 'friendly_possession';
  /**
   * Infinite "breathing" opacity pulses on the possession fills + boundary
   * line. Default on for matches; the landing hero passes false because
   * SVG children never get compositor layers in Blink — an infinite pulse
   * means the (stadium-bitmap-backed) SVG repaints forever, a major source
   * of the mobile-Chrome landing jank.
   */
  ambientPulses?: boolean;
}

export function PossessionTrackScene({
  playerPosition,
  mirrored,
  isPortrait,
  possessionTrackLeft,
  possessionTrackWidth,
  possessionBoundaryX,
  playerAvatarX,
  opponentAvatarX,
  playerAvatarVisualX,
  opponentAvatarVisualX,
  playerAvatarPulse,
  opponentAvatarPulse,
  avatarBox,
  avatarBoxOffset,
  avatarBoxY,
  playerAvatarAlt,
  opponentAvatarAlt,
  playerAvatarCustomization,
  opponentAvatarCustomization,
  renderHtmlPitchActors,
  barBattle,
  barBattleVariant,
  ambientPulses = true,
}: PossessionTrackSceneProps) {
  return (
    <g>
      {/* Main possession bar container */}
      <rect x="15" y="70" width="470" height="90" fill="rgba(0,0,0,0.2)" rx="6" />

      {/* Center line */}
      <line x1="250" y1="70" x2="250" y2="160" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />

      {/* Player's possession fill (always from their defensive end) */}
      <motion.rect
        x={mirrored ? possessionBoundaryX : possessionTrackLeft}
        y="70"
        width={(playerPosition / 100) * possessionTrackWidth}
        height="90"
        fill="#1CB0F6"
        opacity="0.18"
        rx="6"
        animate={ambientPulses ? { opacity: [0.15, 0.22, 0.15] } : undefined}
        transition={ambientPulses ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
      />

      {/* Opponent's possession fill */}
      <motion.rect
        x={mirrored ? possessionTrackLeft : possessionBoundaryX}
        y="70"
        width={((100 - playerPosition) / 100) * possessionTrackWidth}
        height="90"
        fill="#FF4B4B"
        opacity="0.12"
        rx="6"
        animate={ambientPulses ? { opacity: [0.08, 0.15, 0.08] } : undefined}
        transition={ambientPulses ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 } : undefined}
      />

      {/* Bar battle animation sits UNDER avatars. If bars overlap in
          tight edge cases, the player art remains on top and readable. */}
      {barBattle && (
        <BarBattleOverlay
          battle={barBattle}
          mirrored={mirrored}
          playerAvatarX={playerAvatarVisualX}
          opponentAvatarX={opponentAvatarVisualX}
          isPortrait={isPortrait}
          variant={barBattleVariant}
        />
      )}

      {/* Player avatar (positioned close to white line on blue side).
          The data-pitch-avatar attribute lets the bar-battle flight
          overlay find the avatar's screen position so the +N ghost
          can fly into it. Production code paths ignore the attr. */}
      {!renderHtmlPitchActors && (
        <motion.g
          data-pitch-avatar="player"
          animate={{
            x: playerAvatarX,
            scale: playerAvatarPulse,
          }}
          transition={{
            x: { type: 'spring', stiffness: 160, damping: 12, mass: 0.7 },
            scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          }}
        >
          <g transform={isPortrait ? 'rotate(90, 0, 115)' : undefined}>
            <foreignObject
              x={-avatarBoxOffset}
              y={avatarBoxY}
              width={avatarBox}
              height={avatarBox}
            >
              <div
                aria-label={playerAvatarAlt}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  // 2nd half (mirrored) flips the pitch — player is
                  // now on the right side and needs to face left
                  // toward the opp. Default half: player faces forward.
                  transform: mirrored ? 'scaleX(-1)' : undefined,
                }}
              >
                <AvatarDisplay customization={playerAvatarCustomization ?? {}} size="xs" className="size-full" />
              </div>
            </foreignObject>
          </g>
        </motion.g>
      )}

      {/* Opponent avatar (positioned close to white line on red side) */}
      {!renderHtmlPitchActors && (
        <motion.g
          data-pitch-avatar="opponent"
          animate={{
            x: opponentAvatarX,
            scale: opponentAvatarPulse,
          }}
          transition={{
            x: { type: 'spring', stiffness: 160, damping: 12, mass: 0.7 },
            scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          }}
        >
          <g transform={isPortrait ? 'rotate(90, 0, 115)' : undefined}>
            <foreignObject
              x={-avatarBoxOffset}
              y={avatarBoxY}
              width={avatarBox}
              height={avatarBox}
            >
              <div
                aria-label={opponentAvatarAlt}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  // Default half: opp sits on the right and faces
                  // left toward the player. After mirror (2nd half)
                  // opp is on the left and faces forward.
                  transform: mirrored ? undefined : 'scaleX(-1)',
                }}
              >
                <AvatarDisplay customization={opponentAvatarCustomization ?? {}} size="xs" className="size-full" />
              </div>
            </foreignObject>
          </g>
        </motion.g>
      )}

      {/* Ball position indicator - positioned at boundary between blue/red zones */}
      <motion.g
        animate={{ x: possessionBoundaryX }}
        transition={{ type: 'spring', stiffness: 160, damping: 12, mass: 0.7 }}
      >
        {/* Vertical indicator line */}
        <motion.line
          x1="0" y1="65" x2="0" y2="165"
          stroke="white"
          strokeWidth="2.5"
          opacity="0.9"
          animate={ambientPulses ? { opacity: [0.7, 1, 0.7] } : undefined}
          transition={ambientPulses ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : undefined}
        />
      </motion.g>
    </g>
  );
}
