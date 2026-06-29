'use client';

import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/auth/supabase';
import { nudgeSocketReconnectAfterTokenRefresh } from '@/lib/realtime/socket-client';
import { useAuthStore } from '@/stores/auth.store';

export function AuthSessionBridge() {
  useEffect(() => {
    const { data } = getSupabaseClient().auth.onAuthStateChange((event) => {
      // "banned" is terminal. setBanned() signs the user out, which fires
      // SIGNED_OUT (and the post-OAuth session churn fires SIGNED_IN /
      // TOKEN_REFRESHED). If we let those flip the status to anonymous or
      // re-bootstrap, we get an infinite ban -> signout -> re-auth -> ban loop
      // (the screen flashes and /me is hammered). Ignore all auth events while
      // banned; only an explicit "Back to start" (setAnonymous) leaves the state.
      if (useAuthStore.getState().status === 'banned') {
        return;
      }

      if (event === 'SIGNED_OUT') {
        window.setTimeout(() => {
          useAuthStore.getState().setAnonymous();
        }, 0);
        return;
      }

      const authState = useAuthStore.getState();
      if (event === 'TOKEN_REFRESHED' && authState.status === 'authenticated' && authState.user) {
        // If the refresh landed while the realtime socket was down (e.g. the
        // hourly token-expiry disconnect), kick a reconnect now that a fresh
        // token exists — otherwise the manager can idle in backoff while the
        // player stares at a frozen match. No-op when connected/reconnecting.
        nudgeSocketReconnectAfterTokenRefresh();
        return;
      }

      if (
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED' ||
        event === 'PASSWORD_RECOVERY'
      ) {
        window.setTimeout(() => {
          void useAuthStore.getState().bootstrap({ force: true });
        }, 0);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  return null;
}
