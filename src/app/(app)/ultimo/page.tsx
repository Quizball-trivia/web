"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef } from "react";
import { trackGameComplete, trackGameReplay, trackGameStart, type EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { UltimoGame } from "@/features/ultimo/UltimoGame";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuthStore } from "@/stores/auth.store";
import { createRealtimeCommandId } from "@/lib/realtime/command-id";

function UltimoRoute() {
  const router = useRouter();
  const { locale } = useLocale();
  const day = useSearchParams().get("dia");
  const access = useAuthStore((s) => (s.status === "authenticated" ? "member" : "guest"));
  const session = useRef<{ id: string; startedAt: number } | null>(null);
  const onEvent = useCallback((event: "start" | "complete" | "replay", detail?: EngineEventDetail) => {
    session.current ??= { id: createRealtimeCommandId(), startedAt: Date.now() };
    const s = session.current;
    if (event === "start") { s.startedAt = Date.now(); trackGameStart({ modeId: "ultimo", access, sessionId: s.id, sessionKind: "full_game", surface: "app" }); }
    if (event === "complete") trackGameComplete({ modeId: "ultimo", sessionId: s.id, sessionKind: "full_game", durationMs: Date.now() - s.startedAt, ...detail });
    if (event === "replay") { trackGameReplay({ modeId: "ultimo", previousSessionId: s.id }); session.current = { id: createRealtimeCommandId(), startedAt: Date.now() }; }
  }, [access]);
  return <UltimoGame key={day ?? "today"} locale={locale} initialDay={day} onEvent={onEvent} onExit={() => router.push("/play")} />;
}

/** Último en pie futbolero in the app shell; the same daily board as the public page. */
export default function UltimoPage() {
  return (
    <Suspense fallback={null}>
      <UltimoRoute />
    </Suspense>
  );
}
