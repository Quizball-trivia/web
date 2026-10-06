"use client";

import { StatSniperLeaderboard } from "@/features/daily/StatSniperLeaderboard";
import { fetchPublicStatSniperBoard } from "@/lib/repositories/statSniperPublicBoard";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/locale";
import { SignInLink } from "./PublicLinks";

/** The server caches the public board for 30 s; two boards (page + game) at this rate stay far inside its budget. */
const PUBLIC_BOARD_POLL_MS = 60_000;

export const STAT_SNIPER_JOIN_COPY: Record<Locale, { text: string; signUp: string }> = {
  en: { text: "Create an account to get your score on today's leaderboard.", signUp: "Create account" },
  es: { text: "Creá tu cuenta para que tu puntaje entre al ranking de hoy.", signUp: "Crear cuenta" },
  ka: { text: "შექმენი ანგარიში, რომ შენი ქულა დღევანდელ რეიტინგში მოხვდეს.", signUp: "ანგარიშის შექმნა" },
  tr: { text: "Puanının bugünün sıralamasına girmesi için hesap oluştur.", signUp: "Hesap oluştur" },
};

/**
 * Today's Aproximado board for everyone, like the other daily pages: members see their own board (with their rank),
 * visitors the public top ten plus the way onto it.
 */
export function StatSniperPageBoard({ locale, modeId, playPath, refreshKey, onSignUp, className }: {
  locale: Locale; modeId: string; playPath: string; refreshKey?: number; onSignUp?: () => void; className?: string;
}) {
  const status = useAuthStore((s) => s.status);
  const member = status === "authenticated";
  // While auth resolves a returning member must not see the guest sign-up card.
  const visitor = status === "anonymous" || status === "banned";
  const c = STAT_SNIPER_JOIN_COPY[locale] ?? STAT_SNIPER_JOIN_COPY.en;
  if (member) return <StatSniperLeaderboard refreshKey={refreshKey} className={className} />;
  return (
    <div className={cn("w-full", className)}>
      <StatSniperLeaderboard refreshKey={refreshKey} fetcher={fetchPublicStatSniperBoard} pollMs={PUBLIC_BOARD_POLL_MS} />
      {visitor && <div className="mt-3 rounded-[16px] border border-white/10 bg-white/5 p-4 text-white">
        <p className="text-sm text-white/80">{c.text}</p>
        <span className="contents" onClickCapture={onSignUp}>
          <SignInLink placement="stat_sniper_board" modeId={modeId} returnTo={playPath} className="mt-3 inline-flex h-10 items-center rounded-full bg-brand-yellow px-5 text-xs font-bold uppercase tracking-wide text-black hover:bg-brand-yellow-deep">
            {c.signUp}
          </SignInLink>
        </span>
      </div>}
    </div>
  );
}
