import { API_BASE_URL } from '@/lib/config';
import { timeoutSignal } from '@/lib/timeoutSignal';
import type { FootballGridBoardView, FootballGridOption } from '@/lib/realtime/socket.types';

/** A board dealt for play on this device; the ticket proves the server dealt it and goes with every later call. */
export interface GridSoloBoard {
  board: FootballGridBoardView;
  ticket: string;
}

export type GridSoloVerdict =
  | { outcome: 'correct'; player: FootballGridOption }
  | { outcome: 'wrong' | 'ambiguous' | 'already_used'; player: null };

export class GridSoloError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'GridSoloError';
  }
}

/** A call that hangs would hold the turn: no answer in this long is a failure the player can retry. */
const REQUEST_TIMEOUT_MS = 12_000;

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/v1/football-grid/solo/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: timeoutSignal(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new GridSoloError(response.status, `solo ${path} failed: ${response.status}`);
  return await response.json() as T;
}

export const gridSoloApi = {
  dealBoard: (input: { theme?: string; difficulty: 'mixed' | 'easy' | 'normal' | 'hard'; excludeBoardIds: string[] }) =>
    post<GridSoloBoard>('board', input),
  answer: (input: {
    boardId: string; ticket: string; cellIndex: number; text: string; usedPlayerIds: string[]; optionPlayerId?: string;
  }) => post<GridSoloVerdict>('answer', input),
  options: (input: { boardId: string; ticket: string; cellIndex: number; usedPlayerIds: string[]; optionSeed: string }) =>
    post<{ options: FootballGridOption[] | null }>('options', input).then((result) => result.options),
};
