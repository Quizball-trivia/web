'use client';

/**
 * Centered confirmation modal shown after an email sign-up attempt.
 *
 * Two variants:
 *  - "check-email"        — a new sign-up; tells the user to confirm via email.
 *  - "already-registered" — the email already has an account; nudges to sign in.
 *
 * Replaces the easy-to-miss inline notice at the bottom of the auth dialog so
 * the message is unmissable.
 */

import { CheckCircle2, MailCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLocale } from '@/contexts/LocaleContext';

export type AuthNoticeVariant = 'check-email' | 'already-registered';

interface WelcomeAuthNoticeModalProps {
  open: boolean;
  variant: AuthNoticeVariant;
  onClose: () => void;
  /** Shown only for the already-registered variant: takes the user to sign-in. */
  onGoToSignIn: () => void;
}

export function WelcomeAuthNoticeModal({
  open,
  variant,
  onClose,
  onGoToSignIn,
}: WelcomeAuthNoticeModalProps) {
  const { t } = useLocale();

  const isAlreadyRegistered = variant === 'already-registered';
  const title = isAlreadyRegistered
    ? t('welcome.alreadyRegisteredTitle')
    : t('welcome.checkEmailTitle');
  const body = isAlreadyRegistered ? t('welcome.alreadyRegistered') : t('welcome.checkEmail');
  const Icon = isAlreadyRegistered ? CheckCircle2 : MailCheck;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-sm w-[90vw] rounded-[24px] border-0 bg-brand-blue p-7 text-center sm:p-9 [&>button:last-child]:hidden focus:outline-none">
        <DialogHeader className="items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-white/15">
            <Icon className="size-7 text-white" strokeWidth={2.25} aria-hidden="true" />
          </div>
          <DialogTitle className="text-center font-poppins text-[20px] font-semibold text-white sm:text-[22px]">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-2 text-center font-poppins text-[13px] font-medium leading-relaxed text-white/85 sm:text-[14px]">
            {body}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={isAlreadyRegistered ? onGoToSignIn : onClose}
            className="h-12 w-full rounded-[28px] bg-white font-poppins text-sm font-semibold uppercase tracking-wide text-brand-blue transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {isAlreadyRegistered ? t('welcome.goToSignIn') : t('welcome.gotIt')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
