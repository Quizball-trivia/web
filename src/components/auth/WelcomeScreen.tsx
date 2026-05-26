"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { Brain, Goal, Trophy, Crown, Star, Globe, Flame, Shield, Repeat, Award, Flag, Swords, type LucideIcon } from 'lucide-react';
import { useAllCategoriesList } from '@/lib/queries/categories.queries';
import { AppLogo } from '@/components/AppLogo';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { motion, AnimatePresence } from 'motion/react';
import Script from 'next/script';
import { socialLogin, socialLoginWithIdToken } from '@/lib/auth/auth.service';
import { signInWithGoogleIdentity } from '@/lib/auth/google-identity';
import { getPlatform, isInAppBrowser, tryOpenInExternalBrowser } from '@/lib/auth/in-app-browser';
import { useAuthStore } from '@/stores/auth.store';
import { useLocale } from '@/contexts/LocaleContext';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import type { MessageKey } from '@/lib/i18n/messages';
import { LeaderboardPodium } from '@/features/leaderboard/components/LeaderboardPodium';
import { LeaderboardTable } from '@/features/leaderboard/components/LeaderboardTable';
import type { LeaderboardEntry } from '@/lib/domain/leaderboard';
import { useLeaderboard } from '@/lib/queries/leaderboard.queries';
import { RANKED_TIER_BANDS } from '@/utils/rankedTier';
import { tierConfig, type TierName } from '@/utils/tierVisuals';
import type { AvatarCustomization } from '@/types/game';
import { PitchVisualization } from '@/features/possession/components/PitchVisualization';
import type { BarBattleState } from '@/features/possession/components/BarBattleOverlay';
import {
  BarBattleFlightOverlay,
  FLIGHT_TOTAL_MS,
  type FlightSpec,
} from '@/features/possession/components/BarBattleFlightOverlay';
import { GOAL_CELEBRATION_MS, GOAL_SHOT_TO_CELEBRATION_MS } from '@/features/possession/realtimePossession.helpers';
import { trackSignupStarted } from '@/lib/analytics/game-events';

const SUBHEADING_PHRASE_KEYS: MessageKey[] = [
  "welcome.phraseBack",
  "welcome.phraseBeat",
  "welcome.phraseTurn",
  "welcome.phraseMove",
  "welcome.phraseTakeOn",
  "welcome.phrasePlay",
  "welcome.phraseFromTrivia",
  "welcome.phraseKnow",
  "welcome.phraseStartStrong",
  "welcome.phraseEveryRight",
];

// Style mapping for known categories (matched by slug or lowercased name)
const CATEGORY_STYLES: Record<string, { color: string; icon: LucideIcon; flag?: string; watermarkImg?: string }> = {
  "premier-league": { color: "#3D195B", icon: Crown, flag: "gb-eng" },
  "champions-league": { color: "#1A71B8", icon: Star },
  "world-cup": { color: "#D4AF37", icon: Globe, watermarkImg: "/assets/brand/world-cup-trophy.webp" },
  "la-liga": { color: "#FFFFFF", icon: Flame, flag: "es" },
  "serie-a": { color: "#024494", icon: Shield, flag: "it" },
  "bundesliga": { color: "#D20515", icon: Goal, flag: "de" },
  "ligue-1": { color: "#D8F000", icon: Award, flag: "fr" },
  "league-1": { color: "#D8F000", icon: Award, flag: "fr" },
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
  "ac-milan": { color: "#B5121B", icon: Shield, flag: "it" },
  "milan": { color: "#B5121B", icon: Shield, flag: "it" },
  "argentina": { color: "#6CACE4", icon: Flag, flag: "ar" },
  "arsenal": { color: "#EF0107", icon: Shield, flag: "gb-eng" },
  "barcelona": { color: "#A50044", icon: Shield, flag: "es" },
  "barcelona-b": { color: "#A50044", icon: Shield, flag: "es" },
  "salvador": { color: "#0047AB", icon: Flag },
  "el-salvador": { color: "#0047AB", icon: Flag, flag: "sv" },
};

// Categories to exclude (game modes, not real trivia categories)
const EXCLUDED_SLUGS = new Set([
  "daily-challenges", "daily-challenge", "countdown", "jeopardy",
  "daily", "daily-quiz", "count-down", "football-jeopardy", "clues",
  "true-or-false", "put-in-order", "money-drop", "high-low",
  "high_low", "imposter", "football-logic", "career-path",
  "career_path",
]);

const EXCLUDED_CATEGORY_PREFIXES = [
  "daily-challenges",
  "daily-challenge",
];

const EXCLUDED_CATEGORY_NAMES = new Set([
  "daily challenges",
  "clues",
  "countdown",
  "money drop",
  "put in order",
  "true or false",
  "high low",
  "high_low",
  "imposter",
  "football logic",
  "career path",
  "career_path",
]);

function normalizeCategoryKey(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-');
}

function isWelcomeCategoryExcluded(slug: string, name: string) {
  const normalizedSlug = normalizeCategoryKey(slug);
  const normalizedName = normalizeCategoryKey(name);
  const lowerName = name.toLowerCase().trim();

  return (
    EXCLUDED_SLUGS.has(normalizedSlug) ||
    EXCLUDED_SLUGS.has(normalizedName) ||
    EXCLUDED_CATEGORY_PREFIXES.some((prefix) => normalizedSlug.startsWith(prefix)) ||
    EXCLUDED_CATEGORY_NAMES.has(lowerName)
  );
}

// Main categories to feature on the landing page (matched by slug or name substring)
const FEATURED_NAMES = [
  "champions league",
  "world cup",
  "premier league",
  "la liga",
  "bundesliga",
  "league 1",
  "uefa euro",
  "serie a",
];

const FEATURED_CATEGORY_LIMIT = 12;

// Fallback colors for categories not in the mapping
const FALLBACK_COLORS = ["#E74C3C", "#3498DB", "#2ECC71", "#9B59B6", "#F39C12", "#1ABC9C", "#E67E22", "#2980B9"];

function CategoryArtwork({
  src,
  className,
  imageClassName,
}: {
  src?: string | null;
  className: string;
  imageClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Category artwork is runtime CMS data and may be data: URLs. */}
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className={`size-full object-contain object-center transition-transform duration-500 group-hover:scale-105 ${imageClassName ?? ""}`}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

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

const DEMO_AVATAR_LOADOUTS: AvatarCustomization[] = [
  { skin: "skin_male_white", hair: "hair_ramos", jersey: "jersey_liverpool", glasses: "glasses_aviator" },
  { skin: "skin_male_dark", hair: "hair_ronaldo_goat", jersey: "jersey_brazil_retro", facialHair: "stache" },
  { skin: "skin_male_white_alt", hair: "hair_hamsik", jersey: "jersey_milan", facialHair: "beard" },
  { skin: "skin_male_dark_alt", hair: "hair_boy_basic", jersey: "jersey_argentina_retro", glasses: "glasses_round" },
  { skin: "skin_male_white", hair: "hair_girl_basic", jersey: "jersey_barcelona", glasses: "glasses_wayfarer" },
  { skin: "skin_male_dark", hair: "hair_ronaldo_brazil", jersey: "jersey_france_retro" },
  { skin: "skin_male_white_alt", hair: "hair_boy_basic", jersey: "jersey_bayern", glasses: "glasses_aviator" },
  { skin: "skin_male_dark_alt", hair: "hair_ramos", jersey: "jersey_netherlands_retro", facialHair: "beard" },
];

interface DemoPlayer {
  name: string;
  avatarCustomization: AvatarCustomization;
}

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

type LandingGoalSide = 'left' | 'right';
type LandingScenario = {
  kind: 'left-push' | 'right-push' | 'left-goal' | 'right-goal';
  playerPoints: number;
  opponentPoints: number;
};

const LANDING_SCENARIOS: LandingScenario[] = [
  { kind: 'left-push', playerPoints: 50, opponentPoints: 20 },
  { kind: 'right-push', playerPoints: 20, opponentPoints: 50 },
  { kind: 'left-goal', playerPoints: 70, opponentPoints: 20 },
  { kind: 'right-goal', playerPoints: 20, opponentPoints: 70 },
  { kind: 'left-push', playerPoints: 40, opponentPoints: 30 },
  { kind: 'right-push', playerPoints: 30, opponentPoints: 40 },
];

const LANDING_SCORE_FLIGHT_START_MS = 120;
const LANDING_SCORE_HANDOFF_MS = FLIGHT_TOTAL_MS + 420;
const LANDING_CONVERT_MS = 140;
const LANDING_BARS_SPAWN_BASE_MS = 210;
const LANDING_BARS_PER_STAGGER_MS = 82;
const LANDING_BATTLE_BASE_MS = 400;
const LANDING_BATTLE_PER_BAR_MS = 235;
const LANDING_CHARGE_BASE_MS = 660;
const LANDING_CHARGE_PER_BAR_MS = 105;
const LANDING_CHARGE_SHOT_OVERLAP_MS = 180;
const LANDING_RESULT_HOLD_MS = 1150;
const LANDING_DONE_LINGER_MS = 320;
const LANDING_LOOP_REST_MS = 850;

function landingPointsToBars(points: number): number {
  if (points <= 0) return 0;
  return Math.min(Math.max(Math.round(points / 10), 1), 12);
}

function clampLandingPosition(position: number): number {
  return Math.max(22, Math.min(78, position));
}

function getLandingTargetPosition(startPosition: number, scenario: LandingScenario): number {
  const isLeftWin = scenario.kind === 'left-push' || scenario.kind === 'left-goal';
  const isGoalScenario = scenario.kind === 'left-goal' || scenario.kind === 'right-goal';
  const pointDelta = Math.abs(scenario.playerPoints - scenario.opponentPoints);
  const movement = (isGoalScenario ? 24 : 13) + Math.min(8, pointDelta / 10);
  return clampLandingPosition(startPosition + movement * (isLeftWin ? 1 : -1));
}

function getLandingScenario(cycle: number): LandingScenario {
  const offset = Math.floor(Math.random() * LANDING_SCENARIOS.length);
  return LANDING_SCENARIOS[(cycle + offset) % LANDING_SCENARIOS.length];
}

function getLandingAvatarX(playerPosition: number, side: 'player' | 'opponent'): number {
  const possessionTrackLeft = 15;
  const possessionTrackRight = 485;
  const possessionTrackWidth = possessionTrackRight - possessionTrackLeft;
  const avatarSpread = 55;
  const barZonePadding = 74;
  const minBoundary = 24 + avatarSpread + barZonePadding;
  const maxBoundary = 476 - avatarSpread - barZonePadding;
  const rawBoundary = possessionTrackLeft + (playerPosition / 100) * possessionTrackWidth;
  const boundary = Math.max(minBoundary, Math.min(maxBoundary, rawBoundary));
  return side === 'player' ? boundary - avatarSpread : boundary + avatarSpread;
}

function getElementCenter(element: Element | null): { x: number; y: number } | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

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
  const { t, locale } = useLocale();
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [showOpenInBrowser, setShowOpenInBrowser] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [duelsCount] = useState(() => getDuelsCount());
  const [wcDaysLeft] = useState(() => getDaysUntilWorldCup());
  const [stadiumPhase, setStadiumPhase] = useState(0);
  const [stadiumCycle, setStadiumCycle] = useState(0);
  const [landingScore, setLandingScore] = useState({ left: 0, right: 0 });
  const [landingBattle, setLandingBattle] = useState<BarBattleState | null>(null);
  const [landingPlayerPosition, setLandingPlayerPosition] = useState(50);
  const [landingBallOnPlayer, setLandingBallOnPlayer] = useState(true);
  const [landingGoalVisible, setLandingGoalVisible] = useState(false);
  const [landingTargetGoal, setLandingTargetGoal] = useState<LandingGoalSide>('right');
  const [landingShotMode, setLandingShotMode] = useState<React.ComponentProps<typeof PitchVisualization>['shotMode']>(undefined);
  const [landingFlights, setLandingFlights] = useState<FlightSpec[]>([]);
  const leftScoreAnchorRef = useRef<HTMLDivElement | null>(null);
  const rightScoreAnchorRef = useRef<HTMLDivElement | null>(null);
  const landingPitchRef = useRef<HTMLDivElement | null>(null);
  const landingFlightSeqRef = useRef(0);
  const landingPositionRef = useRef(50);
  const landingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Start with a deterministic loadout so SSR and client first paint match
  // (Math.random in useState breaks hydration). Re-shuffle after mount so
  // returning visitors see variety without affecting the SEO-critical HTML.
  const [demoPlayers, setDemoPlayers] = useState<{
    left: DemoPlayer;
    right: DemoPlayer;
    crowd: DemoPlayer[];
  }>(() => {
    const make = (index: number, fallbackName: string): DemoPlayer => ({
      name: DEMO_PLAYER_NAMES[index] ?? fallbackName,
      avatarCustomization: DEMO_AVATAR_LOADOUTS[index % DEMO_AVATAR_LOADOUTS.length],
    });
    return {
      left: make(0, "Mason"),
      right: make(1, "Thiago"),
      crowd: [make(2, "Santi"), make(3, "Jamal"), make(4, "Enzo")],
    };
  });

  useEffect(() => {
    const shuffledNames = [...DEMO_PLAYER_NAMES].sort(() => Math.random() - 0.5);
    const shuffledLoadouts = [...DEMO_AVATAR_LOADOUTS].sort(() => Math.random() - 0.5);
    const make = (index: number, fallbackName: string): DemoPlayer => ({
      name: shuffledNames[index] ?? fallbackName,
      avatarCustomization: shuffledLoadouts[index] ?? DEMO_AVATAR_LOADOUTS[index % DEMO_AVATAR_LOADOUTS.length],
    });
    setDemoPlayers({
      left: make(0, "Mason"),
      right: make(1, "Thiago"),
      crowd: [make(2, "Santi"), make(3, "Jamal"), make(4, "Enzo")],
    });
  }, []);

  // Fetch real leaderboard
  const { data: leaderboardData } = useLeaderboard('global');
  const leaderboardEntries = leaderboardData ?? DEMO_LEADERBOARD;

  // Fetch real categories — filter out game modes, split into featured + rest
  const { data: categoriesData } = useAllCategoriesList({ limit: 100, is_active: "true" });
  const allCategories = (categoriesData?.items ?? []).filter(
    (c) => !isWelcomeCategoryExcluded(c.slug, c.name)
  );
  const featuredCategories: typeof allCategories = [];
  const used = new Set<string>();
  for (const search of FEATURED_NAMES) {
    const normalizedSearch = search.toLowerCase();
    const normalizedSlugSearch = normalizedSearch.replace(/\s+/g, '-');
    const exactMatch = allCategories.find(
      (c) => !used.has(c.id) && (c.name.toLowerCase() === normalizedSearch || c.slug === normalizedSlugSearch)
    );
    const match = exactMatch ?? allCategories.find(
      (c) => !used.has(c.id) && (c.name.toLowerCase().includes(normalizedSearch) || c.slug.includes(normalizedSlugSearch))
    );
    if (match && !used.has(match.id)) {
      featuredCategories.push(match);
      used.add(match.id);
    }
  }
  const fillerCategories = [
    ...allCategories.filter((c) => !used.has(c.id) && Boolean(c.imageUrl)),
    ...allCategories.filter((c) => !used.has(c.id) && !c.imageUrl),
  ];
  for (const category of fillerCategories) {
    if (featuredCategories.length >= FEATURED_CATEGORY_LIMIT) break;
    featuredCategories.push(category);
    used.add(category.id);
  }
  const remainingCategories = allCategories.filter((c) => !used.has(c.id));

  // Subheading rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % SUBHEADING_PHRASE_KEYS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    landingTimersRef.current.forEach((timer) => clearTimeout(timer));
    landingTimersRef.current = [];

    const scenario = getLandingScenario(stadiumCycle);
    const playerBars = landingPointsToBars(scenario.playerPoints);
    const opponentBars = landingPointsToBars(scenario.opponentPoints);
    const maxBars = Math.max(playerBars, opponentBars);
    const cancelledCount = Math.min(playerBars, opponentBars);
    const survivorCount = maxBars - cancelledCount;
    const remainingDelta = playerBars - opponentBars;
    const isGoalScenario = scenario.kind === 'left-goal' || scenario.kind === 'right-goal';
    const playerIsAttacker = scenario.kind === 'left-goal';
    const targetGoal: LandingGoalSide = playerIsAttacker ? 'right' : 'left';
    const startPosition = landingPositionRef.current;
    const targetPosition = getLandingTargetPosition(startPosition, scenario);
    const battleKey = stadiumCycle;
    const baseBattle: BarBattleState = {
      key: battleKey,
      phase: 'both-score',
      playerBars,
      opponentBars,
      playerPoints: scenario.playerPoints,
      opponentPoints: scenario.opponentPoints,
      remainingDelta,
      dividerX: 242.5,
      chargeMode: isGoalScenario ? 'lunge' : 'pulse',
    };
    const schedule = (delayMs: number, callback: () => void) => {
      const timer = setTimeout(callback, delayMs);
      landingTimersRef.current.push(timer);
    };
    const setBattlePhase = (delayMs: number, phase: BarBattleState['phase']) => {
      schedule(delayMs, () => {
        setLandingBattle((prev) => prev?.key === battleKey ? { ...prev, phase } : prev);
      });
    };

    schedule(0, () => {
      setStadiumPhase(0);
      setLandingPlayerPosition(startPosition);
      setLandingBallOnPlayer(remainingDelta >= 0);
      setLandingGoalVisible(false);
      setLandingFlights([]);
      setLandingShotMode(undefined);
      setLandingTargetGoal(targetGoal);
      setLandingBattle(baseBattle);
    });

    schedule(LANDING_SCORE_FLIGHT_START_MS, () => {
      const pitch = landingPitchRef.current;
      const playerTarget = getElementCenter(
        pitch?.querySelector('[data-pitch-bar-target="player"]')
          ?? pitch?.querySelector('[data-pitch-avatar="player"]')
          ?? null,
      );
      const opponentTarget = getElementCenter(
        pitch?.querySelector('[data-pitch-bar-target="opponent"]')
          ?? pitch?.querySelector('[data-pitch-avatar="opponent"]')
          ?? null,
      );
      const playerSource = getElementCenter(leftScoreAnchorRef.current);
      const opponentSource = getElementCenter(rightScoreAnchorRef.current);
      const nextFlights: FlightSpec[] = [];

      if (scenario.playerPoints > 0 && playerSource && playerTarget) {
        nextFlights.push({
          id: ++landingFlightSeqRef.current,
          side: 'player',
          source: playerSource,
          target: playerTarget,
          points: scenario.playerPoints,
        });
      }

      if (scenario.opponentPoints > 0 && opponentSource && opponentTarget) {
        nextFlights.push({
          id: ++landingFlightSeqRef.current,
          side: 'opponent',
          source: opponentSource,
          target: opponentTarget,
          points: scenario.opponentPoints,
        });
      }

      if (nextFlights.length > 0) {
        setLandingFlights((flights) => [...flights, ...nextFlights]);
      }
    });

    let t = LANDING_SCORE_HANDOFF_MS;
    setBattlePhase(t, 'convert');

    t += LANDING_CONVERT_MS;
    setBattlePhase(t, 'bars');

    t += LANDING_BARS_SPAWN_BASE_MS + maxBars * LANDING_BARS_PER_STAGGER_MS;
    if (cancelledCount > 0) {
      setBattlePhase(t, 'battle');
      t += LANDING_BATTLE_BASE_MS + cancelledCount * LANDING_BATTLE_PER_BAR_MS;
    }

    if (isGoalScenario && survivorCount > 0) {
      const chargeMs = LANDING_CHARGE_BASE_MS + survivorCount * LANDING_CHARGE_PER_BAR_MS;
      setBattlePhase(t, 'charge');
      schedule(t + Math.max(0, chargeMs - LANDING_CHARGE_SHOT_OVERLAP_MS), () => {
        setLandingBattle(null);
        landingPositionRef.current = targetPosition;
        setLandingPlayerPosition(targetPosition);
        setLandingTargetGoal(targetGoal);
        setLandingBallOnPlayer(playerIsAttacker);
        setLandingShotMode({
          result: 'goal',
          ballOriginX: getLandingAvatarX(targetPosition, playerIsAttacker ? 'player' : 'opponent'),
          isPlayerAttacker: playerIsAttacker,
          variant: stadiumCycle % 5,
          shotId: `landing-${stadiumCycle}`,
        });
      });
      t += chargeMs;
    } else {
      setBattlePhase(t, 'result');
      schedule(t + 80, () => {
        landingPositionRef.current = targetPosition;
        setLandingPlayerPosition(targetPosition);
        setLandingBallOnPlayer(remainingDelta >= 0);
      });
    }

    if (isGoalScenario) {
      schedule(t + GOAL_SHOT_TO_CELEBRATION_MS, () => {
        setLandingGoalVisible(true);
        setLandingScore((score) => ({
          left: score.left + (playerIsAttacker ? 1 : 0),
          right: score.right + (playerIsAttacker ? 0 : 1),
        }));
        setStadiumPhase(2);
      });
      schedule(t + GOAL_SHOT_TO_CELEBRATION_MS + GOAL_CELEBRATION_MS, () => {
        setLandingGoalVisible(false);
        setLandingShotMode(undefined);
        setLandingBattle(null);
        landingPositionRef.current = 50;
        setLandingPlayerPosition(50);
        setLandingBallOnPlayer(true);
        setStadiumPhase(3);
        setStadiumCycle((cycle) => cycle + 1);
      });
    } else {
      t += LANDING_RESULT_HOLD_MS;
      setBattlePhase(t, 'done');
      schedule(t + LANDING_DONE_LINGER_MS, () => {
        setLandingBattle(null);
      });
      schedule(t + LANDING_DONE_LINGER_MS + LANDING_LOOP_REST_MS, () => {
        setLandingShotMode(undefined);
        setStadiumPhase(3);
        setStadiumCycle((cycle) => cycle + 1);
      });
    }

    return () => {
      landingTimersRef.current.forEach((timer) => clearTimeout(timer));
      landingTimersRef.current = [];
    };
  }, [stadiumCycle]);

  useEffect(() => {
    if (landingScore.left < 3 && landingScore.right < 3) return;
    const timer = setTimeout(() => setLandingScore({ left: 0, right: 0 }), 1200);
    return () => clearTimeout(timer);
  }, [landingScore.left, landingScore.right]);

  const handleKickOff = () => setLoginOpen(true);
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

  const handleGoogleLogin = async () => {
    trackSignupStarted('google');

    // In-app browsers (Messenger, Instagram, etc.) — Google blocks OAuth in
    // these webviews. Fire the bounce URL silently; only show the manual
    // instructions panel if we're still here after ~1.5s (OS ignored it).
    if (isInAppBrowser()) {
      tryOpenInExternalBrowser(window.location.href);
      window.setTimeout(() => {
        if (typeof document !== 'undefined' && !document.hidden) {
          setShowOpenInBrowser(true);
        }
      }, 1500);
      return;
    }

    if (googleClientId) {
      try {
        const { idToken, nonce } = await signInWithGoogleIdentity(googleClientId);
        await socialLoginWithIdToken('google', idToken, nonce);
        await bootstrap({ force: true });
        return;
      } catch (gisError) {
        console.warn('GIS sign-in unavailable, falling back to redirect', gisError);
      }
    }

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      await socialLogin('google', redirectTo);
    } catch (error) {
      console.error('Google login failed', error);
    }
  };

  const stadiumScene = {
    showGoal: landingGoalVisible,
    rightScore: landingScore.right,
  };

  return (
    <div className="min-h-screen w-full bg-surface-page font-sans text-foreground flex flex-col overflow-x-hidden">
      {googleClientId ? (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          async
          defer
        />
      ) : null}
      {/* ── Navbar ── */}
      <header className="flex h-16 md:h-20 items-center justify-between px-6 md:px-12 lg:px-20 shrink-0 bg-surface-page/80 backdrop-blur-md sticky top-0 z-50">
        <AppLogo size="md" className="!justify-start" />
        <div className="flex items-center gap-3 md:gap-4">
          <LanguageSwitcher locale={locale} />
          <div className="flex items-center gap-2.5">
            <Image src="/assets/brand/world-cup-trophy.webp" alt="Trophy" width={96} height={96} className="h-10 md:h-12 w-auto object-contain" />
            {wcDaysLeft > 0 && (
              <div className="flex flex-col leading-none">
                <span className="text-lg md:text-xl font-black tabular-nums text-white">
                  {wcDaysLeft}
                </span>
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-brand-yellow">
                  {t('welcome.untilKickoff')}
                </span>
              </div>
            )}
          </div>
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
              <div className="flex items-center gap-3 flex-1 min-w-0 rounded-2xl bg-surface-page px-3 py-2.5">
                <div className="drop-shadow-[0_0_12px_rgba(56,182,14,0.32)]">
                  <AvatarDisplay customization={demoPlayers.left.avatarCustomization} size="sm" className="rounded-full" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white/85 truncate">{demoPlayers.left.name}</div>
                  <motion.div
                    ref={leftScoreAnchorRef}
                    key={landingScore.left}
                    initial={{ scale: landingGoalVisible ? 1.4 : 1, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className="text-3xl leading-7 font-black text-white tabular-nums"
                  >
                    {landingScore.left}
                  </motion.div>
                </div>
              </div>

              <div className="shrink-0 text-xl font-black text-white/90 min-w-[44px] text-center">VS</div>

              <div className="flex items-center gap-3 flex-1 min-w-0 justify-end rounded-2xl bg-surface-page px-3 py-2.5">
                <div className="min-w-0 text-right">
                  <div className="text-xs font-bold text-white/85 truncate">{demoPlayers.right.name}</div>
                  <motion.div
                    ref={rightScoreAnchorRef}
                    key={stadiumScene.rightScore}
                    initial={{ scale: stadiumScene.showGoal ? 1.4 : 1, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className="text-3xl leading-7 font-black text-white tabular-nums"
                  >
                    {stadiumScene.rightScore}
                  </motion.div>
                </div>
                <div className="drop-shadow-[0_0_12px_rgba(255,75,75,0.3)]">
                  <AvatarDisplay customization={demoPlayers.right.avatarCustomization} size="sm" className="rounded-full scale-x-[-1]" />
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

              <div ref={landingPitchRef} className="relative overflow-hidden rounded-[28px] border border-white/8 bg-surface-darkest p-2 md:rounded-[34px] md:p-3">
                <div className="absolute inset-x-10 bottom-2 h-16 rounded-full bg-brand-green/18 blur-3xl" />
                <div className="relative overflow-hidden rounded-[22px] md:rounded-[28px]">
                  <PitchVisualization
                    playerPosition={landingPlayerPosition}
                    playerAvatarUrl=""
                    opponentAvatarUrl=""
                    playerAvatarCustomization={demoPlayers.left.avatarCustomization}
                    opponentAvatarCustomization={demoPlayers.right.avatarCustomization}
                    playerName={demoPlayers.left.name}
                    opponentName={demoPlayers.right.name}
                    ballOnPlayer={landingBallOnPlayer}
                    barBattle={landingBattle}
                    barBattleVariant="ranked_sim"
                    shotMode={landingShotMode}
                    simpleShotAnimation
                    hideBall={stadiumScene.showGoal}
                    targetGoal={landingTargetGoal}
                    centerPossessionTrack
                    orientation="landscape"
                  />
                </div>

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
                          className="absolute left-1/2 top-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center md:size-24"
                          initial={{ scale: 1, y: 10, opacity: 0.94 }}
                          animate={{ scale: [1, 3, 1], y: [10, -16, 0], opacity: [0.94, 1, 1] }}
                          transition={{ duration: 1.45, times: [0, 0.38, 1], ease: 'easeInOut' }}
                        >
                          <Image src="https://lfbwhxvwubzeqkztghok.supabase.co/storage/v1/object/public/imgs/world-cup-style-ball-cartoon-transparent.png" alt="" width={256} height={256} unoptimized className="size-12 object-contain drop-shadow-[0_0_14px_rgba(255,255,255,0.32)] md:size-14" />
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
              <div className="rounded-full bg-brand-red-soft p-[3px] ring-2 ring-surface-page">
                <AvatarDisplay customization={demoPlayers.crowd[0].avatarCustomization} size="sm" className="rounded-full" />
              </div>
              <div className="rounded-full bg-brand-green p-[3px] ring-2 ring-surface-page">
                <AvatarDisplay customization={demoPlayers.crowd[1].avatarCustomization} size="sm" className="rounded-full" />
              </div>
              <div className="rounded-full bg-brand-gold p-[3px] ring-2 ring-surface-page">
                <AvatarDisplay customization={demoPlayers.crowd[2].avatarCustomization} size="sm" className="rounded-full" />
              </div>
            </div>
            <span className="text-brand-slate font-bold text-sm">{t('welcome.duelsPlayedSoFar', { count: duelsCount.toLocaleString() })}</span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1] mb-4 text-white">
            {t('welcome.heroTitle')}
          </h1>

          <div className="h-8 mb-8 flex items-center justify-center lg:justify-start">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentPhraseIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-lg font-bold text-brand-green"
              >
                {t(SUBHEADING_PHRASE_KEYS[currentPhraseIndex]!)}
              </motion.p>
            </AnimatePresence>
          </div>

          <Button
            onClick={handleKickOff}
            className="h-14 min-w-[280px] rounded-[20px] bg-brand-green px-10 font-poppins text-lg font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none sm:w-auto"
          >
            {t('welcome.kickOff')}
            </Button>
        </motion.div>
      </main>

      <BarBattleFlightOverlay
        flights={landingFlights}
        onArrive={(id) => setLandingFlights((flights) => flights.filter((flight) => flight.id !== id))}
      />

      {/* ── Categories ── */}
      {featuredCategories.length > 0 && (
        <section className="px-6 py-12 md:py-20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-center text-2xl md:text-3xl font-black text-white mb-3">
              {t('welcome.categoriesTitle')}
            </h2>
            <p className="text-center text-sm md:text-base text-white/60 font-medium mb-10">
              {t('welcome.categoriesSubtitle', { count: allCategories.length })}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {featuredCategories.map((cat, i) => {
                const style = getCategoryStyle(cat.slug, cat.name, i);
                const IconComponent = style.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-label={t('welcome.openCategory', { name: cat.name })}
                    className="group relative min-h-[124px] md:min-h-[138px] cursor-pointer overflow-hidden rounded-2xl border border-white/10 p-4 md:p-5 transition-all duration-200 hover:scale-[1.04] hover:-translate-y-1 hover:brightness-110 hover:border-white/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
                    style={{ backgroundColor: style.color }}
                    onClick={() => setLoginOpen(true)}
                  >
                    <CategoryArtwork src={cat.imageUrl} className="absolute inset-2 md:inset-3" />
                    {cat.imageUrl ? (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/18 to-black/10" />
                    ) : null}

                    {/* Watermark: flag, image, or icon. Kept only for categories without artwork. */}
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
                    <div className="relative z-10 flex h-full items-center justify-center text-center text-sm md:text-base font-black uppercase tracking-wide leading-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]">
                      {cat.name}
                    </div>
                  </button>
                );
              })}
            </div>

            {remainingCategories.length > 0 && (
              <div className="mt-8 text-center">
                <Button
                  onClick={() => setCategoriesOpen(true)}
                  className="h-14 min-w-[280px] rounded-[20px] bg-brand-green px-10 font-poppins text-base font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none"
                >
                  {t('welcome.browseAllCategories', { count: allCategories.length })}
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
              {t('welcome.tierRoadTitle')}
            </h2>
            <p className="text-sm md:text-base text-white/60 font-medium">
              {t('welcome.tierRoadSubtitle')}
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
              className="h-14 rounded-[20px] bg-brand-green px-10 font-poppins text-lg font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none"
            >
              {t('welcome.startClimbing')}
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
              {t('welcome.leaderboardTitle')}
            </h2>
            <p className="text-sm md:text-base text-white/60 font-medium">
              {t('welcome.leaderboardSubtitle')}
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
              className="h-14 rounded-[20px] bg-brand-green px-10 font-poppins text-lg font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none"
            >
              {t('welcome.viewFullTable')}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/6 bg-surface-page py-8">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2 font-bold text-brand-yellow">
              <Brain className="size-4" />
              <span className="text-sm">{t('welcome.verifiedQuestions')}</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-brand-yellow">
              <Swords className="size-4" />
              <span className="text-sm">{t('welcome.duelsPlayed', { count: duelsCount.toLocaleString() })}</span>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm md:gap-4">
            <Link
              href={`/${locale}/about`}
              className="font-bold text-white/40 hover:text-brand-cyan transition-colors"
            >
              {t('welcome.aboutUs')}
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href={`/${locale}/terms`}
              className="font-bold text-white/40 hover:text-brand-cyan transition-colors"
            >
              {t('welcome.termsOfService')}
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href={`/${locale}/privacy`}
              className="font-bold text-white/40 hover:text-brand-cyan transition-colors"
            >
              {t('welcome.privacyPolicy')}
            </Link>
          </div>
          <div className="mt-4 space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-white/35">
              {t('welcome.copyright')}
            </p>
            <p className="mx-auto max-w-2xl text-[11px] leading-relaxed text-white/30 md:text-xs">
              {t('welcome.footerLegal')}
            </p>
          </div>
        </div>
      </footer>

      {/* ── All Categories Modal ── */}
      <Dialog open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <DialogContent className="max-w-2xl w-[95vw] rounded-2xl p-5 md:p-8 bg-surface-page border-surface-page max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-center text-white">{t('welcome.allCategoriesTitle')}</DialogTitle>
            <DialogDescription className="text-center text-white/50">
              {t('welcome.allCategoriesDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 -mx-1 px-1 mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3">
              {allCategories.map((cat, i) => {
                const style = getCategoryStyle(cat.slug, cat.name, i);
                return (
                  <motion.button
                    key={cat.id}
                    type="button"
                    aria-label={t('welcome.openCategory', { name: cat.name })}
                    className="group relative min-h-[64px] cursor-pointer overflow-hidden rounded-xl border border-white/10 px-3 py-2.5 flex items-center justify-center transition-all duration-200 hover:brightness-110 hover:border-white/20"
                    style={{ backgroundColor: style.color }}
                    onClick={() => { setCategoriesOpen(false); setLoginOpen(true); }}
                  >
                    <CategoryArtwork src={cat.imageUrl} className="absolute inset-1.5" />
                    {cat.imageUrl ? (
                      <div className="absolute inset-0 bg-gradient-to-r from-black/48 via-black/18 to-black/55" />
                    ) : null}

                    <span className="relative z-10 text-center text-xs md:text-sm font-bold text-white leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
                      {cat.name}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Login Dialog — pinned to Figma node 620-7831 (Play with a Friend
           card). Royal-blue surface, red X close, yellow Google CTA.
           Hide shadcn's built-in close X (last direct <button> child of
           DialogContent) and render our own red square one instead.
           focus:outline-none / focus-visible:ring-0 kills the green-ish focus
           ring that shadcn paints on every primitive inside the dialog. ── */}
      <Dialog
        open={loginOpen}
        onOpenChange={(open) => {
          setLoginOpen(open);
          if (!open) setShowOpenInBrowser(false);
        }}
      >
        <DialogContent
          className="max-w-md w-[92vw] rounded-[24px] border-0 p-8 sm:p-10 [&>button:last-child]:hidden focus:outline-none focus-visible:outline-none focus-visible:ring-0 ring-0"
          style={{ backgroundColor: '#1645FF' }}
        >
          <ModalCloseButton
            onClose={() => {
              setLoginOpen(false);
              setShowOpenInBrowser(false);
            }}
          />

          {showOpenInBrowser ? (
            <InAppBrowserInstructions
              platform={getPlatform()}
              onTryAgain={() => tryOpenInExternalBrowser(window.location.href)}
            />
          ) : (
            <>
              <DialogHeader className="text-center">
                <DialogTitle className="text-center font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
                  {t('welcome.loginTitle')}
                </DialogTitle>
                <DialogDescription className="mt-3 text-center font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-[14px]">
                  {t('welcome.loginDescription')}
                </DialogDescription>
              </DialogHeader>
              <Button
                onClick={handleGoogleLogin}
                className="mt-6 flex h-14 w-full items-center justify-center gap-3 rounded-[28px] bg-brand-yellow font-poppins text-base font-semibold uppercase tracking-wide text-black shadow-none transition-colors hover:bg-brand-yellow-deep hover:shadow-none sm:h-[60px] sm:text-lg focus-visible:ring-0 focus-visible:outline-none"
              >
                <FcGoogle className="size-6" />
                {t('welcome.continueWithGoogle')}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InAppBrowserInstructions({
  platform,
  onTryAgain,
}: {
  platform: 'ios' | 'android' | 'other';
  onTryAgain: () => void;
}) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked in some webviews — no-op */
    }
  };

  return (
    <>
      <DialogHeader className="text-center">
        <DialogTitle className="text-center font-poppins text-[22px] font-semibold text-white sm:text-[26px]">
          {t('inAppBrowser.title')}
        </DialogTitle>
        <DialogDescription className="mt-3 text-center font-poppins text-[13px] font-medium leading-snug text-white/80 sm:text-[14px]">
          {t('inAppBrowser.body')}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 rounded-2xl bg-black/20 p-4 text-left font-poppins text-[13px] font-medium leading-relaxed text-white/90 sm:text-[14px]">
        {platform === 'ios' ? (
          <ol className="list-decimal space-y-2 pl-5">
            <li>{t('inAppBrowser.iosStep1')}</li>
            <li>{t('inAppBrowser.iosStep2')}</li>
          </ol>
        ) : platform === 'android' ? (
          <ol className="list-decimal space-y-2 pl-5">
            <li>{t('inAppBrowser.androidStep1')}</li>
            <li>{t('inAppBrowser.androidStep2')}</li>
          </ol>
        ) : (
          <p>{t('inAppBrowser.genericInstructions')}</p>
        )}
      </div>

      <Button
        onClick={onTryAgain}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-[20px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black shadow-none transition-colors hover:bg-brand-yellow-deep hover:shadow-none focus-visible:ring-0 focus-visible:outline-none"
      >
        {t('inAppBrowser.openInBrowser')}
      </Button>

      <button
        type="button"
        onClick={handleCopy}
        className="mt-2 text-center font-poppins text-[12px] font-medium text-white/70 underline-offset-2 hover:underline"
      >
        {copied ? t('inAppBrowser.linkCopied') : t('inAppBrowser.orCopyLink')}
      </button>
    </>
  );
}
