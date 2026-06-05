'use client';

import { Check, Loader2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/contexts/LocaleContext';

const GE_PREFIX = '+995';
const LOCAL_DIGITS = 9;

interface WelcomePhoneAuthFormProps {
  /** Full number, e.g. "+995598373017". */
  phone: string;
  otp: string;
  otpSent: boolean;
  submitting: boolean;
  error?: string | null;
  onPhoneChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

/** Format the stored full number for display, e.g. "+995 598 370 017". */
function formatDisplayNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local = (digits.startsWith('995') ? digits.slice(3) : digits).slice(0, LOCAL_DIGITS);
  const grouped = local.replace(/(\d{3})(\d{3})(\d{0,3})/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));
  return `${GE_PREFIX} ${grouped}`.trim();
}

/** Strip everything but the 9 local digits from a stored full/partial number. */
function toLocalDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const withoutCountry = digits.startsWith('995') ? digits.slice(3) : digits;
  return withoutCountry.slice(0, LOCAL_DIGITS);
}

export function WelcomePhoneAuthForm({
  phone,
  otp,
  otpSent,
  submitting,
  error = null,
  onPhoneChange,
  onOtpChange,
  onSubmit,
}: WelcomePhoneAuthFormProps) {
  const { t } = useLocale();
  const localDigits = toLocalDigits(phone);

  const handleLocalChange = (raw: string) => {
    // Tolerate a pasted full number (+995…, 995…) by stripping a leading country
    // code before keeping the 9 local digits — so paste never doubles the prefix.
    const digits = raw.replace(/\D/g, '');
    const local = (digits.startsWith('995') ? digits.slice(3) : digits).slice(0, LOCAL_DIGITS);
    // Always emit the full number so the rest of the flow is unchanged.
    onPhoneChange(local ? `${GE_PREFIX}${local}` : '');
  };

  return (
    <form className="mt-5 space-y-3" onSubmit={onSubmit}>
      {otpSent ? (
        // Code-sent step: the number collapses to a compact confirmation row
        // (with a "change number" affordance) so the modal focuses on the code.
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/8 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Phone className="size-4 shrink-0 text-white/45" />
            <span className="min-w-0 truncate font-poppins text-sm font-semibold text-white/90">
              {formatDisplayNumber(phone)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onPhoneChange(phone)}
            disabled={submitting}
            className="shrink-0 font-poppins text-xs font-semibold text-brand-cyan underline-offset-2 hover:underline disabled:opacity-50"
          >
            {t('welcome.changeNumber')}
          </button>
        </div>
      ) : (
        <label className="block">
          <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
            {t('welcome.phoneLabel')}
          </span>
          <div
            className={`flex h-12 items-center gap-2.5 rounded-2xl border bg-white/10 px-4 transition-colors ${
              error ? 'border-brand-red-soft' : 'border-white/15 focus-within:border-white/30'
            }`}
          >
            <Phone className="size-4 shrink-0 text-white/45" />
            <span className="shrink-0 font-poppins font-semibold text-white/80">{GE_PREFIX}</span>
            <input
              type="tel"
              inputMode="numeric"
              value={localDigits}
              onChange={(event) => handleLocalChange(event.target.value)}
              placeholder={t('welcome.phoneLocalPlaceholder')}
              aria-invalid={Boolean(error)}
              className="min-w-0 flex-1 border-0 bg-transparent p-0 font-poppins text-white outline-none placeholder:text-white/40 focus:outline-none focus:ring-0"
              disabled={submitting}
            />
          </div>
        </label>
      )}

      {otpSent ? (
        <>
          {/* Persistent, legible "code sent" hint sitting right above the code
              field — survives the user leaving to fetch the SMS (the toast does not). */}
          <div className="flex items-start gap-2 rounded-2xl bg-brand-cyan/12 px-4 py-3">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-cyan" />
            <p className="font-poppins text-[13px] font-medium leading-snug text-white/85">
              {t('welcome.otpSentHint')}
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
              {t('welcome.otpLabel')}
            </span>
            <Input
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={otp}
              onChange={(event) => onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('welcome.otpPlaceholder')}
              className="h-12 rounded-2xl border-white/15 bg-white/10 text-center font-poppins text-lg font-bold tracking-[0.5em] text-white placeholder:tracking-normal placeholder:text-white/40 focus-visible:ring-white/25"
              disabled={submitting}
            />
          </label>
        </>
      ) : null}

      {error ? (
        <p className="font-poppins text-xs font-medium text-brand-red-soft" role="alert">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={submitting || localDigits.length !== LOCAL_DIGITS || (otpSent && otp.length !== 6)}
        className="h-12 w-full rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep disabled:opacity-60"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {otpSent ? t('welcome.verifyCode') : t('welcome.sendCode')}
      </Button>
    </form>
  );
}
