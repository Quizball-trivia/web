import type { GameMode } from '@/types/game';

/**
 * Maps a multiplayer round number (1-3) to its game mode.
 * Round 1: Countdown, Round 2: Clues, Round 3: Time Attack
 */
export function getRoundMode(round: number): GameMode {
  switch (round) {
    case 1:
      return "countdown";
    case 2:
      return "clues";
    case 3:
      return "timeAttack";
    default:
      return "countdown";
  }
}

/**
 * Formats a timestamp into a "Xh Ym" countdown string
 * showing how much of a 24-hour window remains.
 */
export function formatTimeRemaining(timestamp: number): string {
  const now = Date.now();
  const timeElapsed = now - timestamp;
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const timeRemaining = twentyFourHours - timeElapsed;

  if (timeRemaining <= 0) return "Available";

  const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
  const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
