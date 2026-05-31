'use client';

import { type ComponentProps, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useLocale } from '@/contexts/LocaleContext';
import { GoalCelebrationOverlay } from './GoalCelebrationOverlay';
import { GoalProgressBar } from './GoalProgressBar';
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
  /**
   * Changes whenever the player answers a tall special question (put-in-order /
   * clues), where the pitch is scrolled off-screen on mobile. The viewport
   * scrolls the pitch back into view so the result + fly animation are visible.
   * Null when no scroll is needed.
   */
  autoScrollKey?: string | null;
}

interface PossessionMatchViewportProps {
  model: PossessionViewportModel;
  children?: ReactNode;
}

function usePitchBallMetrics(orientation: 'portrait' | 'landscape', pitchProps: PitchProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ballSizePx, setBallSizePx] = useState(32);
  const [ballCenterPx, setBallCenterPx] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const isPortrait = orientation === 'portrait';
      const viewBox = isPortrait
        ? { width: 290, height: 500, ball: 24 }
        : { width: 500, height: 290, ball: 36 };
      const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height);

      setBallSizePx(Math.max(1, viewBox.ball * scale));
      const marker = el.querySelector<SVGCircleElement>('[data-pitch-ball-center="true"]');
      if (marker) {
        const markerRect = marker.getBoundingClientRect();
        setBallCenterPx({
          x: markerRect.left + markerRect.width / 2 - rect.left,
          y: markerRect.top + markerRect.height / 2 - rect.top,
        });
      } else {
        setBallCenterPx({
          x: rect.width / 2,
          y: rect.height / 2,
        });
      }
    };

    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [orientation, pitchProps.centerPossessionTrack, pitchProps.mirrored, pitchProps.playerPosition]);

  return { containerRef, ballSizePx, ballCenterPx };
}

function PenaltySplash({ model }: { model: PenaltySplashModel | null }) {
  const { t } = useLocale();
  if (!model?.visible) return null;

  const { localQuestionIndex, result, resultShooterIsMe } = model;
  return (
    <motion.div
      key={`pen-splash-${localQuestionIndex}`}
      initial={{ opacity: 0, y: 22, scale: 0.78 }}
      animate={{
        opacity: [0, 1, 1, 1, 0],
        y: [22, -8, -4, 0, 34],
        scale: [0.78, 1.16, 1.07, 1, 0.86],
      }}
      exit={{ opacity: 0, y: 34, scale: 0.86 }}
      transition={{
        duration: 1.85,
        times: [0, 0.12, 0.25, 0.82, 1],
        ease: [0.22, 1, 0.36, 1],
      }}
      className="absolute inset-x-0 top-[35%] z-30 flex pointer-events-none flex-col items-center"
    >
      {result === 'goal' ? (
        <img
          src="/assets/goal.png"
          alt={t('common.altGoal')}
          className="h-auto w-[min(64vw,260px)] object-contain drop-shadow-[0_10px_0_rgba(0,0,0,0.65)]"
        />
      ) : (
        <div
          className="font-fun text-5xl font-black uppercase tracking-wider text-brand-red-soft"
          style={{
            textShadow: '0 0 30px rgba(255,75,75,0.5), 0 4px 0 rgba(200,40,40,0.8)',
          }}
        >
          {t('possession.savedExclaim')}
        </div>
      )}
      <div className="mt-1 text-sm font-bold font-fun uppercase tracking-widest text-white/60">
        {result === 'goal'
          ? (resultShooterIsMe ? t('possession.youScored') : t('possession.opponentScored'))
          : (resultShooterIsMe ? t('possession.keeperSavesIt') : t('possession.youSavedIt'))}
      </div>
    </motion.div>
  );
}

export function PossessionMatchViewport({ model, children }: PossessionMatchViewportProps) {
  const { showMainUI, hud, pitchProps, goalCelebration, penaltySplash, muted, autoScrollKey } = model;
  const celebrationOwnsBall = Boolean(goalCelebration);
  const {
    containerRef: desktopPitchRef,
    ballSizePx: desktopBallSizePx,
    ballCenterPx: desktopBallCenterPx,
  } = usePitchBallMetrics('portrait', pitchProps);
  const {
    containerRef: mobilePitchRef,
    ballSizePx: mobileBallSizePx,
    ballCenterPx: mobileBallCenterPx,
  } = usePitchBallMetrics('landscape', pitchProps);

  // After answering a tall special question, scroll the pitch back into view so
  // the result + fly animation are visible. Mobile only — the `lg:hidden` pitch
  // is the one in the scrollable column; on desktop the pitch is always visible.
  useEffect(() => {
    if (!autoScrollKey) return;
    const pitch = mobilePitchRef.current;
    if (!pitch || pitch.offsetParent === null) return; // hidden (desktop layout)
    pitch.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [autoScrollKey, mobilePitchRef]);

  return (
    <>
      {showMainUI && (
        <div className="hidden lg:flex lg:w-[42%] lg:items-center lg:gap-3 lg:py-4 relative">
          <div className="h-full max-h-[calc(100dvh-2rem)] py-6">
            <GoalProgressBar position={pitchProps.playerPosition} orientation="vertical" mirrored={pitchProps.mirrored} />
          </div>
          <div ref={desktopPitchRef} className="relative h-full w-full max-h-[calc(100dvh-2rem)]">
            <PitchVisualization {...pitchProps} orientation="portrait" hideBall={celebrationOwnsBall} />
            <AnimatePresence>
              {goalCelebration && (
                <GoalCelebrationOverlay
                  scorerName={goalCelebration.scorerName}
                  isMeScorer={goalCelebration.isMeScorer}
                  ballSizePx={desktopBallSizePx}
                  ballCenterPx={desktopBallCenterPx}
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

      <div className="w-full flex flex-col lg:flex-1 lg:max-w-3xl lg:mx-auto lg:justify-start lg:py-4">
        {showMainUI && (
          <>
            {hud.kind === 'shot' ? (
              <ShotHUD {...hud.props} />
            ) : hud.kind === 'penalty' ? (
              <PenaltyHUD {...hud.props} />
            ) : (
              <PossessionHUD {...hud.props} />
            )}

            <div ref={mobilePitchRef} className="lg:hidden relative">
              <PitchVisualization {...pitchProps} orientation="landscape" hideBall={celebrationOwnsBall} />
              <AnimatePresence>
                {goalCelebration && (
                  <GoalCelebrationOverlay
                    scorerName={goalCelebration.scorerName}
                    isMeScorer={goalCelebration.isMeScorer}
                    ballSizePx={mobileBallSizePx}
                    ballCenterPx={mobileBallCenterPx}
                    muted={muted}
                  />
                )}
              </AnimatePresence>
              <AnimatePresence>
                <PenaltySplash model={penaltySplash} />
              </AnimatePresence>
            </div>

            <div className="lg:hidden">
              <GoalProgressBar position={pitchProps.playerPosition} orientation="horizontal" mirrored={pitchProps.mirrored} />
            </div>
          </>
        )}

        {children}
      </div>
    </>
  );
}
