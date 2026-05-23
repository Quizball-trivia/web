"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { ShowdownScreen } from '@/components/ShowdownScreen';
import { motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { isMuted as getIsMuted, toggleMute } from '@/lib/sounds/gameSounds';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useRankedMatchmakingStore } from '@/stores/rankedMatchmaking.store';
import { useGameSessionStore } from '@/stores/gameSession.store';
import { getSocket } from '@/lib/realtime/socket-client';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuthStore } from '@/stores/auth.store';
import { useRankedProfile } from '@/lib/queries/ranked.queries';
import { useCategoriesList } from '@/lib/queries/categories.queries';
import { logger } from '@/utils/logger';
import { cn, parseRp } from '@/lib/utils';
import { resolveAvatarUrl } from '@/lib/avatars';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { tierFromRp, type RankedTier } from '@/utils/rankedTier';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { BanCategoryCard } from '@/components/shared/BanCategoryCard';
import { getTierAccent } from '@/utils/tierVisuals';
import { useLocale } from '@/contexts/LocaleContext';
import type { AvatarCustomization } from '@/types/game';

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

export interface BanCategoryViewCategory {
  id: string;
  name: string;
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
  paused?: boolean;
  soundMuted: boolean;
  onToggleSound: () => void;
  onBanCategory: (categoryId: string) => void;
}

function PlayerHeader({
  info,
  tierColor,
  bgColor,
  align,
  dimmed,
}: {
  info: BanCategoryViewPlayer;
  tierColor: string;
  bgColor: string;
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
      <div className="rounded-full p-3" style={{ backgroundColor: bgColor }}>
        <AvatarDisplay
          customization={info.avatarCustomization ?? { base: info.avatar }}
          size="md"
          countryCode={info.countryCode ?? null}
          className={!isLeft ? '-scale-x-100' : undefined}
        />
      </div>
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
 * preview routes like `/ban-page` without real socket/store wiring.
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
  paused = false,
  soundMuted,
  onToggleSound,
  onBanCategory,
}: BanCategoryViewProps) {
  const { t } = useLocale();
  const playerTierColor = player.tier ? getTierAccent(player.tier) : '#94A3B8';
  const opponentTierColor = opponent.tier ? getTierAccent(opponent.tier) : '#94A3B8';

  return (
    <div className="relative min-h-dvh flex flex-col bg-surface-page">
      {/* ── Header ── */}
      <div className="relative z-10 w-full">
        <div className="max-w-5xl mx-auto px-5 py-5 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Player (Left) */}
          <PlayerHeader
            info={player}
            tierColor={playerTierColor}
            bgColor="#1645FF"
            align="left"
            dimmed={currentActor === 'opponent'}
          />

          {/* Center timer pill */}
          <div
            className={cn(
              'flex h-14 min-w-[72px] items-center justify-center rounded-full px-6 text-3xl tabular-nums text-white transition-colors',
              timeLeft <= 5 ? 'bg-brand-red-soft animate-pulse' : 'bg-brand-blue'
            )}
            style={poppins}
          >
            {timeLeft}
          </div>

          {/* Opponent (Right) */}
          <PlayerHeader
            info={opponent}
            tierColor={opponentTierColor}
            bgColor="#FF4B4B"
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8 sm:mb-10 px-6"
        >
          <h2
            className="text-3xl uppercase text-white sm:text-4xl"
            style={poppins}
          >
            {paused ? 'Waiting' : phase === 'ban' ? 'Ban Category' : 'Get Ready'}
          </h2>
          <p
            className="mt-2 text-xs uppercase tracking-[0.08em] text-white/55 sm:text-sm"
            style={poppins}
          >
            {paused
              ? 'Opponent disconnected. Draft resumes when they return.'
              : phase === 'ban'
              ? 'Tap a card to remove it. One category remains for Half 1.'
              : 'Match starting with selected Half 1 category…'}
          </p>
        </motion.div>

        {/* Category Cards — shared BanCategoryCard matches /play mode-selection style */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="w-full">
          <div className="grid grid-cols-3 gap-3 sm:gap-5 px-4 sm:px-6 max-w-3xl mx-auto">
            {categories.map((category, i) => {
              const isPlayerBanned = category.id === playerBannedId;
              const isOpponentBanned = category.id === opponentBannedId;
              const isBanned = isPlayerBanned || isOpponentBanned;

              const disabled =
                paused ||
                (!!playerBannedId && !isPlayerBanned && phase === 'ban') ||
                isOpponentBanned ||
                currentActor !== 'player' ||
                phase !== 'ban';

              const fadedOut = Boolean(playerBannedId && !isPlayerBanned && !isOpponentBanned);

              return (
                <BanCategoryCard
                  key={category.id}
                  category={category}
                  colorIndex={i}
                  animationIndex={i}
                  isBanned={isBanned}
                  disabled={disabled}
                  fadedOut={fadedOut}
                  onClick={() => onBanCategory(category.id)}
                />
              );
            })}
          </div>
        </motion.div>
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
  const rankedFoundOpponent = useRankedMatchmakingStore((state) => state.rankedFoundOpponent);
  const rankedFoundMyRecentForm = useRankedMatchmakingStore((state) => state.rankedFoundMyRecentForm);
  const matchOpponent = useRealtimeMatchStore((state) => state.match?.opponent);
  const realtimeMatchState = useRealtimeMatchStore((state) => state.match);
  const skipDraftShowdown = useGameSessionStore((state) => state.config?.skipDraftShowdown === true);
  const { data: rankedProfile } = useRankedProfile();
  const [timeLeft, setTimeLeft] = useState(15);
  const [showShowdown, setShowShowdown] = useState(() => {
    if (skipDraftShowdown) return false;
    const currentDraft = useRealtimeMatchStore.getState().draft;
    const hasExistingDraftProgress = Boolean(
      currentDraft?.halfOneCategoryId || Object.keys(currentDraft?.bans ?? {}).length > 0
    );
    return Boolean(useRankedMatchmakingStore.getState().rankedFoundOpponent) && !hasExistingDraftProgress;
  });
  const autoBanFired = useRef(false);
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
  const opponentUsername = opponentMember?.username ?? 'Opponent';

  useEffect(() => {
    if (!draft || showShowdown || draftPaused) return;
    setTimeLeft(15);
    autoBanFired.current = false;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.turnUserId, draft?.halfOneCategoryId, draft?.categories, draftPaused, showShowdown]);

  // Auto-ban a random category when timer expires on player's turn
  useEffect(() => {
    if (timeLeft !== 0 || autoBanFired.current) return;
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
  }, [timeLeft, draft, draftPaused, selfUserId]);

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

  const { data: categoriesData } = useCategoriesList({ limit: 100, is_active: 'true' });
  const poolCategories = useMemo(() => {
    const draftCats = draft?.categories ?? [];
    const imageUrlMap = new Map(categoriesData?.items?.map(c => [c.id, c.imageUrl]) ?? []);
    return draftCats.map(c => ({ ...c, imageUrl: imageUrlMap.get(c.id) ?? null }));
  }, [draft?.categories, categoriesData?.items]);

  const playerRp = rankedProfile?.rp ?? player.rankPoints;
  const opponentRp = parseRp(matchOpponent?.rp ?? rankedFoundOpponent?.rp) ?? opponentMember?.rankPoints;
  const playerTier = playerRp != null ? tierFromRp(playerRp) : undefined;
  const opponentTier = opponentRp != null ? tierFromRp(opponentRp) : undefined;
  const opponentCountryCode =
    matchOpponent?.countryCode
    ?? matchOpponent?.country
    ?? rankedFoundOpponent?.countryCode
    ?? rankedFoundOpponent?.country
    ?? null;

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
          recentForm: realtimeMatchState?.myRecentForm ?? rankedFoundMyRecentForm ?? undefined,
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
      paused={draftPaused}
      soundMuted={soundMuted}
      onToggleSound={() => setSoundMuted(toggleMute())}
      onBanCategory={(categoryId) => {
        if (draftPaused) return;
        if (!selfUserId) return;
        useRealtimeMatchStore.getState().setDraftBan(selfUserId, categoryId);
        getSocket().emit('draft:ban', { categoryId });
        logger.info('Socket emit draft:ban (optimistic)', { categoryId });
      }}
    />
  );
}
