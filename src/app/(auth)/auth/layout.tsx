import PublicOnlyGate from "@/components/auth/PublicOnlyGate";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PublicOnlyGate>
      <div className="min-h-screen bg-background">{children}</div>
    </PublicOnlyGate>
  );
}
