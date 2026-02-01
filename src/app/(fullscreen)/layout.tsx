import AppAuthGate from "@/components/auth/AppAuthGate";

export default function FullscreenLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppAuthGate>
      <div className="min-h-screen bg-background">{children}</div>
    </AppAuthGate>
  );
}
