"use client";

import { useRealtimeConnection } from "@/lib/realtime/useRealtimeConnection";

/** The existing connection/identity lifecycle, loaded without changing it. */
export function ShellRealtime({ enabled, selfUserId }: { enabled: boolean; selfUserId: string | null }) {
  useRealtimeConnection({ enabled, selfUserId });
  return null;
}
