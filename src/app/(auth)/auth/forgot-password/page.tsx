"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ForgotPasswordScreen } from "@/components/auth/ForgotPasswordScreen";
import { forgotPassword } from "@/lib/auth/auth.service";
import { logger } from "@/utils/logger";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const handleResetPassword = async (email: string) => {
    try {
      logger.info("Forgot password submit", { email });
      await forgotPassword(email);
    } catch (error) {
      logger.warn("Forgot password failed", error);
      toast.error("Failed to send reset email", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  };

  return (
    <ForgotPasswordScreen
      onResetPassword={handleResetPassword}
      onBack={() => router.push("/auth/welcome")}
    />
  );
}
