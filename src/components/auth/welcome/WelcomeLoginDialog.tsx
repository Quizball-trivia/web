'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { useLocale } from '@/contexts/LocaleContext';
import { getPlatform, tryOpenInExternalBrowser } from '@/lib/auth/in-app-browser';
import { InAppBrowserInstructions } from './InAppBrowserInstructions';
import { WelcomeGoogleButton } from './WelcomeGoogleButton';
import { WelcomeEmailAuthForm } from './WelcomeEmailAuthForm';
import { WelcomePhoneAuthForm } from './WelcomePhoneAuthForm';
import type { AuthPanelMode } from './welcome.types';

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
  phoneOtpSent: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onGoogleLogin: () => void;
  onAuthModeChange: (mode: AuthPanelMode) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onEmailSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onPhoneSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
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
  phoneOtpSent,
  onOpenChange,
  onClose,
  onGoogleLogin,
  onAuthModeChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onPhoneChange,
  onOtpChange,
  onEmailSubmit,
  onPhoneSubmit,
}: WelcomeLoginDialogProps) {
  const { t } = useLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md w-[92vw] overflow-y-auto rounded-[24px] border-0 bg-brand-blue p-8 sm:p-10 [&>button:last-child]:hidden focus:outline-none focus-visible:outline-none focus-visible:ring-0 ring-0">
        <ModalCloseButton onClose={onClose} />

        {showOpenInBrowser ? (
          <InAppBrowserInstructions
            platform={getPlatform()}
            onTryAgain={() => tryOpenInExternalBrowser(window.location.href)}
          />
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
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/20" />
              <span className="font-poppins text-xs font-semibold uppercase tracking-wide text-white/60">
                {t('welcome.authOr')}
              </span>
              <div className="h-px flex-1 bg-white/20" />
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-full bg-black/18 p-1">
              {(['signin', 'signup', 'phone'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onAuthModeChange(mode)}
                  className={`h-10 rounded-full font-poppins text-xs font-bold uppercase tracking-wide transition-colors ${
                    authMode === mode
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

            {authMode === 'phone' ? (
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
                mode={authMode}
                email={authEmail}
                password={authPassword}
                confirmPassword={authConfirmPassword}
                submitting={authSubmitting}
                onEmailChange={onEmailChange}
                onPasswordChange={onPasswordChange}
                onConfirmPasswordChange={onConfirmPasswordChange}
                onSubmit={onEmailSubmit}
              />
            )}

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
