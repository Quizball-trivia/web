"use client";

import { useRouter } from "next/navigation";
import { TermsOfServiceScreen } from "@/components/auth/TermsOfServiceScreen";

export function TermsClient() {
  const router = useRouter();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };
  return <TermsOfServiceScreen onBack={handleBack} />;
}
