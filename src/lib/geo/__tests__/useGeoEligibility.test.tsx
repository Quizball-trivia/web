import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGeoEligibility } from '../useGeoEligibility';

// Keep production's server-owned promotion eligibility and preview overrides.
// Staging's event-only cache contract does not include those production fields.
describe('production geo eligibility retained in the release', () => {
  const fetchSpy = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchSpy); fetchSpy.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.history.replaceState({}, '', '/play?geo=GE');
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); window.history.replaceState({}, '', '/'); });
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
});
