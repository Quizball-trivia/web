'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuthStore } from '@/stores/auth.store';
import { useRealtimeConnection } from '@/lib/realtime/useRealtimeConnection';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { getSocket } from '@/lib/realtime/socket-client';
import { RealtimePossessionMatchScreen } from '@/features/possession/RealtimePossessionMatchScreen';
import { DevOverlay } from '@/features/dev/DevOverlay';
import { resolveAvatarUrl } from '@/lib/avatars';
import { logger } from '@/utils/logger';

const START_TIMEOUT_MS = 8_000;

export default function DevMatchPage() {
  if (process.env.NODE_ENV !== 'development') {
    return <div className="min-h-dvh bg-[#131F24] flex items-center justify-center text-white font-fun">Dev only</div>;
  }

  return <DevMatchContent />;
}

function DevMatchContent() {
  const router = useRouter();
  const { player } = usePlayer();
  const authUser = useAuthStore((s) => s.user);
  const selfUserId = authUser?.id ?? null;

  useRealtimeConnection({ enabled: true, selfUserId });

  const match = useRealtimeMatchStore((s) => s.match);
  const finalResults = match?.finalResults ?? null;
  const [starting, setStarting] = useState(false);
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset starting state once a match arrives or on unmount
  useEffect(() => {
    if (match) {
      setStarting(false);
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
    }
    return () => {
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
    };
  }, [match]);

  const startMatch = useCallback(() => {
    setStarting(true);
    logger.info('Dev: emitting dev:quick_match');
    getSocket().emit('dev:quick_match');

    // Fallback: reset if server never responds
    if (startTimerRef.current) clearTimeout(startTimerRef.current);
    startTimerRef.current = setTimeout(() => {
      setStarting(false);
      logger.warn('Dev: quick_match start timed out');
    }, START_TIMEOUT_MS);
  }, []);

  const playAgain = useCallback(() => {
    useRealtimeMatchStore.getState().reset();
    setStarting(false);
  }, []);

  const playerAvatar = resolveAvatarUrl(authUser?.avatar_url ?? player.avatarCustomization?.base ?? player.avatar, player.id);
  const opponentAvatar = resolveAvatarUrl(match?.opponent?.avatarUrl, match?.opponent?.id ?? 'ai');

  // Pre-match: show start button
  if (!match) {
    return (
      <div className="min-h-dvh bg-[#131F24] flex flex-col items-center justify-center gap-6 font-fun">
        <h1 className="text-3xl font-black text-white uppercase">Dev Quick Match</h1>
        <p className="text-sm text-[#56707A] font-semibold max-w-sm text-center">
          Instantly start a possession match against AI. Same gameplay as ranked.
        </p>
        <button
          onClick={startMatch}
          disabled={starting}
          className="px-10 py-4 rounded-2xl bg-[#FF9600] border-b-4 border-[#C47400] text-white font-black text-xl uppercase tracking-wide hover:bg-[#FFa620] active:border-b-2 active:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {starting ? 'Starting...' : 'Start Match'}
        </button>
        <button
          onClick={() => router.push('/play')}
          className="text-sm font-bold text-[#56707A] hover:text-white/80 transition-colors"
        >
          Back to Play
        </button>
      </div>
    );
  }

  // Post-match: show results + play again
  if (finalResults) {
    const myResult = selfUserId ? finalResults.players[selfUserId] : null;
    const isWinner = finalResults.winnerId === selfUserId;
    return (
      <div className="min-h-dvh bg-[#131F24] flex flex-col items-center justify-center gap-6 font-fun">
        <h1 className={`text-4xl font-black uppercase ${isWinner ? 'text-[#58CC02]' : 'text-[#FF4B4B]'}`}>
          {isWinner ? 'Victory!' : 'Defeat'}
        </h1>
        {myResult && (
          <div className="flex gap-6 text-white/80 text-sm font-bold">
            <span>Goals: {myResult.goals ?? 0}</span>
            <span>Points: {myResult.totalPoints}</span>
            <span>Correct: {myResult.correctAnswers}</span>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={playAgain}
            className="px-8 py-3 rounded-2xl bg-[#FF9600] border-b-4 border-[#C47400] text-white font-black text-lg uppercase hover:bg-[#FFa620] active:border-b-2 active:translate-y-[2px] transition-all"
          >
            Play Again
          </button>
          <button
            onClick={() => router.push('/play')}
            className="px-8 py-3 rounded-2xl bg-[#1B2F36] border-b-4 border-[#131F24] text-white font-black text-lg uppercase hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px] transition-all"
          >
            Back
          </button>
        </div>
        <DevOverlay />
      </div>
    );
  }

  // In-match: render the same possession screen as production
  return (
    <>
      <RealtimePossessionMatchScreen
        playerAvatar={playerAvatar}
        playerUsername={player.username}
        opponentAvatar={opponentAvatar}
        opponentUsername={match.opponent?.username ?? 'AI'}
        onQuit={() => {
          if (match.matchId) {
            getSocket().emit('match:leave', { matchId: match.matchId });
          }
          useRealtimeMatchStore.getState().reset();
          setStarting(false);
        }}
        onForfeit={() => {
          if (match.matchId) {
            getSocket().emit('match:forfeit', { matchId: match.matchId });
          }
        }}
      />
      <DevOverlay />
    </>
  );
}
