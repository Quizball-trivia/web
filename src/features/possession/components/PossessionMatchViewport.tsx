'use client';

import { type ComponentProps, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GoalCelebrationOverlay } from './GoalCelebrationOverlay';
import { PenaltyHUD } from './PenaltyHUD';
import { PitchVisualization } from './PitchVisualization';
import { PossessionHUD } from './PossessionHUD';
import { ShotHUD } from './ShotHUD';
import type { GoalCelebrationState } from '../realtimePossession.helpers';

type PitchProps = ComponentProps<typeof PitchVisualization>;
type PossessionHudProps = ComponentProps<typeof PossessionHUD>;
type ShotHudProps = ComponentProps<typeof ShotHUD>;
type PenaltyHudProps = ComponentProps<typeof PenaltyHUD>;

type PossessionHudModel =
  | { kind: 'possession'; props: PossessionHudProps }
  | { kind: 'shot'; props: ShotHudProps }
  | { kind: 'penalty'; props: PenaltyHudProps };

interface PenaltySplashModel {
  visible: boolean;
  result: 'goal' | 'saved';
  resultShooterIsMe: boolean;
  localQuestionIndex: number | null;
}

export interface PossessionViewportModel {
  showMainUI: boolean;
  hud: PossessionHudModel;
  pitchProps: PitchProps;
  goalCelebration: GoalCelebrationState | null;
  penaltySplash: PenaltySplashModel | null;
  muted: boolean;
}

interface PossessionMatchViewportProps {
  model: PossessionViewportModel;
  children?: ReactNode;
}

function PenaltySplash({ model }: { model: PenaltySplashModel | null }) {
  if (!model?.visible) return null;

  const { localQuestionIndex, result, resultShooterIsMe } = model;
  return (
    <motion.div
      key={`pen-splash-${localQuestionIndex}`}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="absolute inset-x-0 top-[35%] z-30 flex pointer-events-none flex-col items-center"
    >
      <div
        className={`text-5xl font-black font-fun uppercase tracking-wider ${
          result === 'goal' ? 'text-[#58CC02]' : 'text-[#FF4B4B]'
        }`}
        style={{
          textShadow: result === 'goal'
            ? '0 0 30px rgba(88,204,2,0.5), 0 4px 0 rgba(70,163,2,0.8)'
            : '0 0 30px rgba(255,75,75,0.5), 0 4px 0 rgba(200,40,40,0.8)',
        }}
      >
        {result === 'goal' ? 'GOAL!' : 'SAVED!'}
      </div>
      <div className="mt-1 text-sm font-bold font-fun uppercase tracking-widest text-white/60">
        {result === 'goal'
          ? (resultShooterIsMe ? 'You scored!' : 'Opponent scored')
          : (resultShooterIsMe ? 'Keeper saves it!' : 'You saved it!')}
      </div>
    </motion.div>
  );
}

export function PossessionMatchViewport({ model, children }: PossessionMatchViewportProps) {
  const { showMainUI, hud, pitchProps, goalCelebration, penaltySplash, muted } = model;

  return (
    <>
      {showMainUI && (
        <div className="hidden lg:flex lg:w-[42%] lg:items-center lg:py-4 relative">
          <div className="relative h-full w-full max-h-[calc(100dvh-2rem)]">
            <PitchVisualization {...pitchProps} orientation="portrait" />
            <AnimatePresence>
              {goalCelebration && (
                <GoalCelebrationOverlay
                  scorerName={goalCelebration.scorerName}
                  isMeScorer={goalCelebration.isMeScorer}
                  muted={muted}
                />
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence>
            <PenaltySplash model={penaltySplash} />
          </AnimatePresence>
        </div>
      )}

      <div className="w-full flex flex-col lg:flex-1 lg:max-w-2xl lg:mx-auto lg:justify-start lg:py-4">
        {showMainUI && (
          <>
            {hud.kind === 'shot' ? (
              <ShotHUD {...hud.props} />
            ) : hud.kind === 'penalty' ? (
              <PenaltyHUD {...hud.props} />
            ) : (
              <PossessionHUD {...hud.props} />
            )}

            <div className="lg:hidden relative">
              <PitchVisualization {...pitchProps} orientation="landscape" />
              <AnimatePresence>
                {goalCelebration && (
                  <GoalCelebrationOverlay
                    scorerName={goalCelebration.scorerName}
                    isMeScorer={goalCelebration.isMeScorer}
                    muted={muted}
                  />
                )}
              </AnimatePresence>
              <AnimatePresence>
                <PenaltySplash model={penaltySplash} />
              </AnimatePresence>
            </div>
          </>
        )}

        {children}
      </div>
    </>
  );
}
