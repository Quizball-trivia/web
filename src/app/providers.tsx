"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { CspNonceProvider } from "@/contexts/CspNonceContext";
import { PostHogPageView } from "@/components/PostHogProvider";
import { AuthSessionBridge } from "@/components/auth/AuthSessionBridge";
import type { Locale } from "@/lib/i18n/messages";

type ProvidersProps = {
  children: React.ReactNode;
  initialLocale?: Locale;
  cspNonce?: string;
};

export function Providers({ children, initialLocale, cspNonce }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <LocaleProvider initialLocale={initialLocale}>
          <CspNonceProvider nonce={cspNonce}>
            <PlayerProvider>
              <AuthSessionBridge />
              <PostHogPageView />
              {children}
              <Toaster />
            </PlayerProvider>
          </CspNonceProvider>
        </LocaleProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
