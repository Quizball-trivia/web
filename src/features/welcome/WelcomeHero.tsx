'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { PitchVisualization } from '@/features/possession/components/PitchVisualization';
import { useLocale } from '@/contexts/LocaleContext';
import { SUBHEADING_PHRASE_KEYS } from './welcome.content';
import type { useWelcomeStadiumSim } from './useWelcomeStadiumSim';

interface WelcomeHeroProps {
  sim: ReturnType<typeof useWelcomeStadiumSim>;
  duelsCount: number;
  onKickOff: () => void;
}

export function WelcomeHero({ sim, duelsCount, onKickOff }: WelcomeHeroProps) {
  const { t } = useLocale();
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
    leftScoreAnchorRef,
    rightScoreAnchorRef,
    landingPitchRef,
    demoPlayers,
  } = sim;

  const showGoal = landingGoalVisible;
  const rightScore = landingScore.right;

  return (
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
                  key={rightScore}
                  initial={{ scale: showGoal ? 1.4 : 1, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  className="text-3xl leading-7 font-black text-white tabular-nums"
                >
                  {rightScore}
                </motion.div>
              </div>
              <div className="drop-shadow-[0_0_12px_rgba(255,75,75,0.3)]">
                <AvatarDisplay customization={demoPlayers.right.avatarCustomization} size="sm" className="rounded-full scale-x-[-1]" />
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-3xl">
            <AnimatePresence>
              {showGoal && (
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
                  ambientPulses={false}
                  shotMode={landingShotMode}
                  simpleShotAnimation
                  hideBall={showGoal}
                  targetGoal={landingTargetGoal}
                  centerPossessionTrack
                  orientation="landscape"
                  svgIdPrefix="welcome-hero-pitch"
                />
              </div>

              <AnimatePresence>
                {showGoal && (
                  <motion.div
                    key={`hero-goal-celebration-${stadiumPhase}`}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                      className="relative w-[78%] max-w-[520px]"
                    >
                      <Image src="/assets/goal.webp" alt="Goal celebration" width={760} height={538} priority className="w-full h-auto object-contain" />
                      {/* Rendered at peak size and scaled 1/4.6 -> 1 -> 1/4.6 so
                          the ball stays crisp at the apex (real pixels, not an
                          upscaled tiny render). */}
                      <motion.div
                        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                        initial={{ scale: 1 / 4.6, y: 10, opacity: 0.94 }}
                        animate={{ scale: [1 / 4.6, 1, 1 / 4.6], y: [10, -32, 0], opacity: [0.94, 1, 1] }}
                        transition={{ duration: 1.85, times: [0, 0.45, 1], ease: 'easeInOut' }}
                      >
                        {/* Glow as a radial gradient, not drop-shadow():
                            filters on a scale-animated layer re-rasterize per
                            frame on Blink. */}
                        <div
                          className="absolute inset-[-12%] rounded-full"
                          style={{
                            background:
                              'radial-gradient(circle, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.10) 55%, rgba(255,255,255,0) 72%)',
                          }}
                        />
                        <Image src="/assets/brand/goal-ball.webp" alt="" width={512} height={512} priority className="relative size-[221px] object-contain md:size-[258px]" />
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
        <div className="absolute -left-11 md:-left-22 top-10 md:top-14 w-16 md:w-24 h-32 md:h-48 overflow-hidden pointer-events-none md:hidden">
          <motion.div
            className="origin-bottom"
            style={{
              maskImage: 'linear-gradient(to top, black 60%, transparent 100%), linear-gradient(to right, transparent 0%, black 22%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 60%, transparent 100%), linear-gradient(to right, transparent 0%, black 22%, black 100%)',
              // Promote to its own compositor layer: without this, Blink
              // re-rasterizes the masked image on every frame of the infinite
              // rotation (mobile-only element — a top cause of Chrome jank).
              willChange: 'transform',
            }}
            animate={{ rotate: [-8, 8, -8] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image src="/assets/brand/hand-left.webp" alt="" width={120} height={200} className="w-14 md:w-24 h-auto" />
          </motion.div>
        </div>

        <div className="absolute -right-11 md:-right-22 top-10 md:top-14 w-16 md:w-24 h-32 md:h-48 overflow-hidden pointer-events-none md:hidden">
          <motion.div
            className="origin-bottom"
            style={{
              maskImage: 'linear-gradient(to top, black 60%, transparent 100%), linear-gradient(to left, transparent 0%, black 22%, black 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 60%, transparent 100%), linear-gradient(to left, transparent 0%, black 22%, black 100%)',
              willChange: 'transform',
            }}
            animate={{ rotate: [8, -8, 8] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          >
            <Image src="/assets/brand/hand-right.webp" alt="" width={120} height={200} className="w-14 md:w-24 h-auto" />
          </motion.div>
        </div>

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
          onClick={onKickOff}
          className="h-16 min-w-[320px] rounded-[22px] bg-brand-green px-12 font-poppins text-2xl font-bold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none sm:w-auto"
        >
          {t('welcome.kickOff')}
        </Button>
      </motion.div>
    </main>
  );
}
