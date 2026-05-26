"use client";

import { useRouter } from "next/navigation";
import { AboutScreen } from "@/components/auth/AboutScreen";

export function AboutClient() {
  const router = useRouter();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };
  return <AboutScreen onBack={handleBack} />;
}
