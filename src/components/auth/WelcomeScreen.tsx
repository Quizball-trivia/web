"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { Brain, Goal, Trophy, Crown, Star, Globe, Flame, Shield, Repeat, Award, Flag, Swords, type LucideIcon } from 'lucide-react';
import { useAllCategoriesList } from '@/lib/queries/categories.queries';
import { AppLogo } from '@/components/AppLogo';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { motion, AnimatePresence } from 'motion/react';
import { socialLogin } from '@/lib/auth/auth.service';
import { LeaderboardPodium } from '@/features/leaderboard/components/LeaderboardPodium';
import { LeaderboardTable } from '@/features/leaderboard/components/LeaderboardTable';
import type { LeaderboardEntry } from '@/lib/domain/leaderboard';
import { useLeaderboard } from '@/lib/queries/leaderboard.queries';
import { RANKED_TIER_BANDS } from '@/utils/rankedTier';
import { tierConfig, type TierName } from '@/utils/tierVisuals';

const SUBHEADING_PHRASES = [
  "Back your football knowledge.",
  "Beat your mates and climb.",
  "Turn answers into goals.",
  "Move up the table.",
  "Take on leagues, legends, and rivalries.",
  "Play quick matches. Build your rank.",
  "From trivia wins to real bragging rights.",
  "Know the game. Win the duel.",
  "Start strong. Finish top.",
  "Every right answer moves you on.",
];

// Style mapping for known categories (matched by slug or lowercased name)
const CATEGORY_STYLES: Record<string, { color: string; icon: LucideIcon; flag?: string; watermarkImg?: string }> = {
  "premier-league": { color: "#3D195B", icon: Crown, flag: "gb-eng" },
  "champions-league": { color: "#1A71B8", icon: Star },
  "world-cup": { color: "#D4AF37", icon: Globe, watermarkImg: "/assets/brand/world-cup-trophy.webp" },
  "la-liga": { color: "#FF4B44", icon: Flame, flag: "es" },
  "serie-a": { color: "#024494", icon: Shield, flag: "it" },
  "bundesliga": { color: "#D20515", icon: Goal, flag: "de" },
  "ligue-1": { color: "#DFE512", icon: Award, flag: "fr" },
  "league-1": { color: "#DFE512", icon: Award, flag: "fr" },
  "transfer-history": { color: "#1CB0F6", icon: Repeat },
  "transfers": { color: "#1CB0F6", icon: Repeat },
  "legends": { color: "#FFD700", icon: Trophy, watermarkImg: "/assets/brand/ball.webp" },
  "national-teams": { color: "#38B60E", icon: Flag },
  "club-rivalries": { color: "#FF4B4B", icon: Swords },
  "rivalries": { color: "#FF4B4B", icon: Swords },
  "europa-league": { color: "#F68E1F", icon: Star },
  "euro": { color: "#004B87", icon: Globe, flag: "eu" },
  "copa-america": { color: "#1B75BB", icon: Globe },
  "african-cup": { color: "#009639", icon: Globe },
  "mls": { color: "#472D8C", icon: Shield, flag: "us" },
  "eredivisie": { color: "#E4002B", icon: Shield, flag: "nl" },
  "liga-portugal": { color: "#00543E", icon: Shield, flag: "pt" },
  "scottish-premiership": { color: "#1D1D8F", icon: Shield, flag: "gb-sct" },
  "rules": { color: "#6B7280", icon: Brain },
  "stadiums": { color: "#059669", icon: Goal },
  "managers": { color: "#7C3AED", icon: Crown },
  "ballon-dor": { color: "#D4AF37", icon: Award, watermarkImg: "/assets/brand/ball.webp" },
};

// Categories to exclude (game modes, not real trivia categories)
const EXCLUDED_SLUGS = new Set([
  "daily-challenges", "daily-challenge", "countdown", "jeopardy",
  "daily", "daily-quiz", "count-down", "football-jeopardy", "clues",
  "true-or-false", "put-in-order", "money-drop",
]);

// Main categories to feature on the landing page (matched by slug or name substring)
const FEATURED_NAMES = [
  "champions league",
  "world cup",
  "premier league",
  "la liga",
  "bundesliga",
  "league 1",
  "uefa euro",
];

// Fallback colors for categories not in the mapping
const FALLBACK_COLORS = ["#E74C3C", "#3498DB", "#2ECC71", "#9B59B6", "#F39C12", "#1ABC9C", "#E67E22", "#2980B9"];

function getCategoryStyle(slug: string, name: string, index: number) {
  // Try exact slug match, then name-based slug, then substring match
  const nameSlug = name.toLowerCase().replace(/\s+/g, '-');
  const style = CATEGORY_STYLES[slug] ?? CATEGORY_STYLES[nameSlug];
  if (style) return style;
  // Substring match on name (e.g. "League 1" matches "ligue-1" style)
  const lowerName = name.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_STYLES)) {
    const keyWords = key.replace(/-/g, ' ');
    if (lowerName.includes(keyWords) || keyWords.includes(lowerName)) return val;
  }
  return { color: FALLBACK_COLORS[index % FALLBACK_COLORS.length], icon: Star as LucideIcon };
}

const DEMO_PLAYER_NAMES = ["Mason", "Thiago", "Santi", "Jamal", "Enzo", "Rafa", "Nico", "Jude"];

const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { id: "1", rank: 1, username: "CR7_GOAT", avatar: "avatar-1", country: "pt", tier: "GOAT", rankPoints: 4820, isCurrentUser: false, trend: "same", trendValue: 0 },
  { id: "2", rank: 2, username: "Messianic10", avatar: "avatar-2", country: "ar", tier: "Legend", rankPoints: 4615, isCurrentUser: false, trend: "up", trendValue: 2 },
  { id: "3", rank: 3, username: "ZizouMagic", avatar: "avatar-3", country: "fr", tier: "Legend", rankPoints: 4490, isCurrentUser: false, trend: "down", trendValue: 1 },
  { id: "4", rank: 4, username: "TotalFootball14", avatar: "avatar-4", country: "nl", tier: "World-Class", rankPoints: 4210, isCurrentUser: false, trend: "up", trendValue: 3 },
  { id: "5", rank: 5, username: "KloppHeavyMetal", avatar: "avatar-5", country: "de", tier: "World-Class", rankPoints: 3980, isCurrentUser: false, trend: "down", trendValue: 2 },
  { id: "6", rank: 6, username: "TikiTakaMaster", avatar: "avatar-6", country: "es", tier: "Captain", rankPoints: 3755, isCurrentUser: false, trend: "up", trendValue: 1 },
  { id: "7", rank: 7, username: "Azzurri_Fan", avatar: "avatar-7", country: "it", tier: "Captain", rankPoints: 3640, isCurrentUser: false, trend: "same", trendValue: 0 },
  { id: "8", rank: 8, username: "ThreeLions_", avatar: "avatar-8", country: "gb-eng", tier: "Key Player", rankPoints: 3510, isCurrentUser: false, trend: "up", trendValue: 4 },
];

const STADIUM_SCENES = [
  {
    leftX: '20%',
    leftY: '56%',
    rightX: '79%',
    rightY: '45%',
    ballX: '35%',
    ballY: '53%',
    rightScore: 0,
    showGoal: false,
    progress: 2,
  },
  {
    leftX: '34%',
    leftY: '54%',
    rightX: '73%',
    rightY: '48%',
    ballX: '50%',
    ballY: '52%',
    rightScore: 0,
    showGoal: false,
    progress: 4,
  },
  {
    leftX: '49%',
    leftY: '52%',
    rightX: '86%',
    rightY: '43%',
    ballX: '81%',
    ballY: '47%',
    rightScore: 1,
    showGoal: true,
    progress: 6,
  },
  {
    leftX: '22%',
    leftY: '56%',
    rightX: '79%',
    rightY: '45%',
    ballX: '50%',
    ballY: '50%',
    rightScore: 1,
    showGoal: false,
    progress: 1,
  },
] as const;

function getDaysUntilWorldCup(): number {
  const WC_START = new Date(2026, 5, 11); // June 11, 2026
  const now = new Date();
  const diff = WC_START.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// Deterministic pseudo-random duels count based on days since launch
function getDuelsCount(): number {
  const LAUNCH_DATE = Date.UTC(2026, 2, 1);
  const BASE_COUNT = 1000;
  const now = Date.now();
  const daysSinceLaunch = Math.max(0, Math.floor((now - LAUNCH_DATE) / (1000 * 60 * 60 * 24)));
  let total = BASE_COUNT;
  for (let d = 0; d < daysSinceLaunch; d++) {
    const seed = d * 2654435761;
    const daily = 5 + (Math.abs(seed) % 96);
    total += daily;
  }
  return total;
}

export function WelcomeScreen() {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [duelsCount, setDuelsCount] = useState(1000);
  const [wcDaysLeft, setWcDaysLeft] = useState(0);
  const [stadiumPhase, setStadiumPhase] = useState(0);
  const [demoPlayers, setDemoPlayers] = useState({ left: "Mason", right: "Thiago" });
  useEffect(() => setDuelsCount(getDuelsCount()), []);
  useEffect(() => {
    setWcDaysLeft(getDaysUntilWorldCup());
    const shuffled = [...DEMO_PLAYER_NAMES].sort(() => Math.random() - 0.5);
    setDemoPlayers({
      left: shuffled[0] ?? "Mason",
      right: shuffled[1] ?? "Thiago",
    });
  }, []);

  // Fetch real leaderboard
  const { data: leaderboardData } = useLeaderboard('global');
  const leaderboardEntries = leaderboardData ?? DEMO_LEADERBOARD;

  // Fetch real categories — filter out game modes, split into featured + rest
  const { data: categoriesData } = useAllCategoriesList({ limit: 100, is_active: "true" });
  const allCategories = (categoriesData?.items ?? []).filter(
    (c) => !EXCLUDED_SLUGS.has(c.slug) && !EXCLUDED_SLUGS.has(c.name.toLowerCase().replace(/\s+/g, '-'))
  );
  const featuredCategories: typeof allCategories = [];
  const used = new Set<string>();
  for (const search of FEATURED_NAMES) {
    const normalizedSearch = search.toLowerCase();
    const exactMatch = allCategories.find(
      (c) => !used.has(c.id) && c.name.toLowerCase() === normalizedSearch
    );
    const match = exactMatch ?? allCategories.find(
      (c) => !used.has(c.id) && c.name.toLowerCase().includes(normalizedSearch)
    );
    if (match && !used.has(match.id)) {
      featuredCategories.push(match);
      used.add(match.id);
    }
  }
  const remainingCategories = allCategories.filter((c) => !used.has(c.id));

  // Subheading rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % SUBHEADING_PHRASES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = (phase: number) => {
      const currentScene = STADIUM_SCENES[phase];
      const delay = currentScene.showGoal ? 3000 : 2600;
      timeoutId = setTimeout(() => {
        setStadiumPhase((prev) => (prev + 1) % STADIUM_SCENES.length);
      }, delay);
    };

    scheduleNext(stadiumPhase);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [stadiumPhase]);

  const handleKickOff = () => setLoginOpen(true);
  const handleGoogleLogin = async () => {
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      await socialLogin('google', redirectTo);
    } catch (error) {
      console.error('Google login failed', error);
    }
  };

  const stadiumScene = STADIUM_SCENES[stadiumPhase];

  return (
    <div className="min-h-screen w-full bg-[#071013] font-sans text-foreground flex flex-col overflow-x-hidden">
      {/* ── Navbar ── */}
      <header className="flex h-16 md:h-20 items-center justify-between px-6 md:px-12 lg:px-20 shrink-0 bg-[#071013]/80 backdrop-blur-md sticky top-0 z-50">
        <AppLogo size="md" className="!justify-start" />
        <div className="flex items-center gap-2.5">
          <Image src="/assets/brand/world-cup-trophy.webp" alt="Trophy" width={96} height={96} className="h-10 md:h-12 w-auto object-contain" />
          {wcDaysLeft > 0 && (
            <div className="flex flex-col leading-none">
              <span className="text-lg md:text-xl font-black tabular-nums text-white">
                {wcDaysLeft}
              </span>
              <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-[#FFE500]">
                until kickoff
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero — Split layout ── */}
      <main className="flex-1 flex flex-col lg:flex-row items-center max-w-7xl mx-auto w-full px-6 py-8 md:py-12 lg:py-0 gap-10 md:gap-12 lg:gap-16">

        {/* LEFT: Stadium sim */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="order-2 lg:order-1 flex-1 flex items-center justify-center w-full max-w-3xl lg:max-w-none relative"
        >
          <div className="w-full max-w-3xl">
            <div className="mb-4 flex items-center justify-between gap-3 px-1 md:px-2">
              <div className="flex items-center gap-3 flex-1 min-w-0 rounded-2xl bg-[#071013] px-3 py-2.5">
                <div className="rounded-full bg-[#1CB0F6] p-[3px] shadow-[0_0_16px_rgba(28,176,246,0.3)]">
                  <AvatarDisplay customization={{ base: "avatar-1", background: "transparent" }} size="sm" className="rounded-full" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white/85 truncate">{demoPlayers.left}</div>
                  <div className="text-3xl leading-7 font-black text-white tabular-nums">0</div>
                </div>
              </div>

              <div className="shrink-0 text-xl font-black text-white/90 min-w-[44px] text-center">VS</div>

              <div className="flex items-center gap-3 flex-1 min-w-0 justify-end rounded-2xl bg-[#071013] px-3 py-2.5">
                <div className="min-w-0 text-right">
                  <div className="text-xs font-bold text-white/85 truncate">{demoPlayers.right}</div>
                  <motion.div
                    key={stadiumScene.rightScore}
                    initial={{ scale: stadiumScene.showGoal ? 1.4 : 1, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className="text-3xl leading-7 font-black text-white tabular-nums"
                  >
                    {stadiumScene.rightScore}
                  </motion.div>
                </div>
                <div className="rounded-full bg-[#FF4B4B] p-[3px] shadow-[0_0_16px_rgba(255,75,75,0.3)]">
                  <AvatarDisplay customization={{ base: "avatar-8", background: "transparent" }} size="sm" className="rounded-full" />
                </div>
              </div>
            </div>

            <div className="relative w-full max-w-3xl">
              <AnimatePresence>
                {stadiumScene.showGoal && (
                  <>
                    <motion.div
                      key={`hero-celebration-hand-left-${stadiumPhase}`}
                      className="pointer-events-none absolute -left-[14%] bottom-[6%] z-30 w-[24%] min-w-[104px]"
                      initial={{ opacity: 0, x: -28, rotate: -10 }}
                      animate={{ opacity: 1, x: 0, rotate: -3 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.28 }}
                    >
                      <Image src="/assets/brand/hand-left.webp" alt="" width={120} height={200} className="w-full h-auto object-contain" />
                    </motion.div>

                    <motion.div
                      key={`hero-celebration-hand-right-${stadiumPhase}`}
                      className="pointer-events-none absolute -right-[14%] bottom-[6%] z-30 w-[24%] min-w-[104px]"
                      initial={{ opacity: 0, x: 28, rotate: 10 }}
                      animate={{ opacity: 1, x: 0, rotate: 3 }}
                      exit={{ opacity: 0, x: 18 }}
                      transition={{ duration: 0.28 }}
                    >
                      <Image src="/assets/brand/hand-right.webp" alt="" width={120} height={200} className="w-full h-auto object-contain" />
                    </motion.div>

                    <motion.div
                      key={`hero-celebration-plus-left-${stadiumPhase}`}
                      className="pointer-events-none absolute -left-[3%] top-[10%] z-30 w-[14%] min-w-[60px]"
                      initial={{ opacity: 0, x: -14, y: 8, rotate: -10 }}
                      animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.35, delay: 0.12 }}
                    >
                      <Image src="/assets/brand/+35.png" alt="" width={117} height={96} className="w-full h-auto object-contain" />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[#0B1417] p-2 md:rounded-[34px] md:p-3">
                <div className="absolute inset-x-10 bottom-2 h-16 rounded-full bg-[#38B60E]/18 blur-3xl" />
                <Image
                  src="/assets/stadium-green.png"
                  alt="QuizBall stadium"
                  width={1400}
                  height={520}
                  className="relative w-full h-auto rounded-[22px] object-contain md:rounded-[28px]"
                />

                <motion.div
                  className="pointer-events-none absolute"
                  animate={{ left: stadiumScene.leftX, top: stadiumScene.leftY }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                >
                  <motion.div
                    animate={{ y: [0, -4, 0], scale: [1, 1.04, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    className="rounded-full bg-[#FF4B4B] p-[3px] shadow-[0_0_18px_rgba(255,75,75,0.35)]"
                  >
                    <AvatarDisplay customization={{ base: "avatar-1", background: "transparent" }} size="sm" className="rounded-full" />
                  </motion.div>
                </motion.div>

                <motion.div
                  className="pointer-events-none absolute"
                  animate={{ left: stadiumScene.rightX, top: stadiumScene.rightY }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                >
                  <motion.div
                    animate={{ y: [0, 4, 0], scale: [1, 1.04, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.25 }}
                    className="rounded-full bg-[#38B60E] p-[3px] shadow-[0_0_18px_rgba(56,182,14,0.35)]"
                  >
                    <AvatarDisplay customization={{ base: "avatar-8", background: "transparent" }} size="sm" className="rounded-full" />
                  </motion.div>
                </motion.div>

                <motion.div
                  className="pointer-events-none absolute flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center md:size-12"
                  animate={{
                    left: stadiumScene.ballX,
                    top: stadiumScene.ballY,
                    rotate: stadiumScene.showGoal ? 120 : 0,
                    scale: stadiumScene.showGoal ? 1.12 : 1,
                    y: [0, -3, 0],
                    opacity: stadiumScene.showGoal ? 0 : 1,
                  }}
                  transition={{
                    left: { type: 'spring', stiffness: 120, damping: 16 },
                    top: { type: 'spring', stiffness: 120, damping: 16 },
                    rotate: { type: 'spring', stiffness: 120, damping: 16 },
                    scale: { type: 'spring', stiffness: 120, damping: 16 },
                    opacity: { duration: 0.2 },
                    y: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
                  }}
                >
                  <Image src="/assets/brand/ball-icon.webp" alt="" width={40} height={40} className="size-8 object-contain drop-shadow-[0_0_14px_rgba(255,255,255,0.32)] md:size-9" />
                </motion.div>

                <AnimatePresence>
                  {stadiumScene.showGoal && (
                    <motion.div
                      key={`hero-goal-celebration-${stadiumPhase}`}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 14, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                        className="relative w-[78%] max-w-[520px]"
                      >
                        <Image src="/assets/goal.png" alt="Goal celebration" width={760} height={538} className="w-full h-auto object-contain" />
                        <motion.div
                          className="absolute left-1/2 top-[44%] flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center md:size-24"
                          initial={{ scale: 1, y: 30, opacity: 0.94 }}
                          animate={{ scale: [1, 5, 0.9], y: [30, -42, 20], opacity: [0.94, 1, 0.98] }}
                          transition={{ duration: 1.45, times: [0, 0.38, 1], ease: 'easeInOut' }}
                        >
                          <Image src="/assets/brand/large-ball.png" alt="" width={256} height={256} className="size-12 object-contain drop-shadow-[0_0_14px_rgba(255,255,255,0.32)] md:size-14" />
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>

        {/* RIGHT: Copy & CTA */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="order-1 lg:order-2 flex-1 flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl relative lg:pl-8 xl:pl-12"
        >
          {/* Left hand — keep original motion, soften the edge where it enters */}
          <div className="absolute -left-11 md:-left-22 top-10 md:top-14 w-16 md:w-24 h-32 md:h-48 overflow-hidden pointer-events-none md:hidden">
            <motion.div
              className="origin-bottom"
              style={{
                maskImage: 'linear-gradient(to top, black 60%, transparent 100%), linear-gradient(to right, transparent 0%, black 22%, black 100%)',
                WebkitMaskImage: 'linear-gradient(to top, black 60%, transparent 100%), linear-gradient(to right, transparent 0%, black 22%, black 100%)',
              }}
              animate={{ rotate: [-8, 8, -8] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image src="/assets/brand/hand-left.webp" alt="" width={120} height={200} className="w-14 md:w-24 h-auto" />
            </motion.div>
          </div>

          {/* Right hand — keep original motion, soften the edge where it enters */}
          <div className="absolute -right-11 md:-right-22 top-10 md:top-14 w-16 md:w-24 h-32 md:h-48 overflow-hidden pointer-events-none md:hidden">
            <motion.div
              className="origin-bottom"
              style={{
                maskImage: 'linear-gradient(to top, black 60%, transparent 100%), linear-gradient(to left, transparent 0%, black 22%, black 100%)',
                WebkitMaskImage: 'linear-gradient(to top, black 60%, transparent 100%), linear-gradient(to left, transparent 0%, black 22%, black 100%)',
              }}
              animate={{ rotate: [8, -8, 8] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <Image src="/assets/brand/hand-right.webp" alt="" width={120} height={200} className="w-14 md:w-24 h-auto" />
            </motion.div>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex -space-x-2">
              <div className="rounded-full bg-[#FF4B4B] p-[3px] ring-2 ring-[#071013]">
                <AvatarDisplay customization={{ base: "avatar-1", background: "transparent" }} size="sm" className="rounded-full" />
              </div>
              <div className="rounded-full bg-[#38B60E] p-[3px] ring-2 ring-[#071013]">
                <AvatarDisplay customization={{ base: "avatar-8", background: "transparent" }} size="sm" className="rounded-full" />
              </div>
              <div className="rounded-full bg-[#FFD700] p-[3px] ring-2 ring-[#071013]">
                <AvatarDisplay customization={{ base: "avatar-3", background: "transparent" }} size="sm" className="rounded-full" />
              </div>
            </div>
            <span className="text-[#56707A] font-bold text-sm">{duelsCount.toLocaleString()}+ duels played so far</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] mb-4 text-white">
            Football trivia that feels like matchday.
          </h1>

          <div className="h-8 mb-8 flex items-center justify-center lg:justify-start">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentPhraseIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-lg font-bold text-[#38B60E]"
              >
                {SUBHEADING_PHRASES[currentPhraseIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          <Button
            onClick={handleKickOff}
            className="w-full sm:w-auto min-w-[280px] h-14 rounded-2xl text-lg font-black uppercase tracking-wide bg-[#38B60E] text-white hover:bg-[#42c814] border-b-[5px] border-[#2D950B] active:border-b-0 active:translate-y-[5px] transition-all shadow-none hover:shadow-none"
          >
            Kick off
            </Button>
        </motion.div>
      </main>

      {/* ── Categories ── */}
      {featuredCategories.length > 0 && (
        <section className="px-6 py-12 md:py-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-center text-2xl md:text-3xl font-black text-white mb-3">
              Pick your football lane
            </h2>
            <p className="text-center text-sm md:text-base text-white/60 font-medium mb-10">
              {allCategories.length} ways to test your football brain, from elite leagues to cult storylines.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {featuredCategories.map((cat, i) => {
                const style = getCategoryStyle(cat.slug, cat.name, i);
                const IconComponent = style.icon;
                return (
                  <motion.button
                    key={cat.id}
                    type="button"
                    aria-label={`Open ${cat.name}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04 }}
                    className="group relative min-h-[124px] md:min-h-[138px] cursor-pointer overflow-hidden rounded-2xl border border-white/10 p-4 md:p-5 transition-all duration-200 hover:scale-[1.04] hover:-translate-y-1 hover:brightness-110 hover:border-white/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
                    style={{ backgroundColor: style.color }}
                    onClick={() => setLoginOpen(true)}
                  >
                    {cat.imageUrl ? (
                      <>
                        <Image
                          src={cat.imageUrl}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/30 to-transparent" />
                      </>
                    ) : null}

                    {/* Watermark: flag, image, or icon */}
                    {!cat.imageUrl && style.flag ? (
                      <Image
                        src={`https://flagcdn.com/w160/${style.flag}.png`}
                        alt=""
                        width={160}
                        height={120}
                        className="absolute -bottom-2 -right-2 w-20 md:w-24 opacity-[0.14] pointer-events-none rounded-sm"
                      />
                    ) : !cat.imageUrl && style.watermarkImg ? (
                      <Image
                        src={style.watermarkImg}
                        alt=""
                        width={120}
                        height={120}
                        className="absolute -bottom-2 -right-2 size-20 md:size-24 opacity-[0.14] pointer-events-none object-contain"
                      />
                    ) : !cat.imageUrl ? (
                      <IconComponent className="absolute -bottom-3 -right-3 size-24 md:size-28 opacity-[0.1] text-white pointer-events-none" />
                    ) : null}

                    {/* Name */}
                    <div className="relative z-10 mt-auto text-left text-sm md:text-base font-black uppercase tracking-wide leading-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]">
                      {cat.name}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {remainingCategories.length > 0 && (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => setCategoriesOpen(true)}
                  className="h-12 px-8 rounded-2xl text-sm font-black uppercase tracking-wide border-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:border-white/30 shadow-none hover:shadow-none"
                >
                  Browse all {allCategories.length} categories
                </Button>
              </div>
            )}
          </div>
        </section>
      )}


      {/* ── Tier Road (Horizontal) ── */}
      <section className="py-12 md:py-20 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
              Rise through the tiers
            </h2>
            <p className="text-sm md:text-base text-white/60 font-medium">
              Begin at Academy and work your way to GOAT.
            </p>
          </motion.div>

          {/* Horizontal scrollable road */}
          <div className="overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="relative flex items-center min-w-max mx-auto" style={{ width: 'fit-content' }}>
              {/* Horizontal connecting line */}
              <div className="absolute left-6 right-6 top-1/2 -translate-y-[14px] h-0.5 bg-gradient-to-r from-slate-600/40 via-white/15 to-fuchsia-500/40" />

              {[...RANKED_TIER_BANDS].reverse().map((band, i) => {
                const visual = tierConfig[band.tier as TierName];
                const isTop = band.tier === 'GOAT';
                const totalTiers = RANKED_TIER_BANDS.length;
                return (
                  <motion.div
                    key={band.tier}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    className="flex flex-col items-center px-2 md:px-3 relative"
                    style={{ minWidth: i === totalTiers - 1 ? '90px' : '76px' }}
                  >
                    {/* Emoji node */}
                    <div
                      className={`relative z-10 flex items-center justify-center shrink-0 rounded-full border-2 mb-2 ${
                        isTop
                          ? 'size-14 md:size-16 text-2xl md:text-3xl bg-gradient-to-br from-fuchsia-500/30 to-fuchsia-400/10 border-fuchsia-400/50 shadow-[0_0_20px_rgba(217,70,239,0.3)]'
                          : 'size-10 md:size-12 text-lg md:text-xl border-white/15 bg-[#0d1a1f]'
                      }`}
                    >
                      {visual?.emoji}
                    </div>

                    {/* Tier name */}
                    <div className={`text-center font-black text-[10px] md:text-xs uppercase tracking-wide leading-tight ${
                      isTop ? 'text-fuchsia-300' : visual?.color ?? 'text-white'
                    }`}>
                      {band.tier}
                    </div>

                    {/* RP range */}
                    <div className="text-[9px] md:text-[10px] text-white/60 font-semibold text-center mt-0.5 whitespace-nowrap">
                      {band.maxRpExclusive === null
                        ? `${band.minRp.toLocaleString()}+`
                        : `${band.minRp.toLocaleString()}`}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="mt-10 text-center"
          >
            <Button
              onClick={() => setLoginOpen(true)}
              className="h-14 px-10 rounded-2xl text-lg font-black uppercase tracking-wide bg-[#38B60E] hover:bg-[#2ea00b] text-white border-b-[5px] border-[#2c8a0a] active:border-b-0 active:translate-y-[5px] transition-all shadow-none hover:shadow-none"
            >
              Start climbing
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Leaderboard ── */}
      <section className="px-6 py-12 md:py-20">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
              See where you stack up
            </h2>
            <p className="text-sm md:text-base text-white/60 font-medium">
              Join the table, earn rank points, and chase the top spots.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mb-4"
          >
            <LeaderboardPodium
              topThree={leaderboardEntries.slice(0, 3)}
              onEntryClick={() => setLoginOpen(true)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <LeaderboardTable
              entries={leaderboardEntries.slice(3, 8)}
              onEntryClick={() => setLoginOpen(true)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <Button
              onClick={() => setLoginOpen(true)}
              className="h-14 px-10 rounded-2xl text-lg font-black uppercase tracking-wide bg-[#38B60E] hover:bg-[#2ea00b] text-white border-b-[5px] border-[#2c8a0a] active:border-b-0 active:translate-y-[5px] transition-all shadow-none hover:shadow-none"
            >
              View the full table
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/6 bg-[#071013] py-8">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2 font-bold text-[#FFE500]">
              <Brain className="size-4" />
              <span className="text-sm">10k+ verified questions</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-[#FFE500]">
              <Swords className="size-4" />
              <span className="text-sm">{duelsCount.toLocaleString()}+ duels played</span>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-center gap-4 text-sm">
            <Link
              href="/terms"
              className="font-bold text-white/40 hover:text-[#1CB0F6] transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href="/privacy"
              className="font-bold text-white/40 hover:text-[#1CB0F6] transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
          <div className="mt-4 space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/35">
              &copy; 2026 QuizBall
            </p>
            <p className="mx-auto max-w-2xl text-[11px] leading-relaxed text-white/30 md:text-xs">
              QuizBall is an independent football trivia game. Club, league, tournament, and player references are used for editorial identification only. QuizBall is not affiliated with, endorsed by, or sponsored by any club, league, federation, or competition organizer.
            </p>
          </div>
        </div>
      </footer>

      {/* ── All Categories Modal ── */}
      <Dialog open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <DialogContent className="max-w-2xl w-[95vw] rounded-2xl p-5 md:p-8 bg-[#071013] border-[#071013] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-center text-white">All categories</DialogTitle>
            <DialogDescription className="text-center text-white/50">
              Explore the full QuizBall category list.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-1 px-1 mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3">
              {allCategories.map((cat, i) => {
                const style = getCategoryStyle(cat.slug, cat.name, i);
                const IconComponent = style.icon;
                return (
                  <motion.button
                    key={cat.id}
                    type="button"
                    aria-label={`Open ${cat.name}`}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 px-3 py-2.5 flex items-center gap-2.5 transition-all duration-200 hover:brightness-110 hover:border-white/20"
                    style={{ backgroundColor: style.color }}
                    onClick={() => { setCategoriesOpen(false); setLoginOpen(true); }}
                  >
                    {cat.imageUrl ? (
                      <>
                        <Image
                          src={cat.imageUrl}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/42 via-black/28 to-black/55" />
                      </>
                    ) : null}

                    <div className="relative z-10 flex size-8 items-center justify-center rounded-lg border border-white/20 bg-white/12 text-white shrink-0 backdrop-blur-md">
                      <IconComponent className="size-4" />
                    </div>
                    <span className="relative z-10 text-xs md:text-sm font-bold text-white leading-tight">
                      {cat.name}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Login Dialog ── */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl p-8 bg-[#071013] border-[#071013]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-4 text-center text-white">Sign in to QuizBall</DialogTitle>
            <DialogDescription className="text-center text-white/50">
              Use your Google account to save progress, rank up, and play online.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <Button
              className="flex items-center justify-center gap-3 h-14 rounded-2xl text-lg font-black uppercase tracking-wide bg-[#FFE500] text-black hover:bg-[#FFD700] border-b-[5px] border-[#CCB800] active:border-b-0 active:translate-y-[5px] transition-all shadow-none hover:shadow-none"
              onClick={handleGoogleLogin}
            >
              <FcGoogle className="size-6" /> Continue with Google
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
