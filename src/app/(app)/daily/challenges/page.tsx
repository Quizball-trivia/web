"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  Brain,
  Sparkles,
  Lightbulb,
  Target,
  Timer,
  ListOrdered,
  Trophy,
  Zap,
  Clock,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import {
  ALL_CHALLENGES,
  type ChallengeConfig,
  type IconToken,
  type DailyChallengeId,
} from "@/features/home/challenges";

// ── Map icon tokens to Lucide components ──
const ICON_MAP: Record<IconToken, LucideIcon> = {
  dollarSign: DollarSign,
  brain: Brain,
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  target: Target,
  timer: Timer,
  list: ListOrdered,
};

// ── Accent color map per challenge for chunky border + button ──
const CHALLENGE_ACCENT: Record<
  string,
  { border: string; btnBg: string; btnBorder: string; iconBorder: string }
> = {
  moneyDrop:        { border: 'border-b-[#FFD700]', btnBg: 'bg-[#D4A800]', btnBorder: 'border-[#A68500]', iconBorder: 'border-[#FFD700]/40' },
  footballJeopardy: { border: 'border-b-[#1CB0F6]', btnBg: 'bg-[#1A7FA8]', btnBorder: 'border-[#14627F]', iconBorder: 'border-[#1CB0F6]/40' },
  hairstyle:        { border: 'border-b-[#CE82FF]', btnBg: 'bg-[#9B5CC8]', btnBorder: 'border-[#7A47A0]', iconBorder: 'border-[#CE82FF]/40' },
  clues:            { border: 'border-b-[#58CC02]', btnBg: 'bg-[#46A302]', btnBorder: 'border-[#378200]', iconBorder: 'border-[#58CC02]/40' },
  trueFalse:        { border: 'border-b-[#FF4B4B]', btnBg: 'bg-[#D43B3B]', btnBorder: 'border-[#A82E2E]', iconBorder: 'border-[#FF4B4B]/40' },
  emojiGuess:       { border: 'border-b-[#CE82FF]', btnBg: 'bg-[#9B5CC8]', btnBorder: 'border-[#7A47A0]', iconBorder: 'border-[#CE82FF]/40' },
  countdown:        { border: 'border-b-[#FF9600]', btnBg: 'bg-[#C47400]', btnBorder: 'border-[#9A5B00]', iconBorder: 'border-[#FF9600]/40' },
  putInOrder:       { border: 'border-b-[#1CB0F6]', btnBg: 'bg-[#1A7FA8]', btnBorder: 'border-[#14627F]', iconBorder: 'border-[#1CB0F6]/40' },
};

const DEFAULT_ACCENT = { border: 'border-b-[#58CC02]', btnBg: 'bg-[#46A302]', btnBorder: 'border-[#378200]', iconBorder: 'border-[#58CC02]/40' };

// ── State helpers ──

interface DailyChallengeState {
  completedChallenges: Record<string, number>;
}

function computeCompletedChallenges(): {
  completedChallenges: Map<string, number>;
  needsReset: boolean;
} {
  const state = storage.get<DailyChallengeState | null>(
    STORAGE_KEYS.DAILY_CHALLENGE_STATE,
    null
  );

  if (!state?.completedChallenges) {
    return { completedChallenges: new Map<string, number>(), needsReset: false };
  }

  const now = new Date();
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  const validChallenges = new Map<string, number>();

  Object.entries(state.completedChallenges).forEach(([id, timestamp]) => {
    if (timestamp >= todayMidnight.getTime()) {
      validChallenges.set(id, timestamp);
    }
  });

  const needsReset =
    validChallenges.size !== Object.keys(state.completedChallenges).length;

  return { completedChallenges: validChallenges, needsReset };
}

function getTimeUntilReset(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const msUntilReset = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(msUntilReset / (1000 * 60 * 60));
  const minutes = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));

  return `${hours}h ${minutes}m`;
}

// ── Challenge Card ──

function ChallengeCard({
  challenge,
  isCompleted,
  onClick,
  index,
}: {
  challenge: ChallengeConfig;
  isCompleted: boolean;
  onClick: () => void;
  index: number;
}) {
  const accent = CHALLENGE_ACCENT[challenge.id] ?? DEFAULT_ACCENT;
  const IconComponent = ICON_MAP[challenge.iconToken];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 + index * 0.06, ease: "easeOut" }}
    >
      <button
        onClick={onClick}
        disabled={isCompleted}
        className={`w-full text-left rounded-2xl border-b-4 transition-all overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58CC02] ${
          isCompleted
            ? "bg-[#1B2F36]/60 border-b-[#58CC02]/50 cursor-default opacity-70"
            : `bg-[#1B2F36] ${accent.border} hover:bg-[#243B44] active:border-b-2 active:translate-y-[2px] cursor-pointer`
        }`}
      >
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-4 md:gap-5">
            {/* Icon */}
            <div
              className={`size-14 md:size-[4.5rem] rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 border-2 ${
                isCompleted
                  ? "bg-[#58CC02]/20 border-[#58CC02]/40"
                  : `${challenge.iconBgColor} ${accent.iconBorder}`
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="size-7 md:size-9 text-[#58CC02]" />
              ) : (
                <IconComponent className={`size-7 md:size-9 ${challenge.iconColorClass}`} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3
                className={`text-base md:text-lg font-black uppercase leading-tight ${
                  isCompleted ? "text-[#58CC02]" : "text-white"
                }`}
              >
                {challenge.title}
              </h3>
              <p className="text-xs md:text-sm text-[#56707A] font-semibold mt-0.5 leading-snug line-clamp-2">
                {isCompleted
                  ? "Completed! Come back tomorrow."
                  : challenge.description}
              </p>

              {/* Reward pills */}
              {!isCompleted && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] md:text-xs font-black px-2.5 py-0.5 rounded-full bg-[#FFD700]/15 border border-[#FFD700]/30 text-[#FFD700]">
                    {challenge.coinReward} coins
                  </span>
                  <span className="text-[11px] md:text-xs font-black px-2.5 py-0.5 rounded-full bg-[#CE82FF]/15 border border-[#CE82FF]/30 text-[#CE82FF]">
                    {challenge.xpReward} XP
                  </span>
                </div>
              )}
            </div>

            {/* Action */}
            {isCompleted ? (
              <div className="px-4 py-2 md:px-5 md:py-2.5 rounded-xl bg-[#58CC02]/20 border-b-[3px] border-[#58CC02]/30 shrink-0">
                <span className="text-xs md:text-sm font-black text-[#58CC02] uppercase tracking-wide">Done</span>
              </div>
            ) : (
              <div className={`px-5 py-2.5 md:px-8 md:py-3 rounded-xl ${accent.btnBg} border-b-[3px] ${accent.btnBorder} shrink-0 pointer-events-none`}>
                <span className="text-sm md:text-base font-black text-white uppercase tracking-wide">Play</span>
              </div>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  );
}

// ── Page ──

export default function DailyChallengesPage() {
  const router = useRouter();
  const [, setTick] = useState(0);
  const [, setResetKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const { completedChallenges, needsReset } = computeCompletedChallenges();

  useEffect(() => {
    if (!needsReset) return;
    storage.set(STORAGE_KEYS.DAILY_CHALLENGE_STATE, {
      completedChallenges: Object.fromEntries(completedChallenges),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- completedChallenges is a new Map each render; needsReset is the real trigger
  }, [needsReset]);

  const handleSelectChallenge = (challengeId: DailyChallengeId) => {
    router.push(`/daily/challenges/${challengeId}`);
  };

  const completedCount = ALL_CHALLENGES.filter((c) =>
    completedChallenges.has(c.id)
  ).length;
  const totalCoins = ALL_CHALLENGES.reduce((sum, c) => sum + c.coinReward, 0);
  const earnedCoins = ALL_CHALLENGES.filter((c) =>
    completedChallenges.has(c.id)
  ).reduce((sum, c) => sum + c.coinReward, 0);
  const progressPct = (completedCount / ALL_CHALLENGES.length) * 100;

  return (
    <div className="min-h-screen bg-[#131F24] font-fun">
      {/* ─── Header ─── */}
      <div className="sticky top-0 z-20 bg-[#131F24]/95 backdrop-blur-sm border-b-2 border-[#1B2F36]">
        <div className="max-w-2xl mx-auto px-3 md:px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                aria-label="Back to home"
                onClick={() => router.push("/")}
                className="flex items-center justify-center size-9 md:size-10 rounded-xl bg-[#1B2F36] border-b-[3px] border-[#0D1B21] hover:bg-[#243B44] active:border-b-[1px] active:translate-y-[2px] transition-all"
              >
                <ArrowLeft className="size-4 md:size-5 text-white" />
              </button>
              <div className="flex items-center gap-1.5 md:gap-2">
                <Zap className="size-5 md:size-6 text-[#FFD700] fill-[#FFD700]" />
                <h1 className="text-base md:text-xl font-black text-white uppercase tracking-wide">
                  Daily Challenges
                </h1>
              </div>
            </div>

            <div className="px-2.5 py-1 md:px-3 md:py-1.5 rounded-full bg-[#1CB0F6]/15 border border-[#1CB0F6]/30 flex items-center gap-1.5">
              <Clock className="size-3.5 md:size-4 text-[#1CB0F6]" />
              <span className="text-[10px] md:text-xs font-black text-[#1CB0F6] uppercase">
                {getTimeUntilReset()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="max-w-2xl mx-auto px-3 md:px-4 py-4 md:py-6 space-y-3 md:space-y-4">
        {/* ─── Progress Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#58CC02] p-3 md:p-5 overflow-hidden relative"
        >
          {/* Subtle field lines */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 md:w-28 md:h-28 rounded-full border-2 border-white" />
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white -translate-x-1/2" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <div>
                <span className="text-[10px] md:text-xs font-black text-[#56707A] uppercase tracking-wider">
                  Today&apos;s Progress
                </span>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                  <span className="text-2xl md:text-4xl font-black text-white">{completedCount}</span>
                  <span className="text-base md:text-xl font-black text-[#56707A]">/{ALL_CHALLENGES.length}</span>
                </div>
              </div>
              <div className="size-12 md:size-16 rounded-2xl bg-[#58CC02]/20 border-2 border-[#58CC02]/40 flex items-center justify-center">
                <Trophy className="size-6 md:size-8 text-[#58CC02]" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="bg-[#131F24] rounded-xl md:rounded-2xl border-b-[3px] border-[#0D1B21] p-2 md:p-3">
              <div className="relative h-3 md:h-4 bg-[#243B44] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#58CC02] to-[#85E000]"
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent h-1/2" />
                </motion.div>
              </div>

              <div className="flex items-center justify-between mt-1.5 md:mt-2">
                <span className="text-[10px] md:text-xs font-black text-[#56707A]">
                  <span className="text-[#FFD700]">{earnedCoins}</span> / {totalCoins} coins
                </span>
                {completedCount === ALL_CHALLENGES.length && (
                  <span className="text-[10px] md:text-xs font-black px-2.5 py-0.5 rounded-full bg-[#58CC02]/20 border border-[#58CC02]/40 text-[#58CC02] uppercase">
                    All Complete!
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Challenge Cards ─── */}
        <div className="space-y-2.5 md:space-y-3">
          {ALL_CHALLENGES.map((challenge, i) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              isCompleted={completedChallenges.has(challenge.id)}
              onClick={() => handleSelectChallenge(challenge.id)}
              index={i}
            />
          ))}
        </div>

        {/* ─── Info Banner ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-[#1B2F36] rounded-2xl border-b-4 border-[#0D1B21] p-3 md:p-4"
        >
          <div className="flex items-start gap-3">
            <div className="size-9 md:size-10 rounded-xl bg-[#FF9600]/20 border-2 border-[#FF9600]/40 flex items-center justify-center shrink-0">
              <Zap className="size-4 md:size-5 text-[#FF9600]" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs md:text-sm font-black text-white uppercase mb-0.5">
                Daily Reset
              </h4>
              <p className="text-[11px] md:text-xs text-[#56707A] font-semibold leading-relaxed">
                All challenges reset every 24 hours at midnight. Complete
                challenges to earn coins and boost your progress!
              </p>
            </div>
          </div>
        </motion.div>

        {/* ─── Dev Reset ─── */}
        {process.env.NODE_ENV === "development" && (
          <button
            onClick={() => {
              storage.remove(STORAGE_KEYS.DAILY_CHALLENGE_STATE);
              setResetKey((k) => k + 1);
            }}
            className="flex items-center gap-1.5 text-[10px] font-bold text-yellow-500/60 hover:text-yellow-400 transition-colors uppercase tracking-widest"
          >
            <RotateCcw className="size-3" />
            Dev: Reset All Challenges
          </button>
        )}
      </div>
    </div>
  );
}
