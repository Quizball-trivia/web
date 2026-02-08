'use client';
import { useEffect, useState, useRef } from 'react';

export function useAnimatedScore(targetScore: number, duration: number = 600): number {
  const [displayScore, setDisplayScore] = useState(targetScore);
  const prevTargetRef = useRef(targetScore);

  useEffect(() => {
    const prevTarget = prevTargetRef.current;
    prevTargetRef.current = targetScore;

    if (targetScore === prevTarget) return;

    const diff = targetScore - prevTarget;
    const startTime = Date.now();
    const startScore = displayScore;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startScore + diff * eased);

      setDisplayScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayScore(targetScore);
      }
    };

    animate();
  }, [targetScore, duration, displayScore]);

  return displayScore;
}
