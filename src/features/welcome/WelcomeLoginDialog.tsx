'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { useLocale } from '@/contexts/LocaleContext';
import type { GoogleCredential } from '@/lib/auth/google-identity';
import { WelcomeGoogleButton } from './WelcomeGoogleButton';
import { WelcomeFacebookButton } from './WelcomeFacebookButton';
import { WelcomeEmailAuthForm } from './WelcomeEmailAuthForm';
import { WelcomePhoneAuthForm } from './WelcomePhoneAuthForm';
import { WelcomeForgotPasswordForm } from './WelcomeForgotPasswordForm';
import type { AuthPanelMode } from './welcome.types';
import type { AuthFieldErrors } from '@/lib/auth/validation';

interface WelcomeLoginDialogProps {
  open: boolean;
  googleClientId: string;
  authMode: AuthPanelMode;
  authEmail: string;
  authPassword: string;
  authConfirmPassword: string;
  authPhone: string;
  authOtp: string;
  authSubmitting: boolean;
  authNotice: string | null;
  authError: string | null;
  authFieldErrors: AuthFieldErrors;
  phoneOtpSent: boolean;
  showAdvancedAuth: boolean;
  showForgot: boolean;
  forgotSubmitting: boolean;
  forgotSent: boolean;
  forgotError: string | null;
  showPhoneAuth: boolean;
  onToggleAdvancedAuth: () => void;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onGoogleLogin: () => void;
  onGoogleCredential: (credential: GoogleCredential) => void;
  onFacebookLogin: () => void;
  onAuthModeChange: (mode: AuthPanelMode) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onEmailSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onPhoneSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onShowForgot: () => void;
  onBackToSignIn: () => void;
  onForgotSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function WelcomeLoginDialog({
  open,
  googleClientId,
  authMode,
  authEmail,
  authPassword,
  authConfirmPassword,
  authPhone,
  authOtp,
  authSubmitting,
  authNotice,
  authError,
  authFieldErrors,
  phoneOtpSent,
  showAdvancedAuth,
  showForgot,
  forgotSubmitting,
  forgotSent,
  forgotError,
  showPhoneAuth,
  onToggleAdvancedAuth,
  onOpenChange,
  onClose,
  onGoogleLogin,
  onGoogleCredential,
  onFacebookLogin,
  onAuthModeChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onPhoneChange,
  onOtpChange,
  onEmailSubmit,
  onPhoneSubmit,
  onShowForgot,
  onBackToSignIn,
  onForgotSubmit,
}: WelcomeLoginDialogProps) {
  const { t } = useLocale();
  // Phone is no longer its own tab — it lives under Sign In as an Email|Phone
  // method toggle (only one form shows at a time, keeping the modal short).
  // Two tabs remain; coerce any legacy 'phone' mode to 'signin'.
  const authModes: AuthPanelMode[] = ['signin', 'signup'];
  const effectiveAuthMode: AuthPanelMode =
    authMode === 'phone' ? 'signin' : authMode;

  // Which sign-in method is shown. Force Phone while an OTP is in flight so the
  // verify step isn't hidden behind the Email view.
  const [signinMethod, setSigninMethod] = useState<'email' | 'phone'>('email');
  const activeSigninMethod: 'email' | 'phone' = phoneOtpSent ? 'phone' : signinMethod;
  const phoneFormActive =
    showPhoneAuth && effectiveAuthMode === 'signin' && activeSigninMethod === 'phone';
  // Once the OTP code has been sent, collapse the social buttons, options
  // disclosure, tabs, and method toggle so the modal becomes a focused
  // "enter your code" step. The phone form itself shows a "change number"
  // affordance, so the user can still correct a typo without this chrome.
  const inOtpStep = phoneFormActive && phoneOtpSent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md w-[92vw] overflow-y-auto overflow-x-hidden rounded-[24px] border-0 bg-brand-blue p-5 sm:p-8 md:p-10 [&>button:last-child]:hidden focus:outline-none focus-visible:outline-none focus-visible:ring-0 ring-0">
        <ModalCloseButton onClose={onClose} />

        {showForgot ? (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-center font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
                {t('forgotPassword.title')}
              </DialogTitle>
            </DialogHeader>
            <WelcomeForgotPasswordForm
              email={authEmail}
              submitting={forgotSubmitting}
              sent={forgotSent}
              error={forgotError}
              onEmailChange={onEmailChange}
              onSubmit={onForgotSubmit}
              onBackToSignIn={onBackToSignIn}
            />
          </>
        ) : (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-center font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
                {t('welcome.loginTitle')}
              </DialogTitle>
              <DialogDescription className="mt-3 text-center font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-[14px]">
                {t('welcome.loginDescription')}
              </DialogDescription>
            </DialogHeader>
            {!inOtpStep ? (
              <>
                <div className="mt-6 space-y-3">
                  <WelcomeGoogleButton
                    clientId={googleClientId}
                    onClick={onGoogleLogin}
                    onCredential={onGoogleCredential}
                  />
                  <WelcomeFacebookButton onClick={onFacebookLogin} />
                </div>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/20" />
                  <button
                    type="button"
                    aria-expanded={showAdvancedAuth}
                    aria-controls="welcome-auth-options"
                    onClick={onToggleAdvancedAuth}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 font-poppins text-xs font-semibold uppercase tracking-wide text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
                  >
                    <span>
                      {showAdvancedAuth ? t('welcome.hideSignInOptions') : t('welcome.moreSignInOptions')}
                    </span>
                    <ChevronDown
                      className={`size-4 transition-transform ${showAdvancedAuth ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  <div className="h-px flex-1 bg-white/20" />
                </div>
              </>
            ) : null}

            {showAdvancedAuth ? (
              <div id="welcome-auth-options" className="space-y-4">
                {!inOtpStep ? (
                  <div className="grid grid-cols-2 gap-1 rounded-full bg-black/18 p-1">
                    {authModes.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onAuthModeChange(mode)}
                        className={`h-10 rounded-full font-poppins text-xs font-bold uppercase tracking-wide transition-colors ${
                          effectiveAuthMode === mode
                            ? 'bg-white text-brand-blue'
                            : 'text-white/75 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {mode === 'signin' ? t('welcome.signInTab') : t('welcome.signUpTab')}
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* Sign In: small, secondary Email | Phone method toggle (swaps
                    the form below so the modal stays short). Deliberately smaller
                    than the Sign In/Sign Up tabs. Phone has no toggle on Sign Up.
                    Hidden during the OTP step to keep the modal focused. */}
                {!inOtpStep && showPhoneAuth && effectiveAuthMode === 'signin' ? (
                  <div className="flex justify-center">
                    <div className="inline-flex gap-0.5 rounded-full bg-black/12 p-0.5">
                      {(['email', 'phone'] as const).map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setSigninMethod(method)}
                          aria-pressed={activeSigninMethod === method}
                          className={`h-6 rounded-full px-3 font-poppins text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                            activeSigninMethod === method
                              ? 'bg-white/90 text-brand-blue'
                              : 'text-white/60 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {method === 'email' ? t('welcome.emailMethod') : t('welcome.phoneMethod')}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {phoneFormActive ? (
                  <WelcomePhoneAuthForm
                    phone={authPhone}
                    otp={authOtp}
                    otpSent={phoneOtpSent}
                    submitting={authSubmitting}
                    error={authError}
                    onPhoneChange={onPhoneChange}
                    onOtpChange={onOtpChange}
                    onSubmit={onPhoneSubmit}
                  />
                ) : (
                  <WelcomeEmailAuthForm
                    mode={effectiveAuthMode}
                    email={authEmail}
                    password={authPassword}
                    confirmPassword={authConfirmPassword}
                    submitting={authSubmitting}
                    fieldErrors={authFieldErrors}
                    onEmailChange={onEmailChange}
                    onPasswordChange={onPasswordChange}
                    onConfirmPasswordChange={onConfirmPasswordChange}
                    onSubmit={onEmailSubmit}
                    onForgotPassword={onShowForgot}
                  />
                )}
              </div>
            ) : null}

            {/* During the phone OTP step the form shows its own "code sent" hint,
                so suppress the generic notice banner to avoid duplicate messaging. */}
            {authNotice && !inOtpStep ? (
              <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-center font-poppins text-xs font-semibold leading-relaxed text-white">
                {authNotice}
              </p>
            ) : null}
            {/* The phone form renders its own inline error; avoid duplicating it
                in the big banner below. */}
            {authError && !phoneFormActive ? (
              <p className="mt-3 rounded-2xl bg-red-500/18 px-4 py-3 text-center font-poppins text-xs font-semibold leading-relaxed text-white">
                {authError}
              </p>
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
