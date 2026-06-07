import { createClient, type Provider, type Session, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

// Next.js/Turbopack only inlines STATICALLY-referenced `process.env.NEXT_PUBLIC_*`
// vars into the browser bundle. Dynamic `process.env[name]` lookups are NOT
// replaced and resolve to `undefined` in the browser — so these must be read by
// their literal names here.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  if (!SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
  }
  if (!SUPABASE_ANON_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  }

  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  return supabaseClient;
}

export async function getSupabaseSession(): Promise<Session | null> {
  if (typeof window === 'undefined') return null;
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) {
    throw error;
  }
  return data.session ?? null;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const session = await getSupabaseSession();
  return session?.access_token ?? null;
}

export async function setSupabaseSession(tokens: {
  accessToken: string | null | undefined;
  refreshToken: string | null | undefined;
}): Promise<Session | null> {
  if (!tokens.accessToken || !tokens.refreshToken) {
    return null;
  }

  const { data, error } = await getSupabaseClient().auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  if (error) {
    throw error;
  }
  return data.session ?? null;
}

export async function signOutLocal(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut({ scope: 'local' });
  if (error) {
    throw error;
  }
}

export type OAuthProvider = Extract<Provider, 'google' | 'facebook'>;
