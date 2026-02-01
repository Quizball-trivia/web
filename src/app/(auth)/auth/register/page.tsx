"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RegisterScreen } from "@/components/auth/RegisterScreen";
import { register, socialLogin } from "@/lib/auth/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export default function RegisterPage() {
  const router = useRouter();
  const bootstrap = useAuthStore((state) => state.bootstrap);

  const handleRegister = async (_username: string, email: string, password: string) => {
    try {
      await register({ email, password });
      await bootstrap();
      router.replace("/onboarding");
    } catch (error) {
      toast.error("Registration failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      await socialLogin("google", redirectTo);
    } catch (error) {
      toast.error("Google sign up failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <RegisterScreen
      onRegister={handleRegister}
      onGoogleRegister={handleGoogleRegister}
      onBack={() => router.push("/auth/welcome")}
      onSignIn={() => router.push("/auth/login")}
      onTerms={() => router.push("/terms")}
      onPrivacy={() => router.push("/privacy")}
    />
  );
}
