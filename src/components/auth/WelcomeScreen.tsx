"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ModalCloseButton } from '@/components/shared/ModalCloseButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Swords, Loader2, Mail, Phone, type LucideIcon } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { motion, AnimatePresence } from 'motion/react';
import Script from 'next/script';
import { getPlatform, tryOpenInExternalBrowser } from '@/lib/auth/in-app-browser';
import { useLocale } from '@/contexts/LocaleContext';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { LeaderboardPodium } from '@/features/leaderboard/components/LeaderboardPodium';
import { LeaderboardTable } from '@/features/leaderboard/components/LeaderboardTable';
import { useLeaderboard } from '@/lib/queries/leaderboard.queries';
import { RANKED_TIER_BANDS } from '@/utils/rankedTier';
import { tierConfig, type TierName } from '@/utils/tierVisuals';
import { PitchVisualization } from '@/features/possession/components/PitchVisualization';
import { BarBattleFlightOverlay } from '@/features/possession/components/BarBattleFlightOverlay';

import { DEMO_LEADERBOARD, SUBHEADING_PHRASE_KEYS } from './welcome/welcome.content';
import {
  getCategoryStyle,
  getDaysUntilWorldCup,
  getDuelsCount,
} from './welcome/welcome.helpers';
import { useWelcomeAuthController } from './welcome/useWelcomeAuthController';
import { useWelcomeStadiumSim } from './welcome/useWelcomeStadiumSim';
import { useWelcomeCategoriesData } from './welcome/useWelcomeCategoriesData';
import { CategoryArtwork } from './welcome/CategoryArtwork';
import { InAppBrowserInstructions } from './welcome/InAppBrowserInstructions';
import { WelcomeGoogleButton } from './welcome/WelcomeGoogleButton';

export function WelcomeScreen() {
  const { t, locale } = useLocale();
  const auth = useWelcomeAuthController();
  const {
    loginOpen,
    setLoginOpen,
    showOpenInBrowser,
    handleLoginDialogOpenChange,
    handleCloseLoginDialog,
    handleKickOff,
    authMode,
    handleAuthModeChange,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authConfirmPassword,
    setAuthConfirmPassword,
    authPhone,
    setAuthPhone,
    authOtp,
    setAuthOtp,
    authSubmitting,
    authNotice,
    authError,
    phoneOtpSent,
    handleGoogleLogin,
    handleEmailAuth,
    handlePhoneAuth,
  } = auth;
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [duelsCount] = useState(() => getDuelsCount());
  const [wcDaysLeft] = useState(() => getDaysUntilWorldCup());

  const sim = useWelcomeStadiumSim();
  const {
    currentPhraseIndex,
    stadiumPhase,
    landingScore,
    landingBattle,
    landingPlayerPosition,
    landingBallOnPlayer,
    landingGoalVisible,
    landingTargetGoal,
    landingShotMode,
    landingFlights,
    setLandingFlights,
    leftScoreAnchorRef,
    rightScoreAnchorRef,
    landingPitchRef,
    demoPlayers,
  } = sim;

  // Fetch real leaderboard
  const { data: leaderboardData } = useLeaderboard('global');
  const leaderboardEntries = leaderboardData ?? DEMO_LEADERBOARD;

  // Fetch real categories — filter out game modes, split into featured + rest
  const { allCategories, featuredCategories, remainingCategories } = useWelcomeCategoriesData();

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

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
        onOpenChange={handleLoginDialogOpenChange}
      >
        <DialogContent
          className="max-h-[92vh] max-w-md w-[92vw] overflow-y-auto rounded-[24px] border-0 bg-brand-blue p-8 sm:p-10 [&>button:last-child]:hidden focus:outline-none focus-visible:outline-none focus-visible:ring-0 ring-0"
        >
          <ModalCloseButton onClose={handleCloseLoginDialog} />

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
                <WelcomeGoogleButton onClick={handleGoogleLogin} />
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
                    onClick={() => handleAuthModeChange(mode)}
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
                        onChange={(event) => setAuthPhone(event.target.value)}
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

