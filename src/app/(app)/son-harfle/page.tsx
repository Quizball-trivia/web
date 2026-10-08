"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useState } from "react";
import { trackGameComplete, trackGameReplay, trackGameStart, type EngineEventDetail } from "@/lib/analytics/public-games.analytics";
import { NameChainDaily } from "@/features/name-chain/NameChainDaily";
import { useLocale } from "@/contexts/LocaleContext";
import { useAuthStore } from "@/stores/auth.store";
import { createRealtimeCommandId } from "@/lib/realtime/command-id";

function Route() {
  const router = useRouter();
  const { locale } = useLocale();
  const day = useSearchParams().get("dia");
  const access = useAuthStore((s) => (s.status === "authenticated" ? "member" : "guest"));
  const session = useRef<{ id: string; startedAt: number } | null>(null);
  const onEvent = useCallback((event: "start" | "complete" | "replay", detail?: EngineEventDetail) => {
    session.current ??= { id: createRealtimeCommandId(), startedAt: Date.now() };
    const s = session.current;
    if (event === "start") { s.startedAt = Date.now(); trackGameStart({ modeId: "nameChain", access, sessionId: s.id, sessionKind: "full_game", surface: "app" }); }
    if (event === "complete") trackGameComplete({ modeId: "nameChain", sessionId: s.id, sessionKind: "full_game", durationMs: Date.now() - s.startedAt, ...detail });
    if (event === "replay") { trackGameReplay({ modeId: "nameChain", previousSessionId: s.id }); session.current = { id: createRealtimeCommandId(), startedAt: Date.now() }; }
  }, [access]);
  // An older day chosen from the archive is kept in the address, so a reload opens it again; the newest day has none.
  const onDay = useCallback((chosen: string, newest: boolean) => {
    const url = new URL(window.location.href);
    if ((url.searchParams.get("dia") ?? null) === (newest ? null : chosen)) return;
    if (newest) url.searchParams.delete("dia");
    else url.searchParams.set("dia", chosen);
    window.history.replaceState(null, "", url);
  }, []);
  // Read once: the game owns the day from here on (the address only follows it).
  const [initialDay] = useState(day);
  return <NameChainDaily locale={locale} initialDay={initialDay} onDay={onDay} onEvent={onEvent} onExit={() => router.push("/play")} />;
}

/** Football Name Chain (Son Harfle Futbolcu) in the app shell; the same daily board as the public page. */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Route />
    </Suspense>
  );
}
