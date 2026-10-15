'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useMiniT } from '../lib/i18n';
import { guessTheGoalGuestApi } from '@/lib/repositories/guessTheGoal.repo';
import { SIGN_IN_PATH } from '@/lib/seo/public-game-runtime';
import { useAuthStore } from '@/stores/auth.store';
import { trackEvent } from '@/lib/posthog';
import { GuessTheGoalScreen, type GgtScreenDeps } from './GuessTheGoalLive';

/** Guess the Goal on its public page: a signed-out visitor plays as the guest session, with no rewards. */
export function GuessTheGoalGuest({ locale, onExit, onEvent, onMember }: {
  locale: string;
  onExit: () => void;
  onEvent?: (event: 'start' | 'complete' | 'replay') => void;
  /** A signed-in visitor (known now or once auth resolves) plays in the app, where a solve pays coins and XP. */
  onMember: () => void;
}) {
  const authStatus = useAuthStore((state) => state.status);
  const t = useMiniT();
  // The page re-renders with fresh callbacks; the screen's deps must not change with them, or it reloads its session.
  const handlers = useRef({ onExit, onEvent });
  useEffect(() => { handlers.current = { onExit, onEvent }; });
  const onMemberRef = useRef(onMember);
  useEffect(() => { onMemberRef.current = onMember; });
  useEffect(() => {
    if (authStatus === 'authenticated') onMemberRef.current();
  }, [authStatus]);
  const deps = useMemo<GgtScreenDeps>(
    () => ({
      api: guessTheGoalGuestApi(locale),
      track: (event, properties) => trackEvent(event, properties as Parameters<typeof trackEvent>[1]),
      guest: {
        onExit: () => handlers.current.onExit(),
        onEvent: (event) => handlers.current.onEvent?.(event),
        signInHref: SIGN_IN_PATH,
      },
    }),
    [locale]
  );
  // Until auth resolves the visitor may be a member: mounting would start a session under the wrong screen.
  if (authStatus === 'loading' || authStatus === 'authenticated') {
    // The screen draws the only exit control, so the wait must offer one too (auth can stay unresolved).
    return (
      <div className="flex flex-col gap-4 p-6">
        <button
          type="button"
          aria-label={t('Back')}
          onClick={() => handlers.current.onExit()}
          className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      </div>
    );
  }
  return <GuessTheGoalScreen deps={deps} />;
}
