import AppAuthGate from "@/components/auth/AppAuthGate";
import { AppShell } from "@/components/layout/AppShell";

/**
 * The public hub and game pages render inside the app shell: one hub for
 * members (/play) and signed-out visitors (/{locale}). No robots override here:
 * every page under this group exports its own indexable metadata.
 */
export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppAuthGate>
      <AppShell>{children}</AppShell>
    </AppAuthGate>
  );
}
