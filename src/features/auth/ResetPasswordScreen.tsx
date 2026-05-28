'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/AppLogo';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { PasswordForm } from '@/features/auth/PasswordForm';
import { parseOAuthHash, refreshWithToken, resetPassword } from '@/lib/auth/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { getAuthenticatedEntryRoute } from '@/lib/auth/onboarding';
import { useLocale } from '@/contexts/LocaleContext';
import { logger } from '@/utils/logger';

type Phase = 'verifying' | 'ready' | 'invalid';

/**
 * Handles Supabase password-recovery links. The recovery link lands here with
 * tokens in the URL hash (or query). We establish the session from them,
 * clear the tokens from the URL, then let the user set a new password via the
 * shared PasswordForm and POST it to the reset-password endpoint.
 */
export function ResetPasswordScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const [phase, setPhase] = useState<Phase>('verifying');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const establishSession = async () => {
      try {
        const hash = window.location.hash || '';
        const query = window.location.search || '';
        const queryParams = new URLSearchParams(query.replace(/^\?/, ''));
        const queryAccessToken = queryParams.get('access_token');
        const queryRefreshToken = queryParams.get('refresh_token');

        const tokens =
          parseOAuthHash(hash) ??
          (queryAccessToken && queryRefreshToken
            ? { accessToken: queryAccessToken, refreshToken: queryRefreshToken }
            : null);

        if (!tokens) {
          logger.warn('Reset password: no tokens in recovery link');
          setPhase('invalid');
          return;
        }

        const refreshed = await refreshWithToken(tokens.refreshToken);
        // Clear tokens from the URL regardless, so they don't linger in history.
        window.history.replaceState({}, document.title, window.location.pathname);

        if (!refreshed) {
          logger.warn('Reset password: failed to establish recovery session');
          setPhase('invalid');
          return;
        }

        logger.info('Reset password: recovery session established');
        setPhase('ready');
      } catch (err) {
        logger.error('Reset password: session establishment failed', err);
        setPhase('invalid');
      }
    };
    void establishSession();
  }, []);

  const handleSubmit = async (newPassword: string) => {
    setSubmitting(true);
    try {
      await resetPassword(newPassword);
      toast.success(t('resetPassword.success'));
      // Session is already established; bootstrap and route into the app.
      await bootstrap({ force: true });
      const user = useAuthStore.getState().user;
      router.replace(user ? getAuthenticatedEntryRoute(user) : '/');
    } catch (err) {
      logger.error('Reset password: update failed', err);
      toast.error(t('resetPassword.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === 'verifying') {
    return <LoadingScreen text={t('resetPassword.verifying')} />;
  }

  if (phase === 'invalid') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-page p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md rounded-[24px] bg-brand-blue p-8 sm:p-10"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-white/12">
              <AlertCircle className="size-7 text-white" />
            </div>
            <p className="font-poppins text-sm font-medium leading-relaxed text-white/85">
              {t('resetPassword.invalidLink')}
            </p>
            <Button
              onClick={() => router.replace('/')}
              className="h-12 w-full gap-2 rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep"
            >
              <ArrowLeft className="size-4" />
              {t('resetPassword.requestNewLink')}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-page p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-[24px] bg-brand-blue p-8 sm:p-10"
      >
        <div className="flex flex-col items-center text-center">
          <AppLogo size="md" />
          <h1 className="mt-4 font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
            {t('resetPassword.title')}
          </h1>
          <p className="mt-2 font-poppins text-[13px] font-medium leading-snug text-white/80">
            {t('resetPassword.description')}
          </p>
        </div>
        <PasswordForm
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={t('resetPassword.submit')}
          submittingLabel={t('resetPassword.submitting')}
        />
      </motion.div>
    </div>
  );
}
