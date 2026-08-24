import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DisconnectedPitchOverlay } from '../DisconnectedPitchOverlay';

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    t: (key: string) => (key === 'auctionGame.disconnected' ? 'Disconnected' : key),
  }),
}));

describe('DisconnectedPitchOverlay', () => {
  it('identifies the disconnected player on the pitch', () => {
    render(<DisconnectedPitchOverlay playerName="CarlosGol99" />);

    expect(screen.getByRole('status')).toHaveTextContent('CarlosGol99');
    expect(screen.getByRole('status')).toHaveTextContent('Disconnected');
  });
});
