'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquareText, Phone } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/contexts/LocaleContext';
import { startGeorgianPhoneLink, verifyGeorgianPhoneLink } from '@/lib/auth/auth.service';
import { normalizeGeorgianPhone, validateGeorgianPhone, validateOtp } from '@/lib/auth/validation';
import {
  trackMobileVerificationCompleted,
  trackMobileVerificationFailed,
  trackMobileVerificationPromptShown,
  trackMobileVerificationSkipped,
  trackMobileVerificationStarted,
} from '@/lib/analytics/game-events';
import { ApiError } from '@/lib/api/api';
import { useAuthStore } from '@/stores/auth.store';

type MobileVerificationStepProps = {
  isCompleting: boolean;
  onContinue: () => Promise<void>;
};

type Step = 'phone' | 'otp';

function elapsedSince(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

export function MobileVerificationStep({
  isCompleting,
  onContinue,
}: MobileVerificationStepProps) {
  const { t } = useLocale();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const [step, setStep] = useState<Step>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shownAtRef = useRef(Date.now());
  const sendAttemptsRef = useRef(0);
  const verifyAttemptsRef = useRef(0);
  const promptTrackedRef = useRef(false);

  useEffect(() => {
    if (promptTrackedRef.current) return;
    promptTrackedRef.current = true;
    trackMobileVerificationPromptShown();
  }, []);

  const busy = isSubmitting || isCompleting;

  const handleSendCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const validationError = validateGeorgianPhone(phoneInput);
    if (validationError) {
      trackMobileVerificationFailed({
        step: 'phone',
        reason: 'invalid_phone',
        attempt: sendAttemptsRef.current + 1,
      });
      setError(t(validationError));
      return;
    }

    const attempt = ++sendAttemptsRef.current;
    const phone = normalizeGeorgianPhone(phoneInput);
    setIsSubmitting(true);
    try {
      const result = await startGeorgianPhoneLink(phone);
      setPhoneInput(result.phone);

      if (!result.otp_required) {
        trackMobileVerificationCompleted({
          method: 'already_verified',
          sendAttempts: attempt,
          verifyAttempts: verifyAttemptsRef.current,
          timeToCompleteMs: elapsedSince(shownAtRef.current),
        });
        await onContinue();
        return;
      }

      trackMobileVerificationStarted({
        attempt,
        timeToStartMs: elapsedSince(shownAtRef.current),
      });
      setStep('otp');
      setNotice(t('mobileVerificationExperiment.codeSent', { phone: result.phone }));
    } catch (requestError) {
      const numberInUse = requestError instanceof ApiError && requestError.status === 409;
      trackMobileVerificationFailed({
        step: 'phone',
        reason: numberInUse ? 'number_in_use' : 'request_failed',
        attempt,
      });
      setError(
        numberInUse
          ? t('settings.phoneLinkedElsewhere')
          : t('mobileVerificationExperiment.sendFailed'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const validationError = validateOtp(otp);
    if (validationError) {
      trackMobileVerificationFailed({
        step: 'otp',
        reason: 'invalid_otp',
        attempt: verifyAttemptsRef.current + 1,
      });
      setError(t(validationError));
      return;
    }

    const attempt = ++verifyAttemptsRef.current;
    setIsSubmitting(true);
    try {
      const user = await verifyGeorgianPhoneLink(
        normalizeGeorgianPhone(phoneInput),
        otp,
      );
      setAuthenticated(user);
      trackMobileVerificationCompleted({
        method: 'otp',
        sendAttempts: sendAttemptsRef.current,
        verifyAttempts: attempt,
        timeToCompleteMs: elapsedSince(shownAtRef.current),
      });
      await onContinue();
    } catch {
      trackMobileVerificationFailed({
        step: 'otp',
        reason: 'request_failed',
        attempt,
      });
      setError(t('settings.phoneOtpFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    if (busy) return;
    trackMobileVerificationSkipped({
      step,
      timeOnPromptMs: elapsedSince(shownAtRef.current),
    });
    await onContinue();
  };

  const handleChangeNumber = () => {
    if (busy) return;
    setStep('phone');
    setOtp('');
    setError(null);
    setNotice(null);
  };

  return (
    <div className="min-h-screen w-full bg-black text-white">
      <header className="px-5 pt-5 md:px-12 md:pt-6">
        <AppLogo size="md" iconOnly className="!justify-start" />
      </header>

      <main className="mx-auto flex w-full max-w-[440px] flex-col px-5 pb-10 pt-8 md:max-w-[520px] md:pt-12">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-yellow text-black md:size-20">
          {step === 'phone' ? (
            <Phone className="size-7 md:size-9" aria-hidden />
          ) : (
            <MessageSquareText className="size-7 md:size-9" aria-hidden />
          )}
        </div>

        <h1 className="mt-6 text-center font-poppins text-[28px] font-semibold uppercase leading-none md:text-[40px]">
          {step === 'phone'
            ? t('mobileVerificationExperiment.title')
            : t('mobileVerificationExperiment.codeTitle')}
        </h1>
        <p className="mt-3 text-center font-poppins text-[13px] font-semibold leading-snug text-white/65 md:text-[15px]">
          {step === 'phone'
            ? t('mobileVerificationExperiment.description')
            : t('mobileVerificationExperiment.codeDescription', {
                phone: normalizeGeorgianPhone(phoneInput),
              })}
        </p>

        <div className="mt-8 rounded-[24px] bg-brand-blue p-5 md:p-7">
          <form
            className="space-y-4"
            onSubmit={step === 'phone' ? handleSendCode : handleVerifyCode}
          >
            {step === 'phone' ? (
              <label className="block">
                <span className="mb-2 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
                  {t('mobileVerificationExperiment.phoneLabel')}
                </span>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                  <Input
                    autoComplete="tel"
                    type="tel"
                    value={phoneInput}
                    onChange={(event) => {
                      setPhoneInput(event.target.value);
                      setError(null);
                    }}
                    placeholder={t('welcome.phonePlaceholder')}
                    className="h-[56px] rounded-[18px] border-2 border-white/15 bg-white/10 pl-11 font-poppins text-base font-semibold text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={busy}
                  />
                </div>
              </label>
            ) : (
              <label className="block">
                <span className="mb-2 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
                  {t('welcome.otpLabel')}
                </span>
                <Input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                    setError(null);
                  }}
                  placeholder={t('welcome.otpPlaceholder')}
                  className="h-[56px] rounded-[18px] border-2 border-white/15 bg-white/10 text-center font-poppins text-lg font-bold tracking-[0.5em] text-white placeholder:tracking-normal placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={busy}
                />
              </label>
            )}

            {notice ? (
              <p className="rounded-[16px] bg-white/10 px-4 py-3 text-center font-poppins text-xs font-semibold leading-snug text-white/85">
                {notice}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="font-poppins text-xs font-bold text-brand-red-light">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={busy || !phoneInput || (step === 'otp' && otp.length === 0)}
              className="h-[56px] w-full rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" aria-label={t('onboarding.saving')} />
              ) : step === 'phone' ? (
                t('settings.phoneSendCode')
              ) : (
                t('settings.phoneVerifyCode')
              )}
            </Button>
          </form>

          {step === 'otp' ? (
            <button
              type="button"
              disabled={busy}
              onClick={handleChangeNumber}
              className="mt-4 w-full text-center font-poppins text-xs font-semibold uppercase text-white/70 transition-colors hover:text-white disabled:opacity-50"
            >
              {t('mobileVerificationExperiment.changeNumber')}
            </button>
          ) : null}
        </div>

        <p className="mt-5 text-center font-poppins text-[12px] font-medium leading-snug text-white/50 md:text-[13px]">
          {t('mobileVerificationExperiment.privacyNote')}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSkip()}
          className="mt-5 text-center font-poppins text-sm font-semibold uppercase text-white/70 transition-colors hover:text-white disabled:opacity-50"
        >
          {t('mobileVerificationExperiment.skip')}
        </button>
      </main>
    </div>
  );
}
