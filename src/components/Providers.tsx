"use client";

import { ThemeProvider } from "next-themes";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/components/LocaleContext";

type ProvidersProps = {
  children: React.ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <LocaleProvider>
        <PlayerProvider>
          {children}
          <Toaster />
        </PlayerProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
