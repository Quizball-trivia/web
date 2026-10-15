import { AppShell } from "@/components/layout/WordAppShellEntry";

/** Shared parent owns the persistent gate; only these eight URLs select this entry. */
export default function WordShellLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
