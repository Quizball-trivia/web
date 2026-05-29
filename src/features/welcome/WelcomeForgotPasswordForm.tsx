'use client';

import { ArrowLeft, CheckCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/contexts/LocaleContext';

interface WelcomeForgotPasswordFormProps {
  email: string;
  submitting: boolean;
  sent: boolean;
  error: string | null;
  onEmailChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBackToSignIn: () => void;
}

/**
 * Forgot-password panel shown inside the blue login modal (no page nav).
 * Matches the sign-in form styling: translucent inputs, yellow primary action.
 * Shows a generic success state after the request succeeds — never reveals
 * whether an account exists for the address.
 */
export function WelcomeForgotPasswordForm({
  email,
  submitting,
  sent,
  error,
  onEmailChange,
  onSubmit,
  onBackToSignIn,
}: WelcomeForgotPasswordFormProps) {
  const { t } = useLocale();

  if (sent) {
    return (
      <div className="mt-5 space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-white/12">
          <CheckCircle className="size-7 text-white" />
        </div>
        <p className="font-poppins text-sm font-semibold leading-relaxed text-white">
          {t('forgotPassword.checkEmail')}
        </p>
        <p className="font-poppins text-xs leading-relaxed text-white/70">
          {t('forgotPassword.genericSuccess')}
        </p>
        <Button
          type="button"
          onClick={onBackToSignIn}
          className="h-12 w-full rounded-[28px] bg-white/15 font-poppins text-sm font-semibold uppercase tracking-wide text-white hover:bg-white/25"
        >
          {t('forgotPassword.backToSignIn')}
        </Button>
      </div>
    );
  }

  return (
    <form className="mt-5 space-y-3" onSubmit={onSubmit} noValidate>
      <p className="font-poppins text-[13px] leading-snug text-white/75">
        {t('forgotPassword.description')}
      </p>

      <label className="block">
        <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
          {t('welcome.emailLabel')}
        </span>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/45" />
          <Input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder={t('welcome.emailPlaceholder')}
            className="h-12 rounded-2xl border-white/15 bg-white/10 pl-11 font-poppins text-white placeholder:text-white/40 focus-visible:ring-white/25"
            disabled={submitting}
            autoComplete="email"
          />
        </div>
        {error ? (
          <span className="mt-1 block font-poppins text-xs text-brand-red-light">{error}</span>
        ) : null}
      </label>

      <Button
        type="submit"
        disabled={submitting || !email}
        className="h-12 w-full rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep disabled:opacity-60"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {submitting ? t('forgotPassword.sending') : t('forgotPassword.sendResetLink')}
      </Button>

      <button
        type="button"
        onClick={onBackToSignIn}
        className="mx-auto flex items-center gap-1.5 font-poppins text-xs font-semibold text-white/70 hover:text-white"
      >
        <ArrowLeft className="size-3.5" />
        {t('forgotPassword.backToSignIn')}
      </button>
    </form>
  );
}
