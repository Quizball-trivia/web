"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { ShowdownScreen } from './ShowdownScreen';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { getSocket } from '@/lib/realtime/socket-client';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuthStore } from '@/stores/auth.store';
import { useHeadToHead } from '@/lib/queries/stats.queries';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import { isAvatarUrl } from '@/lib/avatars';
import { LoadingScreen } from '@/components/shared/LoadingScreen';

// Dark-tinted category card colors (subtle accent on dark bg)
const CARD_COLORS = [
  { bg: '#162A3A', dark: '#1CB0F6' },  // blue tint
  { bg: '#2A2118', dark: '#FF9600' },  // orange tint
  { bg: '#241A2E', dark: '#CE82FF' },  // purple tint
  { bg: '#1A2A18', dark: '#58CC02' },  // green tint
  { bg: '#2A1A1A', dark: '#FF4B4B' },  // red tint
  { bg: '#2A2618', dark: '#FFC800' },  // gold tint
];


export function RankedCategoryBlockingScreen() {
  // All hooks must be called before any conditional return
  const { player } = usePlayer();
  const authUser = useAuthStore((state) => state.user);
  const selfUserId = authUser?.id ?? player.id;
  const lobby = useRealtimeMatchStore((state) => state.lobby);
  const draft = useRealtimeMatchStore((state) => state.draft);
  const [timeLeft, setTimeLeft] = useState(15);
  const [showShowdown, setShowShowdown] = useState(() => {
    // Show showdown only on first mount, not after banning
    return true;
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoBanFired = useRef(false);

  const opponentMember = useMemo(
    () => lobby?.members.find((member) => member.userId !== selfUserId),
    [lobby?.members, selfUserId]
  );
  const opponent = useMemo(() => {
    return {
      id: opponentMember?.userId ?? 'opponent',
      username: opponentMember?.username ?? 'Opponent',
      avatar: opponentMember?.avatarUrl ?? '😈',
    };
  }, [opponentMember]);
  const h2h = useHeadToHead(selfUserId, opponent.id !== 'opponent' ? opponent.id : undefined);
  useEffect(() => {
    if (!draft) return;
    setTimeLeft(15);
    autoBanFired.current = false;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.turnUserId, draft?.halfOneCategoryId, draft?.categories]);

  // Auto-ban a random category when timer expires on player's turn
  useEffect(() => {
    if (timeLeft !== 0 || autoBanFired.current) return;
    if (!selfUserId) return;
    if (!draft || draft.halfOneCategoryId) return; // already done
    if (draft.turnUserId !== selfUserId) return; // not our turn
    const playerBan = draft.bans[selfUserId] ?? null;
    if (playerBan) return; // already banned

    const bannedIds = new Set(Object.values(draft.bans));
    const available = draft.categories.filter((c) => !bannedIds.has(c.id));
    if (available.length === 0) return;

    const randomCategory = available[Math.floor(Math.random() * available.length)];
    autoBanFired.current = true;
    getSocket().emit('draft:ban', { categoryId: randomCategory.id });
    logger.info('Auto-ban on timer expiry', { categoryId: randomCategory.id });
  }, [timeLeft, draft, selfUserId]);

  // Show showdown screen for 15 seconds before banning starts, only once
  useEffect(() => {
    if (showShowdown) {
      const timer = setTimeout(() => {
        setShowShowdown(false);
      }, 7000); // 15 seconds
      return () => clearTimeout(timer);
    }
  }, [showShowdown]);
  const phase = draft?.halfOneCategoryId ? 'ready' : 'ban';
  const currentActor = draft?.turnUserId === selfUserId ? 'player' : 'opponent';
  const playerBannedId = draft?.bans[selfUserId ?? ''] ?? null;
  const opponentBannedId = draft ? Object.entries(draft.bans).find(([userId]) => userId !== selfUserId)?.[1] ?? null : null;
  const poolCategories = draft?.categories ?? [];
  const playerRp = player.rankPoints ?? 1200;
  const opponentRp = opponentMember?.rankPoints ?? 1200;

  // Memoized progress state for the 3-step indicator
  const { steps } = useMemo(() => {
    const banCount = Object.keys(draft?.bans ?? {}).length;
    const isReady = !!draft?.halfOneCategoryId;
    return { banCount, isReady, steps: [banCount >= 1, banCount >= 2, isReady] };
  }, [draft?.bans, draft?.halfOneCategoryId]);

  // Early return after all hooks
  if (!draft || !lobby) {
    return <LoadingScreen text="Preparing Match..." />;
  }
  if (showShowdown) {
    return (
      <ShowdownScreen
        player={{
          avatar: player.avatar,
          username: player.username,
          rankPoints: player.rankPoints ?? 1200,
          level: player.level,
        }}
        opponent={{
          avatar: opponent.avatar,
          username: opponent.username,
          rankPoints: opponentMember?.rankPoints ?? 1200,
        }}
        onContinue={() => setShowShowdown(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#131F24] flex flex-col font-fun">

      {/* ─── Chunky Header Bar ─── */}
      <div className="w-full bg-[#1B2F36] border-b-[3px] border-[#0D1B21]">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">

          {/* Player (Left) */}
          <div className={cn("flex items-center gap-3 transition-opacity duration-300", currentActor === 'opponent' && "opacity-50")}>
            <div className="relative">
              <div className="size-14 rounded-full bg-[#131F24] border-[4px] border-[#1CB0F6] flex items-center justify-center text-3xl overflow-hidden shadow-[0_3px_0_0_#1899D6]">
                {isAvatarUrl(player.avatar) ? (
                  <Image src={player.avatar} alt="You" width={56} height={56} unoptimized className="w-full h-full object-cover" />
                ) : (
                  <span>{player.avatar || '🧑'}</span>
                )}
              </div>
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-black bg-[#1CB0F6] text-white px-2 py-[2px] rounded-full border-b-2 border-[#1899D6] uppercase tracking-wide">YOU</span>
            </div>
            <div className="hidden sm:block">
              <div className="text-[15px] font-black text-white leading-none">{player.username}</div>
              <div className="text-xs font-extrabold text-[#56707A] mt-0.5">{playerRp} RP</div>
            </div>
          </div>

          {/* Center: H2H Score + Timer + Phase */}
          <div className="flex flex-col items-center">
            {/* Head-to-head score */}
            {h2h.data && h2h.data.total > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-black text-[#1CB0F6] tabular-nums">{h2h.data.winsA}</span>
                <span className="text-[10px] font-black text-[#56707A]">vs</span>
                <span className="text-lg font-black text-[#FF4B4B] tabular-nums">{h2h.data.winsB}</span>
              </div>
            )}

            {/* Timer */}
            <div className={cn(
              'text-5xl font-black tabular-nums leading-none transition-colors',
              timeLeft <= 5 ? 'text-[#FF4B4B] animate-pulse' : 'text-[#58CC02]'
            )}>
              {timeLeft}
            </div>

            {/* Phase pill */}
            <div className="mt-2 bg-[#FF4B4B] px-3 py-1 rounded-full border-b-[3px] border-[#E04242]">
              <span className="text-[10px] font-black text-white uppercase tracking-wider">Ban Phase</span>
            </div>

            {/* Turn */}
            <span className="text-[10px] font-extrabold text-[#56707A] mt-1.5 uppercase">
              {currentActor === 'player' ? "Your Turn" : "Opponent's Turn"}
            </span>
          </div>

          {/* Opponent (Right) */}
          <div className={cn("flex items-center gap-3 flex-row-reverse transition-opacity duration-300", currentActor === 'player' && "opacity-50")}>
            <div className="relative">
              <div className="size-14 rounded-full bg-[#131F24] border-[4px] border-[#FF4B4B] flex items-center justify-center text-3xl overflow-hidden shadow-[0_3px_0_0_#E04242]">
                {isAvatarUrl(opponent.avatar) ? (
                  <Image src={opponent.avatar} alt="Opponent" width={56} height={56} unoptimized className="w-full h-full object-cover" />
                ) : (
                  <span>{opponent.avatar || '😈'}</span>
                )}
              </div>
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-black bg-[#FF4B4B] text-white px-2 py-[2px] rounded-full border-b-2 border-[#E04242] uppercase tracking-wide">FOE</span>
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-[15px] font-black text-white leading-none">{opponent.username}</div>
              <div className="text-xs font-extrabold text-[#56707A] mt-0.5">{opponentRp} RP</div>
            </div>
          </div>
        </div>

        {/* Chunky progress bar — 3 steps: player ban, opponent ban, ready */}
        <div className="flex gap-1.5 px-5 pb-3 max-w-5xl mx-auto">
          {steps.map((done, i) => (
            <div
              key={i}
              className={cn(
                "h-[10px] flex-1 rounded-full border-b-2 transition-colors duration-300",
                done
                  ? "bg-[#FF4B4B] border-[#E04242]"
                  : "bg-[#243B44] border-[#1B2F36]"
              )}
            />
          ))}
        </div>
      </div>

      {/* ─── Content (vertically centered) ─── */}
      <div className="flex-1 flex flex-col items-center justify-center py-6">

        {/* Heading */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center mb-8 px-6">
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">
            {phase === 'ban' ? "Ban a Category" : "Get Ready!"}
          </h2>
          <p className="text-sm text-[#56707A] font-bold mt-1.5">
            {phase === 'ban'
              ? "Tap a card to remove it. One category remains for Half 1."
              : "Match starting with selected Half 1 category..."}
          </p>
        </motion.div>

        {/* Horizontal Scrolling Cards */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="w-full">
          <div ref={scrollRef} className="flex gap-5 overflow-x-auto scrollbar-hide pb-8 px-6 snap-x snap-mandatory justify-center">
            {poolCategories.map((category, i) => {
              const isPlayerBanned = category.id === playerBannedId;
              const isOpponentBanned = category.id === opponentBannedId;
              const isBanned = isPlayerBanned || isOpponentBanned;
              const color = CARD_COLORS[i % CARD_COLORS.length];

              const disabled =
                (!!playerBannedId && !isPlayerBanned && phase === 'ban') ||
                isOpponentBanned ||
                currentActor !== 'player' ||
                phase !== 'ban';

              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
                  onClick={() => {
                    if (disabled || isBanned) return;
                    useRealtimeMatchStore.getState().setDraftBan(selfUserId, category.id);
                    getSocket().emit('draft:ban', { categoryId: category.id });
                    logger.info('Socket emit draft:ban (optimistic)', { categoryId: category.id });
                  }}
                  className={cn(
                    'shrink-0 w-[220px] snap-center rounded-3xl overflow-hidden transition-all duration-200',
                    !disabled && !isBanned && 'cursor-pointer active:scale-[0.95] active:translate-y-[2px]',
                    disabled && !isBanned && 'cursor-default',
                    playerBannedId && !isPlayerBanned && !isOpponentBanned && 'opacity-25 pointer-events-none scale-95',
                  )}
                >
                  {/* Icon area — bright Duolingo color */}
                  <div
                    className="aspect-[4/5] flex items-center justify-center relative"
                    style={{ backgroundColor: isBanned ? '#243B44' : color.bg }}
                  >
                    <span className={cn(
                      "text-8xl transition-all duration-300 drop-shadow-lg",
                      isBanned && "grayscale opacity-40 scale-90"
                    )}>
                      {category.icon || '⚽'}
                    </span>

                    {/* Banned overlay */}
                    <AnimatePresence>
                      {isBanned && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center"
                        >
                          <motion.div
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: -12 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                            className="bg-[#FF4B4B] px-5 py-2.5 rounded-2xl border-b-4 border-[#CC3E3E] shadow-lg"
                          >
                            <span className="text-base font-black text-white uppercase tracking-wide">BANNED</span>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Info area — dark bottom with thick 3D border */}
                  <div
                    className="p-4 bg-[#1B2F36]"
                    style={{ borderBottom: `5px solid ${isBanned ? '#1B2F36' : color.dark}` }}
                  >
                    <h3 className="text-base font-black text-white leading-tight truncate">{category.name}</h3>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Swipe hint */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center mt-1">
          <span className="text-[10px] text-[#56707A] font-bold">← Swipe to see all categories →</span>
        </motion.div>
      </div>
    </div>
  );
}
