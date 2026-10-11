import { describe, expect, it } from 'vitest';
import {
  agreeLocalDraw,
  canPickLocalCell,
  claimLocalCell,
  DEFAULT_LOCAL_SETTINGS,
  LOCAL_MAX_TURNS,
  localTargetWins,
  localWinningLine,
  missLocalTurn,
  newLocalGame,
  newLocalSeries,
  recordLocalGame,
  type LocalGame,
} from '../localGame';

const footballer = (id: string) => ({ playerId: id, name: id, nameKa: null, imageUrl: null });
const start = (steals: 0 | 3 = 0) => newLocalGame(1, { ...DEFAULT_LOCAL_SETTINGS, steals });
const play = (game: LocalGame, cells: number[]) => cells.reduce((state, cell, index) => claimLocalCell(state, cell, footballer(`p${index}`)), game);

describe('same-phone Tic Tac Toe', () => {
  it('alternates turns and ends on three in a line', () => {
    const game = play(start(), [0, 3, 1, 4, 2]);
    expect(game.winner).toBe(1);
    expect(game.endReason).toBe('line');
    expect(localWinningLine(game.claims)?.cells).toEqual([0, 1, 2]);
  });

  it('passes the turn on a miss without touching the board', () => {
    const game = missLocalTurn(start());
    expect(game.current).toBe(2);
    expect(game.turnNumber).toBe(1);
    expect(game.claims).toHaveLength(0);
  });

  it('never accepts the same footballer twice in a game', () => {
    const first = claimLocalCell(start(), 0, footballer('same'));
    const second = claimLocalCell(first, 1, footballer('same'));
    expect(second).toBe(first);
  });

  it('calls a board nobody can finish a draw, without waiting for it to fill', () => {
    // X O X / X O O / O X . : every line holds both players.
    const game = play(start(), [0, 1, 2, 4, 3, 5, 7, 6]);
    expect(game.endReason).toBe('board_dead');
    expect(game.winner).toBeNull();
  });

  it('keeps cells locked without steals and lets a steal take one with a different footballer', () => {
    const locked = play(start(), [4]);
    expect(canPickLocalCell(locked, 4)).toBe(false);
    const open = play(start(3), [4]);
    expect(canPickLocalCell(open, 4)).toBe(true);
    const stolen = claimLocalCell(open, 4, footballer('other'));
    expect(stolen.claims).toHaveLength(1);
    expect(stolen.claims[0].seat).toBe(2);
    expect(stolen.stealsLeft[2]).toBe(2);
    expect(stolen.usedPlayerIds).toEqual(['p0', 'other']);
  });

  it('does not let a player steal their own cell', () => {
    const game = missLocalTurn(play(start(3), [4]));
    expect(game.current).toBe(1);
    expect(canPickLocalCell(game, 4)).toBe(false);
  });

  it('wins by stealing the cell that completes a line', () => {
    // Seat 1 holds 0 and 1; seat 2 blocks at 2; seat 1 steals 2.
    let game = play(start(3), [0, 3, 1, 2]);
    expect(game.endReason).toBeNull();
    game = claimLocalCell(game, 2, footballer('thief'));
    expect(game.winner).toBe(1);
  });

  it('keeps a blocked board alive while a steal could still open a line', () => {
    const game = play(start(3), [0, 1, 2, 4, 3, 5, 7, 6]);
    expect(game.endReason).toBeNull();
  });

  it('ends at the turn limit and by agreement', () => {
    let game = start();
    for (let turn = 0; turn < LOCAL_MAX_TURNS; turn += 1) game = missLocalTurn(game);
    expect(game.endReason).toBe('turn_limit');
    expect(agreeLocalDraw(start()).endReason).toBe('draw_agreed');
  });

  it('decides a series on enough wins, or on the score after its last game', () => {
    expect(localTargetWins('bo5')).toBe(3);
    const won = play(start(), [0, 3, 1, 4, 2]);
    let series = recordLocalGame(newLocalSeries(), won, 'bo3');
    expect(series.finished).toBe(false);
    series = recordLocalGame({ ...series, gameIndex: 2 }, won, 'bo3');
    expect(series).toMatchObject({ finished: true, winner: 1, wins: { 1: 2, 2: 0 } });
    const drawn = agreeLocalDraw(start());
    let level = recordLocalGame(newLocalSeries(), drawn, 'bo1');
    expect(level).toMatchObject({ finished: true, winner: null, draws: 1 });
    level = recordLocalGame({ ...newLocalSeries(), wins: { 1: 1, 2: 0 }, gameIndex: 3 }, drawn, 'bo3');
    expect(level).toMatchObject({ finished: true, winner: 1 });
  });
});
