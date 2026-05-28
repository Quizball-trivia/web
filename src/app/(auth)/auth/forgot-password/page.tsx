"use client";

import { useRouter } from "next/navigation";
import { ForgotPasswordScreen } from "@/components/auth/ForgotPasswordScreen";
import { forgotPassword } from "@/lib/auth/auth.service";
import { logger } from "@/utils/logger";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Let errors propagate so the screen keeps the form visible and shows an
  // inline error — it must not flip to the generic success state until the
  // request actually succeeds.
  const handleResetPassword = async (email: string) => {
    logger.info("Forgot password submit");
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    await forgotPassword(email, redirectTo);
  };

  return (
    <ForgotPasswordScreen
      onResetPassword={handleResetPassword}
      onBack={() => router.push("/")}
    />
  );
}
