/**
 * Shared types for the realtime party quiz screen and its helpers.
 *
 * Lives separately from the helpers/components so the view-model hook
 * and presentational pieces can both import the shapes without pulling
 * the helper bundle.
 */

import type { AvatarCustomization } from '@/types/game';

export interface RealtimePartyQuizScreenProps {
  onQuit: () => void;
  onForfeit: () => void;
  /** 'leader-pill' (default): the party-kit "me vs leader" bar. The older list under the options and scrolling bar stay available. */
  mobileStandingsPlacement?: 'leader-pill' | 'bottom-bar' | 'below-options';
  disableBgm?: boolean;
}

export interface PartyStandingViewModel {
  userId: string;
  username: string;
  avatarUrl: string | null;
  avatarCustomization?: AvatarCustomization | null;
  rank: number;
  totalPoints: number;
  answered: boolean;
  status: 'active' | 'dropped';
  /** Badge for a dropped row; defaults to "partyResults.dropped" (a room tells away from left). */
  statusLabel?: string;
  isLeader: boolean;
  isSelf: boolean;
  rankShift: number;
  roundDelta: number | null;
}

export interface ScoreFlight {
  id: string;
  userId: string;
  points: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  failed?: boolean;
  targetTotal?: number;
}

export type StandingDotStatus = 'correct' | 'answering' | 'resolved' | 'idle';
