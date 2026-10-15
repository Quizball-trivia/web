import { AppShell } from "@/components/layout/AppShell";

export default function DefaultShellLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
