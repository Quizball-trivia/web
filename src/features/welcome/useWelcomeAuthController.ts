'use client';

/**
 * Controller hook for the WelcomeScreen login dialog.
 *
 * Owns:
 *  - the 11 useState fields for the dialog (open, mode, form fields,
 *    submitting, error/notice, phone-OTP-sent, in-app-browser panel)
 *  - the in-app-browser bounce timer ref + unmount cleanup
 *  - the three submit handlers (Google, email, phone OTP)
 *  - the login dialog open/close handler that resets the form
 *
 * Returns one object the dialog component reads. Behavior must stay
 * byte-identical to the inline version — every analytics event, every
 * redirect, every error-message fallback preserved.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  login,
  register,
  forgotPassword,
  socialLogin,
  socialLoginWithIdToken,
  startGeorgianPhoneOtp,
  verifyGeorgianPhoneOtp,
} from '@/lib/auth/auth.service';
import { signInWithGoogleIdentity } from '@/lib/auth/google-identity';
import { isInAppBrowser, tryOpenInExternalBrowser } from '@/lib/auth/in-app-browser';
import { useAuthStore } from '@/stores/auth.store';
import { useLocale } from '@/contexts/LocaleContext';
import {
  trackLoginCompleted,
  trackSignupCompleted,
  trackSignupStarted,
} from '@/lib/analytics/game-events';

import type { AuthPanelMode } from './welcome.types';
import { authErrorMessage } from './welcome.helpers';
import {
  validateLogin,
  validateSignup,
  validateEmail,
  validateGeorgianPhone,
  validateOtp,
  normalizeGeorgianPhone,
  hasErrors,
  type AuthFieldErrors,
} from '@/lib/auth/validation';

export function useWelcomeAuthController() {
  const { t, locale } = useLocale();
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

  const [loginOpen, setLoginOpen] = useState(false);
  const [showOpenInBrowser, setShowOpenInBrowser] = useState(false);
  const [authMode, setAuthMode] = useState<AuthPanelMode>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authFieldErrors, setAuthFieldErrors] = useState<AuthFieldErrors>({});
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);

  // In-modal forgot-password panel (reached from the sign-in "Forgot password?"
  // link — no page navigation; stays in the blue login dialog).
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Tracks the 1.5s timer that reveals the in-app-browser instructions panel.
  // Held in a ref so we can cancel it when the user closes the dialog or the
  // component unmounts — otherwise the panel can flash open after dismissal.
  const inAppBrowserTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel the pending in-app-browser instructions timer on unmount so it
  // can't fire setState against a torn-down component.
  useEffect(() => {
    return () => {
      if (inAppBrowserTimerRef.current !== null) {
        clearTimeout(inAppBrowserTimerRef.current);
        inAppBrowserTimerRef.current = null;
      }
    };
  }, []);

  const resetAuthFeedback = useCallback(() => {
    setAuthError(null);
    setAuthNotice(null);
    setAuthFieldErrors({});
  }, []);

  const resetAuthForm = useCallback(() => {
    resetAuthFeedback();
    setAuthPassword('');
    setAuthConfirmPassword('');
    setAuthOtp('');
    setPhoneOtpSent(false);
    setAuthSubmitting(false);
    setShowForgot(false);
    setForgotSent(false);
    setForgotError(null);
    setForgotSubmitting(false);
  }, [resetAuthFeedback]);

  const handleKickOff = useCallback(() => setLoginOpen(true), []);

  const handleLoginDialogOpenChange = useCallback(
    (open: boolean) => {
      setLoginOpen(open);
      if (!open) {
        setShowOpenInBrowser(false);
        resetAuthForm();
        if (inAppBrowserTimerRef.current !== null) {
          clearTimeout(inAppBrowserTimerRef.current);
          inAppBrowserTimerRef.current = null;
        }
      }
    },
    [resetAuthForm],
  );

  const handleCloseLoginDialog = useCallback(() => {
    setLoginOpen(false);
    setShowOpenInBrowser(false);
    resetAuthForm();
    if (inAppBrowserTimerRef.current !== null) {
      clearTimeout(inAppBrowserTimerRef.current);
      inAppBrowserTimerRef.current = null;
    }
  }, [resetAuthForm]);

  const handleAuthModeChange = useCallback(
    (mode: AuthPanelMode) => {
      setAuthMode(mode);
      resetAuthForm();
    },
    [resetAuthForm],
  );

  const handleGoogleLogin = useCallback(async () => {
    trackSignupStarted('google');

    // In-app browsers (Messenger, Instagram, etc.) — Google blocks OAuth in
    // these webviews. Fire the bounce URL silently; only show the manual
    // instructions panel if we're still here after ~1.5s (OS ignored it).
    if (isInAppBrowser()) {
      tryOpenInExternalBrowser(window.location.href);
      if (inAppBrowserTimerRef.current !== null) {
        clearTimeout(inAppBrowserTimerRef.current);
      }
      inAppBrowserTimerRef.current = setTimeout(() => {
        inAppBrowserTimerRef.current = null;
        if (typeof document !== 'undefined' && !document.hidden) {
          setShowOpenInBrowser(true);
        }
      }, 1500);
      return;
    }

    if (googleClientId) {
      try {
        const { idToken, nonce } = await signInWithGoogleIdentity(googleClientId);
        await socialLoginWithIdToken('google', idToken, nonce);
        await bootstrap({ force: true });
        return;
      } catch (gisError) {
        console.warn('GIS sign-in unavailable, falling back to redirect', gisError);
      }
    }

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      await socialLogin('google', redirectTo);
    } catch (error) {
      console.error('Google login failed', error);
    }
  }, [bootstrap, googleClientId]);

  const handleFacebookLogin = useCallback(async () => {
    trackSignupStarted('facebook');

    // Same in-app-browser guard as Google: Facebook also blocks OAuth inside
    // Messenger/Instagram webviews, so bounce to the external browser.
    if (isInAppBrowser()) {
      tryOpenInExternalBrowser(window.location.href);
      if (inAppBrowserTimerRef.current !== null) {
        clearTimeout(inAppBrowserTimerRef.current);
      }
      inAppBrowserTimerRef.current = setTimeout(() => {
        inAppBrowserTimerRef.current = null;
        if (typeof document !== 'undefined' && !document.hidden) {
          setShowOpenInBrowser(true);
        }
      }, 1500);
      return;
    }

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      await socialLogin('facebook', redirectTo);
    } catch (error) {
      console.error('Facebook login failed', error);
    }
  }, []);

  const handleEmailAuth = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resetAuthFeedback();

      // Validate with the shared helper BEFORE any API call.
      const fieldErrors =
        authMode === 'signup'
          ? validateSignup(authEmail, authPassword, authConfirmPassword)
          : validateLogin(authEmail, authPassword);
      if (hasErrors(fieldErrors)) {
        setAuthFieldErrors(fieldErrors);
        return;
      }

      setAuthSubmitting(true);
      try {
        if (authMode === 'signup') {
          trackSignupStarted('email');
          const redirectTo = `${window.location.origin}/auth/callback`;
          const result = await register({
            email: authEmail,
            password: authPassword,
            redirect_to: redirectTo,
            locale,
          });
          if (!result.tokensSet) {
            // Neutral confirmation when Supabase requires email confirmation.
            setAuthNotice(t('welcome.checkEmail'));
            setAuthMode('signin');
            setAuthPassword('');
            setAuthConfirmPassword('');
            setAuthFieldErrors({});
            return;
          }
          trackSignupCompleted('email');
        } else {
          await login(authEmail, authPassword);
          trackLoginCompleted('email');
        }

        await bootstrap({ force: true });
        setLoginOpen(false);
        resetAuthForm();
      } catch (error) {
        // Sign-in failures get a single generic message (no account enumeration,
        // and a hint toward Google for Google-created accounts). Sign-up keeps
        // the more specific upstream message.
        if (authMode === 'signin') {
          setAuthError(t('welcome.loginError'));
        } else {
          setAuthError(authErrorMessage(error, t('welcome.emailAuthFailed')));
        }
      } finally {
        setAuthSubmitting(false);
      }
    },
    [authConfirmPassword, authEmail, authMode, authPassword, bootstrap, locale, resetAuthFeedback, resetAuthForm, t],
  );

  const handleShowForgot = useCallback(() => {
    resetAuthFeedback();
    setForgotError(null);
    setForgotSent(false);
    setShowForgot(true);
  }, [resetAuthFeedback]);

  const handleBackToSignIn = useCallback(() => {
    setShowForgot(false);
    setForgotError(null);
    setForgotSent(false);
  }, []);

  const handleForgotSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setForgotError(null);

      const emailErrorKey = validateEmail(authEmail);
      if (emailErrorKey) {
        setForgotError(t(emailErrorKey));
        return;
      }

      setForgotSubmitting(true);
      try {
        const redirectTo = `${window.location.origin}/auth/reset-password`;
        await forgotPassword(authEmail, redirectTo);
        // Generic success only after the request succeeds; never disclose
        // whether the account exists.
        setForgotSent(true);
      } catch {
        setForgotError(t('forgotPassword.sendFailed'));
      } finally {
        setForgotSubmitting(false);
      }
    },
    [authEmail, t],
  );

  const handlePhoneAuth = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resetAuthFeedback();
      const validationErrorKey = phoneOtpSent ? validateOtp(authOtp) : validateGeorgianPhone(authPhone);
      if (validationErrorKey) {
        setAuthError(t(validationErrorKey));
        return;
      }

      setAuthSubmitting(true);

      try {
        const normalizedPhone = normalizeGeorgianPhone(authPhone);
        if (!phoneOtpSent) {
          trackSignupStarted('phone');
          await startGeorgianPhoneOtp(normalizedPhone);
          setAuthPhone(normalizedPhone);
          setPhoneOtpSent(true);
          setAuthNotice(t('welcome.phoneCodeSent'));
          return;
        }

        await verifyGeorgianPhoneOtp(normalizedPhone, authOtp);
        trackLoginCompleted('phone');
        await bootstrap({ force: true });
        setLoginOpen(false);
        resetAuthForm();
      } catch (error) {
        setAuthError(authErrorMessage(error, t('welcome.phoneAuthFailed')));
      } finally {
        setAuthSubmitting(false);
      }
    },
    [authOtp, authPhone, bootstrap, phoneOtpSent, resetAuthFeedback, resetAuthForm, t],
  );

  const handlePhoneFieldChange = useCallback(
    (value: string) => {
      setAuthPhone(value);
      setPhoneOtpSent(false);
      setAuthOtp('');
      resetAuthFeedback();
    },
    [resetAuthFeedback],
  );

  return {
    // Dialog visibility
    loginOpen,
    setLoginOpen,
    showOpenInBrowser,
    handleLoginDialogOpenChange,
    handleCloseLoginDialog,
    handleKickOff,

    // Auth panel mode + form fields
    authMode,
    handleAuthModeChange,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authConfirmPassword,
    setAuthConfirmPassword,
    authPhone,
    setAuthPhone: handlePhoneFieldChange,
    authOtp,
    setAuthOtp,

    // Submit state + feedback
    authSubmitting,
    authNotice,
    authError,
    authFieldErrors,
    phoneOtpSent,

    // Forgot-password panel (in-modal)
    showForgot,
    forgotSubmitting,
    forgotSent,
    forgotError,

    // Submit handlers
    handleGoogleLogin,
    handleFacebookLogin,
    handleEmailAuth,
    handlePhoneAuth,
    handleShowForgot,
    handleBackToSignIn,
    handleForgotSubmit,
  };
}
