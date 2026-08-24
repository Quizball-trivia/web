'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react';
import { useLocale } from '@/contexts/LocaleContext';
import type { MessageKey } from '@/lib/i18n/messages';
import type { AvatarCustomization } from '@/types/game';
import { poppins } from '../../constants/auction.constants';
import { ScreenBackdrop, SCREEN_GLOW } from '../shared/ScreenBackdrop';
import { FramedAvatar } from '../shared/FramedAvatar';
import { LINEUP_CARD_WIDTH } from './MatchCountdown';

// Self-host the player WASM + the animations so the search screen never depends
// on an external CDN (works offline, no CORS, faster).
setWasmUrl('/assets/dotlottie-player.wasm');

// One animation per join state: alone → 2 in → all 3 in. Indexed by `joined`.
const SEARCH_LOTTIES = [
  '/assets/auction-search.lottie', // 1 bidder (you, searching)
  '/assets/auction-search-2.lottie', // 2 bidders
  '/assets/auction-search-3.lottie', // 3 bidders (full)
] as const;

const EMPTY_SEARCH_PLAYERS: Array<{ userId: string; displayName: string }> = [];
const DEMO_SEARCH_PLAYERS = [
  { userId: 'demo-self', displayName: 'Web Player' },
  { userId: 'demo-rival-1', displayName: 'Mobile Rival' },
  { userId: 'demo-rival-2', displayName: 'Third Bidder' },
] as const;

function lottieForJoined(joined: number, total: number) {
  const idx = Math.min(Math.max(joined, 1), total) - 1;
  return SEARCH_LOTTIES[Math.min(idx, SEARCH_LOTTIES.length - 1)];
}

/**
 * Auction "searching for opponents" screen built around a Lottie loader.
 *
 * The Lottie animation loops as the hero. The server-authoritative queue roster
 * fills the three seats in real time, while the count drives the animation and
 * rotating status copy.
 */
export interface LottieSearchProps {
  joined: number;
  total?: number;
  players?: Array<{ userId: string; displayName: string }>;
  botCount?: number;
  botPlayers?: Array<{ seatId: string; displayName: string }>;
  selfUserId?: string | null;
  selfDisplayName?: string | null;
  selfAvatarSeed?: string | null;
  /** The real user's layered avatar — rendered on the "You" seat. */
  selfAvatarCustomization?: AvatarCustomization | null;
  onCancel?: () => void;
  /** Force a single Lottie (harness preview). Defaults to count-driven selection. */
  src?: string;
}

/** A player seat — a framed avatar that springs in once the seat fills. */
function SeatFrame({
  width,
  filled,
  name,
  isSelf = false,
  customization,
  avatarSeed,
}: {
  width: number;
  filled: boolean;
  name?: string | null;
  isSelf?: boolean;
  customization?: AvatarCustomization | null;
  avatarSeed?: string | null;
}) {
  const labelWidth = Math.max(width + 16, 96);

  return (
    <div className="flex shrink-0 flex-col items-center" style={{ width: labelWidth }}>
      <motion.div
        initial={filled ? { opacity: 0, scale: 0.8, y: 10 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <FramedAvatar
          width={width}
          filled={filled}
          customization={filled ? customization : undefined}
          avatarSeed={filled ? avatarSeed : undefined}
        />
      </motion.div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={name ?? 'waiting'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={`relative z-20 mt-2 w-full truncate text-center font-poppins text-[10px] font-black uppercase leading-4 tracking-[0.06em] ${
            filled ? (isSelf ? 'text-brand-yellow' : 'text-white') : 'text-white/35'
          }`}
          style={poppins}
          title={name ?? undefined}
          aria-label={name ?? undefined}
        >
          <span className="block w-full truncate">{name ?? '—'}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const SEARCH_STATUS_KEYS = [
  'auctionGame.searchStatusStep1',
  'auctionGame.searchStatusStep2',
  'auctionGame.searchStatusStep3',
] as const satisfies readonly MessageKey[];

function statusKey(joined: number, total: number): MessageKey {
  if (joined >= total) return 'auctionGame.auctionStarting';
  const idx = Math.min(Math.max(joined - 1, 0), SEARCH_STATUS_KEYS.length - 1);
  return SEARCH_STATUS_KEYS[idx];
}

/** Seconds since the search screen mounted (for the elapsed timer). */
function useElapsedSeconds(): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return seconds;
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function LottieSearch({
  joined,
  total = 3,
  players = EMPTY_SEARCH_PLAYERS,
  botCount = 0,
  botPlayers = [],
  selfUserId,
  selfDisplayName,
  selfAvatarSeed,
  selfAvatarCustomization,
  onCancel,
  src,
}: LottieSearchProps) {
  const { t } = useLocale();
  const lottieSrc = src ?? lottieForJoined(joined, total);
  const elapsed = useElapsedSeconds();
  const status = t(statusKey(joined, total));
  const selfPlayer = players.find((player) => player.userId === selfUserId);
  const rivals = players.filter((player) => player.userId !== selfUserId);
  const humanSlots = [
    {
      userId: selfUserId ?? 'self',
      displayName: selfPlayer?.displayName || selfDisplayName || t('auctionGame.youLabel'),
      isSelf: true,
    },
    ...rivals.map((player) => ({ ...player, isSelf: false })),
  ].slice(0, total);
  const namedBotSlots = botPlayers
    .slice(0, Math.max(0, total - humanSlots.length))
    .map((player) => ({
      userId: player.seatId,
      displayName: player.displayName,
      isSelf: false,
    }));
  const unnamedBotCount = Math.max(
    0,
    Math.min(botCount - namedBotSlots.length, total - humanSlots.length - namedBotSlots.length),
  );
  const slots = [
    ...humanSlots,
    ...namedBotSlots,
    ...Array.from({ length: unnamedBotCount }, (_, index) => ({
      userId: `bot-${index}`,
      displayName: t('auctionGame.aiBidder'),
      isSelf: false,
    })),
  ];

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page-alt">
      <ScreenBackdrop glow={SCREEN_GLOW.formation} />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6">
        <div
          className="mb-3 font-poppins text-xs font-bold uppercase tracking-[0.34em] text-brand-yellow/70"
          style={poppins}
        >
          {t('auctionGame.searchMode')}
        </div>

        {/* Lottie loader — the hero (swaps as bidders join) */}
        <div className="h-64 w-64">
          <DotLottieReact key={lottieSrc} src={lottieSrc} loop autoplay style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Status copy */}
        <AnimatePresence mode="wait">
          <motion.p
            key={status}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-1 text-center font-poppins text-lg font-black uppercase tracking-[0.12em] text-white"
            style={poppins}
          >
            {status}
          </motion.p>
        </AnimatePresence>

        {/* Elapsed search time (like ranked) */}
        <div
          className="mt-1.5 font-poppins text-xs font-bold tabular-nums tracking-[0.2em] text-white/40"
          style={poppins}
        >
          {formatElapsed(elapsed)}
        </div>

        {/* Seats — three equal slots; rivals fill in as they join (matches the
            countdown screen's sizing so the lineup doesn't resize on handoff). */}
        <div className="mt-6 flex items-start justify-center gap-3">
          {Array.from({ length: total }, (_, index) => {
            const slot = slots[index];
            return (
              <SeatFrame
                key={slot?.userId ?? `empty-${index}`}
                width={LINEUP_CARD_WIDTH}
                filled={Boolean(slot)}
                name={slot?.displayName ?? t('auctionGame.waitingBidder')}
                isSelf={slot?.isSelf}
                customization={slot?.isSelf ? selfAvatarCustomization : undefined}
                avatarSeed={slot?.isSelf ? selfAvatarSeed : undefined}
              />
            );
          })}
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-8 rounded-full bg-brand-yellow px-8 py-2.5 font-poppins text-sm font-black uppercase tracking-wide text-surface-deep shadow-lg transition hover:bg-brand-yellow/90"
            style={poppins}
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </div>
  );
}

/** Harness helper: cycles joined 1 → 2 → 3 on a loop. */
export function LottieSearchDemo({ src }: { src?: string }) {
  const [joined, setJoined] = useState(1);
  useEffect(() => {
    const t1 = setTimeout(() => setJoined(2), 3000);
    const t2 = setTimeout(() => setJoined(3), 6000);
    const loop = setInterval(() => {
      setJoined(1);
      setTimeout(() => setJoined(2), 3000);
      setTimeout(() => setJoined(3), 6000);
    }, 9000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(loop);
    };
  }, []);
  return (
    <LottieSearch
      joined={joined}
      total={3}
      players={DEMO_SEARCH_PLAYERS.slice(0, joined)}
      selfUserId="demo-self"
      selfDisplayName="Web Player"
      selfAvatarSeed="avatar-1"
      onCancel={() => {}}
      src={src}
    />
  );
}
