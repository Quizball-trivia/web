'use client';

import { useMemo, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/contexts/LocaleContext';
import { validateNewPassword, hasErrors } from '@/lib/auth/validation';

interface PasswordFormProps {
  /** Called with the validated password. Throw to surface a submit error. */
  onSubmit: (password: string) => Promise<void> | void;
  submitLabel: string;
  submittingLabel: string;
  /** Whether the parent is mid-submit (drives disabled/spinner state). */
  submitting: boolean;
}

/**
 * Shared new-password + confirm form for the reset-password page and the
 * Settings add/change-password modal. Validates with the shared auth
 * validation helper; submit is disabled until both fields are valid.
 */
export function PasswordForm({
  onSubmit,
  submitLabel,
  submittingLabel,
  submitting,
}: PasswordFormProps) {
  const { t } = useLocale();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const errors = useMemo(
    () => validateNewPassword(password, confirmPassword),
    [password, confirmPassword],
  );
  const invalid = hasErrors(errors);
  const missingRequiredFields = !password || !confirmPassword;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (invalid || submitting) return;
    void onSubmit(password);
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit} noValidate>
      <label className="block">
        <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
          {t('resetPassword.newPasswordLabel')}
        </span>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/45" />
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('resetPassword.newPasswordPlaceholder')}
            className="h-12 rounded-2xl border-white/15 bg-white/10 pl-11 font-poppins text-white placeholder:text-white/40 focus-visible:ring-white/25"
            disabled={submitting}
            autoComplete="new-password"
          />
        </div>
        {touched && errors.password ? (
          <span className="mt-1.5 block font-poppins text-xs font-bold text-brand-red-light">
            {t(errors.password)}
          </span>
        ) : null}
      </label>

      <label className="block">
        <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
          {t('resetPassword.confirmPasswordLabel')}
        </span>
        <Input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder={t('resetPassword.confirmPasswordPlaceholder')}
          className="h-12 rounded-2xl border-white/15 bg-white/10 font-poppins text-white placeholder:text-white/40 focus-visible:ring-white/25"
          disabled={submitting}
          autoComplete="new-password"
        />
        {touched && errors.confirmPassword ? (
          <span className="mt-1.5 block font-poppins text-xs font-bold text-brand-red-light">
            {t(errors.confirmPassword)}
          </span>
        ) : null}
      </label>

      <Button
        type="submit"
        disabled={submitting || missingRequiredFields}
        className="h-12 w-full rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep disabled:opacity-60"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
