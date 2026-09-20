import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FOOTBALL_GRID_CDN_BASE_URL } from '@/lib/football-grid/assets';
import type { FootballGridCriterionView } from '@/lib/realtime/socket.types';
import { CriterionAsset } from '../CriterionAsset';

function criterion(overrides: Partial<FootballGridCriterionView> = {}): FootballGridCriterionView {
  return {
    id: 'barcelona',
    key: 'barcelona',
    family: 'club',
    labelEn: 'Barcelona',
    labelKa: 'ბარსელონა',
    assetKey: 'barcelona',
    difficulty: 'normal',
    ...overrides,
  };
}

describe('CriterionAsset', () => {
  it('renders the real club crest first (owner rights decision 2026-08-27)', () => {
    const { container } = render(<CriterionAsset criterion={criterion()} />);
    const primary = container.querySelector('img');
    expect(primary?.getAttribute('src')).toContain('imgs/club-logos/fc-barcelona.webp');
  });

  it('prefers an exact club match before ambiguous suffix matches', () => {
    const { container } = render(<CriterionAsset criterion={criterion({
      id: 'manchester-city',
      key: 'city',
      labelEn: 'Manchester City',
      labelKa: 'მანჩესტერ სიტი',
      assetKey: 'city',
    })} />);

    expect(container.querySelector('img')?.getAttribute('src')).toContain('imgs/club-logos/manchester-city.webp');
  });

  it('resolves a country directly to its packaged flag', () => {
    const { container } = render(<CriterionAsset criterion={criterion({ id: 'brazil', key: 'brazil', family: 'country', labelEn: 'Brazil', labelKa: 'ბრაზილია', assetKey: 'br' })} />);

    expect(container.querySelector('img')?.getAttribute('src')).toBe(`${FOOTBALL_GRID_CDN_BASE_URL}/flags/br.svg`);
  });

  it('renders a family fallback instead of a broken image for unknown content', () => {
    const { container } = render(<CriterionAsset criterion={criterion({ id: 'unknown', key: 'unknown', labelEn: 'Unknown Club', labelKa: 'უცნობი', assetKey: 'unknown' })} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
