'use client';

import { Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/contexts/LocaleContext';

interface WelcomePhoneAuthFormProps {
  phone: string;
  otp: string;
  otpSent: boolean;
  submitting: boolean;
  onPhoneChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function WelcomePhoneAuthForm({
  phone,
  otp,
  otpSent,
  submitting,
  onPhoneChange,
  onOtpChange,
  onSubmit,
}: WelcomePhoneAuthFormProps) {
  const { t } = useLocale();
  return (
    <form className="mt-5 space-y-3" onSubmit={onSubmit}>
      <label className="block">
        <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
          {t('welcome.phoneLabel')}
        </span>
        <div className="relative">
          <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/45" />
          <Input
            type="tel"
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
            placeholder={t('welcome.phonePlaceholder')}
            className="h-12 rounded-2xl border-white/15 bg-white/10 pl-11 font-poppins text-white placeholder:text-white/40 focus-visible:ring-white/25"
            disabled={submitting}
          />
        </div>
      </label>

      {otpSent ? (
        <label className="block">
          <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
            {t('welcome.otpLabel')}
          </span>
          <Input
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('welcome.otpPlaceholder')}
            className="h-12 rounded-2xl border-white/15 bg-white/10 text-center font-poppins text-lg font-bold tracking-[0.5em] text-white placeholder:tracking-normal placeholder:text-white/40 focus-visible:ring-white/25"
            disabled={submitting}
          />
        </label>
      ) : null}

      <Button
        type="submit"
        disabled={submitting || !phone || (otpSent && otp.length !== 6)}
        className="h-12 w-full rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep disabled:opacity-60"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {otpSent ? t('welcome.verifyCode') : t('welcome.sendCode')}
      </Button>
    </form>
  );
}
