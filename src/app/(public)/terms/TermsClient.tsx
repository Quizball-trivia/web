"use client";

import { useRouter } from "next/navigation";
import { TermsOfServiceScreen } from "@/components/auth/TermsOfServiceScreen";

export function TermsClient() {
  const router = useRouter();
  return <TermsOfServiceScreen onBack={() => router.back()} />;
}
