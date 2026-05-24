import PublicOnlyGate from "@/components/auth/PublicOnlyGate";
import { InAppBrowserOverlay } from "@/components/auth/InAppBrowserOverlay";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PublicOnlyGate>
      <div className="min-h-screen bg-background">{children}</div>
      <InAppBrowserOverlay />
    </PublicOnlyGate>
  );
}
