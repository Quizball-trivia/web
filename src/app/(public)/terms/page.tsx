"use client";

import { useRouter } from "next/navigation";
import { TermsOfServiceScreen } from "@/components/auth/TermsOfServiceScreen";

export default function TermsPage() {
  const router = useRouter();

  return <TermsOfServiceScreen onBack={() => router.back()} />;
}
