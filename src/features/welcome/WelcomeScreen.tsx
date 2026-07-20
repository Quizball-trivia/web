"use client";

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { useLeaderboard } from '@/lib/queries/leaderboard.queries';
import { BarBattleFlightOverlay } from '@/features/possession/components/BarBattleFlightOverlay';
import { useGeorgianPhoneAuthAvailability } from '@/lib/auth/useGeorgianPhoneAuthAvailability';
import { useCspNonce } from '@/contexts/CspNonceContext';

import { DEMO_LEADERBOARD } from './welcome.content';
import { getDuelsCount, getVerifiedQuestionsCount } from './welcome.helpers';
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

export function WelcomeScreen() {
  const cspNonce = useCspNonce();
  // Landing shows the Betsson/World Cup layer to EVERYONE while the event flag
  // is on — no region gating here. In-game surfaces (leaderboard, play, modals)
  // keep the region-gated `isEventMode`.
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
  const [verifiedQuestionsCount] = useState(() => getVerifiedQuestionsCount());

  const sim = useWelcomeStadiumSim();
  const { landingFlights, setLandingFlights } = sim;

  const { data: leaderboardData } = useLeaderboard('global');
  const leaderboardEntries = leaderboardData ?? DEMO_LEADERBOARD;

  const { allCategories, featuredCategories, remainingCategories } = useWelcomeCategoriesData();
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
    <div className="min-h-screen w-full bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat font-sans text-foreground flex flex-col overflow-x-hidden">
      {googleClientId ? (
        <Script
          src="https://accounts.google.com/gsi/client"
          nonce={cspNonce}
          strategy="afterInteractive"
          async
          defer
        />
      ) : null}
      <WelcomeNavbar />

      <WelcomeHero sim={sim} duelsCount={duelsCount} onKickOff={handleKickOff} />

      <BarBattleFlightOverlay
        flights={landingFlights}
        onArrive={(id) => setLandingFlights((flights) => flights.filter((flight) => flight.id !== id))}
      />

      {/* ─── World Cup Event Zone ─── */}
      <div className="relative max-w-7xl mx-auto w-full px-2 md:px-4 pt-8 pb-4">
        {/* Categories */}
        <div className="pb-10">
          <WelcomeCategoriesSection
            allCategoriesCount={allCategories.length}
            featuredCategories={featuredCategories}
            hasRemaining={remainingCategories.length > 0}
            onCategorySelect={handleProtectedWelcomeAction}
            onBrowseAll={handleBrowseCategories}
          />
        </div>

        {/* Leaderboard */}
        <div className="pb-10">
          <WelcomeLeaderboardSection
            entries={leaderboardEntries}
            onEntryClick={handleProtectedWelcomeAction}
            onViewFull={handleProtectedWelcomeAction}
          />
        </div>
      </div>

      <WelcomeTierRoadSection onStartClimbing={handleProtectedWelcomeAction} />

      <WelcomeFooter duelsCount={duelsCount} verifiedQuestionsCount={verifiedQuestionsCount} />

      <WelcomeCategoriesDialog
        open={categoriesOpen}
        categories={allCategories}
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
