import React, { StrictMode } from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const shown = vi.fn();
const signup = vi.fn();
vi.mock('../game-events', () => ({
  trackAuthPanelShown: (...args: unknown[]) => shown(...args),
  trackSignupPageView: () => signup(),
}));
import { useAuthPanelTracking } from '../useAuthPanelTracking';

describe('auth panel exposure', () => {
  beforeEach(() => { shown.mockClear(); signup.mockClear(); });
  it('counts sign-in opening, deduplicates rerenders and tab changes, and counts reopening', () => {
    const { rerender } = renderHook(({ open, mode }) => useAuthPanelTracking(open, mode), {
      initialProps: { open: false, mode: 'signin' },
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    });
    expect(shown).not.toHaveBeenCalled();
    rerender({ open: true, mode: 'signin' });
    rerender({ open: true, mode: 'signin' });
    expect(shown).toHaveBeenCalledExactlyOnceWith('signin');
    expect(signup).not.toHaveBeenCalled();
    rerender({ open: true, mode: 'signup' });
    rerender({ open: true, mode: 'phone' });
    rerender({ open: true, mode: 'signup' });
    expect(shown).toHaveBeenCalledTimes(1);
    expect(signup).toHaveBeenCalledTimes(1);
    rerender({ open: false, mode: 'signup' });
    rerender({ open: true, mode: 'signup' });
    expect(shown).toHaveBeenCalledTimes(2);
    expect(signup).toHaveBeenCalledTimes(2);
  });
  it('deduplicates an initially open panel under strict effects', () => {
    renderHook(() => useAuthPanelTracking(true, 'signup'), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    });
    expect(shown).toHaveBeenCalledTimes(1);
    expect(signup).toHaveBeenCalledTimes(1);
  });
});
