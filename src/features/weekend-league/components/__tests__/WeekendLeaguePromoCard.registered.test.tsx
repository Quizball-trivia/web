import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WeekendLeaguePromoCard } from '../WeekendLeaguePromoCard';

// Logged-out visitors have no /current data; the card must HIDE the
// registered line rather than claim "0 players registered" (2026-09-25:
// tournament page showed 0 while 418 were entered, during the biggest
// signup day so far).

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ t: (k: string, p?: Record<string, unknown>) => p ? `${k}:${JSON.stringify(p)}` : k, locale: 'en' }),
}));

const base = { kickoffMs: null, qp: null, qpTarget: 200, onStart: () => {} };

describe('WeekendLeaguePromoCard registered count', () => {
  it('hides the registered line when the count is unknown', () => {
    render(<WeekendLeaguePromoCard {...base} registeredCount={null} />);
    expect(screen.queryByText(/promoRegistered/)).toBeNull();
  });

  it('still shows a real count', () => {
    render(<WeekendLeaguePromoCard {...base} registeredCount={418} />);
    expect(screen.getByText(/promoRegistered.*418/)).toBeTruthy();
  });
});
