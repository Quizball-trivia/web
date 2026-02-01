"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    color: "#8b5cf6",
    rarity: "common",
  },
  {
    id: "3",
    type: "coins",
    amount: 150,
    label: "150 Coins",
    icon: "💰",
    color: "#fbbf24",
    rarity: "rare",
  },
  {
    id: "4",
    type: "multiplier",
    amount: 2,
    label: "2x Streak",
    icon: "🔥",
    color: "#ef4444",
    rarity: "rare",
  },
  {
    id: "5",
    type: "coins",
    amount: 250,
    label: "250 Coins",
    icon: "💎",
    color: "#22c55e",
    rarity: "epic",
  },
  {
    id: "6",
    type: "xp",
    amount: 200,
    label: "200 XP",
    icon: "✨",
    color: "#8b5cf6",
    rarity: "rare",
  },
  {
    id: "7",
    type: "badge",
    amount: 1,
    label: "Lucky Badge",
    icon: "🍀",
    color: "#10b981",
    rarity: "epic",
  },
  {
    id: "8",
    type: "coins",
    amount: 500,
    label: "500 Coins",
    icon: "🏆",
    color: "#22c55e",
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

  useEffect(() => {
    // Check if user can spin (once per day)
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

  const getTimeUntilNextSpin = () => {
    if (!nextSpinTime) return "";
    const now = Date.now();
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
        return "from-yellow-500/20 to-orange-500/20 border-yellow-500/30";
      case "epic":
        return "from-purple-500/20 to-pink-500/20 border-purple-500/30";
      case "rare":
        return "from-blue-500/20 to-cyan-500/20 border-blue-500/30";
      default:
        return "from-gray-500/20 to-gray-600/20 border-gray-500/30";
    }
  };

  const segmentAngle = 360 / wheelRewards.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center justify-center size-9 rounded-xl hover:bg-secondary active:scale-95 transition-all"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <Gift className="size-6 text-primary" />
              <h1 className="text-xl font-bold">Daily Rewards</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-4">
        {/* Header Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-green-500/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="size-5 text-primary" />
              Daily Rewards Wheel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Spin the wheel once every 24 hours for amazing rewards!
            </p>
          </CardContent>
        </Card>

        {/* Wheel Container */}
        <Card className="relative overflow-hidden">
          <CardContent className="pt-8 pb-8">
            <div className="relative flex flex-col items-center justify-center">
              {/* Pointer */}
              <div className="absolute top-0 z-20 flex flex-col items-center">
                <ChevronDown className="size-8 text-primary drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              </div>

              {/* Wheel */}
              <div className="relative size-72 md:size-80">
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-full bg-primary/5 blur-xl" />

                {/* Spinning wheel */}
                <motion.div
                  className="relative size-full rounded-full border-4 border-primary/30 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
                  style={{
                    background:
                      "radial-gradient(circle at center, #1a1a1a 0%, #0f0f0f 100%)",
                  }}
                  animate={{ rotate: rotation }}
                  transition={{
                    duration: 4,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  {/* Center circle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="size-16 rounded-full bg-primary/20 border-2 border-primary/50 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                      <Sparkles className="size-6 text-primary" />
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
                      <div className="absolute left-1/2 top-0 w-0.5 h-full bg-primary/10 -translate-x-1/2" />
                    </div>
                  ))}
                </motion.div>

                {/* Particles */}
                <AnimatePresence>
                  {particles.map((particle) => (
                    <motion.div
                      key={particle.id}
                      className="absolute top-1/2 left-1/2 size-2 rounded-full bg-primary"
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
                <Button
                  onClick={spinWheel}
                  disabled={isSpinning || !canSpin}
                  className="w-full h-12 text-lg relative overflow-hidden group"
                >
                  {isSpinning ? (
                    <span className="flex items-center gap-2">
                      <Zap className="size-5 animate-pulse" />
                      Spinning...
                    </span>
                  ) : !canSpin ? (
                    <span className="flex items-center gap-2">
                      <Clock className="size-5" />
                      Next spin in {getTimeUntilNextSpin()}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
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
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Won Reward Display */}
        <AnimatePresence>
          {wonReward && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <Card
                className={`bg-gradient-to-br ${getRarityColor(wonReward.rarity)} border-2`}
              >
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3">
                      <Trophy className="size-6 text-primary" />
                      <h3 className="text-xl">You Won!</h3>
                      <Trophy className="size-6 text-primary" />
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-lg bg-background/50">
                      <span className="text-4xl">{wonReward.icon}</span>
                      <div>
                        <div className="text-2xl">{wonReward.label}</div>
                        <Badge variant="outline" className="mt-1">
                          {wonReward.rarity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground text-center">
                      {wonReward.type === "coins" &&
                        `${wonReward.amount} coins added to your balance`}
                      {wonReward.type === "xp" &&
                        `${wonReward.amount} XP earned!`}
                      {wonReward.type === "badge" && "New badge unlocked!"}
                      {wonReward.type === "multiplier" &&
                        `${wonReward.amount}x streak multiplier activated!`}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>Come back in 24 hours for another spin!</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rewards Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Possible Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {wheelRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50"
                >
                  <span className="text-xl">{reward.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{reward.label}</div>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1 mt-0.5"
                    >
                      {reward.rarity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <Zap className="size-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm mb-1">Pro Tip</div>
                <div className="text-xs text-muted-foreground">
                  Spin the wheel every day to maximize your rewards! Higher
                  rarity items have better bonuses.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
