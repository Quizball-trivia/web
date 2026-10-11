import type { GoTrueClientOptions } from '@supabase/auth-js';
import { version } from '@supabase/auth-js/package.json';

/** Match the installed full client's auth configuration, not standalone defaults. */
export function browserAuthClientOptions(supabaseUrl: string, anonKey: string): GoTrueClientOptions {
  const trimmedUrl = supabaseUrl.trim();
  if (!/^https?:\/\//i.test(trimmedUrl)) {
    throw new Error('Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.');
  }
  let baseUrl: URL;
  try {
    baseUrl = new URL(trimmedUrl.endsWith('/') ? trimmedUrl : `${trimmedUrl}/`);
  } catch {
    throw new Error('Invalid supabaseUrl: Provided URL is malformed.');
  }
  const runtime = typeof document !== 'undefined' ? 'web' : 'node';
  const runtimeVersion = runtime === 'node' && typeof process !== 'undefined' ? process.version?.replace(/^v/, '') : undefined;
  return {
    url: new URL('auth/v1', baseUrl).href,
    // Reuse the old namespace for both sessions and -code-verifier keys.
    storageKey: `sb-${baseUrl.hostname.split('.')[0]}-auth-token`,
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
      'X-Client-Info': `supabase-js/${version}; runtime=${runtime}${runtimeVersion ? `; runtime-version=${runtimeVersion}` : ''}`,
    },
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // The anon Authorization header is internal, not an owner override.
    hasCustomAuthorizationHeader: false,
  };
}
