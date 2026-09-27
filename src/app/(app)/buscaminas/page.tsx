"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef } from "react";
import { trackGameComplete, trackGameReplay, trackGameStart, type EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { BuscaminasGame } from "@/features/buscaminas/BuscaminasGame";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuthStore } from "@/stores/auth.store";

function BuscaminasRoute() {
  const router = useRouter();
  const { locale } = useLocale();
  const day = useSearchParams().get("dia");
  const access = useAuthStore((s) => (s.status === "authenticated" ? "member" : "guest"));
  const session = useRef<{ id: string; startedAt: number } | null>(null);
  const onEvent = useCallback((event: "start" | "complete" | "replay", detail?: EngineEventDetail) => {
    session.current ??= { id: crypto.randomUUID(), startedAt: Date.now() };
    const s = session.current;
    if (event === "start") { s.startedAt = Date.now(); trackGameStart({ modeId: "buscaminas", access, sessionId: s.id, sessionKind: "full_game", surface: "app" }); }
    if (event === "complete") trackGameComplete({ modeId: "buscaminas", sessionId: s.id, sessionKind: "full_game", durationMs: Date.now() - s.startedAt, ...detail });
    if (event === "replay") { trackGameReplay({ modeId: "buscaminas", previousSessionId: s.id }); session.current = { id: crypto.randomUUID(), startedAt: Date.now() }; }
  }, [access]);
  return <BuscaminasGame key={day ?? "today"} locale={locale} initialDay={day} onEvent={onEvent} onExit={() => router.push("/play")} />;
}

/** Buscaminas futbolero in the app shell; the same daily board as the public page. */
export default function BuscaminasPage() {
  return (
    <Suspense fallback={null}>
      <BuscaminasRoute />
    </Suspense>
  );
}
