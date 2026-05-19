export function calculateCluesDisplayPoints(revealedClues: number): number {
  return Math.max(20, 100 - Math.max(0, revealedClues - 1) * 20);
}
