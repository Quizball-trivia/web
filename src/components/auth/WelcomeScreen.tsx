"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Brain, Swords } from 'lucide-react';
import { motion } from 'motion/react';
import Script from 'next/script';
import { useLocale } from '@/contexts/LocaleContext';
import { LeaderboardPodium } from '@/features/leaderboard/components/LeaderboardPodium';
import { LeaderboardTable } from '@/features/leaderboard/components/LeaderboardTable';
import { useLeaderboard } from '@/lib/queries/leaderboard.queries';
import { RANKED_TIER_BANDS } from '@/utils/rankedTier';
import { tierConfig, type TierName } from '@/utils/tierVisuals';
import { BarBattleFlightOverlay } from '@/features/possession/components/BarBattleFlightOverlay';

import { DEMO_LEADERBOARD } from './welcome/welcome.content';
import {
  getDaysUntilWorldCup,
  getDuelsCount,
} from './welcome/welcome.helpers';
import { useWelcomeAuthController } from './welcome/useWelcomeAuthController';
import { useWelcomeStadiumSim } from './welcome/useWelcomeStadiumSim';
import { useWelcomeCategoriesData } from './welcome/useWelcomeCategoriesData';
import { WelcomeLoginDialog } from './welcome/WelcomeLoginDialog';
import { WelcomeNavbar } from './welcome/WelcomeNavbar';
import { WelcomeHero } from './welcome/WelcomeHero';
import { WelcomeCategoriesSection } from './welcome/WelcomeCategoriesSection';
import { WelcomeCategoriesDialog } from './welcome/WelcomeCategoriesDialog';

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
  const { landingFlights, setLandingFlights } = sim;

  const { data: leaderboardData } = useLeaderboard('global');
  const leaderboardEntries = leaderboardData ?? DEMO_LEADERBOARD;

  const { allCategories, featuredCategories, remainingCategories } = useWelcomeCategoriesData();

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

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
      <WelcomeNavbar wcDaysLeft={wcDaysLeft} />

      <WelcomeHero sim={sim} duelsCount={duelsCount} onKickOff={handleKickOff} />

      <BarBattleFlightOverlay
        flights={landingFlights}
        onArrive={(id) => setLandingFlights((flights) => flights.filter((flight) => flight.id !== id))}
      />

      <WelcomeCategoriesSection
        allCategoriesCount={allCategories.length}
        featuredCategories={featuredCategories}
        hasRemaining={remainingCategories.length > 0}
        onCategorySelect={() => setLoginOpen(true)}
        onBrowseAll={() => setCategoriesOpen(true)}
      />


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

      <WelcomeCategoriesDialog
        open={categoriesOpen}
        categories={allCategories}
        onOpenChange={setCategoriesOpen}
        onCategorySelect={() => { setCategoriesOpen(false); setLoginOpen(true); }}
      />

      <WelcomeLoginDialog
        open={loginOpen}
        showOpenInBrowser={showOpenInBrowser}
        authMode={authMode}
        authEmail={authEmail}
        authPassword={authPassword}
        authConfirmPassword={authConfirmPassword}
        authPhone={authPhone}
        authOtp={authOtp}
        authSubmitting={authSubmitting}
        authNotice={authNotice}
        authError={authError}
        phoneOtpSent={phoneOtpSent}
        onOpenChange={handleLoginDialogOpenChange}
        onClose={handleCloseLoginDialog}
        onGoogleLogin={handleGoogleLogin}
        onAuthModeChange={handleAuthModeChange}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onConfirmPasswordChange={setAuthConfirmPassword}
        onPhoneChange={setAuthPhone}
        onOtpChange={setAuthOtp}
        onEmailSubmit={handleEmailAuth}
        onPhoneSubmit={handlePhoneAuth}
      />
    </div>
  );
}

