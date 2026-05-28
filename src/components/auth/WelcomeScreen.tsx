"use client";

import React, { useState } from 'react';
import Script from 'next/script';
import { useLeaderboard } from '@/lib/queries/leaderboard.queries';
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
import { WelcomeTierRoadSection } from './welcome/WelcomeTierRoadSection';
import { WelcomeLeaderboardSection } from './welcome/WelcomeLeaderboardSection';
import { WelcomeFooter } from './welcome/WelcomeFooter';

export function WelcomeScreen() {
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


      <WelcomeTierRoadSection onStartClimbing={() => setLoginOpen(true)} />

      <WelcomeLeaderboardSection
        entries={leaderboardEntries}
        onEntryClick={() => setLoginOpen(true)}
        onViewFull={() => setLoginOpen(true)}
      />

      <WelcomeFooter duelsCount={duelsCount} />

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

