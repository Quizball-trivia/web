"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DemoDailyChallenge } from "@/features/demos/DemoDailyChallenge";
import { DemoBackButton } from "@/features/demos/DemoBackButton";
import { PlayRoomWithFriendsButton } from "@/features/aproximado/PlayRoomWithFriendsButton";
import { StatSniperPageBoard } from "./StatSniperPageBoard";
import { guestFetch } from "@/lib/guest/guestSession";
import { useAuthStore } from "@/stores/auth.store";
import type { DailyChallengeSession } from "@/lib/domain/dailyChallenge";
import type { Locale } from "@/lib/i18n/locale";

const COPY: Record<Locale, { resultCta: string; loadError: string; retry: string }> = {
  en: { resultCta: "Sign up to get on the leaderboard", loadError: "Today's game didn't load.", retry: "Try again" },
  es: { resultCta: "Creá tu cuenta y entrá al ranking", loadError: "No pudimos cargar el juego de hoy.", retry: "Reintentar" },
  ka: { resultCta: "შექმენი ანგარიში და მოხვდი რეიტინგში", loadError: "დღევანდელი თამაში ვერ ჩაიტვირთა.", retry: "თავიდან ცდა" },
  tr: { resultCta: "Hesap oluştur, sıralamaya gir", loadError: "Bugünün oyunu yüklenemedi.", retry: "Tekrar dene" },
};

/** One request per locale and load while it is in flight (a remount must not POST the rate-limited guest API twice). */
const inflight = new Map<string, Promise<DailyChallengeSession>>();
function loadSession(locale: Locale, attempt: number): Promise<DailyChallengeSession> {
  // The guest set changes at the UTC day boundary: a request still pending across midnight must not serve the new day.
  const key = `${new Date().toISOString().slice(0, 10)}:${locale}:${attempt}`;
  let promise = inflight.get(key);
  if (!promise) {
    promise = guestFetch<DailyChallengeSession>(`/api/v1/guest/daily-challenges/statSniper/session?locale=${encodeURIComponent(locale)}`, { method: "POST", locale });
    inflight.set(key, promise);
    const clear = () => { if (inflight.get(key) === promise) inflight.delete(key); };
    promise.then(clear, clear);
  }
  return promise;
}

/**
 * Today's real Stat Sniper (Aproximado) for a guest on the public page: the guest API serves the day's set and
 * records the best score without a leaderboard row. The board itself is for accounts, so a sign-up card takes its place.
 */
export function StatSniperPublicPlay({ locale, modeId, pagePath, playPath, onExit, onEvent, onLeaveToRealGame, onMember }: {
  locale: Locale;
  modeId: string;
  pagePath: string;
  playPath: string;
  onExit: () => void;
  onEvent: (event: "start" | "complete" | "replay", detail?: { score?: number }) => void;
  onLeaveToRealGame: () => void;
  /** A signed-in player (known now or once auth resolves) plays the member daily instead. */
  onMember: () => void;
}) {
  const c = COPY[locale] ?? COPY.en;
  const [session, setSession] = useState<DailyChallengeSession | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const authStatus = useAuthStore((state) => state.status);
  const onMemberRef = useRef(onMember);
  useEffect(() => { onMemberRef.current = onMember; });
  useEffect(() => { if (authStatus === "authenticated") onMemberRef.current(); }, [authStatus]);
  const guest = authStatus === "anonymous" || authStatus === "banned";

  useEffect(() => {
    if (!guest) return;
    let live = true;
    loadSession(locale, attempt)
      .then((value) => {
        if (!live) return;
        if (value?.challengeType === "statSniper" && value.questions.length > 0) setSession(value);
        else setFailed(true);
      })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [guest, locale, attempt]);

  const complete = useCallback(async (score: number) => {
    const save = () => guestFetch("/api/v1/guest/daily-challenges/statSniper/complete", { method: "POST", body: { score }, locale });
    try { return await save(); } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return save();
    }
  }, [locale]);
  // "Play again" reloads the set: results left open past midnight must not replay yesterday's numbers as today's.
  const handleEvent = useCallback((event: "start" | "complete" | "replay", detail?: { score?: number }) => {
    onEvent(event, detail);
    if (event === "replay") { setSession(null); setAttempt((n) => n + 1); }
  }, [onEvent]);

  if (!session || !guest) {
    return (
      <>
        <DemoBackButton onClick={onExit} />
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center text-white">
          {failed ? (
            <>
              <p role="alert" className="text-base font-semibold">{c.loadError}</p>
              <button type="button" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }} className="inline-flex h-11 items-center rounded-full bg-brand-yellow px-6 text-sm font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep">
                {c.retry}
              </button>
            </>
          ) : (
            <div className="h-40 w-full max-w-md animate-pulse rounded-2xl bg-white/5" />
          )}
        </div>
      </>
    );
  }

  const leave = { onBeforeLeave: onLeaveToRealGame };
  return (
    <DemoDailyChallenge
      type="statSniper"
      session={session}
      backHref={pagePath}
      onExit={onExit}
      onEvent={handleEvent}
      onRemoteComplete={complete}
      confirmQuit={false}
      boardSlot={<StatSniperPageBoard locale={locale} modeId={modeId} playPath={playPath} onSignUp={onLeaveToRealGame} className="mt-6 lg:mt-0" />}
      resultCta={{ modeId, returnTo: playPath, label: c.resultCta, ...leave }}
      resultExtra={<PlayRoomWithFriendsButton locale={locale} tone="white" onBeforeLeave={onLeaveToRealGame} />}
    />
  );
}
