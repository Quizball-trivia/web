'use client';
import { useRef, useCallback, useEffect } from 'react';

const GRAVITY = 900;
const BASE_KICK_SPEED = 550;
const MAX_HORIZONTAL = 350;
const BALL_RADIUS = 32;
const DAMPING = 0.995;
const BOUNCE_ELASTICITY = 0.3;

function computeKick(tapX: number, tapY: number) {
  const offsetX = tapX - 0.5;
  const offsetY = tapY - 0.5;

  return {
    vx: -offsetX * MAX_HORIZONTAL * 2,
    vy: -BASE_KICK_SPEED * (1 + offsetY * 0.4),
    spin: -offsetX * 150,
  };
}

interface UseWarmupPhysicsOptions {
  containerWidth: number;
  containerHeight: number;
  groundY: number;
  active: boolean;
  onDropped: () => void;
}

export interface WarmupPhysicsReturn {
  ballX: number;
  ballY: number;
  ballRotation: number;
  applyKick: (tapX: number, tapY: number) => void;
  resetBall: () => void;
}

export function useWarmupPhysics(options: UseWarmupPhysicsOptions): WarmupPhysicsReturn {
  const { containerWidth, containerHeight, groundY, active, onDropped } = options;

  const posRef = useRef({ x: containerWidth / 2, y: containerHeight * 0.3 });
  const velRef = useRef({ vx: 0, vy: 0 });
  const spinRef = useRef(0);
  const rotationRef = useRef(0);
  const droppedRef = useRef(false);
  const lastTimeRef = useRef(0);
  const frameRef = useRef(0);
  const renderRef = useRef({ x: containerWidth / 2, y: containerHeight * 0.3, rotation: 0 });
  const onDroppedRef = useRef(onDropped);
  onDroppedRef.current = onDropped;

  // Track whether we've ever had a kick (don't apply gravity until first kick)
  const hasStartedRef = useRef(false);

  const resetBall = useCallback(() => {
    posRef.current = { x: containerWidth / 2, y: containerHeight * 0.3 };
    velRef.current = { vx: 0, vy: 0 };
    spinRef.current = 0;
    rotationRef.current = 0;
    droppedRef.current = false;
    hasStartedRef.current = false;
    renderRef.current = { x: containerWidth / 2, y: containerHeight * 0.3, rotation: 0 };
  }, [containerWidth, containerHeight]);

  const applyKick = useCallback((tapX: number, tapY: number) => {
    const kick = computeKick(tapX, tapY);
    velRef.current = { vx: kick.vx, vy: kick.vy };
    spinRef.current = kick.spin;
    hasStartedRef.current = true;
    droppedRef.current = false;
  }, []);

  useEffect(() => {
    if (!active) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      return;
    }

    lastTimeRef.current = 0;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      if (!hasStartedRef.current) {
        frameRef.current = requestAnimationFrame(loop);
        return;
      }

      const pos = posRef.current;
      const vel = velRef.current;

      // Apply gravity
      vel.vy += GRAVITY * dt;

      // Damping on horizontal
      vel.vx *= DAMPING;

      // Update position
      pos.x += vel.vx * dt;
      pos.y += vel.vy * dt;

      // Wall bounce
      if (pos.x - BALL_RADIUS < 0) {
        pos.x = BALL_RADIUS;
        vel.vx = Math.abs(vel.vx) * BOUNCE_ELASTICITY;
      } else if (pos.x + BALL_RADIUS > containerWidth) {
        pos.x = containerWidth - BALL_RADIUS;
        vel.vx = -Math.abs(vel.vx) * BOUNCE_ELASTICITY;
      }

      // Ceiling bounce
      if (pos.y - BALL_RADIUS < 0) {
        pos.y = BALL_RADIUS;
        vel.vy = Math.abs(vel.vy) * BOUNCE_ELASTICITY;
      }

      // Rotation
      rotationRef.current += spinRef.current * dt;

      // Ground detection
      if (pos.y + BALL_RADIUS >= groundY && !droppedRef.current) {
        droppedRef.current = true;
        pos.y = groundY - BALL_RADIUS;
        vel.vy = 0;
        vel.vx = 0;
        onDroppedRef.current();
      }

      renderRef.current = { x: pos.x, y: pos.y, rotation: rotationRef.current };

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [active, containerWidth, groundY]);

  return {
    get ballX() { return renderRef.current.x; },
    get ballY() { return renderRef.current.y; },
    get ballRotation() { return renderRef.current.rotation; },
    applyKick,
    resetBall,
  };
}
