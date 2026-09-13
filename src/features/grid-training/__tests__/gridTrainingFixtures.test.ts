import { describe, expect, it } from 'vitest';
import { searchGridPlayers } from '@/lib/football-grid/typeahead';
import { GRID_TRAINING_BOARD, GRID_TRAINING_ROSTER, GRID_TRAINING_SAMPLES, cellAnswers, resolveCellAnswer } from '../data/gridTrainingFixtures';
import { GRID_TRAINING_TURNS } from '../data/gridTrainingScript';

describe('grid training fixtures', () => {
  it('resolves every canonical name and its aliases for its own cell', () => {
    for (let cell = 0; cell < 9; cell += 1) {
      for (const answer of cellAnswers(cell)) {
        expect(resolveCellAnswer(cell, answer.name)?.name, `${cell}:${answer.name}`).toBe(answer.name);
        for (const alias of answer.accepted) expect(resolveCellAnswer(cell, alias)?.name, `${cell}:${alias}`).toBe(answer.name);
      }
    }
  });

  it('accepts the names the tooltips suggest, and rejects the scripted mistake', () => {
    expect(resolveCellAnswer(4, 'Pogba')?.name).toBe('Paul Pogba');
    expect(resolveCellAnswer(1, 'Benzema')?.name).toBe('Karim Benzema');
    expect(resolveCellAnswer(7, 'Trezeguet')?.name).toBe('David Trezeguet');
    expect(resolveCellAnswer(8, 'Cristiano Ronaldo')).toBeNull();
    expect(resolveCellAnswer(4, 'Messi')).toBeNull();
  });

  it('puts every valid answer (and the decoys) in the typeahead roster with prepared words', () => {
    const names = new Set(GRID_TRAINING_ROSTER.map((p) => p.nameEn));
    for (let cell = 0; cell < 9; cell += 1) for (const answer of cellAnswers(cell)) expect(names.has(answer.name), answer.name).toBe(true);
    expect(names.has('Cristiano Ronaldo')).toBe(true);
    const pogba = GRID_TRAINING_ROSTER.find((p) => p.nameEn === 'Paul Pogba')!;
    expect(pogba.wordsEn).toEqual(['paul', 'pogba']);
    expect(GRID_TRAINING_ROSTER.find((p) => p.nameEn === 'Zinedine Zidane')?.nameKa).toBe('ზიდანი');
  });

  it('finds the Georgian hints in the suggestions and resolves them', () => {
    for (const [query, cell, name] of [['პოგბა', 4, 'Paul Pogba'], ['ბენზემა', 1, 'Karim Benzema'], ['ტრეზეგე', 7, 'David Trezeguet']] as const) {
      expect(searchGridPlayers(GRID_TRAINING_ROSTER, query, 'ka', 6).map((p) => p.nameEn), query).toContain(name);
      expect(resolveCellAnswer(cell, query)?.name, query).toBe(name);
    }
  });

  it('keeps the script on open cells with live registry ids and playable samples', () => {
    const cells = GRID_TRAINING_TURNS.map((turn) => turn.cell);
    expect(new Set(cells).size).toBe(cells.length);
    for (const turn of GRID_TRAINING_TURNS) if (turn.who === 'bot') expect(resolveCellAnswer(turn.cell, turn.player)?.name).toBe(turn.player);
    expect(GRID_TRAINING_BOARD.rows.map((r) => r.assetKey)).toEqual(['real-madrid-cf', 'manchester-united', 'juventus']);
    expect(GRID_TRAINING_BOARD.columns.map((c) => c.assetKey)).toEqual(['br', 'fr', 'ar']);
    expect(GRID_TRAINING_SAMPLES.every((s) => s.players.length === 3)).toBe(true);
  });
});
