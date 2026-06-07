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
import { resetPassword } from '@/lib/auth/auth.service';
import { getSupabaseClient } from '@/lib/auth/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { getAuthenticatedEntryRoute } from '@/lib/auth/onboarding';
import { useLocale } from '@/contexts/LocaleContext';
import { logger } from '@/utils/logger';

type Phase = 'verifying' | 'ready' | 'invalid';

async function waitForRecoverySession() {
  const supabase = getSupabaseClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      lastError = error;
    } else if (data.session) {
      return data.session;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (lastError) {
    throw lastError;
  }
  return null;
}

/**
 * Handles Supabase password-recovery links. The recovery link lands here with
 * a PKCE code/token payload. Supabase JS establishes the session from the URL,
 * then the user sets a new password through the shared PasswordForm.
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
        const query = window.location.search || '';
        const hash = window.location.hash || '';
        const queryParams = new URLSearchParams(query.replace(/^\?/, ''));
        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const recoveryError = queryParams.get('error') ?? hashParams.get('error');
        if (recoveryError) {
          logger.warn('Reset password: recovery provider returned an error', {
            error: recoveryError,
          });
          window.history.replaceState({}, document.title, window.location.pathname);
          setPhase('invalid');
          return;
        }

        const session = await waitForRecoverySession();
        window.history.replaceState({}, document.title, window.location.pathname);
        if (!session?.access_token) {
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
