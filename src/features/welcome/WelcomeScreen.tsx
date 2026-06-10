"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import { useLeaderboard } from '@/lib/queries/leaderboard.queries';
import { BarBattleFlightOverlay } from '@/features/possession/components/BarBattleFlightOverlay';
import { useGeorgianPhoneAuthAvailability } from '@/lib/auth/useGeorgianPhoneAuthAvailability';

import { DEMO_LEADERBOARD } from './welcome.content';
import {
  getDaysUntilWorldCup,
  getDuelsCount,
} from './welcome.helpers';
import { useWelcomeAuthController } from './useWelcomeAuthController';
import { useWelcomeStadiumSim } from './useWelcomeStadiumSim';
import { useWelcomeCategoriesData } from './useWelcomeCategoriesData';
import { WelcomeLoginDialog } from './WelcomeLoginDialog';
import { WelcomeAuthNoticeModal } from './WelcomeAuthNoticeModal';
import { WelcomeOpenInBrowserModal } from './WelcomeOpenInBrowserModal';
import { WelcomeNavbar } from './WelcomeNavbar';
import { WelcomeHero } from './WelcomeHero';
import { WelcomeCategoriesSection } from './WelcomeCategoriesSection';
import { WelcomeCategoriesDialog } from './WelcomeCategoriesDialog';
import { WelcomeTierRoadSection } from './WelcomeTierRoadSection';
import { WelcomeLeaderboardSection } from './WelcomeLeaderboardSection';
import { WelcomeFooter } from './WelcomeFooter';
import { WelcomeWorldCupBanner } from './WelcomeWorldCupBanner';

export function WelcomeScreen() {
  const auth = useWelcomeAuthController();
  const {
    loginOpen,
    handleLoginDialogOpenChange,
    handleCloseLoginDialog,
    handleKickOff,
    handleProtectedWelcomeAction,
    authInAppBrowser,
    openInBrowserModalOpen,
    handleCloseOpenInBrowserModal,
    inAppBrowserPlatform,
    inAppBrowserApp,
    handleGoogleCredential,
    disableGoogleIdentityOverlay,
    showFacebookLogin,
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
    authNoticeModal,
    handleCloseAuthNoticeModal,
    handleNoticeModalGoToSignIn,
    handleRestorePendingDeletion,
    restoreSubmitting,
    restoreError,
    authError,
    authFieldErrors,
    phoneOtpSent,
    socialSubmitting,
    showAdvancedAuth,
    toggleAdvancedAuth,
    showForgot,
    forgotSubmitting,
    forgotSent,
    forgotError,
    handleGoogleLogin,
    handleFacebookLogin,
    handleEmailAuth,
    handlePhoneAuth,
    handleShowForgot,
    handleBackToSignIn,
    handleForgotSubmit,
  } = auth;
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [duelsCount] = useState(() => getDuelsCount());
  const [wcDaysLeft] = useState(() => getDaysUntilWorldCup());

  const sim = useWelcomeStadiumSim();
  const { landingFlights, setLandingFlights } = sim;

  const { data: leaderboardData } = useLeaderboard('global');
  const leaderboardEntries = leaderboardData ?? DEMO_LEADERBOARD;

  const { featuredCategories } = useWelcomeCategoriesData();
  const phoneAuthAvailability = useGeorgianPhoneAuthAvailability();
  const canUseGeorgianPhoneAuth = phoneAuthAvailability.isAvailable;

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';

  const handleBrowseCategories = () => {
    if (authInAppBrowser) {
      handleProtectedWelcomeAction();
      return;
    }
    setCategoriesOpen(true);
  };

  const handleCategorySelect = () => {
    setCategoriesOpen(false);
    handleProtectedWelcomeAction();
  };

  useEffect(() => {
    if (!canUseGeorgianPhoneAuth && authMode === 'phone') {
      handleAuthModeChange('signin');
    }
  }, [authMode, canUseGeorgianPhoneAuth, handleAuthModeChange]);

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

      {/* ─── World Cup Event Zone (Timeline) ─── */}
      <div className="relative max-w-7xl mx-auto w-full pl-6 pr-2 md:pr-4 pt-8 pb-4">
        {/* Vertical timeline line — aligned to left edge */}
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-brand-green/30 to-transparent" />

        {/* Node 1: Prizes */}
        <div className="relative pl-8 pb-10">
          <div className="absolute left-[20px] top-1 size-3 rounded-full bg-brand-green ring-4 ring-brand-green/20" />
          <WelcomeWorldCupBanner />
        </div>

        {/* Node 2: Categories */}
        <div className="relative pl-8 pb-10">
          <div className="absolute left-[20px] top-1 size-3 rounded-full bg-brand-green ring-4 ring-brand-green/20" />
          <WelcomeCategoriesSection
            allCategoriesCount={featuredCategories.length}
            featuredCategories={featuredCategories}
            hasRemaining={featuredCategories.length > 15}
            onCategorySelect={handleProtectedWelcomeAction}
            onBrowseAll={handleBrowseCategories}
          />
        </div>

        {/* Node 3: Leaderboard */}
        <div className="relative pl-8 pb-10">
          <div className="absolute left-[20px] top-1 size-3 rounded-full bg-brand-green ring-4 ring-brand-green/20" />
          <WelcomeLeaderboardSection
            entries={leaderboardEntries}
            onEntryClick={handleProtectedWelcomeAction}
            onViewFull={handleProtectedWelcomeAction}
          />
        </div>

        {/* End node: Betsson branding */}
        <div className="relative pl-8">
          <div className="absolute left-[20px] top-0 size-3 rounded-full bg-brand-green/50 ring-4 ring-brand-green/10" />
          <div className="flex items-center gap-2 opacity-50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">Powered by</span>
            <Image
              src="/assets/betsson/1.png"
              alt="Betsson Sport"
              width={80}
              height={16}
              className="h-3 w-auto object-contain"
            />
          </div>
        </div>
      </div>

      <WelcomeTierRoadSection onStartClimbing={handleProtectedWelcomeAction} />

      <WelcomeFooter duelsCount={duelsCount} />

      <WelcomeCategoriesDialog
        open={categoriesOpen}
        categories={featuredCategories}
        onOpenChange={setCategoriesOpen}
        onCategorySelect={handleCategorySelect}
      />

      <WelcomeLoginDialog
        open={loginOpen}
        googleClientId={googleClientId}
        disableGoogleIdentityOverlay={disableGoogleIdentityOverlay}
        authMode={authMode}
        authEmail={authEmail}
        authPassword={authPassword}
        authConfirmPassword={authConfirmPassword}
        authPhone={authPhone}
        authOtp={authOtp}
        authSubmitting={authSubmitting}
        authNotice={authNotice}
        authError={authError}
        authFieldErrors={authFieldErrors}
        phoneOtpSent={phoneOtpSent}
        socialSubmitting={socialSubmitting}
        showAdvancedAuth={showAdvancedAuth}
        showForgot={showForgot}
        forgotSubmitting={forgotSubmitting}
        forgotSent={forgotSent}
        forgotError={forgotError}
        showPhoneAuth={canUseGeorgianPhoneAuth}
        showFacebookLogin={showFacebookLogin}
        onOpenChange={handleLoginDialogOpenChange}
        onClose={handleCloseLoginDialog}
        onGoogleLogin={handleGoogleLogin}
        onGoogleCredential={handleGoogleCredential}
        onFacebookLogin={handleFacebookLogin}
        onAuthModeChange={handleAuthModeChange}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onConfirmPasswordChange={setAuthConfirmPassword}
        onPhoneChange={setAuthPhone}
        onOtpChange={setAuthOtp}
        onEmailSubmit={handleEmailAuth}
        onPhoneSubmit={handlePhoneAuth}
        onToggleAdvancedAuth={toggleAdvancedAuth}
        onShowForgot={handleShowForgot}
        onBackToSignIn={handleBackToSignIn}
        onForgotSubmit={handleForgotSubmit}
      />

      <WelcomeAuthNoticeModal
        open={authNoticeModal !== null}
        variant={authNoticeModal ?? 'check-email'}
        onClose={handleCloseAuthNoticeModal}
        onGoToSignIn={handleNoticeModalGoToSignIn}
        onRestorePendingDeletion={handleRestorePendingDeletion}
        restoreSubmitting={restoreSubmitting}
        restoreError={restoreError}
      />

      <WelcomeOpenInBrowserModal
        open={openInBrowserModalOpen}
        platform={inAppBrowserPlatform}
        app={inAppBrowserApp}
        onClose={handleCloseOpenInBrowserModal}
      />
    </div>
  );
}
