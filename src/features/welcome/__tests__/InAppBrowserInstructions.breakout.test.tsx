import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { InAppBrowserInstructions } from '../InAppBrowserInstructions';

function renderInDialog(ui: React.ReactElement) {
  return render(<Dialog open><DialogContent>{ui}</DialogContent></Dialog>);
}
import type React from 'react';

// One-tap breakout (FB/IG convert at ~6% vs YouTube 65%, 30d to 2026-09-05 —
// ~330 of ~350 social visitors lost at the manual-instructions wall). The
// modal must LEAD with an automatic open-in-browser attempt, not homework.

const tryOpenInExternalBrowser = vi.fn();
vi.mock('@/lib/auth/in-app-browser', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  tryOpenInExternalBrowser: (url: string) => tryOpenInExternalBrowser(url),
}));

vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({ t: (k: string) => k, locale: 'en' }),
}));

describe('InAppBrowserInstructions one-tap breakout', () => {
  beforeEach(() => tryOpenInExternalBrowser.mockReset());

  it('leads with an open-in-browser button on iOS and calls the breakout helper', () => {
    renderInDialog(<InAppBrowserInstructions platform="ios" app="instagram" />);
    const btn = screen.getByRole('button', { name: /inAppBrowser\.openNowButton/ });
    fireEvent.click(btn);
    expect(tryOpenInExternalBrowser).toHaveBeenCalledWith(window.location.href);
  });

  it('offers the button on Android too', () => {
    renderInDialog(<InAppBrowserInstructions platform="android" app="facebook" />);
    expect(screen.getByRole('button', { name: /inAppBrowser\.openNowButton/ })).toBeTruthy();
  });

  it('hides the button on platforms without a breakout scheme', () => {
    renderInDialog(<InAppBrowserInstructions platform="other" app="facebook" />);
    expect(screen.queryByRole('button', { name: /inAppBrowser\.openNowButton/ })).toBeNull();
  });
});
