"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { FcGoogle } from 'react-icons/fc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Swords, Loader2, Mail, Phone, type LucideIcon } from 'lucide-react';
import { useAllCategoriesList } from '@/lib/queries/categories.queries';
import { AppLogo } from '@/components/AppLogo';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { motion, AnimatePresence } from 'motion/react';
import Script from 'next/script';
import {
  login,
  register,
  socialLogin,
  socialLoginWithIdToken,
  startGeorgianPhoneOtp,
  verifyGeorgianPhoneOtp,
} from '@/lib/auth/auth.service';
import { signInWithGoogleIdentity } from '@/lib/auth/google-identity';
import { getPlatform, isInAppBrowser, tryOpenInExternalBrowser } from '@/lib/auth/in-app-browser';
import { useAuthStore } from '@/stores/auth.store';
import { useLocale } from '@/contexts/LocaleContext';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { LeaderboardPodium } from '@/features/leaderboard/components/LeaderboardPodium';
import { LeaderboardTable } from '@/features/leaderboard/components/LeaderboardTable';
import { useLeaderboard } from '@/lib/queries/leaderboard.queries';
import { RANKED_TIER_BANDS } from '@/utils/rankedTier';
import { tierConfig, type TierName } from '@/utils/tierVisuals';
import { PitchVisualization } from '@/features/possession/components/PitchVisualization';
import type { BarBattleState } from '@/features/possession/components/BarBattleOverlay';
import {
  BarBattleFlightOverlay,
  FLIGHT_TOTAL_MS,
  type FlightSpec,
} from '@/features/possession/components/BarBattleFlightOverlay';
import { GOAL_CELEBRATION_MS, GOAL_SHOT_TO_CELEBRATION_MS } from '@/features/possession/realtimePossession.helpers';
import { trackLoginCompleted, trackSignupCompleted, trackSignupStarted } from '@/lib/analytics/game-events';

import type { AuthPanelMode, DemoPlayer, LandingGoalSide, LandingScenario } from './welcome/welcome.types';
import {
  DEMO_AVATAR_LOADOUTS,
  DEMO_LEADERBOARD,
  DEMO_PLAYER_NAMES,
  FEATURED_CATEGORY_LIMIT,
  FEATURED_NAMES,
  LANDING_BARS_PER_STAGGER_MS,
  LANDING_BARS_SPAWN_BASE_MS,
  LANDING_BATTLE_BASE_MS,
  LANDING_BATTLE_PER_BAR_MS,
  LANDING_CHARGE_BASE_MS,
  LANDING_CHARGE_PER_BAR_MS,
  LANDING_CHARGE_SHOT_OVERLAP_MS,
  LANDING_CONVERT_MS,
  LANDING_DONE_LINGER_MS,
  LANDING_LOOP_REST_MS,
  LANDING_RESULT_HOLD_MS,
  LANDING_SCORE_FLIGHT_START_MS,
  SUBHEADING_PHRASE_KEYS,
} from './welcome/welcome.content';
import {
  authErrorMessage,
  getCategoryStyle,
  getDaysUntilWorldCup,
  getDuelsCount,
  getElementCenter,
  getLandingAvatarX,
  getLandingScenario,
  getLandingTargetPosition,
  isWelcomeCategoryExcluded,
  landingPointsToBars,
} from './welcome/welcome.helpers';

const LANDING_SCORE_HANDOFF_MS = FLIGHT_TOTAL_MS + 420;

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

export function WelcomeScreen() {
  const { t, locale } = useLocale();
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [loginOpen, setLoginOpen] = useState(false);
  const [showOpenInBrowser, setShowOpenInBrowser] = useState(false);
  const [authMode, setAuthMode] = useState<AuthPanelMode>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
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
  // Tracks the 1.5s timer that reveals the in-app-browser instructions panel.
  // Held in a ref so we can cancel it when the user closes the dialog or the
  // component unmounts — otherwise the panel can flash open after dismissal.
  const inAppBrowserTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    queueMicrotask(() => {
      setDemoPlayers({
        left: make(0, "Mason"),
        right: make(1, "Thiago"),
        crowd: [make(2, "Santi"), make(3, "Jamal"), make(4, "Enzo")],
      });
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

  // Cancel the pending in-app-browser instructions timer on unmount so it
  // can't fire setState against a torn-down component.
  useEffect(() => {
    return () => {
      if (inAppBrowserTimerRef.current !== null) {
        clearTimeout(inAppBrowserTimerRef.current);
        inAppBrowserTimerRef.current = null;
      }
    };
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

  const resetAuthFeedback = () => {
    setAuthError(null);
    setAuthNotice(null);
  };

  const resetAuthForm = () => {
    resetAuthFeedback();
    setAuthPassword('');
    setAuthConfirmPassword('');
    setAuthOtp('');
    setPhoneOtpSent(false);
    setAuthSubmitting(false);
  };

  const handleGoogleLogin = async () => {
    trackSignupStarted('google');

    // In-app browsers (Messenger, Instagram, etc.) — Google blocks OAuth in
    // these webviews. Fire the bounce URL silently; only show the manual
    // instructions panel if we're still here after ~1.5s (OS ignored it).
    if (isInAppBrowser()) {
      tryOpenInExternalBrowser(window.location.href);
      if (inAppBrowserTimerRef.current !== null) {
        clearTimeout(inAppBrowserTimerRef.current);
      }
      inAppBrowserTimerRef.current = setTimeout(() => {
        inAppBrowserTimerRef.current = null;
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

  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetAuthFeedback();

    if (authMode === 'signup' && authPassword !== authConfirmPassword) {
      setAuthError(t('welcome.passwordMismatch'));
      return;
    }

    setAuthSubmitting(true);
    try {
      if (authMode === 'signup') {
        trackSignupStarted('email');
        const result = await register({ email: authEmail, password: authPassword });
        if (!result.tokensSet) {
          setAuthNotice(t('welcome.checkEmail'));
          return;
        }
        trackSignupCompleted('email');
      } else {
        await login(authEmail, authPassword);
        trackLoginCompleted('email');
      }

      await bootstrap({ force: true });
      setLoginOpen(false);
      resetAuthForm();
    } catch (error) {
      setAuthError(authErrorMessage(error, t('welcome.emailAuthFailed')));
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handlePhoneAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetAuthFeedback();
    setAuthSubmitting(true);

    try {
      if (!phoneOtpSent) {
        trackSignupStarted('phone');
        await startGeorgianPhoneOtp(authPhone);
        setPhoneOtpSent(true);
        setAuthNotice(t('welcome.phoneCodeSent'));
        return;
      }

      await verifyGeorgianPhoneOtp(authPhone, authOtp);
      trackLoginCompleted('phone');
      await bootstrap({ force: true });
      setLoginOpen(false);
      resetAuthForm();
    } catch (error) {
      setAuthError(authErrorMessage(error, t('welcome.phoneAuthFailed')));
    } finally {
      setAuthSubmitting(false);
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
                          : 'size-10 md:size-12 text-lg md:text-xl border-white/15 bg-surface-auth-input'
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
          if (!open) {
            setShowOpenInBrowser(false);
            resetAuthForm();
            if (inAppBrowserTimerRef.current !== null) {
              clearTimeout(inAppBrowserTimerRef.current);
              inAppBrowserTimerRef.current = null;
            }
          }
        }}
      >
        <DialogContent
          className="max-h-[92vh] max-w-md w-[92vw] overflow-y-auto rounded-[24px] border-0 bg-brand-blue p-8 sm:p-10 [&>button:last-child]:hidden focus:outline-none focus-visible:outline-none focus-visible:ring-0 ring-0"
        >
          <ModalCloseButton
            onClose={() => {
              setLoginOpen(false);
              setShowOpenInBrowser(false);
              resetAuthForm();
              if (inAppBrowserTimerRef.current !== null) {
                clearTimeout(inAppBrowserTimerRef.current);
                inAppBrowserTimerRef.current = null;
              }
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
              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleGoogleLogin}
                  className="flex h-[52px] w-full items-center justify-center gap-3 rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black shadow-none transition-colors hover:bg-brand-yellow-deep hover:shadow-none sm:h-14 sm:text-base focus-visible:ring-0 focus-visible:outline-none"
                >
                  <FcGoogle className="size-6" />
                  {t('welcome.continueWithGoogle')}
                </Button>
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/20" />
                <span className="font-poppins text-xs font-semibold uppercase tracking-wide text-white/60">
                  {t('welcome.authOr')}
                </span>
                <div className="h-px flex-1 bg-white/20" />
              </div>

              <div className="grid grid-cols-3 gap-1 rounded-full bg-black/18 p-1">
                {(['signin', 'signup', 'phone'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setAuthMode(mode);
                      resetAuthForm();
                    }}
                    className={`h-10 rounded-full font-poppins text-xs font-bold uppercase tracking-wide transition-colors ${
                      authMode === mode
                        ? 'bg-white text-brand-blue'
                        : 'text-white/75 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {mode === 'signin'
                      ? t('welcome.signInTab')
                      : mode === 'signup'
                        ? t('welcome.signUpTab')
                        : t('welcome.phoneTab')}
                  </button>
                ))}
              </div>

              {authMode === 'phone' ? (
                <form className="mt-5 space-y-3" onSubmit={handlePhoneAuth}>
                  <label className="block">
                    <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
                      {t('welcome.phoneLabel')}
                    </span>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                      <Input
                        type="tel"
                        value={authPhone}
                        onChange={(event) => {
                          setAuthPhone(event.target.value);
                          setPhoneOtpSent(false);
                          setAuthOtp('');
                          resetAuthFeedback();
                        }}
                        placeholder={t('welcome.phonePlaceholder')}
                        className="h-12 rounded-2xl border-white/15 bg-white/10 pl-11 font-poppins text-white placeholder:text-white/40 focus-visible:ring-white/25"
                        disabled={authSubmitting}
                      />
                    </div>
                  </label>

                  {phoneOtpSent ? (
                    <label className="block">
                      <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
                        {t('welcome.otpLabel')}
                      </span>
                      <Input
                        inputMode="numeric"
                        maxLength={6}
                        value={authOtp}
                        onChange={(event) => setAuthOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder={t('welcome.otpPlaceholder')}
                        className="h-12 rounded-2xl border-white/15 bg-white/10 text-center font-poppins text-lg font-bold tracking-[0.5em] text-white placeholder:tracking-normal placeholder:text-white/40 focus-visible:ring-white/25"
                        disabled={authSubmitting}
                      />
                    </label>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={authSubmitting || !authPhone || (phoneOtpSent && authOtp.length !== 6)}
                    className="h-12 w-full rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep disabled:opacity-60"
                  >
                    {authSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                    {phoneOtpSent ? t('welcome.verifyCode') : t('welcome.sendCode')}
                  </Button>
                </form>
              ) : (
                <form className="mt-5 space-y-3" onSubmit={handleEmailAuth}>
                  <label className="block">
                    <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
                      {t('welcome.emailLabel')}
                    </span>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/45" />
                      <Input
                        type="email"
                        value={authEmail}
                        onChange={(event) => setAuthEmail(event.target.value)}
                        placeholder={t('welcome.emailPlaceholder')}
                        className="h-12 rounded-2xl border-white/15 bg-white/10 pl-11 font-poppins text-white placeholder:text-white/40 focus-visible:ring-white/25"
                        disabled={authSubmitting}
                        autoComplete="email"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
                      {t('welcome.passwordLabel')}
                    </span>
                    <Input
                      type="password"
                      value={authPassword}
                      onChange={(event) => setAuthPassword(event.target.value)}
                      placeholder={t('welcome.passwordPlaceholder')}
                      className="h-12 rounded-2xl border-white/15 bg-white/10 font-poppins text-white placeholder:text-white/40 focus-visible:ring-white/25"
                      disabled={authSubmitting}
                      autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    />
                  </label>

                  {authMode === 'signup' ? (
                    <label className="block">
                      <span className="mb-1.5 block font-poppins text-xs font-semibold uppercase tracking-wide text-white/70">
                        {t('welcome.confirmPasswordLabel')}
                      </span>
                      <Input
                        type="password"
                        value={authConfirmPassword}
                        onChange={(event) => setAuthConfirmPassword(event.target.value)}
                        placeholder={t('welcome.confirmPasswordPlaceholder')}
                        className="h-12 rounded-2xl border-white/15 bg-white/10 font-poppins text-white placeholder:text-white/40 focus-visible:ring-white/25"
                        disabled={authSubmitting}
                        autoComplete="new-password"
                      />
                    </label>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={authSubmitting || !authEmail || !authPassword || (authMode === 'signup' && !authConfirmPassword)}
                    className="h-12 w-full rounded-[28px] bg-brand-yellow font-poppins text-sm font-semibold uppercase tracking-wide text-black hover:bg-brand-yellow-deep disabled:opacity-60"
                  >
                    {authSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                    {authMode === 'signup' ? t('welcome.createAccount') : t('welcome.signInWithEmail')}
                  </Button>
                </form>
              )}

              {authNotice ? (
                <p className="mt-3 rounded-2xl bg-white/10 px-4 py-3 text-center font-poppins text-xs font-semibold leading-relaxed text-white">
                  {authNotice}
                </p>
              ) : null}
              {authError ? (
                <p className="mt-3 rounded-2xl bg-red-500/18 px-4 py-3 text-center font-poppins text-xs font-semibold leading-relaxed text-white">
                  {authError}
                </p>
              ) : null}
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
