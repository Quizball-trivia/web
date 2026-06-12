/**
 * Shared types for the PitchVisualization scene split.
 *
 * Lives separately from the helpers so the controller hook + every
 * scene component can import the shapes without pulling helper code.
 */

import type { AvatarCustomization } from '@/types/game';
import type { BarBattleState } from '../BarBattleOverlay';

export type GoalSide = 'left' | 'right';

export interface GoalCoordinates {
  penSpotX: number;
  goalLineX: number;
  goalTarget: { x: number; y: number };
  saveTarget: { x: number; y: number };
  penY: number;
  netX: number;
  goalTextX: number;
  /** +1 = rightward (into right goal), -1 = leftward (into left goal) */
  inward: 1 | -1;
}

export interface PenaltyMode {
  isPlayerShooter: boolean;
  result: 'pending' | 'goal' | 'saved' | null;
  phase: 'setup' | 'playing' | 'result';
}

export interface ShotMode {
  result: 'pending' | 'goal' | 'saved' | 'miss';
  /** Captured ball X position at shot start (SVG coords). Stays fixed during animation. */
  ballOriginX: number;
  /** Whether the player is attacking (shooting) or defending (goalkeeping) */
  isPlayerAttacker: boolean;
  /** Optional animation variant index used to diversify shot visuals. */
  variant?: number;
  /** Unique per-shot identifier — forces shot-effect reset when consecutive shots share attacker/result/goal/variant. */
  shotId?: number | string;
}

export interface PitchVisualizationProps {
  playerPosition: number; // 0–100
  playerAvatarUrl: string;
  opponentAvatarUrl: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  opponentAvatarCustomization?: AvatarCustomization | null;
  playerName?: string;
  opponentName?: string;
  myMomentum?: number; // 0-6
  oppMomentum?: number; // 0-6
  penaltyMode?: PenaltyMode;
  shotMode?: ShotMode;
  /** Camera zoom into the goal area (penalty/shot). Field stays anchored. */
  zoomToGoal?: boolean;
  /** Flip pitch orientation for 2nd half */
  mirrored?: boolean;
  /** Which goal shots/penalties animate toward */
  targetGoal?: GoalSide;
  /** Ball sits on player icon (true) or opponent icon (false). Drives kick-off logic. */
  ballOnPlayer?: boolean;
  /** Pitch layout orientation. Portrait wraps all content in a 90° rotation matrix. */
  orientation?: 'landscape' | 'portrait';
  /** Bar battle animation state — rendered inside the possession zone */
  barBattle?: BarBattleState | null;
  /** Force a bar-battle variant without changing global realtime match state. */
  barBattleVariant?: 'ranked_sim' | 'friendly_possession';
  /** Infinite possession-fill/boundary opacity pulses (see PossessionTrackScene). */
  ambientPulses?: boolean;
  /** Align the possession boundary to the stadium art's true center line. */
  centerPossessionTrack?: boolean;
  /** Dev prototype: keep avatars planted and animate only the ball for shot/goal results. */
  simpleShotAnimation?: boolean;
  /** Optional shot avatar size override for compact demos where the production marker reads too small. */
  shotAvatarUnitSize?: number;
  /** Keep landing/demo avatars upright during shots while preserving the shared ball path. */
  disableShotActorResultMotion?: boolean;
  /** Hide the pitch-owned ball while a full-screen celebration owns the visible ball. */
  hideBall?: boolean;
  /** Optional stable SVG id prefix. Caller must keep it unique on a page. */
  svgIdPrefix?: string;
}
