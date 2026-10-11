import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, type HttpMethod } from '../api';
import { trackApiError } from '../../analytics/game-events';

const mocks = vi.hoisted(() => ({
  trackEvent: vi.fn(),
  accessToken: vi.fn(),
  guestToken: vi.fn(),
  flushJourney: vi.fn(),
}));

vi.mock('@/lib/posthog', () => ({ trackEvent: mocks.trackEvent }));
vi.mock('@/lib/config', () => ({ API_BASE_URL: 'https://offline.invalid' }));
vi.mock('@/lib/auth/supabase', () => ({ getSupabaseAccessToken: mocks.accessToken }));
vi.mock('@/lib/guest/guestSession', () => ({ peekGuestToken: mocks.guestToken }));
vi.mock('@/lib/guest/guestJourney', () => ({ flushGuestJourney: mocks.flushJourney }));
vi.mock('@/features/campaign-quiz/campaignAttribution', () => ({
  clearCampaignAttribution: vi.fn(),
  getCampaignAttributionAnalyticsProperties: () => ({}),
}));

const fetchMock = vi.fn<typeof fetch>();

// Tests exercise transport behavior independently of which server routes expose
// each method. Production callers still use the generated route/body types.
function request(method: HttpMethod, path = '/api/v1/users/me', options = {}) {
  return api.request(method, path as never, options as never);
}

function respond(status: number, data: unknown) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.stubGlobal('window', {});
  vi.stubGlobal('fetch', fetchMock);
  mocks.accessToken.mockResolvedValue('offline-member-token');
  mocks.guestToken.mockReturnValue('offline-guest-token');
  mocks.flushJourney.mockResolvedValue(undefined);
  mocks.trackEvent.mockImplementation(() => undefined);
  respond(409, { code: 'CONFLICT', message: 'offline-private-response' });
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('API error operation context', () => {
  it.each<HttpMethod>(['get', 'post', 'put', 'patch', 'delete'])('reports the actual %s method without changing the error', async (method) => {
    let caught: unknown;
    try {
      await request(method, '/api/v1/users/me', {
        headers: { Authorization: 'Bearer offline-explicit-token' },
        body: method === 'get' ? undefined : { nickname: 'offline-private-name' },
      });
    } catch (error) { caught = error; }
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({ status: 409, data: {
      code: 'CONFLICT', message: 'offline-private-response',
    } });
    expect(mocks.trackEvent).toHaveBeenCalledExactlyOnceWith('api_error', {
      endpoint: '/api/v1/users/me', status: 409, code: 'CONFLICT', method: method.toUpperCase(),
    });
    const transport = fetchMock.mock.calls[0][1]!;
    expect(transport.method).toBe(method.toUpperCase());
    expect(new Headers(transport.headers).get('Authorization')).toBe('Bearer offline-explicit-token');
    expect(transport.credentials).toBe('include');
  });

  it('keeps route templates and does not emit request/response private values', async () => {
    await expect(request('patch', '/api/v1/users/{userId}', {
      params: { userId: 'offline-private-id' },
      query: { q: 'offline-private-query' },
      headers: { 'x-private-test': 'offline-private-header' },
      body: { nickname: 'offline-private-name' },
    })).rejects.toBeInstanceOf(ApiError);
    expect(mocks.trackEvent).toHaveBeenCalledExactlyOnceWith('api_error', {
      endpoint: '/api/v1/users/{userId}', status: 409, code: 'CONFLICT', method: 'PATCH',
    });
    const captured = JSON.stringify(mocks.trackEvent.mock.calls);
    for (const privateValue of ['offline-private-id', 'offline-private-query', 'offline-private-header',
      'offline-private-name', 'offline-private-response', 'offline-member-token', 'offline-guest-token']) {
      expect(captured).not.toContain(privateValue);
    }
  });

  it('keeps legacy callers backward compatible without inventing a method', () => {
    trackApiError('/legacy', 401, 'UNAUTHORIZED');
    expect(mocks.trackEvent).toHaveBeenCalledExactlyOnceWith('api_error', {
      endpoint: '/legacy', status: 401, code: 'UNAUTHORIZED',
    });
    expect(mocks.trackEvent.mock.calls[0][1]).not.toHaveProperty('method');
  });

  it('does not mistake non-string response codes for an error code', async () => {
    respond(409, { code: 123, detail: 'offline-private-detail' });
    await expect(request('patch')).rejects.toBeInstanceOf(ApiError);
    expect(mocks.trackEvent).toHaveBeenCalledExactlyOnceWith('api_error', {
      endpoint: '/api/v1/users/me', status: 409, code: undefined, method: 'PATCH',
    });
  });

  it('analytics failures cannot replace the original API error', async () => {
    mocks.trackEvent.mockImplementation(() => { throw new Error('offline analytics failure'); });
    await expect(request('patch')).rejects.toMatchObject({
      name: 'ApiError', status: 409, data: { code: 'CONFLICT', message: 'offline-private-response' },
    });
  });

  it('successful responses do not create an api_error', async () => {
    respond(200, { ok: true });
    await expect(request('get')).resolves.toEqual({ ok: true });
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });

  it('network failures remain network failures without an invented HTTP status', async () => {
    const networkError = new TypeError('offline network failure');
    fetchMock.mockRejectedValue(networkError);
    await expect(request('get')).rejects.toBe(networkError);
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });

  it('auth:false still avoids member-token injection', async () => {
    await expect(request('get', '/api/v1/users/me', { auth: false })).rejects.toBeInstanceOf(ApiError);
    expect(mocks.accessToken).not.toHaveBeenCalled();
    expect(new Headers(fetchMock.mock.calls[0][1]!.headers).has('Authorization')).toBe(false);
  });
});
