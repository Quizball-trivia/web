import AppAuthGate from "@/components/auth/AppAuthGate";

export default function FullscreenLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppAuthGate>
      <div className="min-h-dvh w-full bg-background">{children}</div>
    </AppAuthGate>
  );
}
