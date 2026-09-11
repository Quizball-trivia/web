"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { PracticeLayer } from "./PracticeLayer";
import { useAuthStore } from "@/stores/auth.store";
import { trackGameComplete, trackGameReplay, trackGameStart, trackGameView } from "@/lib/analytics/public-games.analytics";
import type { DailyChallengeType } from "@/lib/domain/dailyChallenge";
/** Daily engines are a separate on-demand chunk too; nothing game-related loads before Play. */
const GuestDailyPlay = dynamic(() => import("./GuestDailyPlay").then((m) => m.GuestDailyPlay), { ssr: false, loading: () => <div className="m-6 h-40 animate-pulse rounded-2xl bg-white/5" /> });

/** Every engine lives in one client chunk that is fetched only when a visitor presses Play. */
const DemoModeView = dynamic(() => import("@/features/demos/DemoModeView").then((m) => m.DemoModeView), { ssr: false, loading: () => <div className="m-6 h-40 animate-pulse rounded-2xl bg-white/5" /> });

const newSessionId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/**
 * The practice round on a public game page. The server HTML around it carries
 * the page's content; this only mounts the engine on demand and reports the
 * funnel. The engines are full-viewport screens, so the practice opens as a
 * layer portalled to <body> (outside the page's <main>) with its own exit
 * control, and focus moves in and back out. Practice never touches account state.
 */
export function PublicGameEmbed({ modeId, demoSlug, locale, pagePath, engineEmitsEvents, practiceLocalised, copy }: {
  modeId: string;
  demoSlug: string;
  locale: string;
  pagePath: string;
  /** Daily engines fire start/complete/replay themselves; others are timed from the Play control. */
  engineEmitsEvents: boolean;
  practiceLocalised: boolean;
  copy: { start: string; note: string; exit: string; english: string; title: string; loading: string; sampleFallback: string };
}) {
  /** Daily modes play today's real set as a guest; other engines run their practice prototype. */
  const dailyType = demoSlug.startsWith("daily-") ? (demoSlug.slice("daily-".length) as DailyChallengeType) : null;
  const access = useAuthStore((state) => state.status) === "authenticated" ? "member" : "guest";
  const [playing, setPlaying] = useState(false);
  const sessionRef = useRef<string>("");
  const startedAtRef = useRef(0);
  const launchRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { trackGameView({ modeId, locale, access }); }, [modeId, locale, access]);
  useEffect(() => {
    if (!playing) launchRef.current?.focus({ preventScroll: true });
  }, [playing]);

  const start = () => {
    sessionRef.current = newSessionId();
    startedAtRef.current = Date.now();
    if (!engineEmitsEvents) trackGameStart({ modeId, access, sessionId: sessionRef.current });
    setPlaying(true);
  };
  const exit = () => setPlaying(false);
  const onEngineEvent = (event: "start" | "complete" | "replay", detail?: { score?: number }) => {
    if (event === "start") trackGameStart({ modeId, access, sessionId: sessionRef.current });
    if (event === "complete") trackGameComplete({ modeId, sessionId: sessionRef.current, score: detail?.score, durationMs: Date.now() - startedAtRef.current });
    if (event === "replay") { trackGameReplay({ modeId, previousSessionId: sessionRef.current }); sessionRef.current = newSessionId(); startedAtRef.current = Date.now(); }
  };

  return (
    <section id="play" aria-label={copy.title} className="mt-6 scroll-mt-24">
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <button
          ref={launchRef}
          type="button"
          onClick={start}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-brand-yellow px-8 text-base font-bold uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow-deep"
        >
          <Play className="size-5" /> {copy.start}
        </button>
        <p className="text-sm text-white/65">{copy.note}</p>
        {!practiceLocalised && <p className="text-sm font-semibold text-brand-yellow">{copy.english}</p>}
      </div>
      {playing && (
        <PracticeLayer title={copy.title} exitLabel={copy.exit} onExit={exit}>
          {dailyType ? (
            <GuestDailyPlay
              type={dailyType}
              modeId={modeId}
              locale={locale as "en" | "ka" | "es"}
              pagePath={pagePath}
              onExit={exit}
              onEvent={onEngineEvent}
              copy={{ loading: copy.loading, sampleFallback: copy.sampleFallback }}
            />
          ) : (
            <DemoModeView slug={demoSlug} backHref={pagePath} onExit={exit} onEvent={onEngineEvent} />
          )}
        </PracticeLayer>
      )}
    </section>
  );
}
