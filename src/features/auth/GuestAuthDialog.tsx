"use client";

/**
 * The landing page's full sign-in flow (Google / Facebook / email / phone OTP,
 * forgot-password, auth notices, in-app-browser guard) repackaged as a
 * self-contained dialog for guest mode. Mount it once on a guest-visible screen
 * and open it from anywhere via useAuthPromptStore — every auth-gated tap
 * (ranked, find-opponent, friend rooms, real-coin games) funnels here.
 *
 * On success the auth store flips to `authenticated` and AppAuthGate re-renders
 * the page in its signed-in state (or routes to onboarding when incomplete).
 */

import { WelcomeLoginDialog } from "@/features/welcome/WelcomeLoginDialog";
import { WelcomeAuthNoticeModal } from "@/features/welcome/WelcomeAuthNoticeModal";
import { WelcomeOpenInBrowserModal } from "@/features/welcome/WelcomeOpenInBrowserModal";
import { useWelcomeAuthController } from "@/features/welcome/useWelcomeAuthController";
import { useGeorgianPhoneAuthAvailability } from "@/lib/auth/useGeorgianPhoneAuthAvailability";
import { useAuthPromptStore } from "@/stores/authPrompt.store";

export function GuestAuthDialog() {
  const isOpen = useAuthPromptStore((state) => state.isOpen);
  const close = useAuthPromptStore((state) => state.close);
  const auth = useWelcomeAuthController();
  const phoneAuthAvailability = useGeorgianPhoneAuthAvailability();

  return (
    <>
      <WelcomeLoginDialog
        open={isOpen}
        googleClientId={auth.googleClientId}
        disableGoogleIdentityOverlay={auth.disableGoogleIdentityOverlay}
        authMode={auth.authMode}
        authEmail={auth.authEmail}
        authPassword={auth.authPassword}
        authConfirmPassword={auth.authConfirmPassword}
        authPhone={auth.authPhone}
        authOtp={auth.authOtp}
        authSubmitting={auth.authSubmitting}
        authNotice={auth.authNotice}
        authError={auth.authError}
        authFieldErrors={auth.authFieldErrors}
        phoneOtpSent={auth.phoneOtpSent}
        socialSubmitting={auth.socialSubmitting}
        showAdvancedAuth={auth.showAdvancedAuth}
        showForgot={auth.showForgot}
        forgotSubmitting={auth.forgotSubmitting}
        forgotSent={auth.forgotSent}
        forgotError={auth.forgotError}
        showPhoneAuth={phoneAuthAvailability.isAvailable}
        showFacebookLogin={auth.showFacebookLogin}
        onOpenChange={(open) => {
          auth.handleLoginDialogOpenChange(open);
          if (!open) close();
        }}
        onClose={() => {
          auth.handleCloseLoginDialog();
          close();
        }}
        onGoogleLogin={auth.handleGoogleLogin}
        onGoogleCredential={auth.handleGoogleCredential}
        onFacebookLogin={auth.handleFacebookLogin}
        onAuthModeChange={auth.handleAuthModeChange}
        onEmailChange={auth.setAuthEmail}
        onPasswordChange={auth.setAuthPassword}
        onConfirmPasswordChange={auth.setAuthConfirmPassword}
        onPhoneChange={auth.setAuthPhone}
        onOtpChange={auth.setAuthOtp}
        onEmailSubmit={auth.handleEmailAuth}
        onPhoneSubmit={auth.handlePhoneAuth}
        onToggleAdvancedAuth={auth.toggleAdvancedAuth}
        onShowForgot={auth.handleShowForgot}
        onBackToSignIn={auth.handleBackToSignIn}
        onForgotSubmit={auth.handleForgotSubmit}
      />

      <WelcomeAuthNoticeModal
        open={auth.authNoticeModal !== null}
        variant={auth.authNoticeModal ?? "check-email"}
        onClose={auth.handleCloseAuthNoticeModal}
        onGoToSignIn={auth.handleNoticeModalGoToSignIn}
        onRestorePendingDeletion={auth.handleRestorePendingDeletion}
        restoreSubmitting={auth.restoreSubmitting}
        restoreError={auth.restoreError}
      />

      <WelcomeOpenInBrowserModal
        open={auth.openInBrowserModalOpen}
        platform={auth.inAppBrowserPlatform}
        app={auth.inAppBrowserApp}
        onClose={auth.handleCloseOpenInBrowserModal}
      />
    </>
  );
}
