"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useState } from "react";
import { trackGameComplete, trackGameReplay, trackGameStart, type EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { DraftGame } from "@/features/draft/DraftGame";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuthStore } from "@/stores/auth.store";
import { createRealtimeCommandId } from "@/lib/realtime/command-id";

function Route() {
  const router = useRouter();
  const { locale } = useLocale();
  const params = useSearchParams();
  const challenge = params.get("challenge");
  const access = useAuthStore((s) => (s.status === "authenticated" ? "member" : "guest"));
  const session = useRef<{ id: string; startedAt: number } | null>(null);
  const onEvent = useCallback((event: "start" | "complete" | "replay", detail?: EngineEventDetail) => {
    session.current ??= { id: createRealtimeCommandId(), startedAt: Date.now() };
    const s = session.current;
    if (event === "start") { s.startedAt = Date.now(); trackGameStart({ modeId: "draft", access, sessionId: s.id, sessionKind: "full_game", surface: "app" }); }
    if (event === "complete") trackGameComplete({ modeId: "draft", sessionId: s.id, sessionKind: "full_game", durationMs: Date.now() - s.startedAt, ...detail });
    if (event === "replay") { trackGameReplay({ modeId: "draft", previousSessionId: s.id }); session.current = { id: createRealtimeCommandId(), startedAt: Date.now() }; }
  }, [access]);
  // Read once: the game owns the day from here on (the address only follows it).
  const [initialChallenge] = useState(challenge);
  return <DraftGame locale={locale} initialChallenge={initialChallenge} onEvent={onEvent} onExit={() => router.push("/play")} />;
}

/** Football Draft in the app shell; the same game as the public page. */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Route />
    </Suspense>
  );
}
