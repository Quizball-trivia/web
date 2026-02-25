"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from 'motion/react';

import {
  Gift,
  Sparkles,
  Trophy,
  Star,
  Zap,
  Clock,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { QuitGameDialog } from "./QuitGameDialog";

interface Reward {
  id: string;
  type: "coins" | "xp" | "badge" | "item" | "multiplier";
  amount: number;
  label: string;
  icon: string;
  color: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

interface RewardsWheelProps {
  onRewardWon?: (reward: Reward) => void;
  onBack?: () => void;
}

const wheelRewards: Reward[] = [
  {
    id: "1",
    type: "coins",
    amount: 50,
    label: "50 Coins",
    icon: "🪙",
    color: "#fbbf24",
    rarity: "common",
  },
  {
    id: "2",
    type: "xp",
    amount: 100,
    label: "100 XP",
    icon: "⭐",
    color: "#CE82FF",
    rarity: "common",
  },
  {
    id: "3",
    type: "coins",
    amount: 150,
    label: "150 Coins",
    icon: "💰",
    color: "#FF9600",
    rarity: "rare",
  },
  {
    id: "4",
    type: "multiplier",
    amount: 2,
    label: "2x Streak",
    icon: "🔥",
    color: "#FF4B4B",
    rarity: "rare",
  },
  {
    id: "5",
    type: "coins",
    amount: 250,
    label: "250 Coins",
    icon: "💎",
    color: "#58CC02",
    rarity: "epic",
  },
  {
    id: "6",
    type: "xp",
    amount: 200,
    label: "200 XP",
    icon: "✨",
    color: "#CE82FF",
    rarity: "rare",
  },
  {
    id: "7",
    type: "badge",
    amount: 1,
    label: "Lucky Badge",
    icon: "🍀",
    color: "#58CC02",
    rarity: "epic",
  },
  {
    id: "8",
    type: "coins",
    amount: 500,
    label: "500 Coins",
    icon: "🏆",
    color: "#FFD700",
    rarity: "legendary",
  },
];

export function RewardsWheel({ onRewardWon, onBack }: RewardsWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonReward, setWonReward] = useState<Reward | null>(null);
  const [canSpin, setCanSpin] = useState(true);
  const [nextSpinTime, setNextSpinTime] = useState<number | null>(null);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);
  const [now, setNow] = useState(0);
  const [showQuitDialog, setShowQuitDialog] = useState(false);

  useEffect(() => {
    // Check if user can spin (once per day)
    const timeout = setTimeout(() => {
      const lastSpin = storage.get<number | null>(
        STORAGE_KEYS.WHEEL_SPIN_TIMESTAMP,
        null
      );
      if (lastSpin) {
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (now - lastSpin < twentyFourHours) {
          setCanSpin(false);
          setNextSpinTime(lastSpin + twentyFourHours);
        }
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!canSpin && nextSpinTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        if (now >= nextSpinTime) {
          setCanSpin(true);
          setNextSpinTime(null);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [canSpin, nextSpinTime]);

  useEffect(() => {
    if (!nextSpinTime) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextSpinTime]);

  const getTimeUntilNextSpin = () => {
    if (!nextSpinTime) return "";
    const diff = nextSpinTime - now;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const spinWheel = () => {
    if (isSpinning || !canSpin) return;

    setIsSpinning(true);
    setWonReward(null);

    // Select random reward
    const randomIndex = Math.floor(Math.random() * wheelRewards.length);
    const selectedReward = wheelRewards[randomIndex];

    // Calculate rotation to land on selected segment
    const segmentAngle = 360 / wheelRewards.length;
    const targetAngle = 360 - (randomIndex * segmentAngle + segmentAngle / 2);
    const spins = 5; // Number of full rotations
    const finalRotation = spins * 360 + targetAngle;

    setRotation(finalRotation);

    // After spin completes
    setTimeout(() => {
      setIsSpinning(false);
      setWonReward(selectedReward);
      setCanSpin(false);
      setNextSpinTime(Date.now() + 24 * 60 * 60 * 1000);
      storage.set(STORAGE_KEYS.WHEEL_SPIN_TIMESTAMP, Date.now());

      // Create particle effect
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 300 - 150,
        y: Math.random() * 300 - 150,
      }));
      setParticles(newParticles);

      setTimeout(() => setParticles([]), 1000);

      if (onRewardWon) {
        onRewardWon(selectedReward);
      }
    }, 4000);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "bg-[#FFD700]/10 border-b-[#FFD700]";
      case "epic":
        return "bg-[#CE82FF]/10 border-b-[#CE82FF]";
      case "rare":
        return "bg-[#1CB0F6]/10 border-b-[#1CB0F6]";
      default:
        return "bg-[#243B44] border-b-[#1B2F36]";
    }
  };

  const getRarityTextColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "text-[#FFD700]";
      case "epic":
        return "text-[#CE82FF]";
      case "rare":
        return "text-[#1CB0F6]";
      default:
        return "text-[#56707A]";
    }
  };

  const segmentAngle = 360 / wheelRewards.length;

  return (
    <div className="fixed inset-0 z-40 bg-[#131F24] font-fun flex flex-col">
      {/* Header */}
      <div className="bg-[#1B2F36] border-b-[3px] border-[#131F24]">
        <div className="max-w-2xl mx-auto px-3 md:px-4 py-2.5 md:py-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={() => setShowQuitDialog(true)}
                className="flex items-center justify-center size-9 rounded-xl hover:bg-[#243B44] active:scale-95 transition-all text-white"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Gift className="size-6 text-[#1CB0F6]" />
              <h1 className="text-lg md:text-xl font-black uppercase text-white">Daily Rewards</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full p-3 md:p-4 lg:flex lg:flex-col lg:justify-center">
        <div className="max-w-2xl mx-auto space-y-4 w-full">
        {/* Header Card */}
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] border-l-4 border-l-[#1CB0F6] p-4 md:p-5">
          <h2 className="text-lg font-black text-white flex items-center gap-2 mb-2">
            <Gift className="size-5 text-[#1CB0F6]" />
            Daily Rewards Wheel
          </h2>
          <p className="text-sm text-[#56707A]">
            Spin the wheel once every 24 hours for amazing rewards!
          </p>
        </div>

        {/* Wheel Container */}
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] p-6 md:p-8 relative overflow-hidden">
          <div className="relative flex flex-col items-center justify-center">
            {/* Pointer */}
            <div className="absolute top-0 z-20 flex flex-col items-center">
              <ChevronDown className="size-8 text-[#58CC02] drop-shadow-[0_0_8px_rgba(88,204,2,0.5)]" />
            </div>

            {/* Wheel */}
            <div className="relative size-72 md:size-80">
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-[#58CC02]/5 blur-xl" />

              {/* Spinning wheel */}
              <motion.div
                className="relative size-full rounded-full border-4 border-[#58CC02]/30 shadow-[0_0_30px_rgba(88,204,2,0.3)]"
                style={{
                  background:
                    "radial-gradient(circle at center, #1B2F36 0%, #131F24 100%)",
                }}
                animate={{ rotate: rotation }}
                transition={{
                  duration: 4,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              >
                {/* Center circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="size-16 rounded-full bg-[#58CC02]/20 border-2 border-[#58CC02]/50 flex items-center justify-center shadow-[0_0_20px_rgba(88,204,2,0.4)]">
                    <Sparkles className="size-6 text-[#58CC02]" />
                  </div>
                </div>

                {/* Segments */}
                {wheelRewards.map((reward, index) => {
                  const angle = index * segmentAngle;

                  return (
                    <div
                      key={reward.id}
                      className="absolute inset-0"
                      style={{
                        transform: `rotate(${angle + segmentAngle / 2}deg)`,
                      }}
                    >
                      {/* Segment background */}
                      <div
                        className="absolute left-1/2 top-0 origin-bottom"
                        style={{
                          width: "2px",
                          height: "50%",
                          background: `linear-gradient(to bottom, ${reward.color}, transparent)`,
                          transform: `translateX(-50%) rotate(${-segmentAngle / 2}deg)`,
                        }}
                      />

                      {/* Reward icon and label */}
                      <div
                        className="absolute left-1/2 top-8 md:top-10"
                        style={{
                          transform: `translateX(-50%)`,
                        }}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-3xl md:text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                            {reward.icon}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Segment dividers */}
                {wheelRewards.map((_, index) => (
                  <div
                    key={`divider-${index}`}
                    className="absolute inset-0"
                    style={{
                      transform: `rotate(${index * segmentAngle}deg)`,
                    }}
                  >
                    <div className="absolute left-1/2 top-0 w-0.5 h-full bg-[#58CC02]/10 -translate-x-1/2" />
                  </div>
                ))}
              </motion.div>

              {/* Particles */}
              <AnimatePresence>
                {particles.map((particle) => (
                  <motion.div
                    key={particle.id}
                    className="absolute top-1/2 left-1/2 size-2 rounded-full bg-[#58CC02]"
                    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    animate={{
                      opacity: 0,
                      scale: 0,
                      x: particle.x,
                      y: particle.y,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Spin Button */}
            <div className="mt-8 w-full max-w-xs">
              <button
                onClick={spinWheel}
                disabled={isSpinning || !canSpin}
                className="w-full py-3.5 rounded-xl font-black text-white bg-[#58CC02] border-b-4 border-b-[#46A302] active:border-b-2 active:translate-y-[2px] transition-all disabled:opacity-50 disabled:active:border-b-4 disabled:active:translate-y-0 text-lg relative overflow-hidden"
              >
                {isSpinning ? (
                  <span className="flex items-center justify-center gap-2">
                    <Zap className="size-5 animate-pulse" />
                    Spinning...
                  </span>
                ) : !canSpin ? (
                  <span className="flex items-center justify-center gap-2">
                    <Clock className="size-5" />
                    Next spin in {getTimeUntilNextSpin()}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Star className="size-5" />
                    Spin the Wheel
                  </span>
                )}

                {canSpin && !isSpinning && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                      repeatDelay: 1,
                    }}
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Won Reward Display */}
        <AnimatePresence>
          {wonReward && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <div
                className={`rounded-xl border-b-4 p-5 md:p-6 ${getRarityColor(wonReward.rarity)}`}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-3">
                    <Trophy className="size-6 text-[#FFD700]" />
                    <h3 className="text-xl font-black text-white">You Won!</h3>
                    <Trophy className="size-6 text-[#FFD700]" />
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[#131F24]/50">
                    <span className="text-4xl">{wonReward.icon}</span>
                    <div>
                      <div className="text-2xl font-black text-white">{wonReward.label}</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold bg-[#243B44] mt-1 ${getRarityTextColor(wonReward.rarity)}`}>
                        {wonReward.rarity.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-[#56707A] text-center">
                    {wonReward.type === "coins" &&
                      `${wonReward.amount} coins added to your balance`}
                    {wonReward.type === "xp" &&
                      `${wonReward.amount} XP earned!`}
                    {wonReward.type === "badge" && "New badge unlocked!"}
                    {wonReward.type === "multiplier" &&
                      `${wonReward.amount}x streak multiplier activated!`}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#56707A]">
                    <Clock className="size-3" />
                    <span>Come back in 24 hours for another spin!</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rewards Legend */}
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] p-4 md:p-5">
          <h3 className="text-base font-black text-white flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-[#1CB0F6]" />
            Possible Rewards
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {wheelRewards.map((reward) => (
              <div
                key={reward.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-[#243B44]"
              >
                <span className="text-xl">{reward.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate text-white">{reward.label}</div>
                  <span
                    className={`inline-flex items-center text-[10px] font-bold mt-0.5 ${getRarityTextColor(reward.rarity)}`}
                  >
                    {reward.rarity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips Card */}
        <div className="bg-[#1B2F36] rounded-xl border-b-4 border-[#0F1F26] border-l-4 border-l-[#1CB0F6] p-4">
          <div className="flex items-start gap-3">
            <Zap className="size-5 text-[#1CB0F6] shrink-0 mt-0.5" />
            <div>
              <div className="text-sm mb-1 font-bold text-white">Pro Tip</div>
              <div className="text-xs text-[#56707A]">
                Spin the wheel every day to maximize your rewards! Higher
                rarity items have better bonuses.
              </div>
            </div>
          </div>
        </div>
        </div>
        </div>
      </div>

      {onBack && (
        <QuitGameDialog
          open={showQuitDialog}
          onOpenChange={setShowQuitDialog}
          onQuit={onBack}
          title="Leave Rewards?"
          description="You can come back to spin the wheel anytime."
        />
      )}
    </div>
  );
}
