"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { isAvatarUrl } from "@/lib/avatars";
import { usePlayer } from "@/contexts/PlayerContext";
import { usePlayerAvatar } from "@/hooks/usePlayerAvatar";
import { useTraining } from "../TrainingMatchProvider";
import { BOT_AVATAR, BOT_NAME } from "../constants";

// Same card colors as RankedCategoryBlockingScreen
const CARD_COLORS = [
  { bg: "#162A3A", dark: "#1CB0F6" },
  { bg: "#2A2118", dark: "#FF9600" },
  { bg: "#241A2E", dark: "#CE82FF" },
  { bg: "#1A2A18", dark: "#58CC02" },
  { bg: "#2A1A1A", dark: "#FF4B4B" },
  { bg: "#2A2618", dark: "#FFC800" },
];

export function TrainingBanningStage() {
  const { match, tooltips, banCategories } = useTraining();
  const { player } = usePlayer();
  const { avatarUrl: playerResolvedAvatar } = usePlayerAvatar();

  const [playerBan, setPlayerBan] = useState<string | null>(null);
  const [botBan, setBotBan] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [currentActor, setCurrentActor] = useState<"player" | "opponent">("player");
  const tooltipFired = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const autoBanForActor = useCallback((actor: "player" | "opponent") => {
    const available = banCategories.filter((category) => (
      category.id !== playerBan && category.id !== botBan
    ));
    const pick = available[0];
    if (!pick) return;

    if (actor === "player") {
      setPlayerBan((current) => current ?? pick.id);
      return;
    }

    setBotBan((current) => current ?? pick.id);
  }, [banCategories, botBan, playerBan]);

  useEffect(() => {
    if (!tooltipFired.current) {
      tooltipFired.current = true;
      tooltips.tryShowStageTooltip("banning");
    }
  }, [tooltips]);

  // Countdown timer — pauses while tooltip is visible
  useEffect(() => {
    if (tooltips.isPaused) return;
    if (playerBan && botBan) return; // both bans done, no need for timer
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(() => {
            if (currentActor === "player" && !playerBan) {
              autoBanForActor("player");
              return;
            }
            if (currentActor === "opponent" && !botBan) {
              autoBanForActor("opponent");
            }
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [tooltips.isPaused, playerBan, botBan, currentActor, autoBanForActor]);

  // Bot bans after player bans (switch turns) — waits for tooltip to be dismissed
  useEffect(() => {
    if (!playerBan || botBan) return;
    if (tooltips.isPaused) return;
    setCurrentActor("opponent");
    setTimeLeft(15);
    const timer = setTimeout(() => {
      // Bot bans the first remaining category unless the timeout already resolved it.
      autoBanForActor("opponent");
    }, 2500);
    return () => clearTimeout(timer);
  }, [playerBan, botBan, autoBanForActor, tooltips.isPaused]);

  // After both bans, advance to playing
  useEffect(() => {
    if (playerBan && botBan) {
      const timer = setTimeout(() => {
        match.startQuestion(0);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [playerBan, botBan, match]);

  const handleBan = (categoryId: string) => {
    if (playerBan || botBan || currentActor !== "player") return;
    setPlayerBan(categoryId);
  };

  const banCount = (playerBan ? 1 : 0) + (botBan ? 1 : 0);
  const phase = playerBan && botBan ? "ready" : "ban";
  const steps = [banCount >= 1, banCount >= 2, playerBan !== null && botBan !== null];

  return (
    <div className="min-h-screen bg-[#131F24] flex flex-col font-fun">
      {/* ─── Chunky Header Bar (same as RankedCategoryBlockingScreen) ─── */}
      <div className="w-full bg-[#1B2F36] border-b-[3px] border-[#0D1B21]">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          {/* Player (Left) */}
          <div
            className={cn(
              "flex items-center gap-3 transition-opacity duration-300",
              currentActor === "opponent" && "opacity-50",
            )}
          >
            <div className="relative">
              <div className="size-14 rounded-full bg-[#131F24] border-[4px] border-[#1CB0F6] flex items-center justify-center text-3xl overflow-hidden shadow-[0_3px_0_0_#1899D6]">
                {isAvatarUrl(playerResolvedAvatar) ? (
                  <Image
                    src={playerResolvedAvatar}
                    alt="You"
                    width={56}
                    height={56}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{playerResolvedAvatar || "🧑"}</span>
                )}
              </div>
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-black bg-[#1CB0F6] text-white px-2 py-[2px] rounded-full border-b-2 border-[#1899D6] uppercase tracking-wide">
                YOU
              </span>
            </div>
            <div className="hidden sm:block">
              <div className="text-[15px] font-black text-white leading-none">
                {player.username}
              </div>
            </div>
          </div>

          {/* Center: Timer + Phase */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "text-5xl font-black tabular-nums leading-none transition-colors",
                timeLeft <= 5 ? "text-[#FF4B4B] animate-pulse" : "text-[#58CC02]",
              )}
            >
              {timeLeft}
            </div>
            <div className="mt-2 bg-[#FF4B4B] px-3 py-1 rounded-full border-b-[3px] border-[#E04242]">
              <span className="text-[10px] font-black text-white uppercase tracking-wider">
                Ban Phase
              </span>
            </div>
            <span className="text-[10px] font-extrabold text-[#56707A] mt-1.5 uppercase">
              {currentActor === "player" ? "Your Turn" : "Opponent's Turn"}
            </span>
          </div>

          {/* Opponent (Right) */}
          <div
            className={cn(
              "flex items-center gap-3 flex-row-reverse transition-opacity duration-300",
              currentActor === "player" && "opacity-50",
            )}
          >
            <div className="relative">
              <div className="size-14 rounded-full bg-[#131F24] border-[4px] border-[#FF4B4B] flex items-center justify-center text-3xl overflow-hidden shadow-[0_3px_0_0_#E04242]">
                {isAvatarUrl(BOT_AVATAR) ? (
                  <Image
                    src={BOT_AVATAR}
                    alt="Opponent"
                    width={56}
                    height={56}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>😈</span>
                )}
              </div>
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-black bg-[#FF4B4B] text-white px-2 py-[2px] rounded-full border-b-2 border-[#E04242] uppercase tracking-wide">
                FOE
              </span>
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-[15px] font-black text-white leading-none">
                {BOT_NAME}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar — 3 steps */}
        <div className="flex gap-1.5 px-5 pb-3 max-w-5xl mx-auto">
          {steps.map((done, i) => (
            <div
              key={i}
              className={cn(
                "h-[10px] flex-1 rounded-full border-b-2 transition-colors duration-300",
                done
                  ? "bg-[#FF4B4B] border-[#E04242]"
                  : "bg-[#243B44] border-[#1B2F36]",
              )}
            />
          ))}
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 flex flex-col items-center justify-center py-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8 px-6"
        >
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">
            {phase === "ban" ? "Ban a Category" : "Get Ready!"}
          </h2>
          <p className="text-sm text-[#56707A] font-bold mt-1.5">
            {phase === "ban"
              ? "Tap a card to remove it. One category remains for Half 1."
              : "Match starting with selected Half 1 category..."}
          </p>
        </motion.div>

        {/* Horizontal Scrolling Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="w-full"
        >
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto scrollbar-hide pb-8 px-6 snap-x snap-mandatory justify-center"
          >
            {banCategories.map((category, i) => {
              const isPlayerBanned = category.id === playerBan;
              const isBotBanned = category.id === botBan;
              const isBanned = isPlayerBanned || isBotBanned;
              const color = CARD_COLORS[i % CARD_COLORS.length];

              const disabled =
                (!!playerBan && !isPlayerBanned && phase === "ban") ||
                isBotBanned ||
                currentActor !== "player" ||
                phase !== "ban";

              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.2 + i * 0.08,
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                  }}
                  onClick={() => {
                    if (disabled || isBanned) return;
                    handleBan(category.id);
                  }}
                  className={cn(
                    "shrink-0 w-[220px] snap-center rounded-3xl overflow-hidden transition-all duration-200",
                    !disabled &&
                      !isBanned &&
                      "cursor-pointer active:scale-[0.95] active:translate-y-[2px]",
                    disabled && !isBanned && "cursor-default",
                    playerBan &&
                      !isPlayerBanned &&
                      !isBotBanned &&
                      "opacity-25 pointer-events-none scale-95",
                  )}
                >
                  {/* Icon area */}
                  <div
                    className="aspect-[4/5] flex items-center justify-center relative"
                    style={{
                      backgroundColor: isBanned ? "#243B44" : color.bg,
                    }}
                  >
                    <span
                      className={cn(
                        "text-8xl transition-all duration-300 drop-shadow-lg",
                        isBanned && "grayscale opacity-40 scale-90",
                      )}
                    >
                      {category.icon || "⚽"}
                    </span>

                    {/* Banned overlay */}
                    <AnimatePresence>
                      {isBanned && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 bg-black/40 flex items-center justify-center"
                        >
                          <motion.div
                            initial={{ scale: 0, rotate: -30 }}
                            animate={{ scale: 1, rotate: -12 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 14,
                            }}
                            className="bg-[#FF4B4B] px-5 py-2.5 rounded-2xl border-b-4 border-[#CC3E3E] shadow-lg"
                          >
                            <span className="text-base font-black text-white uppercase tracking-wide">
                              BANNED
                            </span>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Info area */}
                  <div
                    className="p-4 bg-[#1B2F36]"
                    style={{
                      borderBottom: `5px solid ${isBanned ? "#1B2F36" : color.dark}`,
                    }}
                  >
                    <h3 className="text-base font-black text-white leading-tight truncate">
                      {category.name}
                    </h3>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Swipe hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-1"
        >
          <span className="text-[10px] text-[#56707A] font-bold">
            ← Swipe to see all categories →
          </span>
        </motion.div>
      </div>
    </div>
  );
}
