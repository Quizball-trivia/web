"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { OWN_EXIT_ENGINES, PracticeLayer, SELF_EXITING_ENGINES } from "./PracticeLayer";
import { useAuthStore } from "@/stores/auth.store";
import { type SessionKind, trackPlayNowClick, trackGameComplete, trackGameExit, trackGameReplay, trackGameStart, trackGameView } from "@/lib/analytics/public-games.analytics";
import type { EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import type { DailyChallengeType } from "@/lib/domain/dailyChallenge";
import type { Locale } from "@/lib/i18n/locale";
import { isFullGameDemo } from "@/lib/seo/public-game-runtime";
import { PlayRoomWithFriendsButton } from "@/features/aproximado/PlayRoomWithFriendsButton";
/** Daily engines are a separate on-demand chunk too; nothing game-related loads before Play. */
const GuestDailyPlay = dynamic(() => import("./GuestDailyPlay").then((m) => m.GuestDailyPlay), { ssr: false, loading: () => <div className="m-6 h-40 animate-pulse rounded-2xl bg-white/5" /> });

/** Every engine lives in one client chunk that is fetched only when a visitor presses Play. */
const BuscaminasGame = dynamic(() => import("@/features/buscaminas/BuscaminasGame").then((m) => m.BuscaminasGame), { ssr: false, loading: () => <div className="m-6 h-40 animate-pulse rounded-2xl bg-white/5" /> });
const PistasGame = dynamic(() => import("@/features/pistas/PistasGame").then((m) => m.PistasGame), { ssr: false, loading: () => <div className="m-6 h-40 animate-pulse rounded-2xl bg-white/5" /> });
const MinutoGame = dynamic(() => import("@/features/minuto/MinutoGame").then((m) => m.MinutoGame), { ssr: false, loading: () => <div className="m-6 h-40 animate-pulse rounded-2xl bg-white/5" /> });
const UltimoGame = dynamic(() => import("@/features/ultimo/UltimoGame").then((m) => m.UltimoGame), { ssr: false, loading: () => <div className="m-6 h-40 animate-pulse rounded-2xl bg-white/5" /> });
const SharedPlayerDaily = dynamic(() => import("@/features/shared-player/SharedPlayerDaily").then((m) => m.SharedPlayerDaily), { ssr: false, loading: () => <div className="m-6 h-40 animate-pulse rounded-2xl bg-white/5" /> });
const NameChainDaily = dynamic(() => import("@/features/name-chain/NameChainDaily").then((m) => m.NameChainDaily), { ssr: false, loading: () => <div className="m-6 h-40 animate-pulse rounded-2xl bg-white/5" /> });
const StatSniperPublicPlay = dynamic(() => import("./StatSniperPublicPlay").then((m) => m.StatSniperPublicPlay), { ssr: false, loading: () => <div className="m-6 h-40 animate-pulse rounded-2xl bg-white/5" /> });
const DemoModeView = dynamic(() => import("@/features/demos/DemoModeView").then((m) => m.DemoModeView), { ssr: false, loading: () => <div className="m-6 h-40 animate-pulse rounded-2xl bg-white/5" /> });

const newSessionId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/**
 * The practice round on a public game page. The server HTML around it carries
 * the page's content; this only mounts the engine on demand and reports the
 * funnel. The engines are full-viewport screens, so the practice opens as a
 * layer portalled to <body> (outside the page's <main>) with its own exit
 * control, and focus moves in and back out. Practice never touches account state.
 */
/** Marks (or unmarks) the page URL as having its full game open, without a navigation. */
function setPlayUrl(open: boolean): void {
  const url = new URL(window.location.href);
  if (open) url.searchParams.set("jugar", "1");
  else {
    url.searchParams.delete("jugar");
    url.searchParams.delete("dia");
  }
  window.history.replaceState(window.history.state, "", url);
}

export function PublicGameEmbed({ modeId, demoSlug, locale, pagePath, playPath, engineEmitsEvents, practiceLocalised, copy, variant = "card" }: {
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
  /** 'inline' drops the blue card chrome so the launcher can sit inside another card. */
  variant?: "card" | "inline";
}) {
  /** Daily modes run their bundled sample (same every day, no backend); other engines run their practice prototype. */
  const dailyType = demoSlug.startsWith("daily-") ? (demoSlug.slice("daily-".length) as DailyChallengeType) : null;
  // Dailies and the coin mini-games run a fixed sample; the multiplayer/ranked engines run a scripted training.
  const sessionKind: SessionKind = isFullGameDemo(demoSlug) ? "full_game" : dailyType || demoSlug.startsWith("mini-") ? "sample" : "training";
  const authStatus = useAuthStore((state) => state.status);
  const access = authStatus === "authenticated" ? "member" : "guest";
  const router = useRouter();
  const [playing, setPlaying] = useState(false);
  /** A shared result link (/r/…) lands here with ?dia= so the full game opens that puzzle. */
  const [sharedDay, setSharedDay] = useState<string | null>(null);
  const sessionRef = useRef<string>("");
  const startedAtRef = useRef(0);
  const completedRef = useRef(false);
  const launchRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { trackGameView({ modeId, locale, access }); }, [modeId, locale, access]);
  // Return focus to the launcher when the practice layer closes — not on first
  // render, where a programmatic focus only paints a ring on the fresh page.
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (!playing && wasPlayingRef.current) launchRef.current?.focus({ preventScroll: true });
    wasPlayingRef.current = playing;
  }, [playing]);

  /** Members play the real Stat Sniper in the app, where the score counts for coins, streak and the leaderboard. */
  const playInApp = () => {
    trackPlayNowClick({ modeId, access: "member", destination: playPath });
    // Drop ?jugar=1 first: Back from the app must land on the page, not auto-start and bounce forward again.
    setPlayUrl(false);
    router.push(playPath);
  };
  const start = () => {
    if (dailyType === "statSniper" && authStatus === "authenticated") { playInApp(); return; }
    sessionRef.current = newSessionId();
    startedAtRef.current = Date.now();
    completedRef.current = false;
    if (!engineEmitsEvents) trackGameStart({ modeId, access, sessionId: sessionRef.current, sessionKind });
    setSharedDay(new URLSearchParams(window.location.search).get("dia"));
    setPlaying(true);
    if (sessionKind === "full_game") setPlayUrl(true);
  };
  // A full game open on this page survives a reload: the URL says so (?jugar=1, plus the puzzle's ?dia=).
  const startRef = useRef(start);
  useEffect(() => { startRef.current = start; });
  useEffect(() => {
    if (sessionKind !== "full_game" || new URLSearchParams(window.location.search).get("jugar") !== "1") return;
    queueMicrotask(() => startRef.current());
  }, [sessionKind]);
  const onDay = (day: string) => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("dia") === day) return;
    url.searchParams.set("dia", day);
    window.history.replaceState(window.history.state, "", url);
  };
  const recordExit = () => {
    if (!sessionRef.current) return;
    trackGameExit({ modeId, sessionId: sessionRef.current, sessionKind, stage: completedRef.current ? "results" : "playing", durationMs: Date.now() - startedAtRef.current });
    sessionRef.current = "";
  };
  const exit = () => {
    recordExit();
    setPlaying(false);
    if (sessionKind === "full_game") setPlayUrl(false);
  };
  const onEngineEvent = (event: "start" | "complete" | "replay", detail?: EngineEventDetail) => {
    // Daily engines emit "start" after their intro: active time is measured from there, not from the Play click.
    if (event === "start") { startedAtRef.current = Date.now(); trackGameStart({ modeId, access, sessionId: sessionRef.current, sessionKind }); }
    if (event === "complete") { completedRef.current = true; } 
    if (event === "complete") trackGameComplete({ modeId, sessionId: sessionRef.current, ...detail, durationMs: Date.now() - startedAtRef.current, sessionKind });
    if (event === "replay") { completedRef.current = false; trackGameReplay({ modeId, previousSessionId: sessionRef.current }); sessionRef.current = newSessionId(); startedAtRef.current = Date.now(); }
  };

  return (
    <section id="play" aria-label={copy.title} className={variant === "inline" ? "mt-4 scroll-mt-24" : "mt-6 scroll-mt-24"}>
      <div className={variant === "inline" ? "flex flex-col items-start gap-3" : "flex flex-col items-start gap-3 rounded-2xl bg-brand-blue p-5"}>
        <button
          ref={launchRef}
          type="button"
          onClick={start}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-brand-green text-black hover:bg-brand-green-deep px-8 text-base font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Play className="size-5" /> {copy.start}
        </button>
        {dailyType === "statSniper" && (
          <PlayRoomWithFriendsButton locale={locale as Locale} tone={variant === "inline" ? "blue" : "white"} className="w-auto max-w-sm" />
        )}
        <p className="text-sm text-white/85">{copy.note}</p>
        {!practiceLocalised && <p className="text-sm font-semibold text-brand-yellow">{copy.english}</p>}
      </div>
      {playing && (
        <PracticeLayer title={copy.title} exitLabel={copy.exit} onExit={exit} exitControl={!SELF_EXITING_ENGINES.has(demoSlug)} exitButton={!OWN_EXIT_ENGINES.has(demoSlug)}>
          {demoSlug === "buscaminas" ? (
            <BuscaminasGame locale={locale as Locale} onExit={exit} onEvent={onEngineEvent} />
          ) : demoSlug === "pistas" ? (
            <PistasGame locale={locale as Locale} initialDay={sharedDay} onExit={exit} onEvent={onEngineEvent} onDay={onDay} />
          ) : demoSlug === "minuto" ? (
            <MinutoGame locale={locale as Locale} initialDay={sharedDay} onExit={exit} onEvent={onEngineEvent} onDay={onDay} />
          ) : demoSlug === "ultimo" ? (
            <UltimoGame locale={locale as Locale} initialDay={sharedDay} onExit={exit} onEvent={onEngineEvent} onDay={onDay} />
          ) : demoSlug === "shared-player" ? (
            <SharedPlayerDaily locale={locale} initialDay={sharedDay} onExit={exit} onEvent={onEngineEvent} onDay={onDay} />
          ) : demoSlug === "name-chain" ? (
            <NameChainDaily locale={locale} initialDay={sharedDay} onExit={exit} onEvent={onEngineEvent} onDay={onDay} />
          ) : dailyType === "statSniper" ? (
            <StatSniperPublicPlay locale={locale as Locale} modeId={modeId} pagePath={pagePath} playPath={playPath} onExit={exit} onEvent={onEngineEvent} onLeaveToRealGame={recordExit} onMember={() => { recordExit(); playInApp(); }} />
          ) : dailyType ? (
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
            <DemoModeView slug={demoSlug} backHref={pagePath} onExit={exit} onEvent={onEngineEvent} coinSample={demoSlug.startsWith("mini-") ? { modeId, playPath, title: copy.title, onLeaveToRealGame: recordExit } : undefined} />
          )}
        </PracticeLayer>
      )}
    </section>
  );
}
