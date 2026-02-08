'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWarmupPhysics } from '../hooks/useWarmupPhysics';

const CONTAINER_HEIGHT = 340;
const GROUND_Y = CONTAINER_HEIGHT - 20;
const BALL_SIZE = 64;
const KICK_COOLDOWN = 400;
const AI_DELAY_MIN = 100;
const AI_DELAY_MAX = 300;
const AI_KICK_ZONE_TOP = CONTAINER_HEIGHT * 0.35;
const AI_KICK_ZONE_BOTTOM = GROUND_Y - BALL_SIZE;
const HIT_PADDING = 12;

export function WarmupGameLocal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(360);
  const [, forceRender] = useState(0);
  const [bounceCount, setBounceCount] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');

  const turnRef = useRef<'player' | 'ai'>('player');
  const cooldownRef = useRef(0);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bounceCountRef = useRef(0);
  // Track cursor position so we can detect collision even when mouse is stationary
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  // Track previous ball Y to determine if ball is falling
  const prevBallYRef = useRef(0);
  const isActiveRef = useRef(false);
  const isGameOverRef = useRef(false);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
  useEffect(() => {
    isGameOverRef.current = isGameOver;
  }, [isGameOver]);

  const onDropped = useCallback(() => {
    setIsGameOver(true);
    setIsActive(false);
    setBestScore((prev) => Math.max(prev, bounceCountRef.current));
  }, []);

  const physics = useWarmupPhysics({
    containerWidth,
    containerHeight: CONTAINER_HEIGHT,
    groundY: GROUND_Y,
    active: isActive && !isGameOver,
    onDropped,
  });

  // Stable refs for physics functions
  const applyKickRef = useRef(physics.applyKick);
  const resetBallRef = useRef(physics.resetBall);
  // Stable ref for the physics object (getters read from internal refs so any captured reference works)
  const physicsRef = useRef(physics);
  useEffect(() => {
    applyKickRef.current = physics.applyKick;
    resetBallRef.current = physics.resetBall;
    physicsRef.current = physics;
  }, [physics]);

  // Measure container width via callback ref
  const measureRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Helper: attempt a player kick at the current cursor position
  const tryPlayerKick = useCallback(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    if (turnRef.current !== 'player') return;
    if (Date.now() - cooldownRef.current < KICK_COOLDOWN) return;

    const p = physicsRef.current;
    const bx = p.ballX;
    const by = p.ballY;
    const halfSize = BALL_SIZE / 2;

    if (
      cursor.x >= bx - halfSize - HIT_PADDING &&
      cursor.x <= bx + halfSize + HIT_PADDING &&
      cursor.y >= by - halfSize - HIT_PADDING &&
      cursor.y <= by + halfSize + HIT_PADDING
    ) {
      const tapX = Math.max(0, Math.min(1, (cursor.x - (bx - halfSize)) / BALL_SIZE));
      const tapY = Math.max(0, Math.min(1, (cursor.y - (by - halfSize)) / BALL_SIZE));

      if (!isActiveRef.current) {
        setIsActive(true);
      }

      applyKickRef.current(tapX, tapY);
      bounceCountRef.current += 1;
      setBounceCount(bounceCountRef.current);
      turnRef.current = 'ai';
      setTurn('ai');
      cooldownRef.current = Date.now();
    }
  }, []);

  // Render loop — also checks player collision each frame (handles stationary cursor)
  useEffect(() => {
    if (isGameOver) return;
    // Run render loop even before active so the pre-game hover-to-start works
    let frame: number;
    const tick = () => {
      forceRender((v) => v + 1);

      // Check player kick each frame (cursor might be stationary while ball moves into it)
      if (!isGameOverRef.current && turnRef.current === 'player') {
        tryPlayerKick();
      }

      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isGameOver, tryPlayerKick]);

  // AI turn logic
  useEffect(() => {
    if (!isActive || isGameOver) return;
    if (turnRef.current !== 'ai') return;

    let cancelled = false;
    let frame: number;

    const checkAndKick = () => {
      if (cancelled) return;
      const p = physicsRef.current;
      const ballY = p.ballY;
      const isFalling = ballY > prevBallYRef.current;
      prevBallYRef.current = ballY;

      // Wait for ball to be FALLING and in the kickable zone
      if (isFalling && ballY > AI_KICK_ZONE_TOP && ballY < AI_KICK_ZONE_BOTTOM) {
        const delay = AI_DELAY_MIN + Math.random() * (AI_DELAY_MAX - AI_DELAY_MIN);
        aiTimeoutRef.current = setTimeout(() => {
          if (cancelled || turnRef.current !== 'ai') return;
          const tapX = 0.5 + (Math.random() - 0.5) * 0.25;
          const tapY = 0.4 + (Math.random() - 0.5) * 0.15;
          applyKickRef.current(tapX, tapY);
          bounceCountRef.current += 1;
          setBounceCount(bounceCountRef.current);
          turnRef.current = 'player';
          setTurn('player');
          cooldownRef.current = Date.now();
        }, delay);
        return; // stop polling
      }
      frame = requestAnimationFrame(checkAndKick);
    };

    frame = requestAnimationFrame(checkAndKick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
    };
  }, [isActive, isGameOver, bounceCount]);

  // Track cursor position relative to container
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    cursorRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handlePointerLeave = useCallback(() => {
    cursorRef.current = null;
  }, []);

  const handleRestart = useCallback(() => {
    setBounceCount(0);
    bounceCountRef.current = 0;
    setIsGameOver(false);
    setIsActive(false);
    turnRef.current = 'player';
    setTurn('player');
    cooldownRef.current = 0;
    prevBallYRef.current = 0;
    resetBallRef.current();
  }, []);

  const isPlayerTurn = turn === 'player';

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
            <span className="text-xs font-black text-[#FF9600]">{bestScore}</span>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div
        ref={measureRef}
        className="relative select-none"
        style={{ height: CONTAINER_HEIGHT }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
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
          className={cn(
            'absolute z-20 touch-none flex items-center justify-center',
            isPlayerTurn && !isGameOver ? 'cursor-pointer' : 'cursor-default'
          )}
          style={{
            width: BALL_SIZE,
            height: BALL_SIZE,
            left: physics.ballX - BALL_SIZE / 2,
            top: physics.ballY - BALL_SIZE / 2,
            transform: `rotate(${physics.ballRotation}deg)`,
            fontSize: BALL_SIZE * 0.75,
            lineHeight: 1,
            filter: isPlayerTurn && !isGameOver
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
              isPlayerTurn ? 'text-[#58CC02]' : 'text-[#56707A]'
            )}>
              {!isActive
                ? 'Move to the ball to start!'
                : isPlayerTurn
                  ? 'Move to the ball!'
                  : "AI's turn..."}
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
                    {bounceCount}
                  </span>
                  <span className="text-sm font-bold text-[#56707A] ml-2">bounces</span>
                </div>

                {bounceCount >= bestScore && bounceCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="bg-[#FF9600]/20 rounded-xl py-2 px-3 border border-[#FF9600]/30"
                  >
                    <span className="text-sm font-black text-[#FF9600] uppercase tracking-wide">
                      &#127942; New Best!
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
