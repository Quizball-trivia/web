"use client";

import { usePresencePing } from "@/hooks/usePresencePing";

/**
 * Mount-only component that runs the site-wide presence heartbeat. Rendered once
 * inside the client Providers tree so it fires app-wide — including the
 * logged-out landing page (the root layout is a server component, so the hook
 * can't live there directly).
 */
export function PresencePingMount(): null {
  usePresencePing();
  return null;
}
