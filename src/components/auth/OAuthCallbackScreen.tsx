import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { parseOAuthHash, refreshWithToken } from '@/lib/auth/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { logger } from '@/utils/logger';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { getPostAuthEntryRoute } from '@/lib/auth/postAuthRedirect';
import { useLocale } from '@/contexts/LocaleContext';

export function OAuthCallbackScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const [error, setError] = useState<string | null>(null);

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
          if (hash) {
            window.sessionStorage.setItem("quizball_oauth_hash", hash);
          }
          if (query) {
            window.sessionStorage.setItem("quizball_oauth_query", query);
          }
          const refreshed = await refreshWithToken(tokens.refreshToken);
          if (!refreshed) {
            throw new Error(t('oauthCallback.sessionEstablishError'));
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
        logger.info('OAuth callback bootstrap success');
        router.replace(getPostAuthEntryRoute(authenticatedUser));
      } catch (err) {
        logger.error('OAuth callback failed', err);
        setError(err instanceof Error ? err.message : t('oauthCallback.authenticationFailedDefault'));
      }
    };
    processCallback();
  }, [bootstrap, router, t]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="size-8 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">{t('oauthCallback.authenticationFailed')}</h2>
                  <p className="text-muted-foreground">{error}</p>
                </div>
                <Button
                  onClick={() => router.replace('/')}
                  className="mt-4 gap-2"
                >
                  <ArrowLeft className="size-4" />
                  {t('oauthCallback.backToLogin')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return <LoadingScreen text={t('oauthCallback.finalizingTransfer')} />;
}
