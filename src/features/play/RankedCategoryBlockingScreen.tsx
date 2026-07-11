"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ShowdownScreen } from '@/components/ShowdownScreen';
import { Volume2, VolumeX } from 'lucide-react';
import { isMuted as getIsMuted, toggleMute } from '@/lib/sounds/gameSounds';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import {
  selectDraftCountdownSeconds,
  selectHasResolvedRound,
} from '@/stores/realtime-match/selectors';
import { useRankedMatchmakingStore } from '@/stores/rankedMatchmaking.store';
import { useGameSessionStore } from '@/stores/gameSession.store';
import { getSocket } from '@/lib/realtime/socket-client';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuthStore } from '@/stores/auth.store';
import { useRankedProfile } from '@/lib/queries/ranked.queries';
import { logger } from '@/utils/logger';
import { cn, parseRp } from '@/lib/utils';
import { resolveAvatarUrl } from '@/lib/avatars';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { tierFromRp, type RankedTier } from '@/utils/rankedTier';
import { TierFrameAvatar } from '@/components/TierFrameAvatar';
import { BanCategoryCard } from '@/components/shared/BanCategoryCard';
import { getTierAccent } from '@/utils/tierVisuals';
import { useLocale } from '@/contexts/LocaleContext';
import type { AvatarCustomization } from '@/types/game';
import type { I18nField } from '@/lib/realtime/socket.types';

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

function isAiOpponentInfo(opponentInfo: { id?: string; isAiOpponent?: boolean } | null | undefined): boolean {
  if (!opponentInfo) return false;
  if (typeof opponentInfo.isAiOpponent === 'boolean') return opponentInfo.isAiOpponent;
  return typeof opponentInfo.id === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(opponentInfo.id);
}

export interface BanCategoryViewCategory {
  id: string;
  name: I18nField;
  icon?: string | null;
  imageUrl?: string | null;
}

export interface BanCategoryViewPlayer {
  id: string;
  username: string;
  avatar: string;
  avatarCustomization?: AvatarCustomization | null;
  countryCode?: string | null;
  rankPoints?: number | null;
  tier?: RankedTier;
}

export interface BanCategoryViewProps {
  player: BanCategoryViewPlayer;
  opponent: BanCategoryViewPlayer;
  categories: BanCategoryViewCategory[];
  playerBannedId: string | null;
  opponentBannedId: string | null;
  phase: 'ban' | 'ready';
  currentActor: 'player' | 'opponent';
  timeLeft: number;
  turnActive?: boolean;
  waitingMessage?: string | null;
  waitingSeconds?: number | null;
  paused?: boolean;
  pauseSeconds?: number | null;
  hasResolvedRound?: boolean;
  soundMuted: boolean;
  onToggleSound: () => void;
  onBanCategory: (categoryId: string) => void;
}

function PlayerHeader({
  info,
  tierColor,
  align,
  dimmed,
}: {
  info: BanCategoryViewPlayer;
  tierColor: string;
  align: 'left' | 'right';
  dimmed: boolean;
}) {
  const isLeft = align === 'left';
  return (
    <div
      className={cn(
        'flex items-center gap-3 transition-opacity duration-300',
        isLeft ? 'justify-self-start' : 'flex-row-reverse justify-self-end',
        dimmed && 'opacity-50'
      )}
    >
      <TierFrameAvatar
        tier={info.tier ?? tierFromRp(info.rankPoints ?? 0)}
        avatarCustomization={info.avatarCustomization ?? { base: info.avatar }}
        countryCode={info.countryCode ?? null}
        size="md"
        mirrorAvatar={!isLeft}
      />
      <div
        className={cn('hidden min-w-0 sm:block', !isLeft && 'text-right')}
      >
        <div
          className="max-w-[160px] truncate text-[13px] uppercase text-white sm:text-sm"
          style={poppins}
        >
          {info.username}
        </div>
        <div
          className={cn(
            'mt-1.5 flex items-center gap-1.5',
            !isLeft && 'flex-row-reverse'
          )}
        >
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] tabular-nums"
            style={{ backgroundColor: '#FFE500', color: '#1a1800' }}
          >
            {info.rankPoints != null ? `${info.rankPoints} RP` : '— RP'}
          </span>
          {info.tier && (
            <span
              className="text-[10px] uppercase tracking-[0.08em]"
              style={{ ...poppins, color: tierColor }}
            >
              {info.tier}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Pure presentational ban-category view. Accepts all data via props so it can
 * be rendered both in a live match (via `RankedCategoryBlockingScreen`) and in
 * preview routes like `/dev/ban-page` without real socket/store wiring.
 */
export function BanCategoryView({
  player,
  opponent,
  categories,
  playerBannedId,
  opponentBannedId,
  phase,
  currentActor,
  timeLeft,
  turnActive = true,
  waitingMessage = null,
  waitingSeconds = null,
  paused = false,
  pauseSeconds = null,
  hasResolvedRound = false,
  soundMuted,
  onToggleSound,
  onBanCategory,
}: BanCategoryViewProps) {
  const { t } = useLocale();
  const playerTierColor = player.tier ? getTierAccent(player.tier) : '#94A3B8';
  const opponentTierColor = opponent.tier ? getTierAccent(opponent.tier) : '#94A3B8';

  return (
    <div className="relative min-h-dvh flex flex-col bg-surface-page">
      <AnimatePresence>
        {paused && pauseSeconds != null && pauseSeconds > 0 && (
          <motion.div
            key="draft-disconnect-pause"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-40 flex items-center justify-center bg-surface-page-alt/70 px-4 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ y: -12, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -12, scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-sm rounded-[20px] bg-brand-blue px-6 py-6 text-center shadow-2xl"
            >
              <div className="font-poppins text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">
                {t('possession.matchPaused')}
              </div>
              <div className="mt-2 font-poppins text-xl font-semibold uppercase text-white">
                {t('possession.opponentDisconnected')}
              </div>
              <div className="mt-1 font-poppins text-sm font-semibold text-white/70">
                {hasResolvedRound
                  ? t('possession.opponentDisconnectedWinIfNotReturn', { seconds: pauseSeconds })
                  : t('possession.opponentDisconnectedCancelIfNotReturn')}
              </div>
              <div className="mt-4 inline-flex items-center justify-center rounded-full bg-black/30 px-6 py-2 font-poppins text-3xl font-semibold tabular-nums text-white">
                {pauseSeconds}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="relative z-10 w-full">
        <div className="max-w-5xl mx-auto px-5 py-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Player (Left) */}
          <PlayerHeader
            info={player}
            tierColor={playerTierColor}
            align="left"
            dimmed={currentActor === 'opponent'}
          />

          {/* Center timer pill */}
          {turnActive ? (
            <div
              className={cn(
                'flex h-14 min-w-[72px] items-center justify-center rounded-full px-6 text-3xl tabular-nums text-white transition-colors',
                timeLeft <= 5 ? 'bg-brand-red-soft animate-pulse' : 'bg-brand-blue'
              )}
              style={poppins}
            >
              {timeLeft}
            </div>
          ) : <div className="min-w-[72px]" />}

          {/* Opponent (Right) */}
          <PlayerHeader
            info={opponent}
            tierColor={opponentTierColor}
            align="right"
            dimmed={currentActor === 'player'}
          />
        </div>

        {/* Sound toggle (top-right floating) */}
        <button
          onClick={onToggleSound}
          aria-label={soundMuted ? t('common.unmute') : t('common.mute')}
          className="absolute top-4 right-4 sm:top-5 sm:right-6 size-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition"
        >
          {soundMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-12">
        {/* Heading */}
        <div
          className="text-center mb-8 sm:mb-10 px-6"
        >
          <h2
            className="text-3xl uppercase text-white sm:text-4xl"
            style={poppins}
          >
            {waitingMessage
              ? waitingMessage
              : paused
              ? t('possession.waiting')
              : phase === 'ban'
                ? t('banCategory.title')
                : t('possession.getReady')}
          </h2>
          {/* Turn indicator — clearly shows whose turn it is to ban. */}
          {waitingMessage && waitingSeconds != null ? (
            <p className="mt-3 text-2xl tabular-nums text-brand-yellow" style={poppins}>
              {waitingSeconds}
            </p>
          ) : phase === 'ban' && !paused && turnActive ? (
            <p
              className={cn(
                'mt-2 text-sm uppercase tracking-[0.12em] sm:text-base',
                currentActor === 'player' ? 'text-brand-yellow' : 'text-white/55',
              )}
              style={poppins}
            >
              {currentActor === 'player'
                ? t('possession.halftime.yourTurn')
                : t('possession.halftime.opponentBanning')}
            </p>
          ) : (
            <p
              className="mt-2 text-xs uppercase tracking-[0.08em] text-white/55 sm:text-sm"
              style={poppins}
            >
              {paused
                ? t('banCategory.draftResumes')
                : t('training.matchStartingHalf1')}
            </p>
          )}
        </div>

        {/* Category Cards — shared BanCategoryCard matches /play mode-selection style */}
        <div className="w-full">
          <div className="grid grid-cols-3 gap-3 sm:gap-5 px-4 sm:px-6 max-w-3xl mx-auto">
            {categories.map((category, i) => {
              const isPlayerBanned = category.id === playerBannedId;
              const isOpponentBanned = category.id === opponentBannedId;
              const isBanned = isPlayerBanned || isOpponentBanned;

              const disabled =
                !turnActive ||
                paused ||
                (!!playerBannedId && !isPlayerBanned && phase === 'ban') ||
                isOpponentBanned ||
                currentActor !== 'player' ||
                phase !== 'ban';

              // Only the BANNED card dims (via isBanned: grayscale + BANNED stamp).
              // The not-yet-banned cards stay fully visible while waiting for the
              // opponent — matching prod, where the card's entrance motion pinned
              // inline opacity:1 and silently overrode this opacity-30 fade.
              return (
                <BanCategoryCard
                  key={category.id}
                  category={category}
                  colorIndex={i}
                  animationIndex={i}
                  isBanned={isBanned}
                  disabled={disabled}
                  onClick={onBanCategory}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Store-connected ranked category banning screen used during a real match.
 * Delegates rendering to the pure {@link BanCategoryView} component.
 */
export function RankedCategoryBlockingScreen() {
  const { t } = useLocale();
  const { player } = usePlayer();
  const authUser = useAuthStore((state) => state.user);
  const connectedSelfUserId = useRealtimeMatchStore((state) => state.selfUserId);
  const selfUserId = connectedSelfUserId ?? authUser?.id ?? null;
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const draft = useRealtimeMatchStore((state) => state.draft);
  const draftPaused = useRealtimeMatchStore((state) => state.draftPaused);
  const draftPauseUntil = useRealtimeMatchStore((state) => state.draftPauseUntil);
  const hasResolvedRound = useRealtimeMatchStore(selectHasResolvedRound);
  const rankedFoundOpponent = useRankedMatchmakingStore((state) => state.rankedFoundOpponent);
  const rankedFoundMyRecentForm = useRankedMatchmakingStore((state) => state.rankedFoundMyRecentForm);
  const matchOpponent = useRealtimeMatchStore((state) => state.match?.opponent);
  const myRecentForm = useRealtimeMatchStore((s) => s.match?.myRecentForm);
  const skipDraftShowdown = useGameSessionStore((state) => state.config?.skipDraftShowdown === true);
  const { data: rankedProfile } = useRankedProfile();
  const [timeLeft, setTimeLeft] = useState(() =>
    selectDraftCountdownSeconds(useRealtimeMatchStore.getState())
  );
  const [draftPauseNowMs, setDraftPauseNowMs] = useState(() => Date.now());
  const [gateNowMs, setGateNowMs] = useState(() => Date.now());
  const [showShowdown, setShowShowdown] = useState(() => {
    if (skipDraftShowdown) return false;
    const currentDraft = useRealtimeMatchStore.getState().draft;
    const hasExistingDraftProgress = Boolean(
      currentDraft?.halfOneCategoryId || Object.keys(currentDraft?.bans ?? {}).length > 0
    );
    return Boolean(useRankedMatchmakingStore.getState().rankedFoundOpponent) && !hasExistingDraftProgress;
  });
  const autoBanFired = useRef(false);
  const rejoinedDraftLobbyRef = useRef<string | null>(null);
  const draftUiReadyRef = useRef<string | null>(null);
  const [soundMuted, setSoundMuted] = useState(() => getIsMuted());

  const opponentMember = useMemo(
    () => lobby?.members.find((member) => member.userId !== selfUserId),
    [lobby?.members, selfUserId]
  );
  const playerResolvedAvatar = useMemo(
    () =>
      resolveAvatarUrl(
        authUser?.avatar_url ?? player.avatarCustomization?.base ?? player.avatar),
    [authUser?.avatar_url, player.avatarCustomization?.base, player.avatar]
  );
  const opponentResolvedAvatar = useMemo(
    () => resolveAvatarUrl(opponentMember?.avatarUrl),
    [opponentMember?.avatarUrl]
  );
  const opponentId = opponentMember?.userId ?? 'opponent';
  const opponentUsername = opponentMember?.username ?? t('possession.opponent');

  useEffect(() => {
    const lobbyId = draft?.lobbyId ?? lobby?.lobbyId;
    if (!lobbyId || !selfUserId) return;
    if (rejoinedDraftLobbyRef.current === lobbyId) return;
    rejoinedDraftLobbyRef.current = lobbyId;
    getSocket().emit('draft:rejoin', { lobbyId });
    logger.info('Socket emit draft:rejoin', { lobbyId });
  }, [draft?.lobbyId, lobby?.lobbyId, selfUserId]);

  useEffect(() => {
    if (!draft || !draft.turnActive || showShowdown || draftPaused) return;
    autoBanFired.current = false;
    const tick = () => setTimeLeft(selectDraftCountdownSeconds({ draft }));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [draft, draft?.turnActive, draftPaused, showShowdown]);

  useEffect(() => {
    if (!draft?.waitingForReady) return;
    const tick = () => setGateNowMs(Date.now());
    tick();
    const intervalId = setInterval(tick, 250);
    return () => clearInterval(intervalId);
  }, [draft?.waitingForReady]);

  const draftBanCount = draft ? Object.keys(draft.bans).length : 0;

  useEffect(() => {
    if (!draft || !lobby || showShowdown || draftPaused || draft.halfOneCategoryId || !draft.turnUserId || !selfUserId) {
      draftUiReadyRef.current = null;
      return;
    }

    const lobbyId = draft.lobbyId ?? lobby.lobbyId;
    const turnUserId = draft.turnUserId;
    const readyKey = `${lobbyId}:${selfUserId}:${turnUserId}:${draftBanCount}`;
    if (draftUiReadyRef.current === readyKey) return;

    const frameId = window.requestAnimationFrame(() => {
      getSocket().emit('draft:ui_ready', { lobbyId, turnUserId, banCount: draftBanCount });
      draftUiReadyRef.current = readyKey;
      logger.info('Socket emit draft:ui_ready', { lobbyId, turnUserId, banCount: draftBanCount });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [
    draft,
    lobby,
    draft?.lobbyId,
    lobby?.lobbyId,
    showShowdown,
    draftPaused,
    draft?.halfOneCategoryId,
    draft?.turnUserId,
    draftBanCount,
    selfUserId,
  ]);

  useEffect(() => {
    if (!draftPaused || !draftPauseUntil) return;
    const tick = () => setDraftPauseNowMs(Date.now());
    tick();
    const intervalId = setInterval(tick, 250);
    return () => clearInterval(intervalId);
  }, [draftPaused, draftPauseUntil]);

  // Auto-ban a random category when timer expires on player's turn
  useEffect(() => {
    if (timeLeft !== 0 || autoBanFired.current) return;
    if (!draft?.turnActive) return;
    if (draftPaused) return;
    if (!selfUserId) return;
    if (!draft || draft.halfOneCategoryId) return;
    if (draft.turnUserId !== selfUserId) return;
    const playerBan = draft.bans[selfUserId] ?? null;
    if (playerBan) return;

    const bannedIds = new Set(Object.values(draft.bans));
    const available = draft.categories.filter((c) => !bannedIds.has(c.id));
    if (available.length === 0) return;

    const randomCategory = available[Math.floor(Math.random() * available.length)];
    autoBanFired.current = true;
    getSocket().emit('draft:ban', { categoryId: randomCategory.id });
    logger.info('Auto-ban on timer expiry', { categoryId: randomCategory.id });
  }, [timeLeft, draft, draft?.turnActive, draftPaused, selfUserId]);

  useEffect(() => {
    if (showShowdown) {
      const timer = setTimeout(() => setShowShowdown(false), 7000);
      return () => clearTimeout(timer);
    }
  }, [showShowdown]);

  const phase = draft?.halfOneCategoryId ? 'ready' : 'ban';
  const currentActor = draft?.turnUserId === selfUserId ? 'player' : 'opponent';
  const playerBannedId = draft?.bans[selfUserId ?? ''] ?? null;
  const opponentBannedId = draft
    ? Object.entries(draft.bans).find(([userId]) => userId !== selfUserId)?.[1] ?? null
    : null;
  const pauseSeconds = draftPauseUntil
    ? Math.max(0, Math.ceil((draftPauseUntil - draftPauseNowMs) / 1000))
    : null;
  const opponentWaiting = Boolean(
    draft?.waitingForReady?.waitingUserIds.some((userId) => userId !== selfUserId)
  );
  const selfWaiting = Boolean(selfUserId && draft?.waitingForReady?.waitingUserIds.includes(selfUserId));
  const waitingMessage = opponentWaiting
    ? t('banCategory.opponentConnecting')
    : selfWaiting || !draft?.turnActive
      ? t('banCategory.connecting')
      : null;
  const forceCancelAtMs = draft?.waitingForReady
    ? Date.parse(draft.waitingForReady.forceCancelAt)
    : Number.NaN;
  const waitingSeconds = opponentWaiting && Number.isFinite(forceCancelAtMs)
    ? Math.max(0, Math.ceil((forceCancelAtMs - gateNowMs) / 1000))
    : null;

  const poolCategories = draft?.categories ?? [];

  const playerRp = rankedProfile?.rp ?? player.rankPoints;
  const opponentRp = parseRp(matchOpponent?.rp ?? rankedFoundOpponent?.rp) ?? opponentMember?.rankPoints;
  const playerTier = playerRp != null ? tierFromRp(playerRp) : undefined;
  const opponentTier = opponentRp != null ? tierFromRp(opponentRp) : undefined;
  const opponentIsAi = isAiOpponentInfo(matchOpponent) || isAiOpponentInfo(rankedFoundOpponent);
  const opponentCountryCode =
    matchOpponent?.countryCode
    ?? matchOpponent?.country
    ?? rankedFoundOpponent?.countryCode
    ?? rankedFoundOpponent?.country
    ?? null;
  const handleBanCategory = useCallback((categoryId: string) => {
    if (!draft?.turnActive) return;
    if (draftPaused) return;
    if (!selfUserId) return;
    useRealtimeMatchStore.getState().setDraftBan(selfUserId, categoryId);
    getSocket().emit('draft:ban', { categoryId });
    logger.info('Socket emit draft:ban (optimistic)', { categoryId });
  }, [draft?.turnActive, draftPaused, selfUserId]);

  if (!draft || !lobby) {
    return <LoadingScreen text={t('play.preparingMatch')} />;
  }

  if (showShowdown) {
    return (
      <ShowdownScreen
        matchType="ranked"
        playerUsername={player.username}
        playerAvatar={playerResolvedAvatar}
        opponentUsername={opponentUsername}
        opponentAvatar={opponentResolvedAvatar}
        onComplete={() => setShowShowdown(false)}
        playerInfo={{
          username: player.username,
          avatar: playerResolvedAvatar,
          avatarCustomization: authUser?.avatar_customization ?? player.avatarCustomization,
          rankPoints: playerRp,
          level: player.level,
          tier: playerTier,
          countryCode: authUser?.country ?? undefined,
          favoriteClub: authUser?.favorite_club ?? null,
          recentForm: myRecentForm ?? rankedFoundMyRecentForm ?? undefined,
        }}
        opponentInfo={{
          username: opponentUsername,
          avatar: opponentResolvedAvatar,
          avatarCustomization: opponentMember?.avatarCustomization ?? matchOpponent?.avatarCustomization ?? rankedFoundOpponent?.avatarCustomization,
          rankPoints: opponentRp,
          tier: opponentTier,
          countryCode: opponentCountryCode ?? undefined,
          favoriteClub: matchOpponent?.favoriteClub ?? rankedFoundOpponent?.favoriteClub ?? null,
          recentForm: matchOpponent?.recentForm ?? rankedFoundOpponent?.recentForm,
          pingMs: matchOpponent?.pingMs ?? rankedFoundOpponent?.pingMs,
          isAi: opponentIsAi,
        }}
      />
    );
  }

  return (
    <BanCategoryView
      player={{
        id: selfUserId ?? 'player',
        username: player.username,
        avatar: playerResolvedAvatar,
        avatarCustomization: authUser?.avatar_customization ?? player.avatarCustomization,
        countryCode: authUser?.country ?? null,
        rankPoints: playerRp ?? null,
        tier: playerTier,
      }}
      opponent={{
        id: opponentId,
        username: opponentUsername,
        avatar: opponentResolvedAvatar,
        avatarCustomization: opponentMember?.avatarCustomization ?? matchOpponent?.avatarCustomization ?? rankedFoundOpponent?.avatarCustomization,
        countryCode: opponentCountryCode,
        rankPoints: opponentRp ?? null,
        tier: opponentTier,
      }}
      categories={poolCategories}
      playerBannedId={playerBannedId}
      opponentBannedId={opponentBannedId}
      phase={phase}
      currentActor={currentActor}
      timeLeft={timeLeft}
      turnActive={draft.turnActive}
      waitingMessage={waitingMessage}
      waitingSeconds={waitingSeconds}
      paused={draftPaused}
      pauseSeconds={pauseSeconds}
      hasResolvedRound={hasResolvedRound}
      soundMuted={soundMuted}
      onToggleSound={() => setSoundMuted(toggleMute())}
      onBanCategory={handleBanCategory}
    />
  );
}
