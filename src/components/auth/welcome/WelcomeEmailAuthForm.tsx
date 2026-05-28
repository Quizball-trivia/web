'use client';

import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/contexts/LocaleContext';
import type { AuthPanelMode } from './welcome.types';

interface WelcomeEmailAuthFormProps {
  mode: Exclude<AuthPanelMode, 'phone'>;
  email: string;
  password: string;
  confirmPassword: string;
  submitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function WelcomeEmailAuthForm({
  mode,
  email,
  password,
  confirmPassword,
  submitting,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: WelcomeEmailAuthFormProps) {
  const { t } = useLocale();
  return (
    <form className="mt-5 space-y-3" onSubmit={onSubmit}>
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
      </label>

      <label className="block">
        <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
          {t('welcome.passwordLabel')}
        </span>
        <Input
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder={t('welcome.passwordPlaceholder')}
          className="h-12 rounded-2xl border-white/15 bg-white/10 font-poppins text-white placeholder:text-white/40 focus-visible:ring-white/25"
          disabled={submitting}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        />
      </label>

      {mode === 'signup' ? (
        <label className="block">
          <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
            {t('welcome.confirmPasswordLabel')}
          </span>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            placeholder={t('welcome.confirmPasswordPlaceholder')}
            className="h-12 rounded-2xl border-white/15 bg-white/10 font-poppins text-white placeholder:text-white/40 focus-visible:ring-white/25"
            disabled={submitting}
            autoComplete="new-password"
          />
        </label>
      ) : null}

      <Button
        type="submit"
        disabled={submitting || !email || !password || (mode === 'signup' && !confirmPassword)}
        className="h-12 w-full rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep disabled:opacity-60"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {mode === 'signup' ? t('welcome.createAccount') : t('welcome.signInWithEmail')}
      </Button>
    </form>
  );
}
