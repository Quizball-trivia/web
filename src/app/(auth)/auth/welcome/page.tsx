"use client";

import { useRouter } from "next/navigation";
import { WelcomeScreen } from "@/components/auth/WelcomeScreen";

export default function AuthWelcomePage() {
  const router = useRouter();

  return (
    <WelcomeScreen
      onGetStarted={() => router.push("/auth/register")}
      onLogin={() => router.push("/auth/login")}
    />
  );
}
