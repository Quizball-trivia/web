import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { AuthClient } from '@supabase/auth-js';
import { browserAuthClientOptions } from '../supabase-client-options';

const clients: InstanceType<typeof AuthClient>[] = [];
const publicKey = 'synthetic-public-key';
afterEach(async () => {
  await Promise.all(clients.splice(0).map((client) => client.dispose()));
  vi.unstubAllGlobals();
});

describe('auth-only configuration compatibility', () => {
  it.each([
    'https://synthetic.supabase.co',
    'https://synthetic.supabase.co/',
    '  https://synthetic.supabase.co  ',
    'https://auth.example.invalid/base',
    'http://localhost:54321',
  ])('matches the installed full SDK for %s', async (url) => {
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network request'); }));
    const old = createClient(url, publicKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } });
    const current = new AuthClient(browserAuthClientOptions(url, publicKey));
    clients.push(old.auth, current);
    await Promise.all([old.auth.getSession(), current.getSession()]);
    const fields = ['url', 'storageKey', 'headers', 'persistSession', 'autoRefreshToken', 'detectSessionInUrl', 'flowType', 'hasCustomAuthorizationHeader'];
    for (const field of fields) {
      expect(Reflect.get(current, field), field).toEqual(Reflect.get(old.auth, field));
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['ftp://auth.example.invalid', 'https://[invalid'])('rejects an invalid endpoint like the full SDK: %s', (url) => {
    expect(() => browserAuthClientOptions(url, publicKey)).toThrow();
    expect(() => createClient(url, publicKey)).toThrow();
  });
});
