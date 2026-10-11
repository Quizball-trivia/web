import { describe, expect, it } from 'vitest';
import { claimLocalCell, DEFAULT_LOCAL_SETTINGS, newLocalGame, newLocalSeries, type LocalGame } from '../localGame';
import { localSnapshotOf, parseLocalSnapshot } from '../localSession';

const NOW = 1_800_000_000_000;
const player = (id: string) => ({ playerId: id, name: id, nameKa: null, imageUrl: null });
const deal = { board: { boardId: 'board' } as never, ticket: `${NOW + 3_600_000}.sig` };
const screen = (game: LocalGame, stage = 'play') => ({
  stage,
  settings: DEFAULT_LOCAL_SETTINGS,
  names: { 1: 'A', 2: 'B' },
  deal,
  game,
  series: newLocalSeries(),
  opener: 1 as const,
  blocked: { 1: [], 2: [] },
  typing: { 1: false, 2: true },
  played: ['board'],
  deadline: { turn: '1:4', at: NOW + 9_000 },
});

/** Seat 1 takes the top row while seat 2 takes two other squares. */
function wonByLine(): LocalGame {
  let game = newLocalGame(1, DEFAULT_LOCAL_SETTINGS);
  for (const [cell, id] of [[0, 'a'], [3, 'b'], [1, 'c'], [4, 'd'], [2, 'e']] as const) game = claimLocalCell(game, cell, player(id));
  return game;
}

describe('localSnapshotOf', () => {
  it('keeps a running turn with its clock', () => {
    const game = claimLocalCell(newLocalGame(1, DEFAULT_LOCAL_SETTINGS), 0, player('a'));
    expect(localSnapshotOf(screen(game))).toMatchObject({ stage: 'play', deadline: { turn: '1:4', at: NOW + 9_000 }, typing: { 2: true } });
  });

  it('counts a game that has just been won, although the screen still shows its board', () => {
    const game = wonByLine();
    expect(game.endReason).toBe('line');
    const kept = localSnapshotOf(screen(game));
    expect(kept).toMatchObject({ stage: 'between', deadline: null, series: { wins: { 1: 1, 2: 0 } } });
    expect(kept?.game.claims).toHaveLength(5);
  });

  it('keeps nothing before a board is on screen', () => {
    expect(localSnapshotOf({ ...screen(newLocalGame(1, DEFAULT_LOCAL_SETTINGS), 'setup') })).toBeNull();
    expect(localSnapshotOf({ ...screen(newLocalGame(1, DEFAULT_LOCAL_SETTINGS)), deal: null })).toBeNull();
  });
});

describe('parseLocalSnapshot', () => {
  const stored = () => JSON.stringify(localSnapshotOf(screen(newLocalGame(1, DEFAULT_LOCAL_SETTINGS))));

  it('reads back what was kept', () => {
    expect(parseLocalSnapshot(stored(), NOW)).toMatchObject({ stage: 'play', names: { 1: 'A' } });
  });

  it('does not resume a board whose ticket has lapsed or is about to', () => {
    expect(parseLocalSnapshot(stored(), NOW + 3_600_000 - 30_000)).toBeNull();
  });

  it('ignores anything that is not a snapshot', () => {
    expect(parseLocalSnapshot(null, NOW)).toBeNull();
    expect(parseLocalSnapshot('{', NOW)).toBeNull();
    expect(parseLocalSnapshot('{"v":2}', NOW)).toBeNull();
  });
});
