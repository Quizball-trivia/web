import type { TacticModifiers, TacticalCard } from '../types/possession.types';

// ─── Zone helpers ───────────────────────────────────────────────
export function getZone(position: number): { zone: string; color: string } {
  if (position >= 71) return { zone: 'BOX', color: '#FF4B4B' };
  if (position >= 46) return { zone: 'ATT', color: '#FF9600' };
  if (position >= 21) return { zone: 'MID', color: '#FFFFFF' };
  return { zone: 'DEF', color: '#9CA3AF' };
}

export function getDifficultyForZone(position: number): 'easy' | 'medium' | 'hard' {
  if (position >= 71) return Math.random() < 0.5 ? 'medium' : 'hard';
  if (position >= 46) return 'medium';
  if (position >= 21) return Math.random() < 0.5 ? 'easy' : 'medium';
  return 'easy';
}

// ─── Math helpers ───────────────────────────────────────────────
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateSpeedBonus(remainingSeconds: number): number {
  const questionPoints = remainingSeconds * 100;
  return clamp(Math.floor(questionPoints / 300), 0, 5);
}

// ─── Tactic modifiers ───────────────────────────────────────────
export function getTacticModifiers(half: 1 | 2, tactic: TacticalCard | null): TacticModifiers {
  const defaults: TacticModifiers = {
    correctVsWrongGain: 12,
    wrongVsCorrectPenalty: -10,
    speedBonusMultiplier: 1,
    shotMomentumThreshold: 4,
  };

  if (half === 1 || !tactic) return defaults;

  switch (tactic) {
    case 'press-high':
      return { correctVsWrongGain: 12, wrongVsCorrectPenalty: -12, speedBonusMultiplier: 1.25, shotMomentumThreshold: 4 };
    case 'play-safe':
      return { correctVsWrongGain: 9, wrongVsCorrectPenalty: -8, speedBonusMultiplier: 1, shotMomentumThreshold: 4 };
    case 'all-in':
      return { correctVsWrongGain: 14, wrongVsCorrectPenalty: -14, speedBonusMultiplier: 1, shotMomentumThreshold: 3 };
  }
}

// ─── Possession move calculation ────────────────────────────────
export interface PossessionMoveResult {
  posDelta: number;
  momDelta: number;
  message: string;
  direction: 'forward' | 'backward' | 'neutral';
}

export function calculatePossessionMove(
  playerCorrect: boolean,
  oppCorrect: boolean,
  playerTime: number,
  opponentTime: number,
  mods: TacticModifiers,
  timerSeconds: number,
): PossessionMoveResult {
  const remainingSeconds = timerSeconds - playerTime;
  const speedBonus = Math.round(calculateSpeedBonus(remainingSeconds) * mods.speedBonusMultiplier);
  const playerFaster = playerTime < opponentTime;
  const playerFast = playerTime <= 3;

  if (playerCorrect && !oppCorrect) {
    const gain = mods.correctVsWrongGain + speedBonus;
    return { posDelta: gain, momDelta: 2 + (playerFast ? 1 : 0), message: `+${gain} → ATTACK!`, direction: 'forward' };
  }
  if (!playerCorrect && oppCorrect) {
    return { posDelta: mods.wrongVsCorrectPenalty, momDelta: -1, message: `${mods.wrongVsCorrectPenalty} → Pushed back`, direction: 'backward' };
  }
  if (playerCorrect && oppCorrect) {
    if (playerFaster) {
      const gain = 6 + speedBonus;
      return { posDelta: gain, momDelta: 1, message: `+${gain} → Faster answer!`, direction: 'forward' };
    }
    return { posDelta: 3, momDelta: 0, message: '+3 → Correct but slower', direction: 'forward' };
  }
  return { posDelta: -2, momDelta: 0, message: 'Both wrong → -2', direction: 'neutral' };
}

export function shouldTriggerShot(newPos: number, newMom: number, shotThreshold: number): boolean {
  return newPos >= 75 || newMom >= shotThreshold;
}
