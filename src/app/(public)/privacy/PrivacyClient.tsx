"use client";

import { useRouter } from "next/navigation";
import { PrivacyPolicyScreen } from "@/components/auth/PrivacyPolicyScreen";

export function PrivacyClient() {
  const router = useRouter();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };
  return <PrivacyPolicyScreen onBack={handleBack} />;
}
