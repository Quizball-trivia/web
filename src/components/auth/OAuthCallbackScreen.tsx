import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { AlertCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import {
  consumeRedirectOAuthProvider,
  parseOAuthHash,
  refreshWithTokenDetailed,
  restorePendingDeletionWithToken,
} from '@/lib/auth/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { logger } from '@/utils/logger';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { getPostAuthEntryRoute } from '@/lib/auth/postAuthRedirect';
import { isOnboardingComplete } from '@/lib/auth/onboarding';
import { trackLoginCompleted, trackSignupCompleted } from '@/lib/analytics/game-events';
import { useLocale } from '@/contexts/LocaleContext';

// Provider error codes that mean "the user backed out", not "auth is broken".
// These are silently redirected home; every other error surfaces the failure UI.
const OAUTH_CANCELLATION_CODES = new Set([
  'access_denied',
  'user_cancelled',
  'consent_required',
  'interaction_required',
  'login_required',
]);

export function OAuthCallbackScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const [error, setError] = useState<string | null>(null);
  const [pendingRestoreAvailable, setPendingRestoreAvailable] = useState(false);
  const [restoreSubmitting, setRestoreSubmitting] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const hash = window.location.hash || "";
        const query = window.location.search || "";

        // Mobile app redirect: if source=mobile, forward tokens via deep link
        const searchParams = new URLSearchParams(query.replace(/^\?/, ""));
        const mobileRedirect = searchParams.get("mobile_redirect");
        if (mobileRedirect) {
          const tokens = parseOAuthHash(hash);
          if (tokens) {
            const deepLink = `${mobileRedirect}?access_token=${encodeURIComponent(tokens.accessToken)}&refresh_token=${encodeURIComponent(tokens.refreshToken)}`;
            logger.info("OAuth callback: redirecting to mobile app");
            window.location.href = deepLink;
            return;
          }
        }
        // User cancelled / denied the provider consent (e.g. tapped "Cancel" on
        // the Facebook or Google screen). The provider redirects back with an
        // `error` param and no tokens — that's NOT a failure, so don't log an
        // error or show the failure screen; quietly return to the landing page.
        // Supabase OAuth returns the error in the HASH fragment
        // (#error=access_denied&error_description=...), not the query string, so
        // check both.
        const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
        const oauthError = searchParams.get("error") ?? hashParams.get("error");
        if (oauthError) {
          const description =
            searchParams.get("error_description") ?? hashParams.get("error_description") ?? undefined;
          // Only the user-cancellation codes are benign — quietly return to the
          // landing page. Any other provider error (server_error, misconfig, etc.)
          // is a real failure and must surface via the catch below, not be hidden.
          if (OAUTH_CANCELLATION_CODES.has(oauthError)) {
            logger.info("OAuth callback: user cancelled or denied consent", { error: oauthError, description });
            window.history.replaceState({}, document.title, window.location.pathname);
            router.replace("/");
            return;
          }
          logger.error("OAuth callback: provider returned an error", { error: oauthError, description });
          throw new Error(description ?? oauthError);
        }

        const lastHash = window.sessionStorage.getItem("quizball_oauth_hash");
        const lastQuery = window.sessionStorage.getItem("quizball_oauth_query");

        logger.info('OAuth callback start', {
          hashLength: hash.length,
          queryLength: query.length,
          hasLastHash: !!lastHash,
          hasLastQuery: !!lastQuery,
        });

        if ((hash && lastHash === hash) || (!hash && query && lastQuery === query)) {
          logger.info('OAuth callback duplicate payload, skipping');
          return;
        }

        const queryParams = new URLSearchParams(query.replace(/^\?/, ""));
        const queryAccessToken = queryParams.get("access_token");
        const queryRefreshToken = queryParams.get("refresh_token");
        const tokens = parseOAuthHash(hash) ??
          (queryAccessToken && queryRefreshToken
            ? { accessToken: queryAccessToken, refreshToken: queryRefreshToken }
            : null);
        if (tokens) {
          const refreshed = await refreshWithTokenDetailed(tokens.refreshToken);
          if (!refreshed.ok && refreshed.pendingDeletion) {
            window.history.replaceState({}, document.title, window.location.pathname);
            setPendingRestoreAvailable(true);
            return;
          }
          if (!refreshed.ok) {
            throw new Error(t('oauthCallback.sessionEstablishError'));
          }
          if (hash) {
            window.sessionStorage.setItem("quizball_oauth_hash", hash);
          }
          if (query) {
            window.sessionStorage.setItem("quizball_oauth_query", query);
          }
          logger.info('OAuth callback session established');
          // Clear tokens from URL (security: don't leave in browser history)
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          logger.warn('OAuth callback missing tokens', {
            hasCode: Boolean(queryParams.get("code")),
            hasError: Boolean(queryParams.get("error")),
          });
          // Fall back to cookie-based session if already set
        }

        await bootstrap({ force: true });
        const authenticatedUser = useAuthStore.getState().user;
        if (!authenticatedUser) {
          throw new Error(t('oauthCallback.sessionLoadError'));
        }
        const provider = consumeRedirectOAuthProvider();
        if (provider) {
          // OAuth callbacks don't expose a precise new-vs-returning signal; onboarding
          // state is the best available heuristic and matches the post-auth route.
          if (isOnboardingComplete(authenticatedUser)) {
            trackLoginCompleted(provider);
          } else {
            trackSignupCompleted(provider);
          }
        }
        logger.info('OAuth callback bootstrap success');
        router.replace(getPostAuthEntryRoute(authenticatedUser));
      } catch (err) {
        logger.error('OAuth callback failed', err);
        setError(err instanceof Error ? err.message : t('oauthCallback.authenticationFailedDefault'));
      }
    };
    processCallback();
  }, [bootstrap, router, t]);

  const handleRestore = async () => {
    if (!pendingRestoreAvailable || restoreSubmitting) {
      return;
    }
    setRestoreSubmitting(true);
    setRestoreError(null);
    try {
      await restorePendingDeletionWithToken();
      await bootstrap({ force: true });
      const authenticatedUser = useAuthStore.getState().user;
      if (!authenticatedUser) {
        throw new Error(t('oauthCallback.sessionLoadError'));
      }
      router.replace(getPostAuthEntryRoute(authenticatedUser));
    } catch (err) {
      logger.error('OAuth pending deletion restore failed', err);
      setRestoreError(err instanceof Error ? err.message : t('oauthCallback.restoreFailed'));
      setRestoreSubmitting(false);
    }
  };

  if (pendingRestoreAvailable) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-page p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md rounded-[24px] bg-brand-blue p-8 sm:p-10"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-white/12">
              <RotateCcw className="size-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
                {t('oauthCallback.restoreAccountTitle')}
              </h2>
              <p className="font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-sm">
                {t('oauthCallback.restoreAccountDescription')}
              </p>
            </div>
            {restoreError ? (
              <p className="w-full rounded-[16px] bg-red-500/15 px-4 py-3 font-poppins text-xs font-semibold text-white">
                {restoreError}
              </p>
            ) : null}
            <Button
              onClick={handleRestore}
              disabled={restoreSubmitting}
              className="mt-2 h-12 w-full rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {restoreSubmitting ? t('oauthCallback.restoringAccount') : t('oauthCallback.restoreAccount')}
            </Button>
            <Button
              onClick={() => router.replace('/')}
              disabled={restoreSubmitting}
              className="h-11 w-full gap-2 rounded-[28px] bg-white/10 font-poppins text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowLeft className="size-4" />
              {t('oauthCallback.backToLogin')}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-page p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md rounded-[24px] bg-brand-blue p-8 sm:p-10"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-white/12">
              <AlertCircle className="size-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
                {t('oauthCallback.authenticationFailed')}
              </h2>
              <p className="font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-sm">
                {error}
              </p>
            </div>
            <Button
              onClick={() => router.replace('/')}
              className="mt-2 h-12 w-full gap-2 rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep"
            >
              <ArrowLeft className="size-4" />
              {t('oauthCallback.backToLogin')}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return <LoadingScreen text={t('oauthCallback.finalizingTransfer')} />;
}
