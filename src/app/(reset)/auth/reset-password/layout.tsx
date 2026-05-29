import { APP_ROUTE_METADATA } from "@/lib/seo/app-routes";

// Deliberately NOT wrapped in PublicOnlyGate: the recovery link establishes a
// Supabase session (the user becomes authenticated), but they must stay on
// this page to set a new password. PublicOnlyGate would redirect them away.
// Transactional page — never indexed.
export const metadata = APP_ROUTE_METADATA;

export default function ResetPasswordLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="min-h-screen bg-surface-page">{children}</div>;
}
