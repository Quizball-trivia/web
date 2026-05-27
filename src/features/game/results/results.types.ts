/**
 * Shared type defs for the RealtimeResultsScreen split.
 *
 * The top-level `RealtimeResultsScreenProps` is the single public-facing
 * prop interface — it stays the source of truth for the wrapper
 * component and is consumed by sub-components (hero, ranked panel,
 * stats panel, actions) via narrower picks below.
 */

import type { AchievementUnlockPayload, RankedMatchOutcomePayload } from '@/lib/realtime/socket.types';
import type { RankedProfileResponse } from '@/lib/repositories/ranked.repo';
import type { UserProgression } from '@/lib/domain';
import type { AvatarCustomization } from '@/types/game';

export interface RealtimeResultsScreenProps {
  matchType: 'ranked' | 'friendly';
  playerUsername: string;
  playerAvatar: string;
  playerAvatarCustomization?: AvatarCustomization | null;
  opponentUsername: string;
  opponentAvatar: string;
  opponentAvatarCustomization?: AvatarCustomization | null;
  playerScore: number;
  opponentScore: number;
  playerCorrect: number;
  opponentCorrect: number;
  totalQuestions: number;
  /** Per-question outcome arrays (length === totalQuestions). `null` = unanswered. */
  playerQuestionResults?: Array<'correct' | 'wrong' | null>;
  opponentQuestionResults?: Array<'correct' | 'wrong' | null>;
  selfUserId: string;
  finalWinnerId?: string | null;
  winnerDecisionMethod?: 'goals' | 'penalty_goals' | 'total_points' | 'total_points_fallback' | 'forfeit' | null;
  preMatchRp?: number;
  opponentId: string;
  opponentRankPoints?: number | null;
  rankedOutcome?: RankedMatchOutcomePayload | null;
  preMatchRankedProfile?: RankedProfileResponse | null;
  preMatchProgression?: UserProgression | null;
  unlockedAchievements?: AchievementUnlockPayload[];
  onPlayAgain: () => void;
  onMainMenu: () => void;
}
