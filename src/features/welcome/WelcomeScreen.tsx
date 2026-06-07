"use client";

import React, { useEffect, useState } from 'react';
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
import { peekPostAuthRedirect } from '@/lib/auth/postAuthRedirect';
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

export function WelcomeScreen() {
  const auth = useWelcomeAuthController();
  const {
    loginOpen,
    setLoginOpen,
    handleLoginDialogOpenChange,
    handleCloseLoginDialog,
    handleKickOff,
    openInBrowserModalOpen,
    handleCloseOpenInBrowserModal,
    inAppBrowserPlatform,
    inAppBlocksAllSignIn,
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

  const { allCategories, featuredCategories, remainingCategories } = useWelcomeCategoriesData();
  const phoneAuthAvailability = useGeorgianPhoneAuthAvailability();
  const canUseGeorgianPhoneAuth = phoneAuthAvailability.isAvailable;


  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? '';

  useEffect(() => {
    if (!canUseGeorgianPhoneAuth && authMode === 'phone') {
      handleAuthModeChange('signin');
    }
  }, [authMode, canUseGeorgianPhoneAuth, handleAuthModeChange]);

  useEffect(() => {
    if (peekPostAuthRedirect()) {
      if (inAppBlocksAllSignIn) {
        return;
      }
      setLoginOpen(true);
    }
  }, [inAppBlocksAllSignIn, setLoginOpen]);

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
        open={loginOpen && !inAppBlocksAllSignIn}
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
        open={openInBrowserModalOpen || inAppBlocksAllSignIn}
        platform={inAppBrowserPlatform}
        onClose={handleCloseOpenInBrowserModal}
      />
    </div>
  );
}
