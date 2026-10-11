export const GRID_WIN_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
];

/** How long a finished board stays up with its winning line crossed out before the result takes over. */
export const GRID_WIN_LINE_HOLD_MS = 1_800;

/** The three squares in a line that `owner` holds, in board order; null when they hold no line. */
export function gridWinLine<Owner>(
  claims: ReadonlyArray<{ cellIndex: number; owner: Owner }>,
  owner: Owner | null | undefined,
): readonly number[] | null {
  if (owner === null || owner === undefined) return null;
  const held = new Set(claims.filter((claim) => claim.owner === owner).map((claim) => claim.cellIndex));
  return GRID_WIN_LINES.find((line) => line.every((cell) => held.has(cell))) ?? null;
}
