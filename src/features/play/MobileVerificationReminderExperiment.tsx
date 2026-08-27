'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Loader2,
  MessageSquareText,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { useLocale } from '@/contexts/LocaleContext';
import { useAuthStore } from '@/stores/auth.store';
import { useGeorgianPhoneAuthAvailability } from '@/lib/auth/useGeorgianPhoneAuthAvailability';
import {
  startGeorgianPhoneLink,
  verifyGeorgianPhoneLink,
} from '@/lib/auth/auth.service';
import {
  normalizeGeorgianPhone,
  validateGeorgianPhone,
  validateOtp,
} from '@/lib/auth/validation';
import { ApiError } from '@/lib/api/api';
import {
  MOBILE_VERIFICATION_REMINDER_SNOOZE_DAYS,
  isEligibleForPlayHomeMobileVerificationReminder,
  isPlayHomeMobileVerificationReminderSnoozed,
  loadPlayHomeMobileVerificationExperimentVariant,
  snoozePlayHomeMobileVerificationReminder,
} from '@/lib/experiments/playHomeMobileVerificationExperiment';
import type { ExperimentVariant } from '@/lib/experiments/loadExperimentVariant';
import {
  trackMobileVerificationCompleted,
  trackMobileVerificationFailed,
  trackMobileVerificationReminderClicked,
  trackMobileVerificationReminderDismissed,
  trackMobileVerificationReminderShown,
  trackMobileVerificationStarted,
} from '@/lib/analytics/game-events';

type VerificationStep = 'phone' | 'otp';

function elapsedSince(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

export function MobileVerificationReminderExperiment() {
  const { t } = useLocale();
  const user = useAuthStore((state) => state.user);
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const phoneAuthAvailability = useGeorgianPhoneAuthAvailability();
  const [reminderVisible, setReminderVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<VerificationStep>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shownAtRef = useRef(Date.now());
  const sendAttemptsRef = useRef(0);
  const verifyAttemptsRef = useRef(0);
  const shownTrackedUserRef = useRef<string | null>(null);
  const assignmentRef = useRef<{
    userId: string;
    promise: Promise<ExperimentVariant>;
  } | null>(null);

  const phoneAuthAvailable = phoneAuthAvailability.isAvailable
    && !phoneAuthAvailability.isLoading;

  useEffect(() => {
    if (
      !user
      || !isEligibleForPlayHomeMobileVerificationReminder(user, phoneAuthAvailable)
      || isPlayHomeMobileVerificationReminderSnoozed(user.id)
    ) {
      setReminderVisible(false);
      return;
    }

    if (assignmentRef.current?.userId !== user.id) {
      assignmentRef.current = {
        userId: user.id,
        promise: loadPlayHomeMobileVerificationExperimentVariant(
          user,
          phoneAuthAvailable,
        ),
      };
    }

    let subscribed = true;
    void assignmentRef.current.promise.then((variant) => {
      if (!subscribed || variant !== 'test') {
        if (subscribed) setReminderVisible(false);
        return;
      }

      shownAtRef.current = Date.now();
      setReminderVisible(true);
      if (shownTrackedUserRef.current !== user.id) {
        shownTrackedUserRef.current = user.id;
        trackMobileVerificationReminderShown();
      }
    });

    return () => {
      subscribed = false;
    };
  }, [phoneAuthAvailable, user]);

  useEffect(() => {
    if (!successVisible) return;
    const timeoutId = window.setTimeout(() => setSuccessVisible(false), 3_000);
    return () => window.clearTimeout(timeoutId);
  }, [successVisible]);

  const resetDialog = () => {
    setStep('phone');
    setPhoneInput(user?.phone_number ?? '');
    setOtp('');
    setError(null);
    setNotice(null);
    sendAttemptsRef.current = 0;
    verifyAttemptsRef.current = 0;
  };

  const openVerification = () => {
    resetDialog();
    shownAtRef.current = Date.now();
    trackMobileVerificationReminderClicked();
    setDialogOpen(true);
  };

  const dismissReminder = () => {
    if (!user) return;
    snoozePlayHomeMobileVerificationReminder(user.id);
    trackMobileVerificationReminderDismissed({
      snoozeDays: MOBILE_VERIFICATION_REMINDER_SNOOZE_DAYS,
    });
    setReminderVisible(false);
    setDialogOpen(false);
  };

  const showVerifiedConfirmation = () => {
    setDialogOpen(false);
    setReminderVisible(false);
    setSuccessVisible(true);
  };

  const handlePhoneSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const validationError = step === 'phone'
      ? validateGeorgianPhone(phoneInput)
      : validateOtp(otp);
    if (validationError) {
      trackMobileVerificationFailed({
        source: 'play_home_reminder',
        step,
        reason: step === 'phone' ? 'invalid_phone' : 'invalid_otp',
        attempt: step === 'phone'
          ? sendAttemptsRef.current + 1
          : verifyAttemptsRef.current + 1,
      });
      setError(t(validationError));
      return;
    }

    const normalizedPhone = normalizeGeorgianPhone(phoneInput);
    setIsSubmitting(true);
    try {
      if (step === 'phone') {
        const attempt = ++sendAttemptsRef.current;
        const result = await startGeorgianPhoneLink(normalizedPhone);
        setPhoneInput(result.phone);

        if (!result.otp_required) {
          await bootstrap({ force: true });
          trackMobileVerificationCompleted({
            source: 'play_home_reminder',
            method: 'already_verified',
            sendAttempts: attempt,
            verifyAttempts: verifyAttemptsRef.current,
            timeToCompleteMs: elapsedSince(shownAtRef.current),
          });
          showVerifiedConfirmation();
          return;
        }

        trackMobileVerificationStarted({
          source: 'play_home_reminder',
          attempt,
          timeToStartMs: elapsedSince(shownAtRef.current),
        });
        setStep('otp');
        setNotice(t('mobileVerificationExperiment.codeSent', { phone: result.phone }));
        return;
      }

      const attempt = ++verifyAttemptsRef.current;
      const updatedUser = await verifyGeorgianPhoneLink(normalizedPhone, otp);
      setAuthenticated(updatedUser);
      trackMobileVerificationCompleted({
        source: 'play_home_reminder',
        method: 'otp',
        sendAttempts: sendAttemptsRef.current,
        verifyAttempts: attempt,
        timeToCompleteMs: elapsedSince(shownAtRef.current),
      });
      showVerifiedConfirmation();
    } catch (requestError) {
      const numberInUse = requestError instanceof ApiError && requestError.status === 409;
      trackMobileVerificationFailed({
        source: 'play_home_reminder',
        step,
        reason: numberInUse ? 'number_in_use' : 'request_failed',
        attempt: step === 'phone'
          ? sendAttemptsRef.current
          : verifyAttemptsRef.current,
      });
      setError(
        numberInUse
          ? t('settings.phoneLinkedElsewhere')
          : step === 'otp'
            ? t('settings.phoneOtpFailed')
            : t('mobileVerificationExperiment.sendFailed'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successVisible) {
    return (
      <section
        aria-live="polite"
        className="flex items-center gap-3 rounded-[10px] border border-brand-green-light/30 bg-transparent px-4 py-3.5 shadow-none md:px-5"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-green-light text-black">
          <Check className="size-5" strokeWidth={3} aria-hidden />
        </div>
        <div>
          <p className="font-poppins text-sm font-semibold uppercase text-white">
            {t('mobileVerificationReminder.verified')}
          </p>
          <p className="mt-0.5 font-poppins text-[11px] font-medium text-white/55">
            {t('mobileVerificationReminder.verifiedBody')}
          </p>
        </div>
      </section>
    );
  }

  if (!reminderVisible) return null;

  return (
    <>
      <section className="relative overflow-hidden rounded-[10px] border border-brand-yellow/25 bg-transparent px-4 py-3.5 shadow-none md:px-5 md:py-4">
        <button
          type="button"
          onClick={dismissReminder}
          aria-label={t('mobileVerificationReminder.later')}
          className="absolute right-2.5 top-2.5 flex size-8 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/8 hover:text-white"
        >
          <X className="size-4" aria-hidden />
        </button>

        <div className="flex items-start gap-3 pr-7 sm:items-center sm:gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-brand-yellow text-black sm:size-12">
            <ShieldCheck className="size-5 sm:size-6" aria-hidden />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-poppins text-[9px] font-semibold uppercase tracking-[0.14em] text-brand-yellow sm:text-[10px]">
                {t('mobileVerificationReminder.eyebrow')}
              </p>
              <span className="rounded-full border border-white/12 px-2 py-0.5 font-poppins text-[8px] font-semibold uppercase tracking-wide text-white/50">
                {t('mobileVerificationReminder.time')}
              </span>
            </div>
            <h2 className="mt-1 font-poppins text-[15px] font-semibold uppercase leading-tight text-white sm:text-[17px]">
              {t('mobileVerificationReminder.title')}
            </h2>
            <p className="mt-1 max-w-2xl font-poppins text-[11px] font-medium leading-snug text-white/55 sm:text-xs">
              {t('mobileVerificationReminder.body')}
            </p>
          </div>

          <Button
            type="button"
            onClick={openVerification}
            className="hidden h-11 shrink-0 rounded-[8px] bg-brand-yellow px-5 font-poppins text-[11px] font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep sm:flex"
          >
            <Phone className="mr-2 size-4" aria-hidden />
            {t('mobileVerificationReminder.cta')}
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-3 sm:hidden">
          <Button
            type="button"
            onClick={openVerification}
            className="h-10 flex-1 rounded-[8px] bg-brand-yellow font-poppins text-[10px] font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep"
          >
            <Phone className="mr-2 size-3.5" aria-hidden />
            {t('mobileVerificationReminder.cta')}
          </Button>
          <button
            type="button"
            onClick={dismissReminder}
            className="px-2 font-poppins text-[10px] font-semibold uppercase text-white/50"
          >
            {t('mobileVerificationReminder.later')}
          </button>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (isSubmitting) return;
        setDialogOpen(open);
      }}>
        <DialogContent className="max-w-md rounded-[24px] border-0 bg-brand-blue p-7 sm:p-9 [&>button:last-child]:hidden">
          <ModalCloseButton
            onClose={() => {
              if (!isSubmitting) setDialogOpen(false);
            }}
          />
          <DialogHeader>
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-brand-yellow text-black">
              {step === 'phone' ? (
                <Phone className="size-6" aria-hidden />
              ) : (
                <MessageSquareText className="size-6" aria-hidden />
              )}
            </div>
            <DialogTitle className="px-8 text-center font-poppins text-[22px] font-semibold uppercase leading-tight text-white sm:text-[25px]">
              {t('mobileVerificationReminder.dialogTitle')}
            </DialogTitle>
            <DialogDescription className="mt-2 text-center font-poppins text-[13px] font-medium leading-snug text-white/75">
              {step === 'phone'
                ? t('mobileVerificationReminder.phoneDescription')
                : t('mobileVerificationReminder.otpDescription')}
            </DialogDescription>
          </DialogHeader>

          <form className="mt-6 space-y-4" onSubmit={handlePhoneSubmit}>
            <label className="block">
              <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
                {step === 'phone' ? t('welcome.phoneLabel') : t('welcome.otpLabel')}
              </span>
              {step === 'phone' ? (
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                  <Input
                    autoFocus
                    autoComplete="tel"
                    type="tel"
                    value={phoneInput}
                    onChange={(event) => {
                      setPhoneInput(event.target.value);
                      setError(null);
                    }}
                    placeholder={t('welcome.phonePlaceholder')}
                    className="h-[54px] rounded-[18px] border-2 border-white/15 bg-white/10 pl-11 font-poppins text-base font-semibold text-white placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={isSubmitting}
                  />
                </div>
              ) : (
                <Input
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => {
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                    setError(null);
                  }}
                  placeholder={t('welcome.otpPlaceholder')}
                  className="h-[54px] rounded-[18px] border-2 border-white/15 bg-white/10 text-center font-poppins text-lg font-bold tracking-[0.45em] text-white placeholder:tracking-normal placeholder:text-white/40 focus-visible:border-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={isSubmitting}
                />
              )}
            </label>

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
              disabled={isSubmitting || !phoneInput || (step === 'otp' && otp.length === 0)}
              className="h-[54px] w-full rounded-[27px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep disabled:opacity-55"
            >
              {isSubmitting ? (
                <Loader2 className="size-5 animate-spin" aria-label={t('onboarding.saving')} />
              ) : step === 'phone' ? (
                t('settings.phoneSendCode')
              ) : (
                t('settings.phoneVerifyCode')
              )}
            </Button>

            {step === 'otp' ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setError(null);
                  setNotice(null);
                }}
                className="w-full text-center font-poppins text-xs font-semibold uppercase text-white/65 transition-colors hover:text-white disabled:opacity-50"
              >
                {t('mobileVerificationExperiment.changeNumber')}
              </button>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
