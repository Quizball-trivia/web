'use client';

import { useEffect, useState } from 'react';

/** mm:ss since mount — the matchmaking "searching for" clock. */
export function ElapsedTimer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(start);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor((now - start) / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return (
    <span className={className} style={style} role="timer" aria-live="off">
      {mm}:{ss}
    </span>
  );
}
