import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SnapshotClues } from '../parts/SnapshotClues';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'en',
    t: (key: string, params?: Record<string, unknown>) =>
      key === 'auctionGame.snapMarketValueSeason' ? `Market value · ${String(params?.season)}` : key,
  }),
}));

const snapshots = [
  { season: '2017/18', league: 'Ligue 1', age: 26, apps: 20, goals: 19, assists: 13, valueEur: 128_000_000 },
  // Pre-reveal value-season stub: label only, value withheld by the server.
  { season: '2025/26', league: '', age: null, apps: 0, goals: 0, valueEur: 0 },
];

describe('SnapshotClues', () => {
  it('names the scout season on the value row and formats it like every other auction amount', () => {
    render(<SnapshotClues snapshots={snapshots} visibleClues={5} variant="panel" position="FWD" />);

    expect(screen.getByText('Market value · 2017/18')).toBeInTheDocument();
    expect(screen.getByText('€128M')).toBeInTheDocument();
    // The value season is announced, its value stays hidden.
    expect(screen.getByText('2025/26')).toBeInTheDocument();
  });

  it('keeps sub-million scout values precise in euros', () => {
    render(
      <SnapshotClues
        snapshots={[{ ...snapshots[0], valueEur: 2_500_000 }, snapshots[1]]}
        visibleClues={5}
        variant="panel"
        position="FWD"
      />,
    );

    expect(screen.getByText('€2.5M')).toBeInTheDocument();
  });
});
