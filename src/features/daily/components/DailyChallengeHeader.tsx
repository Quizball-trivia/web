"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/LocaleContext";

interface DailyChallengeHeaderProps {
  onQuit: () => void;
  currentIndex: number;
  total: number;
  timeLeft?: number;
  hideTimer?: boolean;
  /** Override the centre-pill label; defaults to "Question N/Total" */
  centerLabel?: string;
  className?: string;
}

const poppins = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: '0',
  lineHeight: 1,
} as const;

export function DailyChallengeHeader({
  onQuit,
  currentIndex,
  total,
  timeLeft,
  hideTimer = false,
  centerLabel,
  className,
}: DailyChallengeHeaderProps) {
  const { t } = useLocale();
  const showTimer = !hideTimer && typeof timeLeft === "number";
  const displayTimer = showTimer
    ? (timeLeft! >= 10 ? `${timeLeft}` : `0${timeLeft}`)
    : null;
  const label = centerLabel ?? t("dailyGames.questionCounter", {
    current: String(Math.min(currentIndex + 1, total)),
    total: String(total),
  });

  return (
    <div className={cn("px-4 pt-4", className)}>
      <div className="mx-auto max-w-3xl flex items-stretch gap-2.5">
        <button
          type="button"
          onClick={onQuit}
          aria-label={t("common.close")}
          className="flex items-center justify-center rounded-[16px] bg-brand-blue px-4 text-white h-[40px] sm:h-[52px]"
          style={poppins}
        >
          ✕
        </button>
        <div
          className="flex flex-1 items-center justify-center rounded-[16px] bg-brand-blue px-5 text-white h-[40px] sm:h-[52px]"
          style={{ ...poppins, fontSize: 'clamp(14px, 2.2vw, 26px)' }}
        >
          {label}
        </div>
        {displayTimer !== null && (
          <div
            className="flex w-[64px] items-center justify-center rounded-[16px] bg-brand-blue text-white h-[40px] sm:h-[52px] sm:w-[92px] tabular-nums"
            style={{ ...poppins, fontSize: 'clamp(14px, 2.2vw, 26px)' }}
          >
            {displayTimer}
          </div>
        )}
      </div>
    </div>
  );
}
