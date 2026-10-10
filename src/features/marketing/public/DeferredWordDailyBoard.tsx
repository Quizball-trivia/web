"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

function BoardPlaceholder() {
  return <div className="h-64 animate-pulse rounded-2xl bg-white/5" aria-hidden="true" />;
}

// Load standalone ranking code only when visible, never the game engine.
const SharedPlayerBoard = dynamic(() => import("@/features/wordgames/daily/WordDailyPageBoards").then((m) => m.SharedPlayerDailyBoard), { ssr: false, loading: BoardPlaceholder });
const NameChainBoard = dynamic(() => import("@/features/wordgames/daily/WordDailyPageBoards").then((m) => m.NameChainDailyBoard), { ssr: false, loading: BoardPlaceholder });

export function DeferredWordDailyBoard({ modeId, locale, className }: { modeId: "sharedPlayer" | "nameChain"; locale: string; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className={className}>
      {!visible ? <BoardPlaceholder /> : modeId === "sharedPlayer" ? <SharedPlayerBoard locale={locale} /> : <NameChainBoard locale={locale} />}
    </div>
  );
}
