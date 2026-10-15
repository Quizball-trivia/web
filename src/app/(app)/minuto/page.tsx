"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useState } from "react";
import { trackGameComplete, trackGameReplay, trackGameStart, type EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { MinutoGame } from "@/features/minuto/MinutoGame";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuthStore } from "@/stores/auth.store";
import { createRealtimeCommandId } from "@/lib/realtime/command-id";

function MinutoRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  // Read once: the board the player then picks goes into the URL (a reload reopens it) without remounting the game.
  const [day] = useState(() => searchParams.get("dia"));
  const access = useAuthStore((s) => (s.status === "authenticated" ? "member" : "guest"));
  const session = useRef<{ id: string; startedAt: number } | null>(null);
  const onEvent = useCallback((event: "start" | "complete" | "replay", detail?: EngineEventDetail) => {
    session.current ??= { id: createRealtimeCommandId(), startedAt: Date.now() };
    const s = session.current;
    if (event === "start") { s.startedAt = Date.now(); trackGameStart({ modeId: "minuto", access, sessionId: s.id, sessionKind: "full_game", surface: "app" }); }
    if (event === "complete") trackGameComplete({ modeId: "minuto", sessionId: s.id, sessionKind: "full_game", durationMs: Date.now() - s.startedAt, ...detail });
    if (event === "replay") { trackGameReplay({ modeId: "minuto", previousSessionId: s.id }); session.current = { id: createRealtimeCommandId(), startedAt: Date.now() }; }
  }, [access]);
  const onDay = useCallback((picked: string) => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("dia") === picked) return;
    url.searchParams.set("dia", picked);
    window.history.replaceState(window.history.state, "", url.toString());
  }, []);
  return <MinutoGame locale={locale} initialDay={day} onDay={onDay} onEvent={onEvent} onExit={() => router.push("/play")} />;
}

/** "¿En qué minuto?" in the app shell; the same daily board as the public page. */
export default function MinutoPage() {
  return (
    <Suspense fallback={null}>
      <MinutoRoute />
    </Suspense>
  );
}
