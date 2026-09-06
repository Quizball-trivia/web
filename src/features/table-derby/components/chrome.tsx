'use client';

/** Table Derby in-round HUD, mirroring the broadcast graphics:
 *  score pill, category lower-third, player boards with hearts. */

import { AnimatePresence, motion } from 'motion/react';
import { PERF_DOTS, TD_DISPLAY, XGlyph } from './brand';

/* ── Table stage: the match happens ON the show's orange table, with the
      opponent seated across (far side, wall behind them). ───────────── */

export function TableStage({
  opponentName,
  opponentExtra,
  children,
}: {
  opponentName: string;
  opponentExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col">
      {/* far side: the wall + the opponent's seat */}
      <div className="flex flex-col items-center justify-end gap-2 pb-3 pt-12" style={{ minHeight: 'clamp(100px, 15dvh, 170px)' }}>
        <div
          className="rounded-[8px] px-4 py-1.5"
          style={{ background: 'var(--td-paper)', boxShadow: '3px 3px 0 rgba(0,0,0,0.55)', transform: 'rotate(-1.5deg)' }}
        >
          <span className="text-sm md:text-base" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
            {opponentName}
          </span>
        </div>
        {opponentExtra}
      </div>
      {/* the table itself */}
      <div className="relative flex flex-1 flex-col">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: 'var(--td-orange)', clipPath: 'polygon(6% 0, 94% 0, 102% 102%, -2% 102%)' }}
        >
          <div className="absolute inset-0" style={PERF_DOTS} />
          {/* far-edge shading gives the plane its depth */}
          <div className="absolute inset-x-0 top-0 h-24" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)' }} />
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-5 pt-5 md:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Score pill (top): white end numerals = rounds won,
      orange slash center = in-round score ─────────────────────── */

export function ScorePill({
  roundsMe,
  roundsOp,
  inRoundMe,
  inRoundOp,
  sep = '-',
}: {
  roundsMe: number;
  roundsOp: number;
  inRoundMe: number;
  inRoundOp: number;
  /** ":" for rounds whose scores can go negative. */
  sep?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <XGlyph size={10} color="rgba(255,255,255,0.35)" />
      <div
        className="flex items-stretch overflow-hidden rounded-[8px]"
        style={{ background: '#0d0d0d', boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}
      >
        <span className="flex w-9 items-center justify-center text-xl text-white md:w-11 md:text-2xl" style={TD_DISPLAY}>
          {roundsMe}
        </span>
        <div
          className="flex items-center px-2.5"
          style={{ background: 'var(--td-orange)', clipPath: 'polygon(18% 0, 100% 0, 82% 100%, 0 100%)' }}
        >
          <span className="text-[12px] tabular-nums md:text-sm" style={{ ...TD_DISPLAY, color: '#0d0d0d' }}>
            {inRoundMe}
            {sep}
            {inRoundOp}
          </span>
        </div>
        <span className="flex w-9 items-center justify-center text-xl text-white md:w-11 md:text-2xl" style={TD_DISPLAY}>
          {roundsOp}
        </span>
      </div>
      <XGlyph size={10} color="rgba(255,255,255,0.35)" />
    </div>
  );
}

/* ── Category lower-third band ──────────────────────────────────── */

export function CategoryBand({ prompt, compact = false }: { prompt: string; compact?: boolean }) {
  return (
    <div
      className={`relative flex w-full items-center gap-3 overflow-hidden rounded-[12px] ${compact ? 'px-3 py-2.5' : 'px-4 py-5'}`}
      style={{
        background: 'var(--td-charcoal)',
        boxShadow: '4px 5px 0 rgba(0,0,0,0.5)',
      }}
    >
      {/* subtle tone-on-tone texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1.4px)',
          backgroundSize: '10px 10px',
        }}
      />
      <div
        className={`flex shrink-0 items-center justify-center ${compact ? 'size-9 rounded-[10px]' : 'size-14 rounded-[14px]'}`}
        style={{ background: 'var(--td-orange)', transform: 'rotate(-3deg)', boxShadow: '3px 3px 0 rgba(0,0,0,0.45)' }}
      >
        <span style={{ ...TD_DISPLAY, color: '#0d0d0d', fontSize: compact ? 20 : 30 }}>?</span>
      </div>
      <p
        className="relative text-white"
        style={{ ...TD_DISPLAY, fontSize: compact ? 'clamp(13px, 1.5vw, 17px)' : 'clamp(16px, 2.6vw, 24px)', lineHeight: 1.15 }}
      >
        {prompt}
      </p>
    </div>
  );
}

/* ── Hearts (lives) ─────────────────────────────────────────────── */

function Heart({ alive }: { alive: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 24 22"
      className="h-4 w-4 md:h-6 md:w-6"
      animate={alive ? { scale: 1, opacity: 1 } : { scale: [1.25, 0.9, 1], opacity: 0.28 }}
      transition={{ duration: 0.4 }}
      aria-hidden
    >
      <path
        d="M12 21 3.3 12.6A6 6 0 0 1 2 6a5.6 5.6 0 0 1 10-2.4A5.6 5.6 0 0 1 22 6a6 6 0 0 1-1.3 6.6L12 21Z"
        fill={alive ? 'var(--td-white)' : '#000'}
        stroke={alive ? 'none' : 'rgba(255,255,255,0.35)'}
        strokeWidth={alive ? 0 : 1.5}
      />
    </motion.svg>
  );
}

/* ── Player board: answers panel + orange tab (count + hearts) + name ── */

export function PlayerBoard({
  name,
  side,
  lives,
  count,
  answers,
  active,
  thinking,
  compact = false,
}: {
  name: string;
  side: 'left' | 'right';
  lives: number;
  count: number;
  answers: string[];
  active: boolean;
  thinking?: string;
  /** Facing layout: the opponent's board at the far edge is short. */
  compact?: boolean;
}) {
  const mirror = side === 'right';
  const lastAnswers = answers.slice(compact ? -2 : -4);
  return (
    <div
      className={`flex min-w-0 flex-1 items-stretch gap-1.5 ${compact ? 'h-[120px] md:h-[136px]' : 'h-[min(240px,26dvh)] md:h-[280px]'} ${mirror ? 'flex-row-reverse' : ''}`}
    >
      {/* answers panel */}
      <div
        className="relative min-w-0 flex-1 rounded-[10px] px-3 pb-8 pt-2"
        style={{
          background: 'var(--td-charcoal)',
          boxShadow: '4px 5px 0 rgba(0,0,0,0.5)',
          outline: active ? '2px solid var(--td-orange)' : '2px solid transparent',
          transition: 'outline-color 0.25s',
        }}
      >
        <div className="flex h-full flex-col justify-end gap-0.5">
          <AnimatePresence initial={false}>
            {lastAnswers.map((a) => (
              <motion.p
                key={a}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`truncate border-b py-1 text-[11px] text-white md:py-1.5 md:text-base ${mirror ? 'text-right' : ''}`}
                style={{ ...TD_DISPLAY, borderColor: 'var(--td-line)' }}
              >
                {a}
              </motion.p>
            ))}
          </AnimatePresence>
          {/* empty ruled lines to keep the board feeling like the show's */}
          {Array.from({ length: Math.max(0, (compact ? 1 : 3) - lastAnswers.length) }).map((_, i) => (
            <div key={i} className="border-b py-1 text-[11px] md:text-sm" style={{ borderColor: 'var(--td-line)' }}>
              &nbsp;
            </div>
          ))}
        </div>
        {/* name plate */}
        <div className={`absolute bottom-1.5 flex items-center gap-1 ${mirror ? 'right-2.5 flex-row-reverse' : 'left-2.5'}`}>
          <svg viewBox="0 0 24 40" width="8" height="13" fill="var(--td-orange)" aria-hidden>
            <path d="M14 0 0 22h8L6 40 24 15h-9L21 0h-7Z" />
          </svg>
          <span className="truncate text-[11px] md:text-[13px]" style={{ ...TD_DISPLAY, color: 'var(--td-orange)' }}>
            {name}
          </span>
        </div>
        {/* opponent "thinking" hint */}
        {thinking && (
          <span
            className={`absolute top-1.5 text-[9px] text-white/50 md:text-[11px] ${mirror ? 'left-2.5' : 'right-2.5'}`}
            style={TD_DISPLAY}
          >
            {thinking}
          </span>
        )}
      </div>
      {/* orange tab: count + hearts */}
      <div
        className="flex w-10 shrink-0 flex-col items-center gap-1.5 self-start rounded-[10px] px-1 pb-2.5 md:w-14 md:gap-2 md:pb-3"
        style={{ background: 'var(--td-orange)', boxShadow: '4px 5px 0 rgba(0,0,0,0.5)' }}
      >
        <motion.span
          key={count}
          initial={{ scale: 1.4 }}
          animate={{ scale: 1 }}
          className="pt-1 text-2xl md:text-4xl"
          style={{ ...TD_DISPLAY, color: '#0d0d0d' }}
        >
          {count}
        </motion.span>
        <div className="flex flex-col items-center gap-1 pb-0.5">
          {[0, 1, 2].map((i) => (
            <Heart key={i} alive={i < lives} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Turn timer bar (10s) ───────────────────────────────────────── */

export function TurnTimerBar({
  turnKey,
  ms,
  running,
  onTable = false,
}: {
  turnKey: string;
  ms: number;
  running: boolean;
  /** Dark bar for placement on the orange table surface. */
  onTable?: boolean;
}) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: onTable ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.12)' }}
    >
      <motion.div
        key={turnKey}
        initial={{ width: '100%' }}
        animate={{ width: running ? '0%' : '100%' }}
        transition={{ duration: running ? ms / 1000 : 0, ease: 'linear' }}
        className="h-full rounded-full"
        style={{ background: onTable ? '#0d0d0d' : 'var(--td-orange)' }}
      />
    </div>
  );
}
