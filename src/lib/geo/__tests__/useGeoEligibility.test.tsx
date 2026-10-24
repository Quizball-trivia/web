import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode, createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGeoEligibility } from '../useGeoEligibility';
import { __resetGeoEligibilityForTests, GEO_CACHE_TTL_MS, GEO_FAILURE_COOLDOWN_MS } from '../geoEligibilityResolver';

// Keep production's server-owned promotion eligibility and preview overrides.
// Staging's event-only cache contract does not include those production fields.
describe('production geo eligibility retained in the release', () => {
  const fetchSpy = vi.fn();
  beforeEach(() => {
    __resetGeoEligibilityForTests();
    vi.stubGlobal('fetch', fetchSpy); fetchSpy.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.history.replaceState({}, '', '/play?geo=GE');
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.history.replaceState({}, '', '/'); });
  const GE = { countryCode: 'GE', isGeorgia: true, source: 'header', isGeoExperimentEnabled: false, showBetson: false };
  it('uses the server promotion decision even for a Georgian visitor', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => GE });
    const { result } = renderHook(() => useGeoEligibility());
    await waitFor(() => expect(result.current.countryCode).toBe('GE'));
    expect(result.current.showBetson).toBe(false);
    expect(fetchSpy).toHaveBeenCalledWith('/api/geo?geo=GE', expect.objectContaining({ cache: 'no-store' }));
  });
  it('does not invent promotion eligibility from an incomplete response', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => ({ countryCode: 'GE', isGeorgia: true }) });
    const { result } = renderHook(() => useGeoEligibility());
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(result.current.showBetson).toBe(false);
    expect(result.current.countryCode).toBeNull();
  });
  it('keeps promotions disabled if the geo request fails', async () => {
    fetchSpy.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useGeoEligibility());
    await waitFor(() => expect(console.warn).toHaveBeenCalled());
    expect(result.current.showBetson).toBe(false);
  });

  it('shares one in-flight request, survives one subscriber unmounting, and reuses the result on navigation', async () => {
    let finish!: (response: unknown) => void;
    fetchSpy.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const a = renderHook(() => useGeoEligibility());
    const b = renderHook(() => useGeoEligibility());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const signal = fetchSpy.mock.calls[0][1].signal as AbortSignal;
    a.unmount();
    expect(signal.aborted).toBe(false);
    await act(async () => { finish({ ok: true, json: async () => GE }); });
    expect(b.result.current).toEqual(GE);
    const c = renderHook(() => useGeoEligibility());
    expect(c.result.current).toEqual(GE);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate a probe during Strict Mode remounts', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => GE });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(StrictMode, null, children);
    const { result } = renderHook(() => useGeoEligibility(), { wrapper });
    await waitFor(() => expect(result.current).toEqual(GE));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('skips disabled consumers and resolves when they become enabled', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: async () => GE });
    const view = renderHook(({ enabled }) => useGeoEligibility({ enabled }), { initialProps: { enabled: false } });
    expect(fetchSpy).not.toHaveBeenCalled();
    view.rerender({ enabled: true });
    await waitFor(() => expect(view.result.current).toEqual(GE));
    view.rerender({ enabled: false });
    expect(view.result.current.countryCode).toBeNull();
  });

  it('refreshes expired answers and clears promotion eligibility after a failed refresh', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(100_000);
    const preview = { ...GE, isGeoExperimentEnabled: true, showBetson: true, source: 'override' };
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => preview });
    const a = renderHook(() => useGeoEligibility());
    await waitFor(() => expect(a.result.current.showBetson).toBe(true));
    clock.mockReturnValue(100_000 + GEO_CACHE_TTL_MS + 1);
    fetchSpy.mockRejectedValueOnce(new Error('offline'));
    const b = renderHook(() => useGeoEligibility());
    await waitFor(() => expect(console.warn).toHaveBeenCalled());
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(a.result.current.showBetson).toBe(false);
    expect(b.result.current.countryCode).toBeNull();
  });

  it('backs off failures and recovers every mounted consumer on a later retry', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(100_000);
    fetchSpy.mockRejectedValueOnce(new Error('offline'));
    const a = renderHook(() => useGeoEligibility());
    await waitFor(() => expect(console.warn).toHaveBeenCalled());
    renderHook(() => useGeoEligibility());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(100_000 + GEO_FAILURE_COOLDOWN_MS + 1);
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => GE });
    const b = renderHook(() => useGeoEligibility());
    await waitFor(() => expect(b.result.current).toEqual(GE));
    expect(a.result.current).toEqual(GE);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('does not make a mounted quiz disappear when freshness expires, and refreshes on the next mount', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(100_000);
    const preview = { ...GE, isGeoExperimentEnabled: true, showBetson: true, source: 'override' };
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => preview });
    const view = renderHook(() => useGeoEligibility());
    await waitFor(() => expect(view.result.current.showBetson).toBe(true));
    clock.mockReturnValue(100_000 + GEO_CACHE_TTL_MS + 1);
    view.rerender();
    expect(view.result.current.showBetson).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => GE });
    renderHook(() => useGeoEligibility());
    await waitFor(() => expect(view.result.current.showBetson).toBe(false));
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('isolates preview overrides and never forwards unrelated campaign/query data', async () => {
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => GE });
    const view = renderHook(() => useGeoEligibility());
    await waitFor(() => expect(view.result.current).toEqual(GE));
    window.history.replaceState({}, '', '/play?geo=TR&utm_source=example');
    const TR = { ...GE, countryCode: 'TR', isGeorgia: false, source: 'override' };
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => TR });
    view.rerender();
    await waitFor(() => expect(view.result.current.countryCode).toBe('TR'));
    expect(fetchSpy).toHaveBeenLastCalledWith('/api/geo?geo=TR', expect.anything());
    window.history.replaceState({}, '', '/leaderboard?geo=TR&utm_source=other');
    view.rerender();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('times out a stuck request and lets later screens retry after cooldown', async () => {
    vi.useFakeTimers();
    fetchSpy.mockImplementation((_url: string, { signal }: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const view = renderHook(() => useGeoEligibility());
    await act(async () => { await vi.advanceTimersByTimeAsync(8_000); });
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(view.result.current.showBetson).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(GEO_FAILURE_COOLDOWN_MS + 1); });
    fetchSpy.mockResolvedValueOnce({ ok: true, json: async () => GE });
    renderHook(() => useGeoEligibility());
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(view.result.current).toEqual(GE);
  });
});
