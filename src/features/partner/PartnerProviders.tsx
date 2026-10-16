"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { CspNonceProvider } from "@/contexts/CspNonceContext";
import { PartnerApiError } from "./api/partnerApiClient";
import { PartnerSessionProvider } from "./PartnerSessionProvider";

/**
 * Provider tree for partner hosts. Deliberately without PlayerProvider, AuthSessionBridge, PostHog page views
 * or the app shell: partner players are not Supabase users and must never touch Quizball auth or analytics.
 */
export function PartnerProviders({ children, cspNonce }: { children: React.ReactNode; cspNonce?: string }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            // 4xx answers are final (a 401 already ended the session); retry only transient failures.
            retry: (failureCount, error) =>
              !(error instanceof PartnerApiError && error.status < 500) && failureCount < 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} nonce={cspNonce}>
        <LocaleProvider>
          <CspNonceProvider nonce={cspNonce}>
            <PartnerSessionProvider>
              {children}
              <Toaster />
            </PartnerSessionProvider>
          </CspNonceProvider>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
