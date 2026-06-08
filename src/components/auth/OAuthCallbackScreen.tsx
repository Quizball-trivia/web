import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { AlertCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import {
  consumeRedirectOAuthProvider,
  isPendingDeletionAuthError,
  restorePendingDeletionWithToken,
} from '@/lib/auth/auth.service';
import { getSupabaseClient, getSupabaseSession } from '@/lib/auth/supabase';
import { fetchCurrentUser } from '@/lib/auth/session';
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

// The mobile app sends `mobile_redirect` so the web callback can hand the
// session back to it. That value is attacker-controllable via the URL, and we
// attach the access/refresh tokens to it — so it MUST be strictly validated, or
// a crafted link could exfiltrate a victim's tokens to an arbitrary origin.
// The only legitimate target is the mobile-callback page on a quizball.io host
// (prod `quizball.io`/`www`, `staging.quizball.io`, and any preview subdomain),
// which the app sets as `redirectTo`.
const ALLOWED_MOBILE_REDIRECT_DOMAIN = 'quizball.io';
const ALLOWED_MOBILE_REDIRECT_PATH = '/auth/mobile-callback';

function isAllowedMobileRedirectHost(host: string): boolean {
  // Apex domain or any subdomain of quizball.io — but NOT lookalikes such as
  // `quizball.io.evil.com` (the `.` prefix anchors the suffix to a real label).
  return host === ALLOWED_MOBILE_REDIRECT_DOMAIN || host.endsWith(`.${ALLOWED_MOBILE_REDIRECT_DOMAIN}`);
}

/**
 * Returns a safe, validated URL to deep-link the mobile app to with the session
 * tokens attached — or null if `raw` is not an allowlisted target (in which case
 * the caller falls back to the normal web login flow and never leaks tokens).
 */
function buildMobileRedirectUrl(
  raw: string,
  accessToken: string,
  refreshToken: string,
): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const isAllowed =
    url.protocol === 'https:' &&
    isAllowedMobileRedirectHost(url.hostname) &&
    url.pathname === ALLOWED_MOBILE_REDIRECT_PATH;
  if (!isAllowed) {
    return null;
  }
  // Build via searchParams so any existing query params are preserved instead of
  // producing a malformed `...?a=1?access_token=...` double-query string.
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('refresh_token', refreshToken);
  return url.toString();
}

async function waitForCallbackSession() {
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

export function OAuthCallbackScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const [error, setError] = useState<string | null>(null);
  const [pendingRestoreAvailable, setPendingRestoreAvailable] = useState(false);
  const [restoreSubmitting, setRestoreSubmitting] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const hash = window.location.hash || "";
        const query = window.location.search || "";

        const searchParams = new URLSearchParams(query.replace(/^\?/, ""));
        const mobileRedirect = searchParams.get("mobile_redirect");

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

        logger.info('OAuth callback start', {
          hashLength: hash.length,
          queryLength: query.length,
        });

        const session = await waitForCallbackSession();
        if (!session?.access_token) {
          throw new Error(t('oauthCallback.sessionEstablishError'));
        }

        if (mobileRedirect) {
          const deepLink = buildMobileRedirectUrl(
            mobileRedirect,
            session.access_token,
            session.refresh_token,
          );
          if (deepLink) {
            logger.info("OAuth callback: redirecting to mobile app");
            window.location.href = deepLink;
            return;
          }
          // Not an allowlisted mobile target — ignore it (never attach tokens to
          // an untrusted origin) and continue the normal web login flow below.
          logger.warn("OAuth callback: ignoring non-allowlisted mobile_redirect");
        }

        window.history.replaceState({}, document.title, window.location.pathname);

        let authenticatedUser;
        try {
          authenticatedUser = await fetchCurrentUser();
        } catch (bootstrapError) {
          if (isPendingDeletionAuthError(bootstrapError)) {
            setPendingRestoreAvailable(true);
            return;
          }
          throw bootstrapError;
        }
        setAuthenticated(authenticatedUser);

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
  }, [router, setAuthenticated, t]);

  const handleRestore = async () => {
    if (!pendingRestoreAvailable || restoreSubmitting) {
      return;
    }
    setRestoreSubmitting(true);
    setRestoreError(null);
    try {
      const session = await getSupabaseSession();
      if (!session?.refresh_token) {
        throw new Error(t('oauthCallback.sessionLoadError'));
      }
      await restorePendingDeletionWithToken(session.refresh_token);
      const authenticatedUser = await fetchCurrentUser();
      setAuthenticated(authenticatedUser);
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
