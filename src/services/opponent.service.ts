import type { GameMode } from '@/types/game';

export interface OpponentAction {
  points: number;
  delay: number;
}

export interface OpponentService {
  simulateAnswer(mode: GameMode, questionIndex: number, totalQuestions: number): OpponentAction;
}

export const opponentService: OpponentService = {
  simulateAnswer(mode, questionIndex, totalQuestions) {
    const maxPerQuestion = mode === 'timeAttack' ? 200 : 100;
    const targetScore = Math.floor(totalQuestions * maxPerQuestion * 0.6);
    const averagePerQuestion = Math.floor(targetScore / totalQuestions);

    // Deterministic variation: ±15 points based on question index
    const variation = ((questionIndex * 31) % 31) - 15;
    const points = Math.max(0, Math.min(maxPerQuestion, averagePerQuestion + variation));

    // Deterministic delay: 3-8 seconds based on question index
    const answerDelay = 3000 + ((questionIndex * 137) % 5000);

    return { points, delay: answerDelay };
  },
};
