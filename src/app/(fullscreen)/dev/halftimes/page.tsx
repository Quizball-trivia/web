'use client';

/**
 * Dev playground for iterating on the three category-ban surfaces and their
 * entrance / banning animations, without a backend:
 *
 *  1. Pre-match ranked draft  → <BanCategoryView />
 *  2. Halftime ban            → <HalftimeScreen />
 *  3. Before-penalties ban    → <HalftimeScreen isPenaltyBan />
 *
 * Real categories are pulled from the DB (useAllCategoriesList) so the cards
 * render true artwork. A fake bot auto-bans a category after a short delay so
 * the banning animation plays; "Replay" remounts the active screen so the
 * staggered fade-in entrance re-fires for tuning.
 *
 * Guarded by NODE_ENV — production code paths are unaffected.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, RefreshCw } from 'lucide-react';
import { useAllCategoriesList } from '@/lib/queries/categories.queries';
import { BanCategoryView } from '@/features/play/RankedCategoryBlockingScreen';
import { HalftimeScreen } from '@/features/possession/components/HalftimeScreen';
import type { DraftCategory } from '@/lib/realtime/socket.types';

type Variant = 'prematch' | 'halftime' | 'penalty';

const VARIANTS: Array<{ id: Variant; label: string }> = [
  { id: 'prematch', label: 'Pre-match draft' },
  { id: 'halftime', label: 'Halftime' },
  { id: 'penalty', label: 'Pre-penalties' },
];

// Real bans show exactly 3 categories per round.
const CARD_COUNT = 3;
// Delay before the fake bot bans a category, so the entrance settles first.
const BOT_BAN_DELAY_MS = 2600;
// Ban window length (seconds), mirrors the real halftime timer.
const BAN_SECONDS = 15;

export default function DevHalftimesPage() {
  const router = useRouter();
  const { data, isLoading } = useAllCategoriesList();

  const [variant, setVariant] = useState<Variant>('halftime');
  // Bumped on Replay to remount the active screen and re-fire its entrance.
  const [replayKey, setReplayKey] = useState(0);
  const [playerBan, setPlayerBan] = useState<string | null>(null);
  const [opponentBan, setOpponentBan] = useState<string | null>(null);

  const categories = useMemo<DraftCategory[]>(() => {
    const items = data?.items ?? [];
    // Prefer categories that actually have artwork so the cards show real
    // imagery (not the emoji/gamepad fallback), then fall back to fill 3.
    const withImage = items.filter((c) => c.imageUrl);
    const pool = (withImage.length >= CARD_COUNT ? withImage : items);
    return pool.slice(0, CARD_COUNT).map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon ?? null,
      imageUrl: c.imageUrl ?? null,
    }));
  }, [data]);

  // A real ban deadline so the circular timer counts down exactly like prod.
  // Recomputed on each replay so the timer restarts fresh. uiReadyAt must equal
  // deadlineAt for HalftimeScreen to arm its timer.
  const deadlineAt = useMemo(
    () => new Date(Date.now() + BAN_SECONDS * 1000).toISOString(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [replayKey],
  );

  // Live countdown for the pre-match BanCategoryView (which takes a plain
  // timeLeft number rather than a deadline). Resets each replay.
  const [timeLeft, setTimeLeft] = useState(BAN_SECONDS);
  useEffect(() => {
    setTimeLeft(BAN_SECONDS);
    const id = window.setInterval(() => {
      setTimeLeft((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [replayKey]);

  // Reset bans + remount so the entrance animation replays from scratch.
  const replay = useCallback(() => {
    setPlayerBan(null);
    setOpponentBan(null);
    setReplayKey((k) => k + 1);
  }, []);

  // Switch variant AND reset/replay in one go, so each surface animates in fresh
  // (done in the handler rather than an effect to avoid a setState-in-effect).
  const selectVariant = useCallback(
    (next: Variant) => {
      setVariant(next);
      replay();
    },
    [replay],
  );

  // Fake bot: a couple of seconds after (re)mount, ban a category the player
  // hasn't taken — so the banning animation plays automatically.
  useEffect(() => {
    if (categories.length === 0 || opponentBan) return;
    const id = window.setTimeout(() => {
      const target = categories.find((c) => c.id !== playerBan);
      if (target) setOpponentBan(target.id);
    }, BOT_BAN_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [categories, opponentBan, playerBan, replayKey]);

  const handleBan = useCallback((id: string) => {
    setPlayerBan((current) => current ?? id);
  }, []);

  const bothBanned = Boolean(playerBan && opponentBan);

  return (
    <div className="relative min-h-dvh w-full bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat">
      {/* Dev toolbar */}
      <div className="absolute left-0 right-0 top-0 z-[60] flex items-center justify-between gap-2 px-3 py-2">
        <div className="flex flex-wrap gap-1.5">
          {VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => selectVariant(v.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition-colors ${
                variant === v.id ? 'bg-brand-blue text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {v.label}
            </button>
          ))}
          <button
            type="button"
            onClick={replay}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-green px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-white hover:bg-brand-green-deep"
          >
            <RefreshCw className="size-3.5" /> Replay
          </button>
        </div>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="pt-14">
        {isLoading || categories.length === 0 ? (
          <div className="flex min-h-dvh items-center justify-center text-sm font-black uppercase tracking-widest text-white/50">
            Loading categories…
          </div>
        ) : variant === 'prematch' ? (
          <BanCategoryView
            key={replayKey}
            player={DEMO_PLAYER}
            opponent={DEMO_OPPONENT}
            categories={categories}
            playerBannedId={playerBan}
            opponentBannedId={opponentBan}
            phase={bothBanned ? 'ready' : 'ban'}
            currentActor={playerBan ? 'opponent' : 'player'}
            timeLeft={timeLeft}
            soundMuted
            onToggleSound={() => {}}
            onBanCategory={handleBan}
          />
        ) : (
          <HalftimeScreen
            key={replayKey}
            visible
            playerGoals={1}
            opponentGoals={0}
            playerName={DEMO_PLAYER.username}
            opponentName={DEMO_OPPONENT.username}
            playerAvatarUrl={DEMO_PLAYER.avatar}
            opponentAvatarUrl={DEMO_OPPONENT.avatar}
            playerPosition={42}
            playerRankPoints={DEMO_PLAYER.rankPoints}
            opponentRankPoints={DEMO_OPPONENT.rankPoints}
            categoryOptions={categories}
            deadlineAt={deadlineAt}
            uiReadyAt={deadlineAt}
            mySeat={1}
            firstBanSeat={1}
            myBan={playerBan}
            opponentBan={opponentBan}
            onBanCategory={handleBan}
            isPenaltyBan={variant === 'penalty'}
          />
        )}
      </div>
    </div>
  );
}

const DEMO_PLAYER = {
  id: 'demo-player',
  username: 'YOU',
  avatar: '/assets/avatars/default.png',
  countryCode: 'ge',
  rankPoints: 1240,
} as const;

const DEMO_OPPONENT = {
  id: 'demo-opponent',
  username: 'BOT',
  avatar: '/assets/avatars/default.png',
  countryCode: 'us',
  rankPoints: 1180,
} as const;
