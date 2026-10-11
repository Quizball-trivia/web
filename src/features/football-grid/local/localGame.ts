import type { FootballGridOption } from '@/lib/realtime/socket.types';

export type LocalSeat = 1 | 2;

export const LOCAL_ROUNDS = ['bo1', 'bo3', 'bo5', 'bo7'] as const;
export const LOCAL_TURN_SECONDS = [20, 40, 60, 0] as const;
export const LOCAL_DIFFICULTIES = ['mixed', 'easy', 'normal', 'hard'] as const;
export const LOCAL_ANSWERS = ['type', 'choice'] as const;
export const LOCAL_STEALS = [0, 3] as const;
export const LOCAL_SUSPENSIONS = 3;
/** Total turns before a game with nobody able to finish it is called a draw. */
export const LOCAL_MAX_TURNS = 40;

export interface LocalSettings {
  difficulty: (typeof LOCAL_DIFFICULTIES)[number];
  rounds: (typeof LOCAL_ROUNDS)[number];
  /** 0 = no clock. */
  turnSeconds: (typeof LOCAL_TURN_SECONDS)[number];
  answers: (typeof LOCAL_ANSWERS)[number];
  /** Steals each player may make in one game: taking a cell the other holds by naming a different footballer. */
  steals: (typeof LOCAL_STEALS)[number];
  /** Before the first game each player rules out three footballers for the other. */
  suspensions: boolean;
}

export const DEFAULT_LOCAL_SETTINGS: LocalSettings = {
  difficulty: 'easy', rounds: 'bo3', turnSeconds: 40, answers: 'type', steals: 0, suspensions: false,
};

export interface LocalClaim {
  cellIndex: number;
  seat: LocalSeat;
  player: FootballGridOption;
  turnNumber: number;
}

export type LocalEndReason = 'line' | 'board_full' | 'board_dead' | 'draw_agreed' | 'turn_limit';

export interface LocalGame {
  claims: LocalClaim[];
  /** Every footballer named right this game, including those since stolen over: none may be named twice. */
  usedPlayerIds: string[];
  current: LocalSeat;
  turnNumber: number;
  stealsLeft: Record<LocalSeat, number>;
  winner: LocalSeat | null;
  endReason: LocalEndReason | null;
}

export interface LocalSeries {
  wins: Record<LocalSeat, number>;
  draws: number;
  /** 1-based index of the game being played (or just finished). */
  gameIndex: number;
  finished: boolean;
  winner: LocalSeat | null;
}

const WIN_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6],
];

export const otherSeat = (seat: LocalSeat): LocalSeat => (seat === 1 ? 2 : 1);

export function localMaxGames(rounds: LocalSettings['rounds']): number {
  return Number(rounds.slice(2));
}

export function localTargetWins(rounds: LocalSettings['rounds']): number {
  return Math.floor(localMaxGames(rounds) / 2) + 1;
}

export function newLocalGame(opener: LocalSeat, settings: LocalSettings): LocalGame {
  return {
    claims: [],
    usedPlayerIds: [],
    current: opener,
    turnNumber: 0,
    stealsLeft: { 1: settings.steals, 2: settings.steals },
    winner: null,
    endReason: null,
  };
}

export function localWinningLine(claims: readonly LocalClaim[]): { seat: LocalSeat; cells: readonly number[] } | null {
  const owner = new Map(claims.map((claim) => [claim.cellIndex, claim.seat]));
  for (const line of WIN_LINES) {
    const seat = owner.get(line[0]);
    if (seat && owner.get(line[1]) === seat && owner.get(line[2]) === seat) return { seat, cells: line };
  }
  return null;
}

/** A cell the player to move may answer: an empty one, or the other player's while a steal is left. */
export function canPickLocalCell(game: LocalGame, cellIndex: number): boolean {
  if (game.endReason) return false;
  const claim = game.claims.find((entry) => entry.cellIndex === cellIndex);
  if (!claim) return true;
  return claim.seat !== game.current && game.stealsLeft[game.current] > 0;
}

function canStillWin(game: LocalGame, seat: LocalSeat): boolean {
  const owner = new Map(game.claims.map((claim) => [claim.cellIndex, claim.seat]));
  return WIN_LINES.some((line) => {
    const blocked = line.filter((cell) => owner.get(cell) === otherSeat(seat)).length;
    return blocked <= game.stealsLeft[seat];
  });
}

function settle(game: LocalGame): LocalGame {
  const line = localWinningLine(game.claims);
  if (line) return { ...game, winner: line.seat, endReason: 'line' };
  const anySteals = game.stealsLeft[1] > 0 || game.stealsLeft[2] > 0;
  if (game.claims.length === 9 && !anySteals) return { ...game, endReason: 'board_full' };
  if (!canStillWin(game, 1) && !canStillWin(game, 2)) return { ...game, endReason: 'board_dead' };
  return game;
}

function nextTurn(game: LocalGame): LocalGame {
  if (game.endReason) return game;
  if (game.turnNumber + 1 >= LOCAL_MAX_TURNS) return { ...game, endReason: 'turn_limit' };
  return { ...game, current: otherSeat(game.current), turnNumber: game.turnNumber + 1 };
}

/** The player to move named a footballer who fits the cell. Taking the other player's cell spends a steal. */
export function claimLocalCell(game: LocalGame, cellIndex: number, player: FootballGridOption): LocalGame {
  if (!canPickLocalCell(game, cellIndex) || game.usedPlayerIds.includes(player.playerId)) return game;
  const stolen = game.claims.some((claim) => claim.cellIndex === cellIndex);
  const claims = [
    ...game.claims.filter((claim) => claim.cellIndex !== cellIndex),
    { cellIndex, seat: game.current, player, turnNumber: game.turnNumber },
  ];
  const stealsLeft = stolen
    ? { ...game.stealsLeft, [game.current]: game.stealsLeft[game.current] - 1 }
    : game.stealsLeft;
  return nextTurn(settle({ ...game, claims, stealsLeft, usedPlayerIds: [...game.usedPlayerIds, player.playerId] }));
}

/** A wrong answer, a skip or the clock running out: the turn passes. */
export function missLocalTurn(game: LocalGame): LocalGame {
  return nextTurn(game);
}

export function agreeLocalDraw(game: LocalGame): LocalGame {
  return game.endReason ? game : { ...game, endReason: 'draw_agreed' };
}

export function newLocalSeries(): LocalSeries {
  return { wins: { 1: 0, 2: 0 }, draws: 0, gameIndex: 1, finished: false, winner: null };
}

/** Folds a finished game into the series. The series ends on enough wins, or after its last game on wins so far. */
export function recordLocalGame(series: LocalSeries, game: LocalGame, rounds: LocalSettings['rounds']): LocalSeries {
  const wins = { ...series.wins };
  if (game.winner) wins[game.winner] += 1;
  const draws = series.draws + (game.winner ? 0 : 1);
  const target = localTargetWins(rounds);
  const finished = wins[1] >= target || wins[2] >= target || series.gameIndex >= localMaxGames(rounds);
  return {
    wins,
    draws,
    gameIndex: series.gameIndex,
    finished,
    winner: finished && wins[1] !== wins[2] ? (wins[1] > wins[2] ? 1 : 2) : null,
  };
}
