'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown } from 'lucide-react';
import type {
  AuctionGameState,
  AuctionPlayer,
  Footballer,
  Formation,
  PositionGroup,
} from '../types';
import type { AuctionActions } from '../hooks/useAuctionGame';
import {
  formatMoney,
  getFilledCount,
  getMaxBid,
  getTotalTeamValue,
  needsPosition,
  getRemainingSlots,
  MIN_BID_INCREMENT,
  getFootballerPlaceholderImage,
  BID_COUNTDOWN_MS,
  createEmptyTeam,
} from '../data';
import { useLocale } from '@/contexts/LocaleContext';
import { CountryFlag } from '@/components/CountryFlag';
import { normalizeCountryCode } from '@/lib/geo/countryCode';
import type { MessageKey } from '@/lib/i18n/messages';

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

const POS_COLORS: Record<PositionGroup, string> = {
  GK: '#FFE500',
  DEF: '#1CB0F6',
  MID: '#58CC02',
  FWD: '#FF4B4B',
};

const POSITION_LABEL_KEYS: Record<PositionGroup, MessageKey> = {
  GK: 'auctionGame.positionGoalkeeper',
  DEF: 'auctionGame.positionDefender',
  MID: 'auctionGame.positionMidfielder',
  FWD: 'auctionGame.positionForward',
};

function usePositionLabel() {
  const { t } = useLocale();
  return (pos: PositionGroup) => t(POSITION_LABEL_KEYS[pos]);
}

/* ================================================================== */
/*  SHARED COMPONENTS                                                  */
/* ================================================================== */

function PlayerPhoto({
  footballer,
  size = 32,
  className = '',
}: {
  footballer: Footballer;
  size?: number;
  className?: string;
}) {
  const [err, setErr] = useState(false);
  const src = footballer.imageUrl || getFootballerPlaceholderImage(footballer.id);

  if (err) {
    const initials = footballer.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2);
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-white/10 text-white/50 font-bold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={footballer.name}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => setErr(true)}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Countdown + Timer Bar + Going/Going/Sold                           */
/* ------------------------------------------------------------------ */

// Countdown timer styled like the ranked match puck (cyan ring + blue fill +
// white number) but sized for the card corner, with a BLUE progress bar so it
// stays visible on the yellow card. `runKey` resets the bar when the clock
// re-arms (a new bid pushes `endsAt` forward).
function CountdownTimer({
  endsAt,
  totalMs = BID_COUNTDOWN_MS,
}: {
  endsAt: number;
  totalMs?: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    const update = () => {
      setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    };
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <div className="flex w-12 flex-col items-center gap-1.5">
      <motion.div
        key={secondsLeft}
        initial={{ y: -10, scale: 1.25, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 460, damping: 17 }}
        className="flex size-11 items-center justify-center rounded-full border-4 border-brand-cyan bg-brand-blue shadow-[0_0_18px_rgba(28,176,246,0.5)]"
      >
        <span className="font-poppins text-xl font-semibold leading-none tabular-nums text-white">
          {secondsLeft}
        </span>
      </motion.div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-black/15">
        <motion.div
          key={`bar-${endsAt}`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: totalMs / 1000, ease: 'linear' }}
          className="h-full rounded-full bg-brand-blue"
        />
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  SOLD! Flash                                                        */
/* ------------------------------------------------------------------ */

function SoldFlash({ visible }: { visible: boolean }) {
  const { t } = useLocale();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 2 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 12 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.6 }}
              className="text-6xl sm:text-8xl font-black uppercase"
              style={{
                ...poppins,
                color: '#FFE500',
                textShadow:
                  '0 4px 40px rgba(255,229,0,0.5), 0 0 80px rgba(255,229,0,0.2)',
              }}
            >
              {t('auctionGame.sold')}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Bid Activity Ticker                                                */
/* ------------------------------------------------------------------ */

function BidTicker({
  bids,
  players,
  humanPlayerId,
  outbid = false,
}: {
  bids: { playerId: string; amount: number }[];
  players: AuctionPlayer[];
  humanPlayerId: string;
  /** When true, an OUTBID! badge drops in tilted over the human's last bid row. */
  outbid?: boolean;
}) {
  const { t } = useLocale();
  const recentBids = bids.slice(-4);
  if (recentBids.length === 0) return null;
  // Index (within recentBids) of the human's most recent bid row.
  const humanRowIndex = recentBids.map((b) => b.playerId).lastIndexOf(humanPlayerId);

  return (
    <div className="w-full space-y-1">
      <AnimatePresence initial={false}>
        {recentBids.map((bid, i) => {
          const player = players.find((p) => p.id === bid.playerId);
          const isHuman = bid.playerId === humanPlayerId;
          const isLatest = i === recentBids.length - 1;
          const showOutbid = outbid && i === humanRowIndex;

          return (
            <div key={`${bid.playerId}-${bid.amount}`} className="relative">
              {/* OUTBID! badge — drops in + bounces, lands tilted on the human's row */}
              {showOutbid && (
                <motion.div
                  initial={{ y: -260, opacity: 0, rotate: -22, scale: 0.6 }}
                  animate={{
                    opacity: 1,
                    y: [-260, 14, -6, 3, 0],
                    rotate: [-22, 4, -3, 5, 4],
                    scale: [0.6, 1.12, 0.97, 1.02, 1],
                  }}
                  transition={{
                    y: { duration: 0.85, times: [0, 0.55, 0.74, 0.88, 1], ease: [0.4, 0, 0.7, 0.2] },
                    rotate: { duration: 0.85, times: [0, 0.55, 0.74, 0.88, 1], ease: 'easeOut' },
                    scale: { duration: 0.85, times: [0, 0.55, 0.74, 0.88, 1], ease: 'easeOut' },
                    opacity: { duration: 0.15 },
                  }}
                  style={{ transformOrigin: 'center' }}
                  className="pointer-events-none absolute -top-2.5 right-2 z-30 flex items-center gap-1 rounded-lg bg-brand-red px-2.5 py-1 font-poppins text-xs font-black uppercase tracking-wide text-white shadow-[0_4px_14px_rgba(255,75,75,0.55)]"
                >
                  <span>⚠️</span>
                  {t('auctionGame.outbid')}
                </motion.div>
              )}
            <motion.div
              initial={{ opacity: 0, x: -30, height: 0 }}
              animate={{ opacity: isLatest ? 1 : 0.6, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 30, height: 0 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              className={`flex items-center gap-2.5 rounded-[12px] border-2 px-3.5 py-2.5 ${
                isHuman
                  ? 'border-brand-green bg-brand-green/5'
                  : 'border-brand-red-deep bg-brand-red/5'
              } ${isLatest ? 'shadow-[0_0_14px_rgba(0,0,0,0.35)]' : ''}`}
            >
              {isHuman && (
                <span
                  className="shrink-0 rounded-md bg-brand-green px-2 py-0.5 text-[11px] font-black uppercase text-white"
                  style={poppins}
                >
                  {t('auctionGame.you')}
                </span>
              )}
              <span className="text-sm font-bold truncate text-white/85" style={poppins}>
                {isHuman ? '' : player?.username}
              </span>
              <span className="ml-auto text-base font-black tabular-nums text-white" style={poppins}>
                {formatMoney(bid.amount)}
              </span>
            </motion.div>
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== */
/*  FORMATION PITCH                                                    */
/* ================================================================== */

function SquadPitch({
  player,
  formation,
  highlightId,
  size = 'md',
  activePosition,
  showYouBadge,
  needGlow,
  isHuman,
}: {
  player: AuctionPlayer;
  formation: Formation;
  highlightId?: string;
  size?: 'sm' | 'md' | 'lg';
  activePosition?: PositionGroup;
  showYouBadge?: boolean;
  needGlow?: boolean;
  isHuman?: boolean;
}) {
  const { t } = useLocale();
  const circle = size === 'lg' ? 48 : size === 'md' ? 36 : 28;
  const nameFs = size === 'lg' ? 'text-[11px]' : size === 'md' ? 'text-[9px]' : 'text-[8px]';
  const remaining = getRemainingSlots(player.team);

  return (
    <motion.div
      className="relative overflow-hidden rounded-[12px]"
      style={{ aspectRatio: '4/5' }}
      animate={
        needGlow
          ? {
              boxShadow: isHuman
                ? '0 0 0 3px rgba(255,229,0,0.9), 0 0 18px rgba(255,229,0,0.35)'
                : '0 0 0 3px rgba(255,255,255,0.5), 0 0 14px rgba(255,255,255,0.18)',
            }
          : { boxShadow: '0 0 0 0px rgba(255,229,0,0)' }
      }
      transition={{ duration: 0.3 }}
    >
      {/* Real stadium turf — same asset as the ranked possession pitch. The
          source image is landscape (goal lines left/right); rotate it 90° so
          the goal areas sit at top & bottom, matching the vertical formation.
          The img's CSS width = container HEIGHT and CSS height = container WIDTH
          (because rotation swaps axes); object-fill stretches it edge-to-edge so
          both goal areas stay fully visible. */}
      <img
        src="/assets/stadium-green.webp"
        alt=""
        aria-hidden
        draggable={false}
        className="absolute left-1/2 top-1/2 h-[80%] w-[125%] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90 object-fill"
      />
      <div aria-hidden className="absolute inset-0 bg-black/15" />

      {/* "YOU" badge — top-right corner of the pitch */}
      {showYouBadge && (
        <span
          className="absolute right-2 top-2 z-30 rounded-full bg-brand-yellow px-3 py-1 text-sm font-black uppercase text-surface-page shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
          style={poppins}
        >
          {t('auctionGame.youBadge')}
        </span>
      )}

      {(() => {
        // Display rows top→bottom. y is spread evenly between the FWD band (top)
        // and the GK band (bottom) so multi-band formations (e.g. 4-2-3-1) sit
        // correctly. A per-position offset keeps slot indexing continuous when a
        // group spans two rows (MID 3 then MID 2).
        const rows = formation.rows;
        const TOP = 19;
        const BOTTOM = 93;
        const step = rows.length > 1 ? (BOTTOM - TOP) / (rows.length - 1) : 0;
        const posOffset: Record<PositionGroup, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
        return rows.map((row, rowIdx) => {
          const { pos, count } = row;
          const yPct = TOP + step * rowIdx;
          const startIndex = posOffset[pos];
          posOffset[pos] += count;
          const filled = player.team.slots[pos];
          const needsMore = remaining[pos] > 0;
          const isActiveRow = activePosition === pos && needsMore;

          return (
            <div
              key={`${pos}-${rowIdx}`}
              className="absolute left-0 right-0 flex justify-center"
              style={{ top: `${yPct}%`, transform: 'translateY(-50%)' }}
            >
              <div
                className="flex items-start justify-center"
                style={{ gap: size === 'lg' ? 10 : size === 'md' ? 6 : 4, padding: '0 4px' }}
              >
                {Array.from({ length: count }).map((_, slot) => {
                  const i = startIndex + slot;
                  const f = filled[i];
                  const isNew = f && highlightId === f.id;
                  const isEmpty = !f;
                  const isPulsing = isEmpty && isActiveRow;

                return (
                  <div key={`${rowIdx}-${slot}`} className={`flex items-center gap-0.5 ${pos === 'GK' ? 'flex-col-reverse' : 'flex-col'}`}>
                    <motion.div
                      initial={isNew ? { scale: 0, rotate: -180 } : false}
                      animate={
                        isNew
                          ? { scale: 1, rotate: 0 }
                          : isPulsing
                            ? { boxShadow: [`0 0 0px ${POS_COLORS[pos]}00`, `0 0 12px ${POS_COLORS[pos]}60`, `0 0 0px ${POS_COLORS[pos]}00`] }
                            : {}
                      }
                      transition={
                        isNew
                          ? { type: 'spring', stiffness: 260, damping: 14 }
                          : isPulsing
                            ? { duration: 1.5, repeat: Infinity }
                            : undefined
                      }
                      className="rounded-full flex items-center justify-center overflow-hidden"
                      style={{
                        width: circle,
                        height: circle,
                        border: f
                          ? isNew
                            ? `2.5px solid ${POS_COLORS[pos]}`
                            : '2.5px solid rgba(255,255,255,0.55)'
                          : isPulsing
                            ? `2px dashed ${POS_COLORS[pos]}`
                            : '2px dashed rgba(255,255,255,0.45)',
                        backgroundColor: f
                          ? 'rgba(0,0,0,0.35)'
                          : isPulsing
                            ? `${POS_COLORS[pos]}22`
                            : 'rgba(0,0,0,0.35)',
                        boxShadow: isNew
                          ? `0 0 14px ${POS_COLORS[pos]}60`
                          : '0 2px 6px rgba(0,0,0,0.45)',
                      }}
                    >
                      {f ? (
                        <PlayerPhoto footballer={f} size={circle - 4} />
                      ) : (
                        <span
                          className="font-black"
                          style={{
                            fontSize: circle * 0.3,
                            ...poppins,
                            color: isPulsing ? POS_COLORS[pos] : 'rgba(255,255,255,0.7)',
                          }}
                        >
                          {pos}
                        </span>
                      )}
                    </motion.div>
                    {f && (
                      <motion.span
                        initial={isNew ? { opacity: 0, y: 4 } : false}
                        animate={isNew ? { opacity: 1, y: 0 } : {}}
                        transition={isNew ? { delay: 0.3 } : undefined}
                        className={`${nameFs} text-white/90 text-center leading-tight font-semibold`}
                        style={{ maxWidth: circle + 16, ...poppins, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                      >
                        {f.name.split(' ').pop()}
                      </motion.span>
                    )}
                  </div>
                );
                })}
              </div>
            </div>
          );
        });
      })()}
    </motion.div>
  );
}

/* ================================================================== */
/*  ALL SQUADS                                                         */
/* ================================================================== */

function AllSquads({
  state,
  humanPlayerId,
  highlightId,
  pitchSize = 'md',
  activePosition,
}: {
  state: AuctionGameState;
  humanPlayerId: string;
  highlightId?: string;
  pitchSize?: 'sm' | 'md' | 'lg';
  activePosition?: PositionGroup;
}) {
  const { t } = useLocale();
  // Keep YOU in the center column: split the others around the human.
  const human = state.players.filter((p) => p.id === humanPlayerId);
  const others = state.players.filter((p) => p.id !== humanPlayerId);
  const leftCount = Math.floor(others.length / 2);
  const sorted = [...others.slice(0, leftCount), ...human, ...others.slice(leftCount)];

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {sorted.map((player) => {
        const isHuman = player.id === humanPlayerId;
        const value = getTotalTeamValue(player.team);
        const filled = getFilledCount(player.team);
        const isHighBidder =
          state.currentRound?.highestBidderId === player.id;
        const needsActivePos = activePosition
          ? needsPosition(player, activePosition)
          : false;
        // Squads still chasing the player being auctioned glow — yellow for YOU,
        // neutral white for opponents — so you can see who you're up against.
        const showNeedGlow = !!activePosition && needsActivePos && !player.isEliminated;

        return (
          <motion.div
            key={player.id}
            layout
            className={`p-1 transition-all ${player.isEliminated ? 'opacity-40' : ''}`}
          >
            {/* Header — centered name + (high-bidder badge) over the column */}
            <div className="flex items-center justify-center gap-1.5 mb-1.5 px-0.5">
              <span
                className="max-w-full truncate text-center text-sm sm:text-base font-black text-white uppercase"
                style={poppins}
              >
                {player.username}
              </span>
              {isHighBidder && (
                <motion.span
                  key="crown"
                  initial={{ scale: 0, rotate: -30, y: -6 }}
                  animate={{ scale: 1, rotate: 0, y: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 14 }}
                  className="shrink-0"
                  title="Leading bid"
                >
                  <Crown className="size-4 text-brand-yellow" fill="currentColor" />
                </motion.span>
              )}
            </div>

            {/* Budget + value — centered above the pitch, no background */}
            <div className="mb-2 flex items-center justify-center gap-4">
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] sm:text-[11px] text-white/55 font-semibold uppercase" style={poppins}>
                  {t('auctionGame.budgetLabel')}
                </span>
                <span
                  className="text-sm sm:text-base text-brand-yellow tabular-nums font-black"
                  style={{ ...poppins, textShadow: '0 1px 6px rgba(255,229,0,0.2)' }}
                >
                  {formatMoney(player.budget)}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] sm:text-[11px] text-white/55 font-semibold uppercase" style={poppins}>
                  {t('auctionGame.valueLabel')}
                </span>
                <span
                  className="text-sm sm:text-base text-white tabular-nums font-black"
                  style={poppins}
                >
                  {formatMoney(value)}
                </span>
              </div>
            </div>

            {/* Pitch — full column width (no card box) so the stadium reads large. */}
            <div className="mx-auto w-full max-w-[320px]">
              <SquadPitch
                player={player}
                formation={state.formation}
                highlightId={highlightId}
                size={pitchSize}
                activePosition={activePosition}
                showYouBadge={isHuman}
                needGlow={showNeedGlow}
                isHuman={isHuman}
              />
            </div>

            {/* Progress dots */}
            <div className="flex gap-[3px] mt-1.5 justify-center">
              {Array.from({ length: 11 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-[5px] w-[5px] sm:h-1.5 sm:w-1.5 rounded-full transition-colors ${
                    i < filled ? 'bg-brand-green' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ================================================================== */
/*  QUICK BID PANEL                                                    */
/* ================================================================== */

function QuickBidPanel({
  minBid,
  maxBid,
  currentBudget,
  onBid,
}: {
  minBid: number;
  maxBid: number;
  currentBudget: number;
  onBid: (amount: number) => void;
}) {
  const { t } = useLocale();
  const [customInput, setCustomInput] = useState('');

  const presets = useMemo(() => {
    const options: { label: string; amount: number; variant: 'default' | 'hot' | 'max' }[] = [];

    options.push({ label: t('auctionGame.minBid', { amount: formatMoney(minBid) }), amount: minBid, variant: 'default' });

    const smallRaise = minBid + 10_000_000;
    if (smallRaise <= maxBid && smallRaise !== minBid) {
      options.push({ label: t('auctionGame.bidPlus10M'), amount: smallRaise, variant: 'default' });
    }

    const medRaise = minBid + 25_000_000;
    if (medRaise <= maxBid && options.length < 3) {
      options.push({ label: t('auctionGame.bidPlus25M'), amount: medRaise, variant: 'hot' });
    }

    const bigRaise = minBid + 50_000_000;
    if (bigRaise <= maxBid && options.length < 4) {
      options.push({ label: t('auctionGame.bidPlus50M'), amount: bigRaise, variant: 'hot' });
    }

    if (maxBid > minBid + 5_000_000) {
      options.push({ label: t('auctionGame.allIn'), amount: maxBid, variant: 'max' });
    }

    return options;
  }, [minBid, maxBid, t]);

  const parsedCustom = Math.round(Number(customInput) * 1_000_000);
  const isCustomValid =
    !isNaN(parsedCustom) && parsedCustom >= minBid && parsedCustom <= maxBid;

  const handleCustomBid = () => {
    if (!isCustomValid) return;
    onBid(parsedCustom);
    setCustomInput('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-2.5"
    >
      {/* Preset buttons + custom-amount cell (sits in the grid, right of ALL IN) */}
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const budgetAfter = currentBudget - preset.amount;
          return (
            <motion.button
              key={preset.label}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onBid(preset.amount)}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-[14px] px-2 py-3.5 text-white shadow-none transition-colors ${
                preset.variant === 'max'
                  ? 'bg-brand-red hover:bg-brand-red/90'
                  : preset.variant === 'hot'
                    ? 'bg-brand-orange hover:bg-brand-orange/90'
                    : 'bg-brand-green hover:bg-brand-green/90'
              }`}
            >
              <span className="text-sm font-black uppercase leading-none" style={poppins}>
                {preset.label}
              </span>
              <span className="text-[11px] font-semibold leading-none text-white/85" style={poppins}>
                {t('auctionGame.leftAmount', { amount: formatMoney(budgetAfter) })}
              </span>
            </motion.button>
          );
        })}

        {/* Custom amount — input + Bid, occupies the grid cell next to ALL IN */}
        <div className="flex items-stretch gap-1.5 rounded-[14px] border-2 border-white/10 bg-white/5 p-1.5">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-poppins text-sm font-bold text-white/40">
              $
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomBid();
              }}
              className="h-full w-full rounded-[9px] bg-transparent pl-6 pr-6 font-poppins text-sm font-semibold text-white tabular-nums outline-none placeholder:text-white/30"
              placeholder={String(Math.round(minBid / 1_000_000))}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-poppins text-[11px] font-bold text-white/40">
              M
            </span>
          </div>
          <button
            type="button"
            onClick={handleCustomBid}
            disabled={!isCustomValid}
            className={`shrink-0 rounded-[9px] px-3 font-poppins text-xs font-bold uppercase shadow-none transition-colors ${
              isCustomValid
                ? 'bg-brand-green text-white hover:bg-brand-green/90'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            {t('auctionGame.bid')}
          </button>
        </div>
      </div>

      {/* Budget info */}
      <div className="flex justify-between text-xs sm:text-sm font-semibold text-white/70 px-1" style={poppins}>
        <span>{t('auctionGame.budgetAmount', { amount: formatMoney(currentBudget) })}</span>
        <span>{t('auctionGame.maxBidAmount', { amount: formatMoney(maxBid) })}</span>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  MONEY FX — branded cash on a win (burst or fountain, random)       */
/* ================================================================== */

// Branded banknote — same look as the daily-challenge Money Drop DollarBill.
function CashBill({ size = 1 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-sm border border-brand-green-deep bg-gradient-to-br from-brand-green-light to-brand-green shadow-sm"
      style={{ width: 40 * size, height: 24 * size }}
    >
      <span className="font-bold text-white" style={{ fontSize: 13 * size }}>$</span>
    </div>
  );
}

function MoneyFx({ active, variant }: { active: boolean; variant: 'burst' | 'fountain' }) {
  if (!active) return null;

  if (variant === 'fountain') {
    // Bills shoot up from the bottom, arc, and fall back.
    const parts = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: 50 + ((i % 9) - 4) * 7,
      peak: 30 + (i % 5) * 10,
      dur: 1.7 + (i % 3) * 0.3,
      delay: (i % 6) * 0.05,
      rot: (i % 2 ? 1 : -1) * 180,
      size: 0.8 + (i % 3) * 0.2,
    }));
    return (
      <div className="fixed inset-0 z-[90] pointer-events-none overflow-hidden">
        {parts.map((p) => (
          <motion.div
            key={p.id}
            initial={{ left: `${p.x}%`, top: '105%', opacity: 0 }}
            animate={{ top: ['105%', `${p.peak}%`, '110%'], opacity: [0, 1, 1, 0], rotate: p.rot }}
            transition={{ duration: p.dur, delay: p.delay, ease: 'easeOut' }}
            className="absolute"
          >
            <CashBill size={p.size} />
          </motion.div>
        ))}
      </div>
    );
  }

  // burst — bills explode outward from the center, then fall.
  const parts = Array.from({ length: 20 }, (_, i) => {
    const a = (i / 20) * Math.PI * 2;
    return {
      id: i,
      dx: Math.cos(a) * (130 + (i % 4) * 30),
      dy: Math.sin(a) * (95 + (i % 4) * 25),
      rot: i * 30,
      dur: 1.3 + (i % 3) * 0.25,
      size: 0.85 + (i % 3) * 0.18,
    };
  });
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none overflow-hidden">
      {parts.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
          animate={{ x: p.dx, y: [0, p.dy, p.dy + 170], opacity: [0, 1, 1, 0], scale: 1, rotate: p.rot }}
          transition={{ duration: p.dur, ease: 'easeOut' }}
          className="absolute"
        >
          <CashBill size={p.size} />
        </motion.div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  DEAL BADGE — STEAL / OVERPAID etc., drops in tilted on the price    */
/* ================================================================== */

function DealBadge({ paid, value }: { paid: number; value: number }) {
  const { t } = useLocale();
  const ratio = value > 0 ? paid / value : 1;

  let label: string;
  let bg: string;
  if (ratio < 0.7) {
    label = t('auctionGame.steal');
    bg = '#1645FF'; // brand blue
  } else if (ratio < 0.95) {
    label = t('auctionGame.bargain');
    bg = '#58CC02';
  } else if (ratio <= 1.15) {
    label = t('auctionGame.fairDeal');
    bg = '#FF9600'; // orange
  } else if (ratio <= 1.4) {
    label = t('auctionGame.overpaid');
    bg = '#FF6C0A';
  } else {
    label = t('auctionGame.robbery');
    bg = '#FF4B4B'; // red
  }

  return (
    <motion.div
      initial={{ y: -220, opacity: 0, rotate: -24, scale: 0.55 }}
      animate={{
        opacity: 1,
        y: [-220, 14, -6, 3, 0],
        rotate: [-24, 5, -4, 6, 5],
        scale: [0.55, 1.12, 0.96, 1.03, 1],
      }}
      transition={{
        y: { duration: 0.9, times: [0, 0.55, 0.74, 0.88, 1], ease: [0.4, 0, 0.7, 0.2] },
        rotate: { duration: 0.9, times: [0, 0.55, 0.74, 0.88, 1], ease: 'easeOut' },
        scale: { duration: 0.9, times: [0, 0.55, 0.74, 0.88, 1], ease: 'easeOut' },
        opacity: { duration: 0.15 },
      }}
      style={{ transformOrigin: 'center', backgroundColor: bg }}
      className="pointer-events-none absolute -top-3 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-lg px-3 py-1 font-poppins text-xs font-black uppercase tracking-wide text-white shadow-[0_4px_14px_rgba(0,0,0,0.5)]"
    >
      {label}
    </motion.div>
  );
}

/* ================================================================== */
/*  FORMATION REVEAL                                                   */
/* ================================================================== */

function FormationReveal({
  state,
  onContinue,
}: {
  state: AuctionGameState;
  onContinue: () => void;
}) {
  const { t } = useLocale();
  // An empty squad in the chosen formation — renders the real pitch with all
  // position slots laid out, so players see the actual layout they'll fill.
  const emptyPlayer: AuctionPlayer = {
    id: 'formation-preview',
    username: '',
    avatarSeed: '',
    budget: 0,
    team: createEmptyTeam(state.formation),
    isBot: false,
    isEliminated: false,
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page-alt p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%), radial-gradient(circle at bottom left, rgba(88,204,2,0.06), transparent 28%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="relative z-10 flex flex-col items-center gap-6 text-center"
      >
        <motion.img
          src="/assets/brand/goal-ball-small.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
          width={56}
          height={56}
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="block size-14 object-contain"
        />

        <div>
          <h2 className="font-poppins text-[2rem] font-black uppercase text-white sm:text-[2.5rem]">
            {t('auctionGame.formation')}
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-2 font-poppins text-[3.5rem] font-black text-brand-yellow sm:text-[4.5rem]"
            style={{ textShadow: '0 2px 16px rgba(255,229,0,0.25)' }}
          >
            {state.formation.name}
          </motion.div>
        </div>

        {/* Actual pitch with the formation laid out (reuses the in-game SquadPitch) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="w-[200px] sm:w-[240px]"
        >
          <SquadPitch player={emptyPlayer} formation={state.formation} size="md" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="text-xs font-poppins font-semibold text-white/40 uppercase"
        >
          {t('auctionGame.allPlayersSameFormation')}
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7 }}
          whileTap={{ scale: 0.97 }}
          onClick={onContinue}
          className="mt-4 flex h-14 w-56 items-center justify-center rounded-[20px] bg-brand-green font-poppins text-lg font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none"
        >
          {t('auctionGame.startAuction')}
        </motion.button>
      </motion.div>
    </div>
  );
}

/* ================================================================== */
/*  BIDDING SCREEN                                                     */
/* ================================================================== */

function BiddingScreen({
  state,
  actions,
  humanPlayerId,
}: {
  state: AuctionGameState;
  actions: AuctionActions;
  humanPlayerId: string;
}) {
  const { t } = useLocale();
  const posLabel = usePositionLabel();
  const round = state.currentRound;
  const humanPlayer = state.players.find((p) => p.id === humanPlayerId);

  const isCluePhase = state.phase === 'clue-reveal';
  const isBidding = state.phase === 'bidding';
  const visibleClues = round
    ? isCluePhase
      ? round.clueRevealIndex
      : round.clues.length
    : 0;
  const allCluesRevealed = round ? visibleClues >= round.clues.length : false;
  const hasBids = round ? round.highestBid > 0 : false;

  const minBid = round
    ? round.highestBid > 0
      ? round.highestBid + MIN_BID_INCREMENT
      : round.startingPrice
    : 0;

  if (!round || !humanPlayer) return null;

  const canBid =
    isBidding &&
    needsPosition(humanPlayer, round.positionGroup) &&
    !humanPlayer.isEliminated &&
    humanPlayer.id !== round.highestBidderId;

  const maxBid = getMaxBid(humanPlayer);
  const posColor = POS_COLORS[round.positionGroup];
  const positionFilled = !needsPosition(humanPlayer, round.positionGroup);

  const highestBidder = round.highestBidderId
    ? state.players.find((p) => p.id === round.highestBidderId)
    : null;

  const competitorsNeedingPos = state.players.filter(
    (p) =>
      p.id !== humanPlayerId &&
      !p.isEliminated &&
      needsPosition(p, round.positionGroup),
  ).length;

  // Human has bid this round but is no longer the top bidder → OUTBID.
  const humanOutbid =
    isBidding &&
    round.bids.some((b) => b.playerId === humanPlayerId) &&
    round.highestBidderId !== humanPlayerId;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface-page-alt">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at top center, rgba(28,176,246,0.06), transparent 32%), radial-gradient(circle at bottom right, rgba(88,204,2,0.04), transparent 28%)',
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto">
        {/* Main area */}
        <div className="flex flex-col items-center gap-3 px-4 pt-4 pb-2 mx-auto w-full max-w-lg">
          {/* Mystery card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative w-full rounded-[20px] bg-brand-yellow p-4 sm:p-5 pb-12"
            style={
              isCluePhase
                ? {
                    boxShadow: `0 0 40px ${posColor}08`,
                  }
                : undefined
            }
          >
            {/* Starting price — bottom-right corner */}
            <div className="absolute bottom-3 right-4 rounded-[10px] bg-black px-3.5 py-1.5 font-poppins text-lg font-black uppercase tabular-nums text-brand-yellow">
              {formatMoney(round.startingPrice)}
            </div>

            {/* "Rivals want this" — tilted ribbon badge, top-left, outside the card.
                Drops in from above + overshoots + bounces, like the ranked
                special-question label (live-special/shared.tsx). */}
            {competitorsNeedingPos > 0 && (
              <motion.div
                initial={{ y: -600, opacity: 0, rotate: -28, scale: 0.55 }}
                animate={{
                  opacity: 1,
                  y: [-600, 30, -12, 6, -2, 0],
                  rotate: [-28, -2, -10, -4, -7, -6],
                  scale: [0.55, 1.1, 0.94, 1.04, 0.99, 1],
                }}
                transition={{
                  y: { duration: 1.0, times: [0, 0.55, 0.7, 0.82, 0.92, 1], ease: [0.4, 0, 0.7, 0.2] },
                  rotate: { duration: 1.0, times: [0, 0.55, 0.7, 0.82, 0.92, 1], ease: 'easeOut' },
                  scale: { duration: 1.0, times: [0, 0.55, 0.7, 0.82, 0.92, 1], ease: 'easeOut' },
                  opacity: { duration: 0.2, ease: 'easeOut' },
                }}
                style={{ transformOrigin: 'center' }}
                className="absolute -left-2 -top-3.5 z-20 rounded-lg bg-brand-orange px-3.5 py-1.5 font-poppins text-xs font-black uppercase tracking-wide text-white shadow-[0_3px_10px_rgba(0,0,0,0.45)]"
              >
                {competitorsNeedingPos > 1
                  ? t('auctionGame.rivalsWantThisPlural', { count: competitorsNeedingPos })
                  : t('auctionGame.rivalsWantThis', { count: competitorsNeedingPos })}
              </motion.div>
            )}

            {/* Countdown — absolutely pinned to the card's top-right corner */}
            {isBidding && round.countdownEndsAt && (
              <div className="absolute right-3 top-3 z-20">
                <CountdownTimer endsAt={round.countdownEndsAt} />
              </div>
            )}

            {/* Position + round chips — head the question card */}
            <div className="mb-3 flex items-center gap-2 pr-16">
              <div className="flex h-7 items-center justify-center rounded-[10px] bg-black px-3 font-poppins text-xs font-black uppercase text-brand-yellow">
                {posLabel(round.positionGroup)}
              </div>
              <div className="flex h-7 items-center justify-center rounded-[10px] bg-brand-blue px-3 font-poppins text-xs font-semibold uppercase text-white">
                {t('auctionGame.round', { round: state.roundIndex })}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <motion.div
                animate={isCluePhase ? { rotate: [0, 10, -10, 0] } : {}}
                transition={isCluePhase ? { duration: 2, repeat: Infinity } : {}}
                className="text-xl"
              >
                ❓
              </motion.div>
              <div className="font-poppins text-sm font-black uppercase text-black">
                {t('auctionGame.mysteryPlayer')}
              </div>
            </div>

            {/* Clues */}
            <div className="space-y-2.5 min-h-[80px]">
              <AnimatePresence>
                {round.clues.slice(0, visibleClues).map((clue, i) => {
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="flex items-center gap-2.5"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: 'spring',
                          stiffness: 400,
                          damping: 12,
                          delay: 0.1,
                        }}
                        className="size-5 shrink-0 rounded-full flex items-center justify-center bg-black font-poppins text-[10px] font-black text-brand-yellow leading-none"
                      >
                        {i + 1}
                      </motion.div>
                      <p className="font-poppins text-[13px] font-semibold text-black/80 leading-tight">
                        {clue}
                      </p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {isCluePhase && !allCluesRevealed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 pt-1"
                >
                  <div className="size-4 rounded-full border-2 border-black/15 border-t-black/50 animate-spin" />
                  <span className="font-poppins text-xs font-semibold text-black/55">
                    {t('auctionGame.revealingClue', { current: visibleClues + 1, total: round.clues.length })}
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Bidding controls */}
          {allCluesRevealed && (
            <>
              {/* Current bid display */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full rounded-[16px] border-2 border-white/10 bg-white/[0.03] p-4"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={round.highestBid}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {hasBids ? (
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-poppins text-[11px] font-black uppercase text-white/70 mb-1">
                            {t('auctionGame.highestBid')}
                          </div>
                          <motion.div
                            key={round.highestBid}
                            initial={{ scale: 1.15 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="font-poppins text-3xl sm:text-4xl font-black text-brand-yellow tabular-nums leading-none"
                            style={{
                              textShadow: '0 2px 16px rgba(255,229,0,0.3)',
                            }}
                          >
                            {formatMoney(round.highestBid)}
                          </motion.div>
                          {highestBidder && (
                            <div className="font-poppins text-xs font-semibold text-white/70 mt-1.5">
                              {highestBidder.id === humanPlayerId
                                ? t('auctionGame.yourBid')
                                : t('auctionGame.bidBy', { name: highestBidder.username })}
                            </div>
                          )}
                        </div>

                        {/* Bid count — top-aligned with the Highest Bid label */}
                        <div className="text-right">
                          <div className="font-poppins text-[11px] font-black uppercase text-white/70 mb-1">
                            {t('auctionGame.totalBids')}
                          </div>
                          <div className="font-poppins text-3xl sm:text-4xl font-black text-white tabular-nums leading-none">
                            {round.bids.length}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-1">
                        <motion.div
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="font-poppins text-sm font-black uppercase text-brand-green"
                        >
                          {t('auctionGame.biddingOpen')}
                        </motion.div>
                        <div className="font-poppins text-2xl font-black text-white/60 tabular-nums mt-0.5">
                          {formatMoney(round.startingPrice)}
                        </div>
                        <div className="font-poppins text-[11px] font-semibold text-white/30 mt-0.5">
                          {t('auctionGame.placeFirstBidToStartClock')}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {/* Bid activity ticker */}
              {round.bids.length > 0 && (
                <BidTicker
                  bids={round.bids}
                  players={state.players}
                  humanPlayerId={humanPlayerId}
                  outbid={humanOutbid}
                />
              )}

              {/* Bid input or status */}
              {canBid ? (
                <QuickBidPanel
                  key={minBid}
                  minBid={minBid}
                  maxBid={maxBid}
                  currentBudget={humanPlayer.budget}
                  onBid={actions.placeBid}
                />
              ) : isBidding && humanPlayer.id !== round.highestBidderId ? (
                // Watching states only (eliminated / position filled / watching).
                // No pill when you're already leading — the yellow bid bar shows that.
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full"
                >
                  <div className="rounded-[14px] border-2 border-white/5 bg-white/[0.03] px-5 py-3 text-center font-poppins text-sm font-semibold uppercase text-white/45">
                    {humanPlayer.isEliminated
                      ? t('auctionGame.eliminatedWatching')
                      : positionFilled
                        ? t('auctionGame.positionFilledWatching', { position: posLabel(round.positionGroup) })
                        : t('auctionGame.watching')}
                  </div>
                </motion.div>
              ) : null}
            </>
          )}
        </div>

        {/* All squads — sits directly below the bidding controls (no bottom-pin gap) */}
        <div className="px-4 pb-5 pt-1">
          <AllSquads
            state={state}
            humanPlayerId={humanPlayerId}
            pitchSize="md"
            activePosition={round.positionGroup}
          />
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  REVEAL SCREEN — staged dramatic reveal                             */
/* ================================================================== */

function RevealScreen({
  state,
  actions,
  humanPlayerId,
}: {
  state: AuctionGameState;
  actions: AuctionActions;
  humanPlayerId: string;
}) {
  const { t } = useLocale();
  const round = state.currentRound;
  const [stage, setStage] = useState(0);
  const [showSold, setShowSold] = useState(true);

  useEffect(() => {
    const timers = [
      setTimeout(() => setShowSold(false), 1200),
      setTimeout(() => setStage(1), 800),
      setTimeout(() => setStage(2), 1400),
      setTimeout(() => setStage(3), 2000),
      setTimeout(() => setStage(4), 2600),
      setTimeout(() => setStage(5), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!round) return null;

  const winner = state.players.find((p) => p.id === round.winnerId);
  const posColor = POS_COLORS[round.positionGroup];
  const isHumanWin = round.winnerId === humanPlayerId;
  // Randomly alternate the win cash-FX (burst / fountain), stable per reveal.
  const moneyFxVariant: 'burst' | 'fountain' =
    round.footballer.id.length % 2 === 0 ? 'burst' : 'fountain';

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface-page-alt">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: isHumanWin
            ? 'radial-gradient(circle at top center, rgba(88,204,2,0.1), transparent 40%), radial-gradient(circle at bottom, rgba(255,229,0,0.06), transparent 30%)'
            : 'radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%)',
        }}
      />

      {/* SOLD! flash */}
      <SoldFlash visible={showSold && round.highestBid > 0} />

      {/* Cash FX on human win (burst or fountain, alternating) */}
      <MoneyFx active={isHumanWin && stage >= 2} variant={moneyFxVariant} />

      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto">
        {/* Player reveal */}
        <div className="flex flex-col items-center px-4 pt-6 pb-3">
          {/* Photo — stage 1 */}
          <AnimatePresence>
            {stage >= 1 && (
              <motion.div
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                className="rounded-full border-4 overflow-hidden mb-3"
                style={{
                  borderColor: posColor,
                  boxShadow: `0 4px 30px ${posColor}40, 0 0 60px ${posColor}15`,
                }}
              >
                <PlayerPhoto footballer={round.footballer} size={100} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Name — stage 2 */}
          <AnimatePresence>
            {stage >= 2 && (
              <motion.h2
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="font-poppins text-[1.8rem] sm:text-[2.2rem] font-black uppercase text-white text-center leading-tight"
              >
                {round.footballer.name}
              </motion.h2>
            )}
          </AnimatePresence>

          {/* Position + nationality — stage 2 */}
          <AnimatePresence>
            {stage >= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-1.5 flex items-center gap-2"
              >
                <span
                  className="rounded-[8px] px-2.5 py-1 font-poppins text-[10px] font-black uppercase text-black"
                  style={{ backgroundColor: posColor }}
                >
                  {round.positionGroup}
                </span>
                <span className="font-poppins text-sm font-semibold text-white/50">
                  {round.footballer.nationality}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Value + Sold For cards — stage 3 */}
          <AnimatePresence>
            {stage >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="mt-4 flex items-stretch gap-3"
              >
                <div className="rounded-[16px] bg-brand-yellow px-6 py-3 text-center shadow-[0_4px_16px_rgba(255,229,0,0.25)]">
                  <div className="text-[10px] font-black uppercase text-black/60" style={poppins}>
                    {t('auctionGame.trueValue')}
                  </div>
                  <div className="font-poppins text-2xl font-black text-black tabular-nums leading-tight">
                    {formatMoney(round.footballer.value)}
                  </div>
                </div>

                {winner && (
                  <div className="relative rounded-[16px] bg-brand-green px-6 py-3 text-center shadow-[0_4px_16px_rgba(56,182,14,0.25)]">
                    {/* Deal-quality badge drops in tilted on the sold price */}
                    {stage >= 4 && (
                      <DealBadge paid={round.winningBid} value={round.footballer.value} />
                    )}
                    <div className="text-[10px] font-black uppercase text-white/70" style={poppins}>
                      {t('auctionGame.soldFor')}
                    </div>
                    <div className="font-poppins text-2xl font-black text-white tabular-nums leading-tight">
                      {formatMoney(round.winningBid)}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Assignment message — stage 4 */}
          <AnimatePresence>
            {stage >= 4 && winner && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="mt-4"
              >
                <span className="font-poppins text-sm font-semibold text-white/80">
                  {isHumanWin
                    ? t('auctionGame.joinedYourSquad', { name: round.footballer.name })
                    : t('auctionGame.joinedSquad', { name: round.footballer.name, owner: winner.username })}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* All squads — stage 5 */}
        <AnimatePresence>
          {stage >= 5 && (
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 150, damping: 18 }}
              className="px-4 pb-3 pt-1"
            >
              <AllSquads
                state={state}
                humanPlayerId={humanPlayerId}
                highlightId={round.footballer.id}
                pitchSize="md"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next round button — stage 5 */}
        <AnimatePresence>
          {stage >= 5 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="px-4 pb-6"
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={actions.confirmReveal}
                className="mx-auto flex h-14 w-full max-w-sm items-center justify-center rounded-[20px] bg-brand-green font-poppins text-lg font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none"
              >
                {t('auctionGame.nextRound')}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  SOLO PICK SCREEN                                                   */
/* ================================================================== */

function SoloPickScreen({
  state,
  actions,
  humanPlayerId,
}: {
  state: AuctionGameState;
  actions: AuctionActions;
  humanPlayerId: string;
}) {
  const { t } = useLocale();
  const posLabel = usePositionLabel();
  const pick = state.soloPick;
  const isHumanPicking = pick ? pick.playerId === humanPlayerId : true;

  useEffect(() => {
    if (!pick || isHumanPicking) return;
    const timer = setTimeout(() => {
      actions.pickSoloOption(Math.random() > 0.5 ? 'A' : 'B');
    }, 1500);
    return () => clearTimeout(timer);
  }, [pick, isHumanPicking, actions]);

  if (!pick) return null;

  const posColor = POS_COLORS[pick.positionGroup];

  if (!isHumanPicking) {
    const botPlayer = state.players.find((p) => p.id === pick.playerId);
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface-page-alt p-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
        />
        <div className="relative z-10 text-center">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-4xl mb-3"
          >
            🤖
          </motion.div>
          <div className="font-poppins text-base font-semibold text-white/50">
            {t('auctionGame.botPicking', {
              name: botPlayer?.username ?? '',
              position: posLabel(pick.positionGroup).toLowerCase(),
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-surface-page-alt p-4 pt-[12vh] sm:pt-[14vh]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-2xl">
        <div className="text-center">
          <div
            className="inline-block rounded-[12px] px-4 py-2 font-poppins text-xs font-black uppercase text-black mb-3"
            style={{ backgroundColor: posColor }}
          >
            {t('auctionGame.onlyYouNeedPosition', { position: posLabel(pick.positionGroup) })}
          </div>
          <h2 className="font-poppins text-2xl sm:text-3xl font-black uppercase text-white">
            {t('auctionGame.chooseYourPlayer')}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full">
          {/* Option A — Revealed */}
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => actions.pickSoloOption('A')}
            className="flex flex-col items-center gap-3 rounded-[22px] bg-brand-green p-6 sm:p-8 text-center transition-transform hover:brightness-105 active:translate-y-[2px]"
          >
            <PlayerPhoto footballer={pick.optionA.footballer} size={80} />
            <div className="font-poppins text-sm font-black uppercase text-black/70">
              {t('auctionGame.knownPlayer')}
            </div>
            <div className="font-poppins text-lg font-black text-white">
              {pick.optionA.footballer.name}
            </div>
            <div className="font-poppins text-sm font-bold text-black/70">
              {t('auctionGame.valueAmount', { amount: formatMoney(pick.optionA.footballer.value) })}
            </div>
            <div className="rounded-[10px] bg-black/85 px-4 py-1.5 font-poppins text-2xl font-black text-brand-yellow">
              {formatMoney(pick.optionA.footballer.startingPrice)}
            </div>
            <div className="flex items-center gap-2">
              {normalizeCountryCode(pick.optionA.footballer.nationality) && (
                <span
                  className="block overflow-hidden rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                  style={{ width: 24, height: 16 }}
                >
                  <CountryFlag
                    code={pick.optionA.footballer.nationality}
                    className="!block !h-full !w-full"
                    style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
                  />
                </span>
              )}
              <span className="font-poppins text-sm font-bold uppercase text-black/70">
                {pick.optionA.footballer.nationality}
              </span>
            </div>
          </motion.button>

          {/* Option B — Mystery */}
          <motion.button
            type="button"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => actions.pickSoloOption('B')}
            className="flex flex-col items-center gap-3 rounded-[22px] p-6 sm:p-8 text-center transition-transform hover:brightness-110 active:translate-y-[2px]"
            style={{ backgroundColor: '#6B2FB3' }}
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="size-20 rounded-full bg-white/15 flex items-center justify-center text-4xl"
            >
              ❓
            </motion.div>
            <div className="font-poppins text-sm font-black text-white/80 uppercase">
              {t('auctionGame.mysteryPlayer')}
            </div>
            <div className="space-y-2 mt-1">
              {pick.optionB.clues?.map((clue, i) => (
                <p
                  key={i}
                  className="font-poppins text-xs font-semibold text-white/85 leading-snug"
                >
                  {clue}
                </p>
              ))}
            </div>
            <div className="mt-auto rounded-[10px] bg-black/85 px-4 py-1.5 font-poppins text-2xl font-black text-brand-yellow">
              {formatMoney(pick.optionB.footballer.startingPrice)}
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  MAIN ROUTER                                                        */
/* ================================================================== */

export function AuctionGameScreen({
  state,
  actions,
  humanPlayerId,
}: {
  state: AuctionGameState;
  actions: AuctionActions;
  humanPlayerId: string;
}) {
  if (state.phase === 'formation') {
    return (
      <FormationReveal
        state={state}
        onContinue={() => actions.setPhase('bidding')}
      />
    );
  }

  if (state.phase === 'clue-reveal' || state.phase === 'bidding') {
    return (
      <BiddingScreen
        state={state}
        actions={actions}
        humanPlayerId={humanPlayerId}
      />
    );
  }

  if (state.phase === 'reveal') {
    return (
      <RevealScreen
        state={state}
        actions={actions}
        humanPlayerId={humanPlayerId}
      />
    );
  }

  if (state.phase === 'solo-pick') {
    return (
      <SoloPickScreen
        state={state}
        actions={actions}
        humanPlayerId={humanPlayerId}
      />
    );
  }

  return null;
}
