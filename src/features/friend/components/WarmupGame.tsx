'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSocket } from '@/lib/realtime/socket-client';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { useWarmupPhysics } from '../hooks/useWarmupPhysics';

const CONTAINER_HEIGHT = 340;
const GROUND_Y = CONTAINER_HEIGHT - 20;
const BALL_SIZE = 64;

export function WarmupGame() {
  const warmup = useRealtimeMatchStore((s) => s.warmup);
  const selfUserId = useRealtimeMatchStore((s) => s.selfUserId);
  const containerRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLDivElement>(null);
  const tapSeqRef = useRef(0);
  const [containerWidth, setContainerWidth] = useState(360);
  const [, forceRender] = useState(0);

  const isMyTurn = warmup?.nextTurnUserId === selfUserId;
  const isActive = warmup?.active ?? false;
  const isGameOver = warmup?.gameOver ?? false;
  // Pre-game: warmup exists but hasn't started yet — either player can tap to begin
  const isWaitingToStart = Boolean(warmup && !isActive && !isGameOver);
  const canTap = (isMyTurn && isActive && !isGameOver) || isWaitingToStart;

  const onDropped = useCallback(() => {
    const socket = getSocket();
    socket.emit('warmup:dropped', { clientTs: Date.now(), y: GROUND_Y });
  }, []);

  const physics = useWarmupPhysics({
    containerWidth,
    containerHeight: CONTAINER_HEIGHT,
    groundY: GROUND_Y,
    active: isActive && !isGameOver,
    onDropped,
  });

  // Fetch scores on mount
  useEffect(() => {
    const socket = getSocket();
    socket.emit('warmup:get_scores');
  }, []);

  // Measure container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Apply kick when tapped event comes from server
  const lastBounceCountRef = useRef(0);
  useEffect(() => {
    if (!warmup) return;
    if (warmup.bounceCount > lastBounceCountRef.current && warmup.lastTapX !== null && warmup.lastTapY !== null) {
      physics.applyKick(warmup.lastTapX, warmup.lastTapY);
    }
    lastBounceCountRef.current = warmup.bounceCount;
  }, [warmup, warmup?.bounceCount, warmup?.lastTapX, warmup?.lastTapY, physics]);

  // Reset ball on restart
  const prevGameOverRef = useRef(false);
  useEffect(() => {
    if (prevGameOverRef.current && !isGameOver && isActive) {
      physics.resetBall();
    }
    prevGameOverRef.current = isGameOver;
  }, [isGameOver, isActive, physics]);

  // Animation frame for smooth rendering
  useEffect(() => {
    if (!isActive || isGameOver) return;
    let frame: number;
    const tick = () => {
      forceRender((v) => v + 1);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isActive, isGameOver]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!canTap) return;
      const rect = ballRef.current?.getBoundingClientRect();
      if (!rect) return;
      const tapX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const tapY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      tapSeqRef.current += 1;
      getSocket().emit('warmup:tap', { tapX, tapY, tapSeq: tapSeqRef.current });
    },
    [canTap]
  );

  const handleRestart = useCallback(() => {
    tapSeqRef.current = 0;
    getSocket().emit('warmup:restart');
  }, []);

  const bounceCount = warmup?.bounceCount ?? 0;
  const playerBest = warmup?.playerBest ?? 0;
  const pairBest = warmup?.pairBest ?? 0;

  return (
    <div className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b-[3px] border-[#0D1B21] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#9917;</span>
          <h2 className="text-base font-black text-white uppercase tracking-wide">Warm-Up</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#131F24] rounded-xl px-3 py-1.5 border-b-[3px] border-[#0D1B21]">
            <Trophy className="size-3.5 text-[#FF9600]" />
            <span className="text-xs font-black text-[#FF9600]">{playerBest}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#131F24] rounded-xl px-3 py-1.5 border-b-[3px] border-[#0D1B21]">
            <Users className="size-3.5 text-[#CE82FF]" />
            <span className="text-xs font-black text-[#CE82FF]">{pairBest}</span>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ height: CONTAINER_HEIGHT }}
      >
        {/* Bounce Counter */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={bounceCount}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-10"
          >
            <div className="bg-[#131F24] rounded-2xl border-b-4 border-[#0D1B21] px-6 py-2 min-w-[64px] text-center">
              <span className={cn(
                'text-3xl font-black tabular-nums',
                bounceCount > 0 ? 'text-[#58CC02]' : 'text-[#56707A]'
              )}>
                {bounceCount}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Ball */}
        <div
          ref={ballRef}
          onPointerDown={handlePointerDown}
          className={cn(
            'absolute z-20 touch-none flex items-center justify-center',
            canTap ? 'cursor-pointer' : 'cursor-default'
          )}
          style={{
            width: BALL_SIZE,
            height: BALL_SIZE,
            left: physics.ballX - BALL_SIZE / 2,
            top: physics.ballY - BALL_SIZE / 2,
            transform: `rotate(${physics.ballRotation}deg)`,
            fontSize: BALL_SIZE * 0.75,
            lineHeight: 1,
            filter: canTap
              ? 'drop-shadow(0 0 12px rgba(88,204,2,0.5)) drop-shadow(0 0 24px rgba(88,204,2,0.2))'
              : 'none',
            transition: 'filter 0.15s',
          }}
        >
          &#9917;
        </div>

        {/* Ground Line */}
        <div
          className="absolute left-4 right-4 border-t-[3px] border-dashed border-[#243B44]"
          style={{ top: GROUND_Y }}
        />

        {/* Turn Indicator */}
        {!isGameOver && (
          <div className="absolute bottom-6 left-0 right-0 text-center">
            <span className={cn(
              'text-sm font-black uppercase tracking-wide',
              canTap ? 'text-[#58CC02]' : 'text-[#56707A]'
            )}>
              {isWaitingToStart
                ? 'Tap the ball to start!'
                : isMyTurn
                  ? 'Your turn! Tap the ball!'
                  : "Opponent's turn..."}
            </span>
          </div>
        )}

        {/* Game Over Overlay */}
        <AnimatePresence>
          {isGameOver && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 flex items-center justify-center bg-[#131F24]/80 z-30"
            >
              <div className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] p-6 text-center space-y-3 mx-4 max-w-xs w-full">
                <h3 className="text-lg font-black text-white uppercase tracking-wide">
                  Game Over
                </h3>
                <div className="bg-[#131F24] rounded-xl border-b-[3px] border-[#0D1B21] py-3 px-4">
                  <span className="text-3xl font-black text-[#1CB0F6] tabular-nums">
                    {warmup?.finalScore ?? 0}
                  </span>
                  <span className="text-sm font-bold text-[#56707A] ml-2">bounces</span>
                </div>

                {/* New Best Indicators */}
                {warmup?.isNewPlayerBest && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="bg-[#FF9600]/20 rounded-xl py-2 px-3 border border-[#FF9600]/30"
                  >
                    <span className="text-sm font-black text-[#FF9600] uppercase tracking-wide">
                      &#127942; New Personal Best!
                    </span>
                  </motion.div>
                )}
                {warmup?.isNewPairBest && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.35 }}
                    className="bg-[#CE82FF]/20 rounded-xl py-2 px-3 border border-[#CE82FF]/30"
                  >
                    <span className="text-sm font-black text-[#CE82FF] uppercase tracking-wide">
                      &#127881; New Duo Best!
                    </span>
                  </motion.div>
                )}

                <button
                  onClick={handleRestart}
                  className="w-full py-3 rounded-2xl bg-[#58CC02] border-b-4 border-[#46A302] text-sm font-black text-white uppercase tracking-wide hover:bg-[#4CB801] active:translate-y-[2px] active:border-b-2 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="size-4" />
                  Play Again
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
