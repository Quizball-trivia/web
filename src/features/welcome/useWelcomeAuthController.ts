'use client';

/**
 * Controller hook for the WelcomeScreen login dialog.
 *
 * Owns:
 *  - the useState fields for the dialog (open, mode, form fields,
 *    submitting, error/notice, phone-OTP-sent)
 *  - the submit handlers (Google credential + redirect fallback, email,
 *    phone OTP)
 *  - the login dialog open/close handler that resets the form
 *
 * Returns one object the dialog component reads. Behavior must stay
 * byte-identical to the inline version — every analytics event, every
 * redirect, every error-message fallback preserved.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  login,
  register,
  forgotPassword,
  isPendingDeletionAuthError,
  restorePendingDeletionWithLogin,
  socialLogin,
  socialLoginWithIdToken,
  startGeorgianPhoneOtp,
  verifyGeorgianPhoneOtp,
} from '@/lib/auth/auth.service';
import { signInWithGoogleIdentity, type GoogleCredential } from '@/lib/auth/google-identity';
import { getInAppBrowserApp, getPlatform, isPopupBlockedInAppBrowser } from '@/lib/auth/in-app-browser';
import { useAuthStore } from '@/stores/auth.store';
import { useLocale } from '@/contexts/LocaleContext';
import {
  trackLoginCompleted,
  trackSignupCompleted,
  trackSignupStarted,
} from '@/lib/analytics/game-events';

import type { AuthPanelMode } from './welcome.types';
import type { AuthNoticeVariant } from './WelcomeAuthNoticeModal';
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

type PendingRestoreAction =
  | { kind: 'email'; email: string; password: string }
  | { kind: 'phone'; phone: string; token: string }
  | { kind: 'social-token'; provider: 'google'; idToken: string; nonce?: string };

export function useWelcomeAuthController() {
  const { t, locale } = useLocale();
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';
  const inAppBrowserApp = useMemo(() => getInAppBrowserApp(), []);
  const authInAppBrowser = inAppBrowserApp !== null;
  // GIS id_token sign-in works inside in-app browsers (Instagram, Messenger,
  // Facebook, …) where Google blocks the classic OAuth redirect, so the GIS
  // overlay is always enabled. We never force users out to an external browser.
  const disableGoogleIdentityOverlay = false;
  // Facebook sign-in only has the OAuth *redirect* flow (no in-webview token
  // equivalent like Google's GIS), and that redirect can't complete inside an
  // in-app browser (Instagram/Messenger/…) — it dead-ends. So hide the Facebook
  // button there and steer users to Google / email / phone, which all work.
  const showFacebookLogin = !authInAppBrowser;
  // Messenger/Facebook webviews block Google's GIS popup (it opens a blank
  // accounts.google.com page), so social sign-in can't complete there at all.
  // Show an "open in your browser" instructions modal for those. Instagram is
  // excluded — its webview allows the popup, so Google works in place.
  const showOpenInBrowserModal = isPopupBlockedInAppBrowser(inAppBrowserApp);
  const inAppBrowserPlatform = getPlatform();

  const [loginOpen, setLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthPanelMode>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  // Centered post-signup confirmation modal (check-email vs already-registered).
  const [authNoticeModal, setAuthNoticeModal] = useState<AuthNoticeVariant | null>(null);
  const [pendingRestoreAction, setPendingRestoreAction] = useState<PendingRestoreAction | null>(null);
  const [restoreSubmitting, setRestoreSubmitting] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authFieldErrors, setAuthFieldErrors] = useState<AuthFieldErrors>({});
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  // Which social provider is mid-sign-in, so the button shows a spinner +
  // disables immediately on press (the GIS token exchange / GIS-wait / OAuth
  // redirect are all async with otherwise no feedback).
  const [socialSubmitting, setSocialSubmitting] = useState<'google' | 'facebook' | null>(null);
  const googleCredentialInFlightRef = useRef(false);

  const [showAdvancedAuth, setShowAdvancedAuth] = useState(false);

  // In-modal forgot-password panel (reached from the sign-in "Forgot password?"
  // link — no page navigation; stays in the blue login dialog).
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const resetAuthFeedback = useCallback(() => {
    setAuthError(null);
    setAuthNotice(null);
    setAuthFieldErrors({});
    setRestoreError(null);
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
    setPendingRestoreAction(null);
    setRestoreSubmitting(false);
    setRestoreError(null);
  }, [resetAuthFeedback]);

  // Switching tabs uses resetAuthForm (keeps the panel open); only closing the
  // dialog collapses it.
  const resetAuthDialog = useCallback(() => {
    resetAuthForm();
    setShowAdvancedAuth(false);
  }, [resetAuthForm]);

  const toggleAdvancedAuth = useCallback(() => {
    setShowAdvancedAuth((current) => !current);
  }, []);

  const handleKickOff = useCallback(() => setLoginOpen(true), []);

  const handleLoginDialogOpenChange = useCallback(
    (open: boolean) => {
      setLoginOpen(open);
      if (!open) {
        resetAuthDialog();
      }
    },
    [resetAuthDialog],
  );

  const handleCloseLoginDialog = useCallback(() => {
    setLoginOpen(false);
    resetAuthDialog();
  }, [resetAuthDialog]);

  const handleAuthModeChange = useCallback(
    (mode: AuthPanelMode) => {
      setAuthMode(mode);
      resetAuthForm();
    },
    [resetAuthForm],
  );

  // Exchange a Google id_token (from the overlaid GIS button — the path that
  // works inside in-app browsers like Instagram) for a session. The classic
  // redirect is only a last-ditch fallback in handleGoogleLogin below.
  const handleGoogleCredential = useCallback(
    async (credential: GoogleCredential) => {
      if (googleCredentialInFlightRef.current) return;
      googleCredentialInFlightRef.current = true;
      trackSignupStarted('google');
      setSocialSubmitting('google');
      try {
        await socialLoginWithIdToken('google', credential.idToken, credential.nonce);
        await bootstrap({ force: true });
        setLoginOpen(false);
      } catch (error) {
        if (isPendingDeletionAuthError(error)) {
          setPendingRestoreAction({
            kind: 'social-token',
            provider: 'google',
            idToken: credential.idToken,
            nonce: credential.nonce,
          });
          setAuthNoticeModal('pending-deletion');
          setLoginOpen(true);
          return;
        }
        console.error('Google credential sign-in failed', error);
        setAuthError(t('welcome.loginError'));
      } finally {
        googleCredentialInFlightRef.current = false;
        setSocialSubmitting(null);
      }
    },
    [bootstrap, t],
  );

  // Fallback for when the overlaid GIS button never rendered (GIS unavailable
  // in a locked-down webview): try One Tap, then the classic redirect.
  const handleGoogleLogin = useCallback(async () => {
    if (socialSubmitting) return;
    trackSignupStarted('google');
    setSocialSubmitting('google');

    if (googleClientId) {
      let googleIdentity: { idToken: string; nonce?: string } | null = null;
      try {
        googleIdentity = await signInWithGoogleIdentity(googleClientId);
        await socialLoginWithIdToken('google', googleIdentity.idToken, googleIdentity.nonce);
        await bootstrap({ force: true });
        return;
      } catch (gisError) {
        if (googleIdentity && isPendingDeletionAuthError(gisError)) {
          setPendingRestoreAction({
            kind: 'social-token',
            provider: 'google',
            idToken: googleIdentity.idToken,
            nonce: googleIdentity.nonce,
          });
          setAuthNoticeModal('pending-deletion');
          setLoginOpen(true);
          setSocialSubmitting(null);
          return;
        }
        console.warn('GIS sign-in unavailable', gisError);
        if (authInAppBrowser) {
          // GIS unavailable in this webview, and Google blocks the classic OAuth
          // redirect inside embedded browsers — surface email/phone instead of
          // dead-ending the user (never force an external-browser bounce).
          setSocialSubmitting(null);
          setShowAdvancedAuth(true);
          setLoginOpen(true);
          return;
        }
      }
    }

    try {
      // Navigates away (window.location); the spinner stays until the page unloads.
      const redirectTo = `${window.location.origin}/auth/callback`;
      await socialLogin('google', redirectTo);
    } catch (error) {
      console.error('Google login failed', error);
      setSocialSubmitting(null);
    }
  }, [authInAppBrowser, bootstrap, googleClientId, socialSubmitting]);

  const handleFacebookLogin = useCallback(async () => {
    if (socialSubmitting) return;
    trackSignupStarted('facebook');
    setSocialSubmitting('facebook');

    try {
      // Navigates away (window.location); the spinner stays until the page unloads.
      const redirectTo = `${window.location.origin}/auth/callback`;
      await socialLogin('facebook', redirectTo);
    } catch (error) {
      console.error('Facebook login failed', error);
      setSocialSubmitting(null);
    }
  }, [socialSubmitting]);

  const handleEmailAuth = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resetAuthFeedback();
      setShowAdvancedAuth(true);

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
            // Centered modal instead of the easy-to-miss inline notice.
            // `alreadyRegistered` distinguishes "email already has an account"
            // (no email sent) from a genuine new signup awaiting confirmation.
            if (result.pendingDeletion) {
              setPendingRestoreAction({ kind: 'email', email: authEmail, password: authPassword });
              setAuthNoticeModal('pending-deletion');
            } else {
              setAuthNoticeModal(result.alreadyRegistered ? 'already-registered' : 'check-email');
            }
            setAuthMode('signin');
            setAuthPassword('');
            setAuthConfirmPassword('');
            setAuthFieldErrors({});
            return;
          }
          trackSignupCompleted('email');
        } else {
          try {
            await login(authEmail, authPassword);
          } catch (error) {
            if (isPendingDeletionAuthError(error)) {
              setPendingRestoreAction({ kind: 'email', email: authEmail, password: authPassword });
              setAuthNoticeModal('pending-deletion');
              return;
            }
            throw error;
          }
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

  const handleCloseAuthNoticeModal = useCallback(() => {
    setAuthNoticeModal(null);
    setPendingRestoreAction(null);
    setRestoreSubmitting(false);
    setRestoreError(null);
  }, []);

  // From the "already registered" modal: dismiss it and land the user on the
  // sign-in tab (dialog stays open) so they can log in right away.
  const handleNoticeModalGoToSignIn = useCallback(() => {
    setAuthNoticeModal(null);
    setPendingRestoreAction(null);
    setRestoreSubmitting(false);
    setRestoreError(null);
    setAuthMode('signin');
    setShowAdvancedAuth(true);
    setLoginOpen(true);
  }, []);

  const handleRestorePendingDeletion = useCallback(async () => {
    if (!pendingRestoreAction || restoreSubmitting) {
      return;
    }

    setRestoreSubmitting(true);
    setRestoreError(null);
    try {
      if (pendingRestoreAction.kind === 'email') {
        await restorePendingDeletionWithLogin(pendingRestoreAction.email, pendingRestoreAction.password);
        trackLoginCompleted('email');
      } else if (pendingRestoreAction.kind === 'phone') {
        // Re-verify with the OTP the user just entered (still valid), passing
        // the restore flag — restorePendingDeletionWithToken() sent no identity
        // material, so the phone restore would otherwise fail.
        await verifyGeorgianPhoneOtp(pendingRestoreAction.phone, pendingRestoreAction.token, {
          restorePendingDeletion: true,
        });
        trackLoginCompleted('phone');
      } else {
        await socialLoginWithIdToken(
          pendingRestoreAction.provider,
          pendingRestoreAction.idToken,
          pendingRestoreAction.nonce,
          { restorePendingDeletion: true },
        );
        trackLoginCompleted(pendingRestoreAction.provider);
      }

      await bootstrap({ force: true });
      setAuthNoticeModal(null);
      setPendingRestoreAction(null);
      setLoginOpen(false);
      resetAuthForm();
    } catch (error) {
      setRestoreError(authErrorMessage(error, t('welcome.restoreAccountFailed')));
      setRestoreSubmitting(false);
    }
  }, [bootstrap, pendingRestoreAction, resetAuthForm, restoreSubmitting, t]);

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
      setShowAdvancedAuth(true);
      const validationErrorKey = phoneOtpSent ? validateOtp(authOtp) : validateGeorgianPhone(authPhone);
      if (validationErrorKey) {
        setAuthError(t(validationErrorKey));
        return;
      }

      setAuthSubmitting(true);

      try {
        const normalizedPhone = normalizeGeorgianPhone(authPhone);
        if (!phoneOtpSent) {
          await startGeorgianPhoneOtp(normalizedPhone);
          setAuthPhone(normalizedPhone);
          setPhoneOtpSent(true);
          setAuthNotice(t('welcome.phoneCodeSent'));
          toast.success(t('welcome.phoneCodeSentTitle'), {
            description: t('welcome.phoneCodeSent'),
          });
          return;
        }

        try {
          await verifyGeorgianPhoneOtp(normalizedPhone, authOtp);
        } catch (error) {
          if (isPendingDeletionAuthError(error)) {
            setPendingRestoreAction({ kind: 'phone', phone: normalizedPhone, token: authOtp });
            setAuthNoticeModal('pending-deletion');
            return;
          }
          throw error;
        }
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
    handleLoginDialogOpenChange,
    handleCloseLoginDialog,
    handleKickOff,

    // Google client id + credential handler for the overlaid GIS button
    googleClientId,
    handleGoogleCredential,
    disableGoogleIdentityOverlay,

    // Hide Facebook inside in-app browsers (its redirect can't complete there)
    showFacebookLogin,

    // Messenger/Facebook webview: Google popup is blocked, show "open in browser"
    showOpenInBrowserModal,
    inAppBrowserPlatform,

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
    authNoticeModal,
    handleCloseAuthNoticeModal,
    handleNoticeModalGoToSignIn,
    handleRestorePendingDeletion,
    restoreSubmitting,
    restoreError,
    authError,
    authFieldErrors,
    phoneOtpSent,
    socialSubmitting,

    // "More sign-in options" disclosure
    showAdvancedAuth,
    toggleAdvancedAuth,

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
