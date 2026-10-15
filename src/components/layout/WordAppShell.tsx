"use client";

import { AppShellFrame } from "./AppShellFrame";
import * as chrome from "./app-shell/DeferredShellChrome";
import type { AppShellProps } from "./app-shell/appShell.types";

/** Selected only for the fixed word-route entry in an opted-in staging build. */
export function AppShell({ children }: AppShellProps) {
  return <AppShellFrame chrome={chrome}>{children}</AppShellFrame>;
}
