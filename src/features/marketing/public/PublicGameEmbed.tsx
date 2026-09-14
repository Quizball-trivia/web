"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { PracticeLayer, SELF_EXITING_ENGINES } from "./PracticeLayer";
import { useAuthStore } from "@/stores/auth.store";
import { type SessionKind, trackGameComplete, trackGameExit, trackGameReplay, trackGameStart, trackGameView } from "@/lib/analytics/public-games.analytics";
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
export function PublicGameEmbed({ modeId, demoSlug, locale, pagePath, playPath, engineEmitsEvents, practiceLocalised, copy }: {
  modeId: string;
  demoSlug: string;
  locale: string;
  pagePath: string;
  /** The real game's app route (sample result action). */
  playPath: string;
  /** Daily engines fire start/complete/replay themselves; others are timed from the Play control. */
  engineEmitsEvents: boolean;
  practiceLocalised: boolean;
  copy: { start: string; note: string; exit: string; english: string; title: string };
}) {
  /** Daily modes run their bundled sample (same every day, no backend); other engines run their practice prototype. */
  const dailyType = demoSlug.startsWith("daily-") ? (demoSlug.slice("daily-".length) as DailyChallengeType) : null;
  // Dailies and the coin mini-games run a fixed sample; the multiplayer/ranked engines run a scripted training.
  const sessionKind: SessionKind = dailyType || demoSlug.startsWith("mini-") ? "sample" : "training";
  const access = useAuthStore((state) => state.status) === "authenticated" ? "member" : "guest";
  const [playing, setPlaying] = useState(false);
  const sessionRef = useRef<string>("");
  const startedAtRef = useRef(0);
  const completedRef = useRef(false);
  const launchRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { trackGameView({ modeId, locale, access }); }, [modeId, locale, access]);
  useEffect(() => {
    if (!playing) launchRef.current?.focus({ preventScroll: true });
  }, [playing]);

  const start = () => {
    sessionRef.current = newSessionId();
    startedAtRef.current = Date.now();
    completedRef.current = false;
    if (!engineEmitsEvents) trackGameStart({ modeId, access, sessionId: sessionRef.current, sessionKind });
    setPlaying(true);
  };
  const recordExit = () => {
    if (!sessionRef.current) return;
    trackGameExit({ modeId, sessionId: sessionRef.current, sessionKind, stage: completedRef.current ? "results" : "playing", durationMs: Date.now() - startedAtRef.current });
    sessionRef.current = "";
  };
  const exit = () => {
    recordExit();
    setPlaying(false);
  };
  const onEngineEvent = (event: "start" | "complete" | "replay", detail?: { score?: number }) => {
    // Daily engines emit "start" after their intro: active time is measured from there, not from the Play click.
    if (event === "start") { startedAtRef.current = Date.now(); trackGameStart({ modeId, access, sessionId: sessionRef.current, sessionKind }); }
    if (event === "complete") { completedRef.current = true; } 
    if (event === "complete") trackGameComplete({ modeId, sessionId: sessionRef.current, score: detail?.score, durationMs: Date.now() - startedAtRef.current, sessionKind });
    if (event === "replay") { completedRef.current = false; trackGameReplay({ modeId, previousSessionId: sessionRef.current }); sessionRef.current = newSessionId(); startedAtRef.current = Date.now(); }
  };

  return (
    <section id="play" aria-label={copy.title} className="mt-6 scroll-mt-24">
      <div className="flex flex-col items-start gap-3 rounded-2xl bg-brand-blue p-5">
        <button
          ref={launchRef}
          type="button"
          onClick={start}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-brand-yellow px-8 text-base font-bold uppercase tracking-wide text-black transition-colors hover:bg-brand-yellow-deep"
        >
          <Play className="size-5" /> {copy.start}
        </button>
        <p className="text-sm text-white/85">{copy.note}</p>
        {!practiceLocalised && <p className="text-sm font-semibold text-brand-yellow">{copy.english}</p>}
      </div>
      {playing && (
        <PracticeLayer title={copy.title} exitLabel={copy.exit} onExit={exit} exitControl={!SELF_EXITING_ENGINES.has(demoSlug)}>
          {dailyType ? (
            <GuestDailyPlay
              type={dailyType}
              modeId={modeId}
              pagePath={pagePath}
              playPath={playPath}
              onExit={exit}
              onEvent={onEngineEvent}
              onLeaveToRealGame={recordExit}
            />
          ) : (
            <DemoModeView slug={demoSlug} backHref={pagePath} onExit={exit} onEvent={onEngineEvent} />
          )}
        </PracticeLayer>
      )}
    </section>
  );
}
