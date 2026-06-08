'use client';

import { useEffect } from 'react';
import { getSupabaseClient } from '@/lib/auth/supabase';
import { useAuthStore } from '@/stores/auth.store';

export function AuthSessionBridge() {
  useEffect(() => {
    const { data } = getSupabaseClient().auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        window.setTimeout(() => {
          useAuthStore.getState().setAnonymous();
        }, 0);
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
