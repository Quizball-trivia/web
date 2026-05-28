/**
 * Shared types for the WelcomeScreen split.
 */

import type { AvatarCustomization } from '@/types/game';

export type AuthPanelMode = 'signin' | 'signup' | 'phone';

export interface DemoPlayer {
  name: string;
  avatarCustomization: AvatarCustomization;
}

export type LandingGoalSide = 'left' | 'right';

export type LandingScenario = {
  kind: 'left-push' | 'right-push' | 'left-goal' | 'right-goal';
  playerPoints: number;
  opponentPoints: number;
};
