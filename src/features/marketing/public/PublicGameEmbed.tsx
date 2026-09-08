"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { trackGameComplete, trackGameReplay, trackGameStart, trackGameView } from "@/lib/analytics/public-games.analytics";

/** Every engine lives in one client chunk that is fetched only when a visitor presses Play. */
const DemoModeView = dynamic(() => import("@/features/demos/DemoModeView").then((m) => m.DemoModeView), { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-2xl bg-white/5" /> });

const newSessionId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/**
 * The practice round on a public game page. Server HTML around it carries the
 * page's content; this only mounts the engine on demand and reports the funnel.
 * Practice never touches account state.
 */
export function PublicGameEmbed({ modeId, demoSlug, locale, pagePath, copy }: {
  modeId: string;
  demoSlug: string;
  locale: string;
  pagePath: string;
  copy: { start: string; note: string; exit: string };
}) {
  const access = useAuthStore((state) => state.status) === "authenticated" ? "member" : "guest";
  const [playing, setPlaying] = useState(false);
  const sessionRef = useRef<string>("");
  const startedAtRef = useRef(0);

  useEffect(() => { trackGameView({ modeId, locale, access }); }, [modeId, locale, access]);

  const start = () => {
    sessionRef.current = newSessionId();
    startedAtRef.current = Date.now();
    setPlaying(true);
  };

  return (
    <section id="play" className="mt-6 scroll-mt-24">
      {!playing ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <button
            type="button"
            onClick={start}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-brand-yellow px-8 text-base font-bold uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow-deep"
          >
            <Play className="size-5" /> {copy.start}
          </button>
          <p className="text-sm text-white/65">{copy.note}</p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface-page-alt">
          <button
            type="button"
            onClick={() => setPlaying(false)}
            className="absolute right-3 top-3 z-[110] inline-flex h-9 items-center gap-1 rounded-full bg-black/50 px-3 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-sm hover:bg-black/70"
          >
            <X className="size-4" /> {copy.exit}
          </button>
          <div className="min-h-[70vh]">
            <DemoModeView
              slug={demoSlug}
              backHref={pagePath}
              onExit={() => setPlaying(false)}
              onEvent={(event, detail) => {
                if (event === "start") trackGameStart({ modeId, access, sessionId: sessionRef.current });
                if (event === "complete") trackGameComplete({ modeId, sessionId: sessionRef.current, score: detail?.score, durationMs: Date.now() - startedAtRef.current });
                if (event === "replay") { trackGameReplay({ modeId, previousSessionId: sessionRef.current }); sessionRef.current = newSessionId(); startedAtRef.current = Date.now(); }
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
