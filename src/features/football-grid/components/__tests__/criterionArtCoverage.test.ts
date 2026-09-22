import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import review from '../../dev/criteria-review.json';
import type { FootballGridCriterionView } from '@/lib/realtime/socket.types';
import { criterionAssetSources } from '../CriterionAsset';
import { trophyArtForm } from '../CriterionFallbackArt';
import portraits from '@/data/football-grid/player-portrait-overrides.json';

describe('published clue artwork coverage', () => {
  it('has a specific original trophy illustration for every published award', () => {
    for (const criterion of review.criteria as FootballGridCriterionView[]) {
      if (criterion.family !== 'trophy_award') continue;
      expect(trophyArtForm(criterion), criterion.key).not.toBe('cup');
      expect(criterionAssetSources(criterion)).toEqual([]);
    }
  });
  it('ships every reviewed player portrait without shared placeholder keys', () => {
    for (const [id, path] of Object.entries(portraits)) {
      expect(path).toContain(`/${id}.webp`);
      expect(existsSync(resolve(process.cwd(), 'public', path.slice(1)))).toBe(true);
    }
  });
  it('resolves an image for every photographed or logo-based clue, and ships its local files', () => {
    const missing: string[] = [];
    for (const criterion of review.criteria as FootballGridCriterionView[]) {
      if (criterion.family === 'wildcard' || criterion.family === 'trophy_award') continue;
      const sources = criterionAssetSources(criterion);
      if (!sources.length) missing.push(`${criterion.key}: no image`);
      for (const source of sources.filter((value) => value.startsWith('/'))) {
        if (!existsSync(resolve(process.cwd(), 'public', source.slice(1)))) missing.push(`${criterion.key}: ${source}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
