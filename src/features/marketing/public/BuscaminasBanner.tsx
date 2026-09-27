"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { trackEvent } from "@/lib/posthog";
import type { SeoPageLocale } from "@/lib/seo/game-pages";

const TO_TRIVIA: Record<SeoPageLocale, { title: string; text: string }> = {
  es: { title: "¿Buscabas Minas de trivia?", text: "El juego de casillas con defensas ocultos, preguntas y monedas sigue acá." },
  en: { title: "Looking for Trivia Mines?", text: "The tile game with hidden defenders, questions and coins is here." },
  ka: { title: "ეძებ ტრივია-მაღაროებს?", text: "უჯრების თამაში დამალული მცველებით, კითხვებით და ქოინებით აქაა." },
  tr: { title: "Bilgi Mayınları'nı mı arıyorsun?", text: "Gizli defanslı, sorulu ve jetonlu kare oyunu burada." },
};

const COPY: Record<SeoPageLocale, { title: string; text: string }> = {
  es: { title: "¿Buscabas el buscaminas futbolero de jugadores?", text: "16 futbolistas, 12 cumplen la consigna y 4 son minas. 20 rondas, tablero nuevo cada día." },
  en: { title: "Looking for the player version?", text: "Football Minesweeper: 16 players, 12 fit the clue and 4 are mines. 20 rounds, a new board every day." },
  ka: { title: "ეძებ მოთამაშეების ვერსიას?", text: "საფეხბურთო მაღაროები: 16 მოთამაშე, 12 შეესაბამება, 4 მაღაროა. 20 რაუნდი, ყოველდღე ახალი დაფა." },
  tr: { title: "Oyunculu versiyonu mu arıyorsun?", text: "Futbol Mayın Tarlası: 16 oyuncu, 12'si ipucuna uyar, 4'ü mayın. 20 tur, her gün yeni tahta." },
};

/** Sends Trivia Mines visitors who searched for the player-card game to Buscaminas futbolero. */
export function BuscaminasBanner({ locale, href, target = "buscaminas" }: { locale: SeoPageLocale; href: string; target?: "buscaminas" | "triviaMines" }) {
  const copy = target === "triviaMines" ? TO_TRIVIA[locale] : COPY[locale];
  return (
    <Link
      href={href}
      onClick={() => trackEvent("buscaminas_banner_click", { source_mode_id: target === "triviaMines" ? "buscaminas" : "triviaMines", target_mode_id: target, locale })}
      className="mt-5 flex items-center gap-3 rounded-2xl border-2 border-brand-yellow bg-brand-yellow/10 px-4 py-3 transition-colors hover:bg-brand-yellow/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black leading-snug text-brand-yellow">{copy.title}</span>
        <span className="mt-0.5 block text-sm text-white/80">{copy.text}</span>
      </span>
      <ChevronRight className="size-6 shrink-0 text-brand-yellow" />
    </Link>
  );
}
