'use client';

/**
 * Controller hook for the AppShell split. Owns every store/router/
 * query read the layout needs, the four effects that keep the shell
 * in sync (nowTick, lobby-banner-clear-in-room, socket connect/
 * disconnect, ranked-geo-hint storage sync), every derived flag for
 * banner visibility, and the eight UI callbacks the shell wires to
 * its buttons.
 *
 * The shell + scene components are pure renderers over the object
 * this hook returns.
 */

import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuthStore } from '@/stores/auth.store';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useRankedMatchmakingStore } from '@/stores/rankedMatchmaking.store';
import { useGameSessionStore } from '@/stores/gameSession.store';
import { useStoreWallet } from '@/lib/queries/store.queries';
import { useIncomingFriendRequestCount } from '@/lib/queries/social.queries';
import { getSocket } from '@/lib/realtime/socket-client';
import { useRealtimeConnection } from '@/lib/realtime/useRealtimeConnection';
import { useLobbyCommandMachine } from '@/features/friend/hooks/useLobbyCommandMachine';

import type { RankedGeoHintDebug } from './appShell.types';
import {
  HEADER_PATHS,
  HIDE_NAV_PATHS,
  isPathActive as isPathActiveHelper,
  readRankedGeoHintDebug,
} from './appShell.helpers';

export function useAppShellViewModel() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useLocale();
  const { player: playerStats } = usePlayer();
  const { data: storeWallet } = useStoreWallet();
  const { data: incomingFriendRequestCount = 0 } = useIncomingFriendRequestCount();
  const authUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const draft = useRealtimeMatchStore((state) => state.draft);
  const matchBanner = useRealtimeMatchStore(useShallow((s) => ({
    matchId: s.match?.matchId ?? null,
    mode: s.match?.mode ?? null,
    variant: s.match?.variant ?? null,
    opponent: s.match?.opponent ?? null,
    finalResults: s.match?.finalResults ?? null,
  })));
  const remainingReconnects = useRealtimeMatchStore((state) => state.remainingReconnects);
  const sessionState = useRealtimeMatchStore((state) => state.sessionState);
  const rejoinMatch = useRealtimeMatchStore((state) => state.rejoinMatch);
  const forfeitPending = useRealtimeMatchStore((state) => state.forfeitPending);
  const partyDropout = useRealtimeMatchStore((state) => state.partyDropout);
  const setForfeitPending = useRealtimeMatchStore((state) => state.setForfeitPending);
  const clearPartyDropout = useRealtimeMatchStore((state) => state.clearPartyDropout);
  const challengeInviteCount = useRealtimeMatchStore((state) => state.challengeInvites.length);
  const suppressLobbyBannerUntil = useRealtimeMatchStore((state) => state.suppressLobbyBannerUntil);
  const suppressLobbyBannerReason = useRealtimeMatchStore((state) => state.suppressLobbyBannerReason);
  const clearLobbyBannerSuppression = useRealtimeMatchStore((state) => state.clearLobbyBannerSuppression);
  const clearRejoinAvailable = useRealtimeMatchStore((state) => state.clearRejoinAvailable);
  const resetRealtime = useRealtimeMatchStore((state) => state.reset);
  const startSession = useGameSessionStore((state) => state.startSession);
  const setGameStage = useGameSessionStore((state) => state.setStage);
  const [socketConnected, setSocketConnected] = useState(() => getSocket().connected);
  const [rankedGeoHintDebug, setRankedGeoHintDebug] = useState<RankedGeoHintDebug | null>(
    () => readRankedGeoHintDebug(),
  );
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const lobbyCommands = useLobbyCommandMachine();
  useRealtimeConnection({ enabled: Boolean(authUser), selfUserId: authUser?.id ?? null });

  // Tick once per second so any time-comparison render values
  // (e.g. lobby banner suppression deadline) stay fresh without
  // calling Date.now() during render.
  useEffect(() => {
    if (suppressLobbyBannerUntil === null) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [suppressLobbyBannerUntil]);

  const currentPath = pathname ?? '/';
  const showHeader = HEADER_PATHS.some((p) => (p === '/' ? currentPath === '/' : currentPath.startsWith(p)));
  const showNav = !HIDE_NAV_PATHS.some((path) => currentPath.startsWith(path));
  const inLobbyRoom = currentPath.startsWith('/friend/room');
  const lobbyBannerSuppressed =
    suppressLobbyBannerReason !== null ||
    (suppressLobbyBannerUntil !== null && suppressLobbyBannerUntil > nowTick);
  const lobbyIncludesCurrentUser =
    !!authUser?.id &&
    !!lobby &&
    lobby.members.some((member) => member.userId === authUser.id);
  const showLobbyBanner =
    !!lobby &&
    lobbyIncludesCurrentUser &&
    lobby.status === 'waiting' &&
    lobby.mode === 'friendly' &&
    Boolean(lobby.inviteCode) &&
    !inLobbyRoom &&
    !lobbyBannerSuppressed;
  const showRankedLobbyBanner =
    !!lobby &&
    lobbyIncludesCurrentUser &&
    lobby.status === 'waiting' &&
    lobby.mode === 'ranked' &&
    !currentPath.startsWith('/game');

  useEffect(() => {
    if (inLobbyRoom && suppressLobbyBannerReason !== null) {
      clearLobbyBannerSuppression();
    }
  }, [clearLobbyBannerSuppression, inLobbyRoom, suppressLobbyBannerReason]);

  const draftOpponent = lobby?.members.find((member) => member.userId !== authUser?.id);
  const activeDraftBanner = lobby?.status === 'active' && draft
    ? {
        lobbyId: lobby.lobbyId,
        mode: lobby.mode,
        opponent: draftOpponent,
      }
    : null;
  const showDraftBanner = !!activeDraftBanner && !inLobbyRoom && !currentPath.startsWith('/game');
  const activeMatchBanner = rejoinMatch
    ? {
        matchId: rejoinMatch.matchId,
        mode: rejoinMatch.mode,
        opponent: rejoinMatch.opponent,
        source: 'rejoin' as const,
      }
    : matchBanner.matchId && !matchBanner.finalResults
      ? {
          matchId: matchBanner.matchId,
          mode: matchBanner.mode!,
          opponent: matchBanner.opponent!,
          source: 'active' as const,
      }
    : null;
  const forfeitPendingForActiveMatch =
    !!forfeitPending &&
    !!activeMatchBanner &&
    forfeitPending.matchId === activeMatchBanner.matchId;
  const partyDropoutForActiveMatch =
    !!partyDropout &&
    !!activeMatchBanner &&
    partyDropout.matchId === activeMatchBanner.matchId;
  const showRejoinBanner =
    !!activeMatchBanner &&
    !forfeitPendingForActiveMatch &&
    !partyDropoutForActiveMatch &&
    !inLobbyRoom &&
    !currentPath.startsWith('/game');
  const completedMatchBanner = matchBanner.finalResults
    ? {
        matchId: matchBanner.matchId!,
        mode: matchBanner.mode!,
        variant: matchBanner.variant!,
        opponent: matchBanner.opponent!,
      }
    : null;
  const showCompletedMatchBanner = !!completedMatchBanner && !currentPath.startsWith('/game');
  const showForfeitPendingBanner = !!forfeitPending && !matchBanner.finalResults && !currentPath.startsWith('/game');
  const showPartyDropoutBanner = !!partyDropout && !matchBanner.finalResults && !currentPath.startsWith('/game');
  const forfeitPendingTitle =
    forfeitPending?.reason === 'self_forfeit'
      ? t('forfeit.matchForfeited')
      : forfeitPending?.reason === 'opponent_forfeit'
        ? t('forfeit.opponentForfeited')
        : forfeitPending?.reason === 'opponent_reconnect_limit'
          ? t('forfeit.opponentDidNotReconnect')
          : t('forfeit.youLostMatch');
  const forfeitPendingDescription = forfeitPending?.message ?? t('forfeit.finalizingResult');
  const completedByForfeit = matchBanner.finalResults?.winnerDecisionMethod === 'forfeit';
  const completedPartyQuiz = completedMatchBanner?.variant === 'friendly_party_quiz';
  const rejoinReconnectsLeft = rejoinMatch?.remainingReconnects ?? remainingReconnects ?? 0;
  const lobbyCode = lobby?.inviteCode ?? '';
  const showLobbyDebug = process.env.NODE_ENV !== 'production';
  const localWaitingLobbyId = lobby?.status === 'waiting' ? lobby.lobbyId : null;
  const sessionWaitingLobbyId = sessionState?.waitingLobbyId ?? null;
  const lobbyDebugMismatch = localWaitingLobbyId !== sessionWaitingLobbyId;
  const sessionStateLabel = sessionState?.state ?? 'NO_SESSION';
  const navbarCoins = storeWallet?.coins ?? 0;
  const navbarTickets = storeWallet?.tickets ?? 0;
  const socialBadgeCount = incomingFriendRequestCount + challengeInviteCount;

  useEffect(() => {
    const socket = getSocket();
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  useEffect(() => {
    const sync = () => setRankedGeoHintDebug(readRankedGeoHintDebug());
    window.addEventListener('storage', sync);
    const intervalId = window.setInterval(sync, 1500);
    return () => {
      window.removeEventListener('storage', sync);
      window.clearInterval(intervalId);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const isPathActive = (path: string, exact?: boolean) => isPathActiveHelper(currentPath, path, exact);

  const handleReturnToLobby = () => {
    if (!lobbyCode) return;
    router.push(`/friend/room/${lobbyCode}`);
  };

  const handleReturnToRankedLobby = () => {
    startSession({
      mode: 'ranked',
      matchType: 'ranked',
      questionCount: 10,
      opponentId: draftOpponent?.userId ?? 'opponent',
      opponentUsername: draftOpponent?.username ?? 'Opponent',
      opponentAvatar: draftOpponent?.avatarUrl ?? undefined,
    });
    setGameStage('matchmaking');
    router.push('/game');
  };

  const handleLeaveLobby = () => {
    if (lobbyCommands.isLeaving) return;
    void lobbyCommands.leaveLobby().then((result) => {
      if (!result?.ok) return;
      resetRealtime();
      useRankedMatchmakingStore.getState().clearRankedMatchmaking();
    });
  };

  const handleRejoinMatch = () => {
    if (!activeMatchBanner) return;

    const matchId = activeMatchBanner.matchId;

    startSession({
      mode: activeMatchBanner.mode === 'ranked' ? 'ranked' : 'quizball',
      matchType: activeMatchBanner.mode === 'ranked' ? 'ranked' : 'friendly',
      questionCount: 10,
      opponentId: activeMatchBanner.opponent.id,
      opponentUsername: activeMatchBanner.opponent.username,
      opponentAvatar: activeMatchBanner.opponent.avatarUrl ?? undefined,
    });
    // Avoid re-entering matchmaking queue on rejoin.
    setGameStage('playing');

    if (activeMatchBanner.source === 'rejoin') {
      getSocket().emit('match:rejoin', { matchId });
      clearRejoinAvailable();
    }

    router.push('/game');
  };

  const handleReturnToDraft = () => {
    if (!activeDraftBanner) return;

    startSession({
      mode: activeDraftBanner.mode === 'ranked' ? 'ranked' : 'quizball',
      matchType: activeDraftBanner.mode === 'ranked' ? 'ranked' : 'friendly',
      questionCount: 10,
      opponentId: activeDraftBanner.opponent?.userId ?? 'opponent',
      opponentUsername: activeDraftBanner.opponent?.username ?? 'Opponent',
      opponentAvatar: activeDraftBanner.opponent?.avatarUrl ?? undefined,
      skipDraftShowdown: true,
    });
    setGameStage('categoryBlocking');
    router.push('/game');
  };

  const handleForfeitRejoin = () => {
    if (!activeMatchBanner) {
      clearRejoinAvailable();
      return;
    }
    setForfeitPending({
      matchId: activeMatchBanner.matchId,
      reason: 'self_forfeit',
      message: t('forfeit.finalizingResult'),
    });
    getSocket().emit('match:forfeit', { matchId: activeMatchBanner.matchId });
  };

  const handleViewCompletedMatch = () => {
    if (!completedMatchBanner) return;

    startSession({
      mode: completedMatchBanner.mode === 'ranked' ? 'ranked' : 'quizball',
      matchType: completedMatchBanner.mode === 'ranked' ? 'ranked' : 'friendly',
      questionCount: 10,
      opponentId: completedMatchBanner.opponent.id,
      opponentUsername: completedMatchBanner.opponent.username,
      opponentAvatar: completedMatchBanner.opponent.avatarUrl ?? undefined,
    });
    setGameStage('finalResults');
    router.push('/game');
  };

  const handleDismissCompletedMatch = () => {
    resetRealtime();
    useRankedMatchmakingStore.getState().clearRankedMatchmaking();
  };

  const handleDismissPartyDropout = () => {
    clearPartyDropout();
  };

  return {
    // Locale / router
    t,
    locale,
    router,
    // Player / auth
    playerStats,
    authUser,
    // Route
    currentPath,
    showHeader,
    showNav,
    isPathActive,
    // Lobby / draft / match data
    lobby,
    lobbyCode,
    draftOpponent,
    activeDraftBanner,
    activeMatchBanner,
    completedMatchBanner,
    forfeitPending,
    partyDropout,
    forfeitPendingTitle,
    forfeitPendingDescription,
    completedByForfeit,
    completedPartyQuiz,
    rejoinReconnectsLeft,
    // Banner show flags
    showLobbyBanner,
    showRankedLobbyBanner,
    showDraftBanner,
    showRejoinBanner,
    showCompletedMatchBanner,
    showForfeitPendingBanner,
    showPartyDropoutBanner,
    // Currency + badges
    navbarCoins,
    navbarTickets,
    socialBadgeCount,
    // Realtime
    socketConnected,
    // Debug
    showLobbyDebug,
    lobbyDebugMismatch,
    localWaitingLobbyId,
    sessionWaitingLobbyId,
    sessionStateLabel,
    rankedGeoHintDebug,
    // Logout modal state
    showLogoutConfirm,
    setShowLogoutConfirm,
    // Callbacks
    handleLogout,
    handleReturnToLobby,
    handleReturnToRankedLobby,
    handleLeaveLobby,
    handleRejoinMatch,
    handleReturnToDraft,
    handleForfeitRejoin,
    handleViewCompletedMatch,
    handleDismissCompletedMatch,
    handleDismissPartyDropout,
  };
}
