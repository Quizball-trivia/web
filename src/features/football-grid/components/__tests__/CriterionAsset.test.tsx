import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
  it('uses the packaged club visual while the provider primary awaits rights clearance', () => {
    const { container } = render(<CriterionAsset criterion={criterion()} />);
    const primary = container.querySelector('img');
    expect(primary?.getAttribute('src')).toBe('/assets/football-grid/clubs/fc-barcelona-fallback.svg');
  });

  it('prefers an exact club match before ambiguous suffix matches', () => {
    const { container } = render(<CriterionAsset criterion={criterion({
      id: 'manchester-city',
      key: 'city',
      labelEn: 'Manchester City',
      labelKa: 'მანჩესტერ სიტი',
      assetKey: 'city',
    })} />);

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/assets/football-grid/clubs/manchester-city-fallback.svg');
  });

  it('resolves a country directly to its packaged flag', () => {
    const { container } = render(<CriterionAsset criterion={criterion({ id: 'brazil', key: 'brazil', family: 'country', labelEn: 'Brazil', labelKa: 'ბრაზილია', assetKey: 'br' })} />);

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/assets/football-grid/flags/br.svg');
  });

  it('renders a family fallback instead of a broken image for unknown content', () => {
    const { container } = render(<CriterionAsset criterion={criterion({ id: 'unknown', key: 'unknown', labelEn: 'Unknown Club', labelKa: 'უცნობი', assetKey: 'unknown' })} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
