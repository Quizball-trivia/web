import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { parseOAuthHash } from '@/lib/auth/auth.service';
import { setTokens } from '@/lib/auth/tokenStorage';
import { useAuthStore } from '@/stores/auth.store';
import { AppLogo } from '../AppLogo';

export function OAuthCallbackScreen() {
  const router = useRouter();
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const tokens = parseOAuthHash(window.location.hash);
        if (!tokens) {
          throw new Error('Missing tokens in callback');
        }
        setTokens(tokens);
        // Clear tokens from URL (security: don't leave in browser history)
        window.history.replaceState({}, document.title, window.location.pathname);
        await bootstrap();
        router.replace('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
      }
    };
    processCallback();
  }, [bootstrap, router]);

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
                  <h2 className="text-xl font-semibold">Authentication Failed</h2>
                  <p className="text-muted-foreground">{error}</p>
                </div>
                <Button
                  onClick={() => router.replace('/auth/login')}
                  className="mt-4 gap-2"
                >
                  <ArrowLeft className="size-4" />
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-6"
      >
        <AppLogo className="size-16" />
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Completing sign in...</p>
        </div>
      </motion.div>
    </div>
  );
}
