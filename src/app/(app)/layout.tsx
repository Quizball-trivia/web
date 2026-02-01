import AppAuthGate from "@/components/auth/AppAuthGate";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppAuthGate>
      <AppShell>{children}</AppShell>
    </AppAuthGate>
  );
}
