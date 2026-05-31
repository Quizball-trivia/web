"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { PostHogPageView } from "@/components/PostHogProvider";
import { PresencePingMount } from "@/components/PresencePingMount";
import type { Locale } from "@/lib/i18n/messages";

type ProvidersProps = {
  children: React.ReactNode;
  initialLocale?: Locale;
};

export function Providers({ children, initialLocale }: ProvidersProps) {
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
          <PlayerProvider>
            <PostHogPageView />
            <PresencePingMount />
            {children}
            <Toaster />
          </PlayerProvider>
        </LocaleProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
