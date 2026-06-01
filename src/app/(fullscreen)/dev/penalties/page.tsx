'use client';

/**
 * Dev-only route: a REAL playable AI penalty match. Unlike `dev/animations`
 * (which scripts a stub socket), this connects to the real backend, boots a
 * quick AI match, and asks the server to skip straight into the penalty
 * category-ban phase — so the user plays the exact production penalty flow
 * (ban → shootout) against the AI with the same components, animations, and
 * delays. No normal open-play question is ever shown (the server suppresses
 * question 0 via `dev:quick_match { skipTo: 'penalty_ban' }`).
 *
 * Guarded by NODE_ENV; backend dev handlers also no-op in production.
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/realtime/socket-client';
import { useRealtimeConnection } from '@/lib/realtime/useRealtimeConnection';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useAuthStore } from '@/stores/auth.store';
import { resolveAvatarUrl } from '@/lib/avatars';
import { RealtimePossessionMatchScreen } from '@/features/possession/RealtimePossessionMatchScreen';

function DevPenaltiesContent() {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const selfUserId = authUser?.id ?? null;

  // Connect the real authed socket + register handlers (same as the app shell).
  useRealtimeConnection({ enabled: Boolean(selfUserId), selfUserId });

  const match = useRealtimeMatchStore((s) => s.match);
  const matchId = match?.matchId ?? null;
  const quickMatchSentRef = useRef(false);

  // Boot a real AI match straight into the penalty ban phase. Fired once.
  useEffect(() => {
    if (!selfUserId || quickMatchSentRef.current) return;
    quickMatchSentRef.current = true;
    getSocket().emit('dev:quick_match', { skipTo: 'penalty_ban' });
  }, [selfUserId]);

  const handleLeave = () => {
    if (matchId) {
      try {
        getSocket().emit('match:leave', { matchId });
      } catch {
        // best-effort; navigating away regardless
      }
    }
    router.push('/');
  };

  if (!selfUserId) {
    return (
      <div className="min-h-dvh bg-surface-deep flex items-center justify-center text-white font-fun">
        Log in to run the penalty simulation.
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-dvh bg-surface-deep flex items-center justify-center text-white font-fun">
        Starting penalty simulation…
      </div>
    );
  }

  const opponent = match.opponent;

  return (
    <RealtimePossessionMatchScreen
      playerAvatar={resolveAvatarUrl(authUser?.avatar_url)}
      playerAvatarCustomization={authUser?.avatar_customization ?? null}
      playerUsername={authUser?.nickname ?? 'You'}
      opponentAvatar={resolveAvatarUrl(opponent?.avatarUrl)}
      opponentAvatarCustomization={opponent?.avatarCustomization ?? null}
      opponentUsername={opponent?.username ?? 'AI'}
      playerCountryCode={authUser?.country ?? null}
      playerFavoriteClub={authUser?.favorite_club ?? null}
      disableBgm
      onQuit={handleLeave}
      onForfeit={handleLeave}
    />
  );
}

export default function DevPenaltiesPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-dvh bg-surface-deep flex items-center justify-center text-white font-fun">
        Dev only
      </div>
    );
  }
  return <DevPenaltiesContent />;
}
