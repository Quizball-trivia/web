import { fireEvent, render } from '@testing-library/react';
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
  it('falls back from a remote club primary to the packaged local crest', () => {
    const { container } = render(<CriterionAsset criterion={criterion()} />);
    const primary = container.querySelector('img');
    expect(primary?.getAttribute('src')).toContain('/storage/v1/object/public/imgs/club-logos/');

    fireEvent.error(primary as HTMLImageElement);

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/assets/football-grid/clubs/fc-barcelona.svg');
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
