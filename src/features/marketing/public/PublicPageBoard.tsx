"use client";

import dynamic from "next/dynamic";
import type { Locale } from "@/lib/i18n/locale-config";

function Placeholder() {
  return <div className="h-64 animate-pulse rounded-2xl bg-white/5" aria-hidden />;
}

// A server template references every board; keep their implementations out of
// unrelated game pages, while loading the selected board at its existing time.
const TopTen = dynamic(() => import("./PublicTopTen").then((module) => module.PublicTopTen), { ssr: false, loading: Placeholder });
const Buscaminas = dynamic(() => import("@/features/buscaminas/BuscaminasLeaderboard").then((module) => module.BuscaminasLeaderboard), { ssr: false, loading: Placeholder });
const Pistas = dynamic(() => import("@/features/pistas/PistasLeaderboard").then((module) => module.PistasLeaderboard), { ssr: false, loading: Placeholder });
const Ultimo = dynamic(() => import("@/features/ultimo/UltimoLeaderboard").then((module) => module.UltimoLeaderboard), { ssr: false, loading: Placeholder });
const Minuto = dynamic(() => import("@/features/minuto/MinutoLeaderboard").then((module) => module.MinutoLeaderboard), { ssr: false, loading: Placeholder });
const StatSniper = dynamic(() => import("./StatSniperPageBoard").then((module) => module.StatSniperPageBoard), { ssr: false, loading: Placeholder });

export type PageBoardMode = "ranked" | "grid" | "auction" | "buscaminas" | "pistas" | "ultimo" | "minuto" | "statSniper";

export function PublicPageBoard({ modeId, locale, playPath, className }: { modeId: PageBoardMode; locale: Locale; playPath: string; className?: string }) {
  if (modeId === "ranked" || modeId === "grid" || modeId === "auction") return <TopTen board={modeId} locale={locale} />;
  if (modeId === "buscaminas") return <Buscaminas locale={locale} className={className} />;
  if (modeId === "pistas") return <Pistas locale={locale} className={className} />;
  if (modeId === "ultimo") return <Ultimo locale={locale} className={className} />;
  if (modeId === "minuto") return <Minuto locale={locale} className={className} />;
  return <StatSniper modeId={modeId} locale={locale} playPath={playPath} className={className} />;
}
