"use client";

import { useMemo } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

import { WorldCupMedal, type MedalPlace } from "@/components/shared/WorldCupMedal";
import { useLocale } from "@/contexts/LocaleContext";
import type { MessageKey } from "@/lib/i18n/messages";

const PLACE_TITLE_KEYS: Record<MedalPlace, MessageKey> = {
  1: "wcAward.title1",
  2: "wcAward.title2",
  3: "wcAward.title3",
};

const PLACE_ACCENTS: Record<MedalPlace, string> = {
  1: "#FFD700",
  2: "#D8D8D8",
  3: "#FF9600",
};

const CONFETTI_COLORS = ["#FFE500", "#38B60E", "#1CB0F6", "#FF6C0A", "#FFD700", "#FFFFFF"];

// Deterministic pseudo-random so confetti is stable across re-renders and SSR.
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface WorldCupUnlockOverlayProps {
  place: MedalPlace;
  open: boolean;
  /** Fired when the player dismisses the ceremony — the caller acks `seen_at` here. */
  onClose: () => void;
}

interface ConfettiPiece {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  color: string;
  delay: number;
}

export function WorldCupUnlockOverlay({ place, open, onClose }: WorldCupUnlockOverlayProps) {
  const { t } = useLocale();
  const accent = PLACE_ACCENTS[place];

  const confetti = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const angle = (i / 36) * Math.PI * 2 + rand(i * 7) * 0.3;
        const dist = 130 + rand(i * 7 + 1) * 190;
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist * 0.85 + 60 + rand(i * 7 + 2) * 160,
          rotate: rand(i * 7 + 3) * 540 - 270,
          scale: 0.6 + rand(i * 7 + 4) * 0.9,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: 0.65 + rand(i * 7 + 5) * 0.25,
        };
      }),
    [],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/85 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
          role="dialog"
          aria-modal="true"
          aria-label={t(PLACE_TITLE_KEYS[place])}
        >
          <div className="relative flex w-full max-w-sm flex-col items-center px-6 text-center">
            {/* Light rays — slow spin behind the medal */}
            <motion.div
              className="pointer-events-none absolute left-1/2 top-[104px] size-[420px] -translate-x-1/2 -translate-y-1/2"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 0.5, scale: 1, transition: { delay: 0.35, duration: 0.6 } }}
            >
              <motion.div
                className="size-full"
                style={{
                  background: `repeating-conic-gradient(${accent}22 0deg 9deg, transparent 9deg 24deg)`,
                  maskImage: "radial-gradient(circle, black 18%, transparent 68%)",
                  WebkitMaskImage: "radial-gradient(circle, black 18%, transparent 68%)",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>

            {/* Confetti burst */}
            {confetti.map((piece, i) => (
              <motion.span
                key={i}
                className="pointer-events-none absolute left-1/2 top-[104px] h-3 w-2 rounded-[2px]"
                style={{ backgroundColor: piece.color }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0, rotate: 0 }}
                animate={{
                  x: piece.x,
                  y: piece.y,
                  opacity: [0, 1, 1, 0],
                  scale: piece.scale,
                  rotate: piece.rotate,
                }}
                transition={{ delay: piece.delay, duration: 1.7, ease: [0.12, 0.8, 0.35, 1] }}
              />
            ))}

            {/* Medal stamps in */}
            <motion.div
              className="relative"
              initial={{ scale: 2.6, opacity: 0, rotate: -14 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                delay: 0.35,
                type: "spring",
                stiffness: 260,
                damping: 17,
                opacity: { delay: 0.35, duration: 0.22, ease: "easeOut" },
              }}
            >
              <WorldCupMedal place={place} className="w-52 drop-shadow-[0_10px_40px_rgba(0,0,0,0.6)]" />
              {/* Shockwave ring on landing */}
              <motion.div
                className="pointer-events-none absolute inset-0 rounded-full border-2"
                style={{ borderColor: accent }}
                initial={{ scale: 0.9, opacity: 0.9 }}
                animate={{ scale: 1.75, opacity: 0 }}
                transition={{ delay: 0.62, duration: 0.7, ease: "easeOut" }}
              />
            </motion.div>

            <motion.div
              className="mt-8 font-poppins text-[11px] font-bold uppercase tracking-[0.34em] text-white/55"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.95, duration: 0.4 }}
            >
              {t("wcAward.unlocked")}
            </motion.div>

            <motion.h2
              className="mt-2 font-poppins text-2xl font-bold uppercase leading-tight sm:text-3xl"
              style={{ color: accent }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.45 }}
            >
              {t(PLACE_TITLE_KEYS[place])}
            </motion.h2>

            <motion.p
              className="mt-3 max-w-[19rem] text-sm font-semibold leading-snug text-white/65"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.25, duration: 0.4 }}
            >
              {t("wcAward.unlockSubtitle")}
            </motion.p>

            <motion.div
              className="mt-4 flex items-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.4 }}
            >
              <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/40">
                {t("welcome.poweredBy")}
              </span>
              <Image
                src="/assets/betsson/3.png"
                alt="Betsson Sport"
                width={80}
                height={16}
                className="h-3 w-auto object-contain"
              />
            </motion.div>

            <motion.button
              type="button"
              onClick={onClose}
              className="mt-8 h-12 min-w-[180px] rounded-[14px] bg-brand-green px-8 font-poppins text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-green-deep"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.4 }}
            >
              {t("wcAward.collect")}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
