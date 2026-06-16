'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gavel, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
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
  POSITION_LABELS,
  getFilledCount,
  getMaxBid,
  getTotalTeamValue,
  needsPosition,
  getRemainingSlots,
  MIN_BID_INCREMENT,
  getFootballerPlaceholderImage,
  BID_COUNTDOWN_MS,
} from '../data';

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

function CountdownTimer({
  endsAt,
  totalMs = BID_COUNTDOWN_MS,
}: {
  endsAt: number;
  totalMs?: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
      const pct = Math.max(0, Math.min(1, (endsAt - now) / totalMs));
      setSecondsLeft(left);
      setProgress(pct);
    };
    update();
    const interval = setInterval(update, 50);
    return () => clearInterval(interval);
  }, [endsAt, totalMs]);

  const isUrgent = secondsLeft <= 3;
  const numColor =
    secondsLeft <= 2 ? '#FF4B4B' : secondsLeft <= 5 ? '#FF9600' : '#58CC02';
  const barColor =
    progress > 0.6 ? '#58CC02' : progress > 0.3 ? '#FF9600' : progress > 0.1 ? '#FF4B4B' : '#FF0000';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <motion.div
        animate={isUrgent ? { scale: [1, 1.1, 1] } : {}}
        transition={isUrgent ? { duration: 0.4, repeat: Infinity } : {}}
        className="flex h-[52px] w-[72px] items-center justify-center rounded-[14px]"
        style={{ backgroundColor: '#1CB0F6' }}
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={secondsLeft}
            initial={{ y: -20, scale: 1.5, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 460, damping: 17 }}
            className="text-2xl font-poppins font-black tabular-nums"
            style={{ color: numColor }}
          >
            {secondsLeft}
          </motion.span>
        </AnimatePresence>
      </motion.div>

      {/* Timer bar */}
      <div className="h-[4px] w-[72px] rounded-full bg-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>

      {/* Going once / twice */}
      <AnimatePresence>
        {secondsLeft <= 3 && secondsLeft > 0 && (
          <motion.div
            key={secondsLeft <= 2 ? 'twice' : 'once'}
            initial={{ opacity: 0, y: -6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-[9px] font-black uppercase tracking-wider"
            style={{
              ...poppins,
              color: secondsLeft <= 2 ? '#FF4B4B' : '#FF9600',
            }}
          >
            {secondsLeft <= 2 ? 'GOING TWICE' : 'GOING ONCE'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Outbid Flash Banner                                                */
/* ------------------------------------------------------------------ */

function OutbidBanner({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-8 py-3 rounded-[16px] border-2 border-brand-red/40"
          style={{
            background: 'linear-gradient(135deg, rgba(255,75,75,0.2), rgba(255,75,75,0.05))',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 30px rgba(255,75,75,0.3), 0 0 60px rgba(255,75,75,0.1)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <motion.span
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
              className="text-xl"
            >
              ⚠️
            </motion.span>
            <span
              className="text-lg font-black uppercase text-brand-red"
              style={poppins}
            >
              OUTBID!
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  SOLD! Flash                                                        */
/* ------------------------------------------------------------------ */

function SoldFlash({ visible }: { visible: boolean }) {
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
              SOLD!
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl mt-1"
            >
              🔨
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
}: {
  bids: { playerId: string; amount: number }[];
  players: AuctionPlayer[];
  humanPlayerId: string;
}) {
  const recentBids = bids.slice(-4);
  if (recentBids.length === 0) return null;

  return (
    <div className="w-full space-y-1">
      <AnimatePresence initial={false}>
        {recentBids.map((bid, i) => {
          const player = players.find((p) => p.id === bid.playerId);
          const isHuman = bid.playerId === humanPlayerId;
          const isLatest = i === recentBids.length - 1;

          return (
            <motion.div
              key={`${bid.playerId}-${bid.amount}`}
              initial={{ opacity: 0, x: -30, height: 0 }}
              animate={{ opacity: isLatest ? 1 : 0.5, x: 0, height: 'auto' }}
              exit={{ opacity: 0, x: 30, height: 0 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[10px] ${
                isLatest
                  ? isHuman
                    ? 'bg-brand-green/10 border border-brand-green/20'
                    : 'bg-brand-yellow/5 border border-brand-yellow/15'
                  : 'bg-white/[0.02]'
              }`}
            >
              <Gavel
                className="size-3 shrink-0"
                style={{ color: isHuman ? '#58CC02' : '#FFE500' }}
              />
              <span
                className="text-[11px] font-bold truncate"
                style={{
                  ...poppins,
                  color: isHuman ? '#58CC02' : 'rgba(255,255,255,0.6)',
                }}
              >
                {isHuman ? 'You' : player?.username}
              </span>
              <span
                className="ml-auto text-[11px] font-black tabular-nums"
                style={{
                  ...poppins,
                  color: isLatest ? '#FFE500' : 'rgba(255,255,255,0.4)',
                }}
              >
                {formatMoney(bid.amount)}
              </span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bidding War Badge                                                  */
/* ------------------------------------------------------------------ */

function BidWarBadge({ bidCount }: { bidCount: number }) {
  if (bidCount < 3) return null;

  const isHot = bidCount >= 5;
  const isFire = bidCount >= 8;

  return (
    <motion.div
      initial={{ scale: 0, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 12 }}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full"
      style={{
        background: isFire
          ? 'linear-gradient(135deg, #FF4B4B, #FF9600)'
          : isHot
            ? 'linear-gradient(135deg, #FF9600, #FFE500)'
            : 'rgba(255,229,0,0.15)',
        border: `1px solid ${isFire ? '#FF4B4B' : isHot ? '#FF9600' : '#FFE50040'}`,
      }}
    >
      <motion.span
        animate={isFire ? { scale: [1, 1.2, 1] } : {}}
        transition={isFire ? { duration: 0.5, repeat: Infinity } : {}}
        className="text-xs"
      >
        {isFire ? '🔥' : isHot ? '⚡' : '💰'}
      </motion.span>
      <span
        className="text-[9px] font-black uppercase"
        style={{
          ...poppins,
          color: isFire || isHot ? '#000' : '#FFE500',
        }}
      >
        {isFire ? 'BIDDING FRENZY' : isHot ? 'HOT AUCTION' : `${bidCount} BIDS`}
      </span>
    </motion.div>
  );
}

/* ================================================================== */
/*  FORMATION PITCH                                                    */
/* ================================================================== */

const PITCH_ROWS: { pos: PositionGroup; yPct: number }[] = [
  { pos: 'FWD', yPct: 12 },
  { pos: 'MID', yPct: 36 },
  { pos: 'DEF', yPct: 62 },
  { pos: 'GK', yPct: 86 },
];

function SquadPitch({
  player,
  formation,
  highlightId,
  size = 'md',
  activePosition,
}: {
  player: AuctionPlayer;
  formation: Formation;
  highlightId?: string;
  size?: 'sm' | 'md' | 'lg';
  activePosition?: PositionGroup;
}) {
  const circle = size === 'lg' ? 42 : size === 'md' ? 32 : 26;
  const nameFs = size === 'lg' ? 'text-[9px]' : size === 'md' ? 'text-[7px]' : 'text-[6px]';
  const centerCircle = size === 'lg' ? 44 : size === 'md' ? 32 : 24;
  const remaining = getRemainingSlots(player.team);

  return (
    <div
      className="relative rounded-[16px] overflow-hidden"
      style={{
        aspectRatio: '3/4',
        background: 'linear-gradient(180deg,#1a5c30 0%,#0e3d22 50%,#0a2e1a 100%)',
      }}
    >
      {/* Pitch markings */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[8%] right-[8%] top-[48%] h-px bg-white/[0.08]" />
        <div
          className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08]"
          style={{ width: centerCircle, height: centerCircle }}
        />
        <div className="absolute left-[20%] right-[20%] top-0 h-[16%] border-b border-l border-r border-white/[0.06] rounded-b-sm" />
        <div className="absolute left-[20%] right-[20%] bottom-0 h-[16%] border-t border-l border-r border-white/[0.06] rounded-t-sm" />
      </div>

      {PITCH_ROWS.map(({ pos, yPct }) => {
        const req = formation.required[pos];
        const filled = player.team.slots[pos];
        const needsMore = remaining[pos] > 0;
        const isActiveRow = activePosition === pos && needsMore;

        return (
          <div
            key={pos}
            className="absolute left-0 right-0 flex justify-center"
            style={{ top: `${yPct}%`, transform: 'translateY(-50%)' }}
          >
            <div
              className="flex items-start justify-center"
              style={{ gap: size === 'lg' ? 10 : size === 'md' ? 6 : 4, padding: '0 4px' }}
            >
              {Array.from({ length: req }).map((_, i) => {
                const f = filled[i];
                const isNew = f && highlightId === f.id;
                const isEmpty = !f;
                const isPulsing = isEmpty && isActiveRow;

                return (
                  <div key={i} className="flex flex-col items-center">
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
                            ? `2px solid ${POS_COLORS[pos]}`
                            : '2px solid rgba(255,255,255,0.3)'
                          : isPulsing
                            ? `1.5px dashed ${POS_COLORS[pos]}50`
                            : '1.5px dashed rgba(255,255,255,0.12)',
                        backgroundColor: f
                          ? 'rgba(255,255,255,0.1)'
                          : isPulsing
                            ? `${POS_COLORS[pos]}08`
                            : 'rgba(255,255,255,0.03)',
                        boxShadow: isNew
                          ? `0 0 14px ${POS_COLORS[pos]}60`
                          : f
                            ? '0 2px 6px rgba(0,0,0,0.3)'
                            : undefined,
                      }}
                    >
                      {f ? (
                        <PlayerPhoto footballer={f} size={circle - 4} />
                      ) : (
                        <span
                          className="font-black"
                          style={{
                            fontSize: circle * 0.28,
                            ...poppins,
                            color: isPulsing ? `${POS_COLORS[pos]}60` : 'rgba(255,255,255,0.15)',
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
                        className={`${nameFs} text-white/60 mt-0.5 text-center leading-tight font-semibold`}
                        style={{ maxWidth: circle + 16, ...poppins }}
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
      })}
    </div>
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
  const sorted = [
    ...state.players.filter((p) => p.id === humanPlayerId),
    ...state.players.filter((p) => p.id !== humanPlayerId),
  ];

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

        return (
          <motion.div
            key={player.id}
            layout
            className={`rounded-[16px] p-2 sm:p-3 transition-all ${
              isHighBidder
                ? 'border-2 border-brand-yellow/40 bg-brand-yellow/[0.06]'
                : isHuman
                  ? 'border-2 border-brand-yellow/20 bg-brand-yellow/[0.03]'
                  : 'border-2 border-white/[0.06] bg-white/[0.02]'
            } ${player.isEliminated ? 'opacity-40' : ''}`}
            animate={
              isHighBidder
                ? { boxShadow: '0 0 20px rgba(255,229,0,0.1)' }
                : { boxShadow: '0 0 0px rgba(255,229,0,0)' }
            }
          >
            {/* Header */}
            <div className="flex items-center gap-1.5 mb-2 px-0.5">
              <span className="text-xs">{isHuman ? '👤' : '🤖'}</span>
              <span
                className="text-[11px] sm:text-xs font-black text-white truncate flex-1 uppercase"
                style={poppins}
              >
                {player.username}
              </span>
              {isHuman && (
                <span className="rounded-full bg-brand-yellow px-1.5 py-px text-[7px] font-black text-surface-page uppercase">
                  YOU
                </span>
              )}
              {isHighBidder && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="rounded-full bg-brand-green/20 px-1.5 py-px text-[7px] font-black text-brand-green uppercase"
                  style={poppins}
                >
                  TOP
                </motion.span>
              )}
            </div>

            {/* Position need indicator */}
            {activePosition && needsActivePos && !player.isEliminated && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-1.5 flex items-center justify-center gap-1 rounded-[8px] py-1"
                style={{
                  backgroundColor: `${POS_COLORS[activePosition]}10`,
                  border: `1px solid ${POS_COLORS[activePosition]}25`,
                }}
              >
                <Zap className="size-2.5" style={{ color: POS_COLORS[activePosition] }} />
                <span
                  className="text-[7px] sm:text-[8px] font-black uppercase"
                  style={{ ...poppins, color: POS_COLORS[activePosition] }}
                >
                  Wants {activePosition}
                </span>
              </motion.div>
            )}

            {/* Pitch */}
            <SquadPitch
              player={player}
              formation={state.formation}
              highlightId={highlightId}
              size={pitchSize}
              activePosition={activePosition}
            />

            {/* Footer stats */}
            <div className="flex items-center justify-between mt-2 px-0.5">
              <div className="flex flex-col">
                <span
                  className="text-[9px] sm:text-[10px] text-brand-yellow tabular-nums font-bold"
                  style={{ ...poppins, textShadow: '0 1px 6px rgba(255,229,0,0.15)' }}
                >
                  {formatMoney(player.budget)}
                </span>
                <span className="text-[7px] sm:text-[8px] text-white/25 font-semibold uppercase" style={poppins}>
                  Budget
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span
                  className="text-[9px] sm:text-[10px] text-white/60 tabular-nums font-bold"
                  style={poppins}
                >
                  {formatMoney(value)}
                </span>
                <span className="text-[7px] sm:text-[8px] text-white/25 font-semibold uppercase" style={poppins}>
                  Value
                </span>
              </div>
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
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const presets = useMemo(() => {
    const options: { label: string; amount: number; variant: 'default' | 'hot' | 'max' }[] = [];

    options.push({ label: `MIN ${formatMoney(minBid)}`, amount: minBid, variant: 'default' });

    const smallRaise = minBid + 10_000_000;
    if (smallRaise <= maxBid && smallRaise !== minBid) {
      options.push({ label: '+$10M', amount: smallRaise, variant: 'default' });
    }

    const medRaise = minBid + 25_000_000;
    if (medRaise <= maxBid && options.length < 3) {
      options.push({ label: '+$25M', amount: medRaise, variant: 'hot' });
    }

    const bigRaise = minBid + 50_000_000;
    if (bigRaise <= maxBid && options.length < 4) {
      options.push({ label: '+$50M', amount: bigRaise, variant: 'hot' });
    }

    if (maxBid > minBid + 5_000_000) {
      options.push({ label: 'ALL IN', amount: maxBid, variant: 'max' });
    }

    return options;
  }, [minBid, maxBid]);

  const parsedCustom = Math.round(Number(customInput) * 1_000_000);
  const isCustomValid =
    !isNaN(parsedCustom) && parsedCustom >= minBid && parsedCustom <= maxBid;

  const handleCustomBid = () => {
    if (!isCustomValid) return;
    onBid(parsedCustom);
    setCustomInput('');
    setShowCustom(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-2.5"
    >
      {/* Preset buttons */}
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const budgetAfter = currentBudget - preset.amount;
          return (
            <motion.button
              key={preset.label}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => onBid(preset.amount)}
              className={`relative flex flex-col items-center justify-center rounded-[14px] py-3 px-2 transition-all active:translate-y-[1px] ${
                preset.variant === 'max'
                  ? 'bg-gradient-to-r from-brand-red/80 to-brand-red border-b-3 border-red-800 text-white'
                  : preset.variant === 'hot'
                    ? 'bg-gradient-to-r from-brand-orange/80 to-brand-orange border-b-3 border-orange-700 text-white'
                    : 'border-b-3 border-brand-green-deep bg-brand-green text-white'
              }`}
            >
              <span className="text-sm font-black uppercase" style={poppins}>
                {preset.label}
              </span>
              <span className="text-[9px] font-semibold opacity-70" style={poppins}>
                Left: {formatMoney(budgetAfter)}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Custom input toggle */}
      {!showCustom ? (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="w-full text-center text-[11px] font-semibold text-white/30 uppercase py-1 hover:text-white/50 transition-colors"
          style={poppins}
        >
          Custom amount
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-poppins text-sm font-bold text-white/30">
              $
            </span>
            <input
              type="number"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomBid();
              }}
              className="w-full rounded-[12px] border-2 border-white/10 bg-white/5 py-3 pl-8 pr-10 font-poppins text-sm font-semibold text-white tabular-nums outline-none focus:border-brand-yellow/40"
              placeholder={String(Math.round(minBid / 1_000_000))}
              autoFocus
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-poppins text-xs font-bold text-white/30">
              M
            </span>
          </div>
          <button
            type="button"
            onClick={handleCustomBid}
            disabled={!isCustomValid}
            className={`shrink-0 rounded-[12px] px-5 py-3 font-poppins text-sm font-semibold uppercase ${
              isCustomValid
                ? 'border-b-3 border-brand-green-deep bg-brand-green text-white'
                : 'bg-white/5 text-white/30 cursor-not-allowed'
            }`}
          >
            Bid
          </button>
        </motion.div>
      )}

      {/* Budget info */}
      <div className="flex justify-between text-[10px] text-white/30 px-1" style={poppins}>
        <span>Budget: {formatMoney(currentBudget)}</span>
        <span>Max bid: {formatMoney(maxBid)}</span>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  CONFETTI EFFECT                                                    */
/* ================================================================== */

function Confetti({ active, color }: { active: boolean; color: string }) {
  if (!active) return null;

  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: 40 + (i % 6) * 4 + (i > 11 ? 2 : 0),
    delay: (i % 8) * 0.06,
    duration: 1.2 + (i % 3) * 0.4,
    size: 4 + (i % 3) * 3,
    colors: ['#FFE500', '#58CC02', '#1CB0F6', '#FF4B4B', '#FF9600', color],
  }));

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            x: `${p.x}vw`,
            y: '45vh',
            opacity: 1,
            scale: 1,
            rotate: 0,
          }}
          animate={{
            x: `${p.x + (p.id % 2 === 0 ? 8 : -8)}vw`,
            y: '-10vh',
            opacity: 0,
            scale: 0.3,
            rotate: 360 + p.id * 45,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
          }}
          className="absolute rounded-sm"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor:
              p.colors[p.id % p.colors.length],
          }}
        />
      ))}
    </div>
  );
}

/* ================================================================== */
/*  DEAL QUALITY BADGE                                                 */
/* ================================================================== */

function DealBadge({ paid, value }: { paid: number; value: number }) {
  const ratio = paid / value;

  let label: string;
  let icon: React.ReactNode;
  let color: string;
  let bgColor: string;

  if (ratio < 0.7) {
    label = 'STEAL!';
    icon = <TrendingDown className="size-3.5" />;
    color = '#58CC02';
    bgColor = 'rgba(88,204,2,0.15)';
  } else if (ratio < 0.95) {
    label = 'BARGAIN';
    icon = <TrendingDown className="size-3.5" />;
    color = '#58CC02';
    bgColor = 'rgba(88,204,2,0.1)';
  } else if (ratio <= 1.15) {
    label = 'FAIR DEAL';
    icon = <Minus className="size-3.5" />;
    color = '#FFE500';
    bgColor = 'rgba(255,229,0,0.1)';
  } else if (ratio <= 1.4) {
    label = 'OVERPAID';
    icon = <TrendingUp className="size-3.5" />;
    color = '#FF9600';
    bgColor = 'rgba(255,150,0,0.1)';
  } else {
    label = 'ROBBERY!';
    icon = <TrendingUp className="size-3.5" />;
    color = '#FF4B4B';
    bgColor = 'rgba(255,75,75,0.15)';
  }

  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 12, delay: 0.2 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
      style={{ backgroundColor: bgColor, border: `1px solid ${color}30`, color }}
    >
      {icon}
      <span className="text-[11px] font-black uppercase" style={poppins}>
        {label}
      </span>
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
  const positions = state.formation.required;

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
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="text-5xl"
        >
          ⚽
        </motion.div>

        <div>
          <h2 className="font-poppins text-[2rem] font-black uppercase text-white sm:text-[2.5rem]">
            Formation
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex gap-5 sm:gap-8"
        >
          {(['GK', 'DEF', 'MID', 'FWD'] as PositionGroup[]).map((pos, i) => (
            <motion.div
              key={pos}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.15 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl font-poppins font-black text-white">
                {positions[pos]}
              </div>
              <div
                className="text-[11px] uppercase tracking-wider font-black"
                style={{ ...poppins, color: POS_COLORS[pos] }}
              >
                {pos}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="text-xs font-poppins font-semibold text-white/40 uppercase"
        >
          All players build with the same formation
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7 }}
          whileTap={{ scale: 0.97 }}
          onClick={onContinue}
          className="mt-4 flex h-[64px] w-56 items-center justify-center rounded-[20px] border-b-4 border-brand-green-deep bg-brand-green font-poppins text-xl font-semibold uppercase text-white transition-all active:translate-y-[2px]"
        >
          Start Auction
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

      {/* Outbid warning — visible when human has bid but is no longer leading */}
      <OutbidBanner
        visible={
          isBidding &&
          !!round &&
          round.bids.some((b) => b.playerId === humanPlayerId) &&
          round.highestBidderId !== humanPlayerId
        }
      />

      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto">
        {/* Top bar */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className="flex h-[38px] items-center justify-center rounded-[12px] px-4 font-poppins text-sm font-black uppercase text-black"
                style={{ backgroundColor: posColor }}
              >
                {POSITION_LABELS[round.positionGroup]}
              </div>
              <div className="flex h-[38px] items-center justify-center rounded-[12px] bg-brand-blue px-4 font-poppins text-sm font-semibold uppercase text-white">
                Round {state.roundIndex}
              </div>
              {isBidding && <BidWarBadge bidCount={round.bids.length} />}
            </div>

            {hasBids && round.countdownEndsAt && (
              <CountdownTimer endsAt={round.countdownEndsAt} />
            )}
          </div>
        </div>

        {/* Main area */}
        <div className="flex flex-col items-center gap-3 px-4 py-2 mx-auto w-full max-w-lg">
          {/* Mystery card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full rounded-[20px] border-2 border-white/10 bg-white/[0.03] p-4 sm:p-5"
            style={
              isCluePhase
                ? {
                    boxShadow: `0 0 40px ${posColor}08`,
                  }
                : undefined
            }
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <motion.div
                  animate={isCluePhase ? { rotate: [0, 10, -10, 0] } : {}}
                  transition={isCluePhase ? { duration: 2, repeat: Infinity } : {}}
                  className="text-xl"
                >
                  ❓
                </motion.div>
                <div className="font-poppins text-sm font-black uppercase text-white">
                  Mystery Player
                </div>
              </div>
              <div className="flex items-center gap-2">
                {competitorsNeedingPos > 0 && (
                  <div
                    className="rounded-[8px] px-2 py-1 font-poppins text-[9px] font-black uppercase"
                    style={{
                      backgroundColor: competitorsNeedingPos > 1 ? '#FF4B4B15' : '#FF960015',
                      color: competitorsNeedingPos > 1 ? '#FF4B4B' : '#FF9600',
                    }}
                  >
                    {competitorsNeedingPos} rival{competitorsNeedingPos > 1 ? 's' : ''} want this
                  </div>
                )}
                <div
                  className="rounded-[8px] px-2.5 py-1 font-poppins text-[10px] font-black uppercase"
                  style={{ backgroundColor: `${posColor}15`, color: posColor }}
                >
                  {formatMoney(round.startingPrice)}
                </div>
              </div>
            </div>

            {/* Clues */}
            <div className="space-y-2.5 min-h-[80px]">
              <AnimatePresence>
                {round.clues.slice(0, visibleClues).map((clue, i) => {
                  const isLatest = i === visibleClues - 1 && isCluePhase;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="flex gap-2.5"
                      style={
                        isLatest
                          ? {
                              background: `${posColor}08`,
                              borderRadius: 10,
                              padding: '5px 8px',
                              margin: '-5px -8px',
                            }
                          : undefined
                      }
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
                        className="mt-0.5 size-5 shrink-0 rounded-full flex items-center justify-center font-poppins text-[9px] font-black text-black"
                        style={{ backgroundColor: posColor }}
                      >
                        {i + 1}
                      </motion.div>
                      <p className="font-poppins text-[13px] font-semibold text-white/75 leading-snug">
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
                  <div className="size-4 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
                  <span className="font-poppins text-xs font-semibold text-white/30">
                    Revealing clue {visibleClues + 1} of {round.clues.length}...
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
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-poppins text-[10px] font-black uppercase text-white/40 mb-0.5">
                            Highest Bid
                          </div>
                          <motion.div
                            key={round.highestBid}
                            initial={{ scale: 1.15 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                            className="font-poppins text-2xl sm:text-3xl font-black text-brand-yellow tabular-nums"
                            style={{
                              textShadow: '0 2px 16px rgba(255,229,0,0.3)',
                            }}
                          >
                            {formatMoney(round.highestBid)}
                          </motion.div>
                          {highestBidder && (
                            <div className="font-poppins text-[11px] font-semibold text-white/40 mt-0.5">
                              by{' '}
                              <span
                                className="font-bold"
                                style={{
                                  color:
                                    highestBidder.id === humanPlayerId
                                      ? '#58CC02'
                                      : 'rgba(255,255,255,0.8)',
                                }}
                              >
                                {highestBidder.id === humanPlayerId
                                  ? 'You'
                                  : highestBidder.username}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Bid count */}
                        <div className="text-right">
                          <div className="font-poppins text-[9px] font-black uppercase text-white/25">
                            Total Bids
                          </div>
                          <div className="font-poppins text-lg font-black text-white/60 tabular-nums">
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
                          Bidding Open
                        </motion.div>
                        <div className="font-poppins text-2xl font-black text-white/60 tabular-nums mt-0.5">
                          {formatMoney(round.startingPrice)}
                        </div>
                        <div className="font-poppins text-[11px] font-semibold text-white/30 mt-0.5">
                          Place first bid to start the clock
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
              ) : isBidding ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full"
                >
                  <div
                    className={`rounded-[14px] px-5 py-3 text-center font-poppins text-sm font-semibold uppercase ${
                      humanPlayer.id === round.highestBidderId
                        ? 'border-2 border-brand-green/20 bg-brand-green/5 text-brand-green'
                        : 'border-2 border-white/5 bg-white/[0.03] text-white/40'
                    }`}
                  >
                    {humanPlayer.isEliminated
                      ? 'You are eliminated — watching'
                      : humanPlayer.id === round.highestBidderId
                        ? '✓ You are the highest bidder'
                        : positionFilled
                          ? `${round.positionGroup} filled — watching`
                          : 'Watching...'}
                  </div>
                </motion.div>
              ) : null}
            </>
          )}
        </div>

        {/* All squads */}
        <div className="px-4 pb-5 pt-2 mt-auto">
          <div className="font-poppins text-xs font-black uppercase tracking-wider text-white/30 mb-2.5">
            Squads
          </div>
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

      {/* Confetti on human win */}
      <Confetti active={isHumanWin && stage >= 2} color={posColor} />

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
                className="mt-4 flex items-center gap-3"
              >
                <div className="rounded-[14px] border-2 border-brand-yellow/20 bg-brand-yellow/5 px-5 py-2.5 text-center">
                  <div
                    className="text-[8px] font-black uppercase text-brand-yellow/50"
                    style={poppins}
                  >
                    True Value
                  </div>
                  <div
                    className="font-poppins text-xl font-black text-brand-yellow tabular-nums"
                    style={{ textShadow: '0 2px 12px rgba(255,229,0,0.2)' }}
                  >
                    {formatMoney(round.footballer.value)}
                  </div>
                </div>

                {winner && (
                  <div className="rounded-[14px] border-2 border-brand-green/20 bg-brand-green/5 px-5 py-2.5 text-center">
                    <div
                      className="text-[8px] font-black uppercase text-brand-green/50"
                      style={poppins}
                    >
                      Sold For
                    </div>
                    <div className="font-poppins text-xl font-black text-brand-green tabular-nums">
                      {formatMoney(round.winningBid)}
                    </div>
                  </div>
                )}

                {winner && (
                  <DealBadge paid={round.winningBid} value={round.footballer.value} />
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
                className="mt-3 flex items-center gap-2"
              >
                <Gavel className="size-4 text-brand-green" />
                <span className="font-poppins text-sm font-semibold text-white/80">
                  {round.footballer.name} joined{' '}
                  <span
                    className="font-black"
                    style={{ color: isHumanWin ? '#58CC02' : '#FFE500' }}
                  >
                    {isHumanWin ? 'your' : `${winner.username}'s`}
                  </span>{' '}
                  squad
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Human win celebration */}
          <AnimatePresence>
            {stage >= 4 && isHumanWin && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 12 }}
                className="mt-2 px-4 py-1.5 rounded-full bg-brand-green/15 border border-brand-green/30"
              >
                <span className="font-poppins text-xs font-black uppercase text-brand-green">
                  🎉 Nice signing!
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
              className="px-4 pb-3 mt-auto"
            >
              <div className="font-poppins text-xs font-black uppercase tracking-wider text-white/30 mb-2.5">
                All Squads
              </div>
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
                className="mx-auto flex h-[56px] w-full max-w-sm items-center justify-center rounded-[20px] border-b-4 border-brand-green-deep bg-brand-green font-poppins text-lg font-semibold uppercase text-white transition-all active:translate-y-[2px]"
              >
                Next Round
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
            {botPlayer?.username} is picking a{' '}
            {POSITION_LABELS[pick.positionGroup].toLowerCase()}...
          </div>
        </div>
      </div>
    );
  }

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
            'radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-5 w-full max-w-md">
        <div className="text-center">
          <div
            className="inline-block rounded-[12px] px-4 py-2 font-poppins text-xs font-black uppercase text-black mb-3"
            style={{ backgroundColor: posColor }}
          >
            Only you need a {POSITION_LABELS[pick.positionGroup]}
          </div>
          <h2 className="font-poppins text-2xl sm:text-3xl font-black uppercase text-white">
            Choose your player
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
            className="flex flex-col items-center gap-2.5 rounded-[20px] border-2 border-brand-green/20 bg-brand-green/5 p-4 sm:p-5 text-center transition-colors hover:bg-brand-green/10 active:translate-y-[2px]"
          >
            <PlayerPhoto footballer={pick.optionA.footballer} size={56} />
            <div className="font-poppins text-xs font-black text-brand-green uppercase">
              Known Player
            </div>
            <div className="font-poppins text-sm font-black text-white">
              {pick.optionA.footballer.name}
            </div>
            <div className="font-poppins text-[11px] font-semibold text-white/40">
              Value: {formatMoney(pick.optionA.footballer.value)}
            </div>
            <div
              className="font-poppins text-lg font-black text-brand-yellow"
              style={{ textShadow: '0 2px 8px rgba(255,229,0,0.15)' }}
            >
              {formatMoney(pick.optionA.footballer.startingPrice)}
            </div>
            <div className="font-poppins text-[10px] font-semibold text-white/30">
              {pick.optionA.footballer.nationality}
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
            className="flex flex-col items-center gap-2.5 rounded-[20px] border-2 border-purple-500/20 bg-purple-500/5 p-4 sm:p-5 text-center transition-colors hover:bg-purple-500/10 active:translate-y-[2px]"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="size-[56px] rounded-full bg-purple-500/10 flex items-center justify-center text-2xl"
            >
              ❓
            </motion.div>
            <div className="font-poppins text-xs font-black text-purple-400 uppercase">
              Mystery Player
            </div>
            <div className="space-y-1.5 mt-1">
              {pick.optionB.clues?.map((clue, i) => (
                <p
                  key={i}
                  className="font-poppins text-[11px] font-semibold text-white/50 leading-snug"
                >
                  {clue}
                </p>
              ))}
            </div>
            <div
              className="font-poppins text-lg font-black text-brand-yellow mt-auto"
              style={{ textShadow: '0 2px 8px rgba(255,229,0,0.15)' }}
            >
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
