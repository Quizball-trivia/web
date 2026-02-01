"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { login, socialLogin } from "@/lib/auth/auth.service";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { useAuthStore } from "@/stores/auth.store";

export default function LoginPage() {
  const router = useRouter();
  const bootstrap = useAuthStore((state) => state.bootstrap);

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      await bootstrap();
      const onboardingCompleted = storage.get(STORAGE_KEYS.ONBOARDING_COMPLETE, false);
      router.replace(onboardingCompleted ? "/" : "/onboarding");
    } catch (error) {
      toast.error("Login failed", {
        description:
          error instanceof Error
            ? error.message
            : "Please check your credentials and try again.",
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      await socialLogin("google", redirectTo);
    } catch (error) {
      toast.error("Google login failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  const handleFacebookLogin = () => {
    toast.error("Facebook login", { description: "Coming soon!" });
  };

  return (
    <LoginScreen
      onLogin={handleLogin}
      onGoogleLogin={handleGoogleLogin}
      onFacebookLogin={handleFacebookLogin}
      onBack={() => router.push("/auth/welcome")}
      onForgotPassword={() => router.push("/auth/forgot-password")}
      onSignUp={() => router.push("/auth/register")}
    />
  );
}
