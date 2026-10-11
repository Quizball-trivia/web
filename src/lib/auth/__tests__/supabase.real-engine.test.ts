import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthClient, AuthChangeEvent } from '@supabase/auth-js';

const storageKey = 'sb-synthetic-auth-token';
const clients: InstanceType<typeof AuthClient>[] = [];
const fixtureSession = () => ({
  access_token: 'synthetic-access-token', refresh_token: 'synthetic-refresh-token',
  token_type: 'bearer', expires_in: 7200, expires_at: Math.floor(Date.now() / 1000) + 7200,
  user: { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});
const blockedFetch = vi.fn(() => Promise.reject(new Error('Network access is forbidden in this test')));

async function wrapper() {
  const clientModule = await import('../supabase');
  clients.push(clientModule.getSupabaseClient().auth);
  return clientModule;
}

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://synthetic.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic-public-key');
  blockedFetch.mockClear();
  vi.stubGlobal('fetch', blockedFetch);
});
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.dispose()));
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('real auth engine without external requests', () => {
  it('restores an existing full-client session without rewriting it or fetching', async () => {
    const session = fixtureSession();
    const stored = JSON.stringify(session);
    localStorage.setItem(storageKey, stored);
    const clientModule = await wrapper();
    expect(clientModule.getSupabaseClient()).toBe(clientModule.getSupabaseClient());
    expect(await clientModule.getSupabaseSession()).toEqual(session);
    expect(await clientModule.getSupabaseAccessToken()).toBe(session.access_token);
    expect(localStorage.getItem(storageKey)).toBe(stored);
    expect(blockedFetch).not.toHaveBeenCalled();
  });

  it.each([null, '{invalid-json'])('handles an empty or malformed stored session: %s', async (stored) => {
    if (stored !== null) localStorage.setItem(storageKey, stored);
    const clientModule = await wrapper();
    expect(await clientModule.getSupabaseSession()).toBeNull();
    expect(blockedFetch).not.toHaveBeenCalled();
  });

  it.each(['', '/recovery'])('reuses an existing PKCE verifier and preserves the auth event: %s', async (suffix) => {
    localStorage.setItem(`${storageKey}-code-verifier`, JSON.stringify(`old-client-verifier${suffix}`));
    const session = fixtureSession();
    const transport = vi.fn(async () => new Response(JSON.stringify(session), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', transport);
    const clientModule = await wrapper();
    const auth = clientModule.getSupabaseClient().auth;
    await auth.getSession();
    const events: string[] = [];
    const { data: listener } = auth.onAuthStateChange((event: AuthChangeEvent) => { events.push(event); });
    const result = await auth.exchangeCodeForSession('synthetic-authorization-code');
    expect(result.error).toBeNull();
    expect(transport).toHaveBeenCalledOnce();
    const [url, request] = transport.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://synthetic.supabase.co/auth/v1/token?grant_type=pkce');
    expect(JSON.parse(String(request.body))).toEqual({ auth_code: 'synthetic-authorization-code', code_verifier: 'old-client-verifier' });
    expect(request.headers).toEqual(expect.objectContaining({ apikey: 'synthetic-public-key', Authorization: 'Bearer synthetic-public-key' }));
    expect(localStorage.getItem(`${storageKey}-code-verifier`)).toBeNull();
    expect(events).toContain(suffix ? 'PASSWORD_RECOVERY' : 'SIGNED_IN');
    expect(await clientModule.getSupabaseSession()).toEqual(expect.objectContaining({ access_token: session.access_token }));
    listener.subscription.unsubscribe();
  });

  it('keeps an existing session when a PKCE exchange fails', async () => {
    const session = fixtureSession();
    localStorage.setItem(storageKey, JSON.stringify(session));
    localStorage.setItem(`${storageKey}-code-verifier`, JSON.stringify('old-client-verifier'));
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ msg: 'Synthetic expired code' }), { status: 400, headers: { 'Content-Type': 'application/json' } })));
    const clientModule = await wrapper();
    await clientModule.getSupabaseSession();
    const result = await clientModule.getSupabaseClient().auth.exchangeCodeForSession('synthetic-expired-code');
    expect(result.error).not.toBeNull();
    expect(await clientModule.getSupabaseSession()).toEqual(session);
  });

  it('refreshes through the same endpoint and clears the existing namespace on local logout', async () => {
    localStorage.setItem(storageKey, JSON.stringify(fixtureSession()));
    const renewed = { ...fixtureSession(), access_token: 'synthetic-renewed-token' };
    const transport = vi.fn(async (url: string) => url.includes('/logout')
      ? new Response(null, { status: 204 })
      : new Response(JSON.stringify(renewed), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', transport);
    const clientModule = await wrapper();
    await clientModule.getSupabaseSession();
    const result = await clientModule.getSupabaseClient().auth.refreshSession();
    expect(result.error).toBeNull();
    expect(await clientModule.getSupabaseAccessToken()).toBe(renewed.access_token);
    expect(transport.mock.calls[0][0]).toBe('https://synthetic.supabase.co/auth/v1/token?grant_type=refresh_token');
    await clientModule.signOutLocal();
    expect(transport.mock.calls[1][0]).toBe('https://synthetic.supabase.co/auth/v1/logout?scope=local');
    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(await clientModule.getSupabaseSession()).toBeNull();
  });

  it('does not initialize auth for incomplete tokens', async () => {
    const clientModule = await import('../supabase');
    expect(await clientModule.setSupabaseSession({ accessToken: null, refreshToken: 'synthetic' })).toBeNull();
    expect(blockedFetch).not.toHaveBeenCalled();
  });

  it('serializes a pending refresh and local logout without restoring the logged-out session', async () => {
    localStorage.setItem(storageKey, JSON.stringify(fixtureSession()));
    let finishRefresh!: (response: Response) => void;
    const transport = vi.fn(async (url: string) => url.includes('/logout')
      ? new Response(null, { status: 204 })
      : new Promise<Response>((resolve) => { finishRefresh = resolve; }));
    vi.stubGlobal('fetch', transport);
    const clientModule = await wrapper();
    await clientModule.getSupabaseSession();
    const pendingRefresh = clientModule.getSupabaseClient().auth.refreshSession();
    await vi.waitFor(() => expect(transport).toHaveBeenCalledOnce());
    const pendingLogout = clientModule.signOutLocal();
    finishRefresh(new Response(JSON.stringify(fixtureSession()), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await Promise.all([pendingRefresh, pendingLogout]);
    expect(await clientModule.getSupabaseSession()).toBeNull();
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it('receives cross-tab signout on the old channel and honors subscription cleanup', async () => {
    type Listener = (event: { data: unknown }) => void;
    const channels = new Set<SyntheticChannel>();
    class SyntheticChannel {
      listeners: Listener[] = [];
      constructor(readonly name: string) { channels.add(this); }
      addEventListener(_event: string, listener: Listener) { this.listeners.push(listener); }
      postMessage(data: unknown) {
        for (const peer of channels) if (peer !== this && peer.name === this.name) {
          for (const listener of peer.listeners) queueMicrotask(() => listener({ data }));
        }
      }
      close() { channels.delete(this); }
    }
    vi.stubGlobal('BroadcastChannel', SyntheticChannel);
    localStorage.setItem(storageKey, JSON.stringify(fixtureSession()));
    const clientModule = await wrapper();
    const auth = clientModule.getSupabaseClient().auth;
    await auth.getSession();
    const events: string[] = [];
    const { data: listener } = auth.onAuthStateChange((event: AuthChangeEvent) => { events.push(event); });
    const oldTab = new SyntheticChannel(storageKey);
    localStorage.removeItem(storageKey);
    oldTab.postMessage({ event: 'SIGNED_OUT', session: null });
    await vi.waitFor(() => expect(events).toContain('SIGNED_OUT'));
    expect(await clientModule.getSupabaseSession()).toBeNull();
    listener.subscription.unsubscribe();
    const count = events.length;
    oldTab.postMessage({ event: 'SIGNED_OUT', session: null });
    await Promise.resolve();
    await Promise.resolve();
    expect(events).toHaveLength(count);
    expect(blockedFetch).not.toHaveBeenCalled();
    oldTab.close();
  });

  it.each(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'])('keeps explicit missing configuration errors for %s', async (variable) => {
    vi.stubEnv(variable, '');
    const clientModule = await import('../supabase');
    expect(() => clientModule.getSupabaseClient()).toThrow(`${variable} is required`);
    expect(blockedFetch).not.toHaveBeenCalled();
  });
});
