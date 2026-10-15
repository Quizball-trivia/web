import AppAuthGate from "@/components/auth/AppAuthGate";

/** Persistent gate across both shell entries: preserve auth dialog/recovery state. */
export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppAuthGate>{children}</AppAuthGate>
  );
}
