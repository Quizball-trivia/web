"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { ShowdownScreen } from './ShowdownScreen';
import { motion } from 'motion/react';
import { Volume2, VolumeX } from 'lucide-react';
import { isMuted as getIsMuted, toggleMute } from '@/lib/sounds/gameSounds';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useRankedMatchmakingStore } from '@/stores/rankedMatchmaking.store';
import { getSocket } from '@/lib/realtime/socket-client';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuthStore } from '@/stores/auth.store';
import { useHeadToHead } from '@/lib/queries/stats.queries';
import { useRankedProfile } from '@/lib/queries/ranked.queries';
import { useCategoriesList } from '@/lib/queries/categories.queries';
import { logger } from '@/utils/logger';
import { cn, parseRp } from '@/lib/utils';
import { resolveAvatarUrl } from '@/lib/avatars';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { tierFromRp, type RankedTier } from '@/utils/rankedTier';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { BanCategoryCard } from '@/components/shared/BanCategoryCard';

// Tier accent colors (mirrors ModeSelectionScreen)
const TIER_COLORS: Record<RankedTier, string> = {
  Academy: '#8B9DA4',
  'Youth Prospect': '#58CC02',
  Reserve: '#1CB0F6',
  Bench: '#1CB0F6',
  Rotation: '#CE82FF',
  Starting11: '#CE82FF',
  'Key Player': '#FF9600',
  Captain: '#FF9600',
  'World-Class': '#FF4B4B',
  Legend: '#FFD700',
  GOAT: '#FFD700',
};

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
  h2h?: { winsA: number; winsB: number; total: number } | null;
  soundMuted: boolean;
  onToggleSound: () => void;
  onBanCategory: (categoryId: string) => void;
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
  h2h,
  soundMuted,
  onToggleSound,
  onBanCategory,
}: BanCategoryViewProps) {
  const playerTierColor = player.tier ? TIER_COLORS[player.tier] : '#56707A';
  const opponentTierColor = opponent.tier ? TIER_COLORS[opponent.tier] : '#56707A';

  return (
    <div className="relative min-h-dvh flex flex-col font-poppins">
      {/* ── Shared AppShell-style background ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[#0f1420] bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%), radial-gradient(circle at bottom left, rgba(88,204,2,0.06), transparent 28%)",
        }}
      />

      {/* ── Header (no separator, blends into page bg) ── */}
      <div className="relative z-10 w-full">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          {/* Player (Left) */}
          <div className={cn(
            "flex items-center gap-3 transition-opacity duration-300",
            currentActor === 'opponent' && "opacity-50"
          )}>
            <div className="relative">
              <AvatarDisplay
                customization={{ base: player.avatar }}
                size="sm"
                countryCode={player.countryCode ?? null}
                className="ring-[3px] ring-[#1CB0F6] shadow-[0_3px_0_0_#1899D6]"
              />
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[7px] font-black bg-[#1CB0F6] text-white px-1.5 py-px rounded-full border-b border-[#1899D6] uppercase tracking-wider z-30">
                YOU
              </span>
            </div>
            <div className="hidden sm:block">
              <div className="text-[15px] font-black text-white leading-none truncate max-w-[140px]">
                {player.username}
              </div>
              <div className="text-xs font-extrabold text-[#56707A] mt-1">
                {player.rankPoints != null ? `${player.rankPoints} RP` : '— RP'}
              </div>
              {player.tier && (
                <div
                  className="mt-0.5 text-[10px] font-black uppercase tracking-wider"
                  style={{ color: playerTierColor }}
                >
                  {player.tier}
                </div>
              )}
            </div>
          </div>

          {/* Center: H2H + Timer + Phase */}
          <div className="flex flex-col items-center">
            {h2h && h2h.total > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-black text-[#1CB0F6] tabular-nums">{h2h.winsA}</span>
                <span className="text-[10px] font-black text-[#56707A]">vs</span>
                <span className="text-lg font-black text-[#FF4B4B] tabular-nums">{h2h.winsB}</span>
              </div>
            )}

            <div className={cn(
              'text-5xl font-black tabular-nums leading-none transition-colors',
              timeLeft <= 5 ? 'text-[#FF4B4B] animate-pulse' : 'text-[#58CC02]'
            )}>
              {timeLeft}
            </div>

            <div className="mt-2 bg-[#FF4B4B] px-3 py-1 rounded-full border-b-[3px] border-[#E04242]">
              <span className="text-[10px] font-black text-white uppercase tracking-wider">Ban Phase</span>
            </div>

            <span className="text-[10px] font-extrabold text-[#56707A] mt-1.5 uppercase">
              {currentActor === 'player' ? "Your Turn" : "Opponent's Turn"}
            </span>
          </div>

          {/* Opponent (Right) */}
          <div className={cn(
            "flex items-center gap-3 flex-row-reverse transition-opacity duration-300",
            currentActor === 'player' && "opacity-50"
          )}>
            <div className="relative">
              <AvatarDisplay
                customization={{ base: opponent.avatar }}
                size="sm"
                countryCode={opponent.countryCode ?? null}
                className="ring-[3px] ring-[#FF4B4B] shadow-[0_3px_0_0_#E04242]"
              />
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[7px] font-black bg-[#FF4B4B] text-white px-1.5 py-px rounded-full border-b border-[#E04242] uppercase tracking-wider z-30">
                FOE
              </span>
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-[15px] font-black text-white leading-none truncate max-w-[140px]">
                {opponent.username}
              </div>
              <div className="text-xs font-extrabold text-[#56707A] mt-1">
                {opponent.rankPoints != null ? `${opponent.rankPoints} RP` : '— RP'}
              </div>
              {opponent.tier && (
                <div
                  className="mt-0.5 text-[10px] font-black uppercase tracking-wider"
                  style={{ color: opponentTierColor }}
                >
                  {opponent.tier}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sound toggle (top-right floating) */}
        <button
          onClick={onToggleSound}
          aria-label={soundMuted ? 'Unmute' : 'Mute'}
          className="absolute top-4 right-4 sm:top-5 sm:right-6 size-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition"
        >
          {soundMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center pt-4 sm:pt-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-6 sm:mb-8 px-6"
        >
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">
            {phase === 'ban' ? "Ban a Category" : "Get Ready!"}
          </h2>
          <p className="text-sm text-[#56707A] font-bold mt-1.5">
            {phase === 'ban'
              ? "Tap a card to remove it. One category remains for Half 1."
              : "Match starting with selected Half 1 category..."}
          </p>
        </motion.div>

        {/* Category Cards — shared BanCategoryCard matches /play mode-selection style */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="w-full">
          <div className="grid grid-cols-3 gap-3 sm:gap-5 pb-8 px-4 sm:px-6 max-w-2xl mx-auto">
            {categories.map((category, i) => {
              const isPlayerBanned = category.id === playerBannedId;
              const isOpponentBanned = category.id === opponentBannedId;
              const isBanned = isPlayerBanned || isOpponentBanned;

              const disabled =
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
  const { player } = usePlayer();
  const authUser = useAuthStore((state) => state.user);
  const connectedSelfUserId = useRealtimeMatchStore((state) => state.selfUserId);
  const selfUserId = connectedSelfUserId ?? authUser?.id ?? null;
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const draft = useRealtimeMatchStore((state) => state.draft);
  const rankedFoundOpponent = useRankedMatchmakingStore((state) => state.rankedFoundOpponent);
  const matchOpponent = useRealtimeMatchStore((state) => state.match?.opponent);
  const { data: rankedProfile } = useRankedProfile();
  const [timeLeft, setTimeLeft] = useState(15);
  const [showShowdown, setShowShowdown] = useState(true);
  const autoBanFired = useRef(false);
  const [soundMuted, setSoundMuted] = useState(() => getIsMuted());

  const opponentMember = useMemo(
    () => lobby?.members.find((member) => member.userId !== selfUserId),
    [lobby?.members, selfUserId]
  );
  const playerResolvedAvatar = useMemo(
    () =>
      resolveAvatarUrl(
        authUser?.avatar_url ?? player.avatarCustomization?.base ?? player.avatar,
        selfUserId || 'player',
        256
      ),
    [authUser?.avatar_url, player.avatarCustomization?.base, player.avatar, selfUserId]
  );
  const opponentResolvedAvatar = useMemo(
    () => resolveAvatarUrl(opponentMember?.avatarUrl, opponentMember?.userId ?? 'opponent', 256),
    [opponentMember?.avatarUrl, opponentMember?.userId]
  );
  const opponentId = opponentMember?.userId ?? 'opponent';
  const opponentUsername = opponentMember?.username ?? 'Opponent';

  const h2h = useHeadToHead(
    selfUserId ?? undefined,
    opponentId !== 'opponent' ? opponentId : undefined
  );

  useEffect(() => {
    if (!draft || showShowdown) return;
    setTimeLeft(15);
    autoBanFired.current = false;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.turnUserId, draft?.halfOneCategoryId, draft?.categories, showShowdown]);

  // Auto-ban a random category when timer expires on player's turn
  useEffect(() => {
    if (timeLeft !== 0 || autoBanFired.current) return;
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
  }, [timeLeft, draft, selfUserId]);

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
    return <LoadingScreen text="Preparing Match..." />;
  }

  if (showShowdown) {
    return (
      <ShowdownScreen
        player={{
          avatar: playerResolvedAvatar,
          username: player.username,
          rankPoints: playerRp,
          level: player.level,
          tier: playerTier,
        }}
        opponent={{
          avatar: opponentResolvedAvatar,
          username: opponentUsername,
          rankPoints: opponentRp,
          tier: opponentTier,
        }}
        onContinue={() => setShowShowdown(false)}
      />
    );
  }

  return (
    <BanCategoryView
      player={{
        id: selfUserId ?? 'player',
        username: player.username,
        avatar: playerResolvedAvatar,
        countryCode: authUser?.country ?? null,
        rankPoints: playerRp ?? null,
        tier: playerTier,
      }}
      opponent={{
        id: opponentId,
        username: opponentUsername,
        avatar: opponentResolvedAvatar,
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
      h2h={h2h.data ?? null}
      soundMuted={soundMuted}
      onToggleSound={() => setSoundMuted(toggleMute())}
      onBanCategory={(categoryId) => {
        if (!selfUserId) return;
        useRealtimeMatchStore.getState().setDraftBan(selfUserId, categoryId);
        getSocket().emit('draft:ban', { categoryId });
        logger.info('Socket emit draft:ban (optimistic)', { categoryId });
      }}
    />
  );
}
