import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ user: null as { country: string } | null }));
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (select: (value: typeof state) => unknown) => select(state),
}));

describe('event geo checks', () => {
  const fetchSpy = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    state.user = null;
    fetchSpy.mockReset();
    vi.stubGlobal('fetch', fetchSpy);
    window.history.replaceState({}, '', '/play');
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('does not check IP country while the event is disabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED', 'false');
    const { useActiveEventMode } = await import('@/lib/hooks/useActiveEventMode');
    const { result } = renderHook(() => useActiveEventMode());
    expect(result.current.isEventMode).toBe(false);
    expect(result.current.scoreLabel).toBe('RP');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(['GE', 'US'])('uses the logged-in %s account country without an IP request', async (country) => {
    vi.stubEnv('NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED', 'true');
    state.user = { country };
    const { useActiveEventMode } = await import('@/lib/hooks/useActiveEventMode');
    const { result } = renderHook(() => useActiveEventMode());
    expect(result.current.canParticipate).toBe(country === 'GE');
    expect(result.current.isEventMode).toBe(country === 'GE');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('shares guest checks across event consumers without allowing guest participation', async () => {
    vi.stubEnv('NEXT_PUBLIC_GEORGIA_WC_EVENT_ENABLED', 'true');
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ countryCode: 'GE', isGeorgia: true, showBetson: false, isGeoExperimentEnabled: false, source: 'header' }) });
    const { useActiveEventMode } = await import('@/lib/hooks/useActiveEventMode');
    const { result, rerender } = renderHook(() => [useActiveEventMode(), useActiveEventMode()]);
    await waitFor(() => expect(result.current.every((mode) => mode.isEventMode)).toBe(true));
    expect(result.current.every((mode) => !mode.canParticipate)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    state.user = { country: 'US' };
    rerender();
    expect(result.current.every((mode) => !mode.isEventMode)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
