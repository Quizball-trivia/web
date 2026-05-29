'use client';

import { ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { useLocale } from '@/contexts/LocaleContext';
import { getPlatform, tryOpenInExternalBrowser } from '@/lib/auth/in-app-browser';
import { InAppBrowserInstructions } from './InAppBrowserInstructions';
import { WelcomeGoogleButton } from './WelcomeGoogleButton';
import { WelcomeFacebookButton } from './WelcomeFacebookButton';
import { WelcomeEmailAuthForm } from './WelcomeEmailAuthForm';
import { WelcomePhoneAuthForm } from './WelcomePhoneAuthForm';
import { WelcomeForgotPasswordForm } from './WelcomeForgotPasswordForm';
import type { AuthPanelMode } from './welcome.types';
import type { AuthFieldErrors } from '@/lib/auth/validation';

interface WelcomeLoginDialogProps {
  open: boolean;
  showOpenInBrowser: boolean;
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
  showOpenInBrowser,
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
  const authModes: AuthPanelMode[] = showPhoneAuth
    ? ['signin', 'signup', 'phone']
    : ['signin', 'signup'];
  const effectiveAuthMode: AuthPanelMode =
    showPhoneAuth || authMode !== 'phone' ? authMode : 'signin';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md w-[92vw] overflow-y-auto overflow-x-hidden rounded-[24px] border-0 bg-brand-blue p-5 sm:p-8 md:p-10 [&>button:last-child]:hidden focus:outline-none focus-visible:outline-none focus-visible:ring-0 ring-0">
        <ModalCloseButton onClose={onClose} />

        {showOpenInBrowser ? (
          <InAppBrowserInstructions
            platform={getPlatform()}
            onTryAgain={() => tryOpenInExternalBrowser(window.location.href)}
          />
        ) : showForgot ? (
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
            <div className="mt-6 space-y-3">
              <WelcomeGoogleButton onClick={onGoogleLogin} />
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

            {showAdvancedAuth ? (
              <div id="welcome-auth-options" className="space-y-4">
                <div
                  className={`grid gap-1 rounded-full bg-black/18 p-1 ${
                    showPhoneAuth ? 'grid-cols-3' : 'grid-cols-2'
                  }`}
                >
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
                      {mode === 'signin'
                        ? t('welcome.signInTab')
                        : mode === 'signup'
                          ? t('welcome.signUpTab')
                          : t('welcome.phoneTab')}
                    </button>
                  ))}
                </div>

                {effectiveAuthMode === 'phone' ? (
                  <WelcomePhoneAuthForm
                    phone={authPhone}
                    otp={authOtp}
                    otpSent={phoneOtpSent}
                    submitting={authSubmitting}
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

            {authNotice ? (
              <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-center font-poppins text-xs font-semibold leading-relaxed text-white">
                {authNotice}
              </p>
            ) : null}
            {authError ? (
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
