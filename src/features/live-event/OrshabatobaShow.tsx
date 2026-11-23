'use client';

/**
 * The ორშაბათობა night on the real server: one WL live subscription feeding the show stage (3D studio + question).
 * Lobby and countdown panels come from LiveEventScreen, so registration, the host's Start and late registration work
 * exactly as on the plain live-event screen.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuthStore } from '@/stores/auth.store';
import { wlNow } from '@/features/weekend-league/wlClock';
import { useWlLive } from '@/features/weekend-league/live/useWlLive';
import { LiveShowStage, type LiveShowPhase } from '@/features/live-show/live/LiveShowStage';
import type { ShowRound } from '@/features/live-show/live/showLive.adapter';

const PRE_GAME = new Set(['scheduled', 'content_pending', 'ready', 'entry_open', 'entry_closed']);
const COUNTDOWN = new Set(['entry_open', 'entry_closed', 'checkin']);

export function phaseOf(status: string | null, kickoffMs: number | null, screenKind: string): LiveShowPhase {
  if (screenKind !== 'waiting') return 'game';
  if (kickoffMs != null && (status == null || COUNTDOWN.has(status))) return 'countdown';
  if (status == null || PRE_GAME.has(status)) return 'pregame';
  return 'game';
}

export function OrshabatobaShow({
  tournamentId, role, status, kickoffMs, registered, rounds, title, lobbyLine, pregamePanel, countdownPanel, onExit, fullPage,
}: {
  fullPage?: boolean;
  tournamentId: string;
  role: 'player' | 'spectator';
  status: string | null;
  kickoffMs: number | null;
  registered: number | null;
  rounds: ShowRound[] | null;
  title: string;
  lobbyLine: string;
  pregamePanel: ReactNode;
  countdownPanel: ReactNode;
  onExit: () => void;
}) {
  const { locale } = useLocale();
  const live = useWlLive(tournamentId, role);
  const selfUserId = useAuthStore((s) => s.user?.id ?? null);
  // In-game ticks use the socket-synchronised clock the question windows are stamped on; the /current poll's clock
  // can lag it when a poll is slow.
  const serverNowRef = useRef(live.serverNow);
  useEffect(() => { serverNowRef.current = live.serverNow; }, [live.serverNow]);
  const [now, setNow] = useState(() => wlNow());
  useEffect(() => {
    const id = window.setInterval(() => setNow(serverNowRef.current()), 100);
    return () => window.clearInterval(id);
  }, []);

  return (
    <LiveShowStage
      locale={locale === 'ka' ? 'ka' : 'en'}
      title={title}
      phase={phaseOf(status, kickoffMs, live.screen.kind)}
      now={now}
      kickoffMs={kickoffMs}
      registered={registered}
      screen={live.screen}
      board={live.board}
      score={live.score}
      selfUserId={selfUserId}
      canAnswer={role === 'player'}
      onAnswer={(answer) => live.submitAnswer(answer)}
      retryNonce={live.retryNonce}
      rounds={rounds}
      pregamePanel={pregamePanel}
      countdownPanel={countdownPanel}
      lobbyLine={lobbyLine}
      onExit={onExit}
      fullPage={fullPage}
    />
  );
}
