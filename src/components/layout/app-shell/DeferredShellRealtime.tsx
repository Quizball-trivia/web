"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRealtimePrincipal } from "@/lib/realtime/realtime-principal";

const ShellRealtime = dynamic(() => import("./ShellRealtime").then((module) => module.ShellRealtime), { ssr: false });

/** Load the connection owner only for a resolved member or lobby guest. */
export function DeferredShellRealtime() {
  const principal = useRealtimePrincipal();
  const enabled = principal.kind !== "none";
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!enabled || activated) return;
    // Keep the owner mounted after sign-out, too: its existing disabled path
    // clears connection ownership. Do not unload it on principal changes.
    queueMicrotask(() => setActivated(true));
  }, [enabled, activated]);

  if (!enabled && !activated) return null;
  return <ShellRealtime enabled={enabled} selfUserId={principal.userId} />;
}
