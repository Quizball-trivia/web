"use client";

import { useRouter } from "next/navigation";
import { PrivacyPolicyScreen } from "@/components/auth/PrivacyPolicyScreen";

export function PrivacyClient() {
  const router = useRouter();
  return <PrivacyPolicyScreen onBack={() => router.back()} />;
}
