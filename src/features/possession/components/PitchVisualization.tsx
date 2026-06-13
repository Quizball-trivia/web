'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { PitchVisualizationProps } from './pitch/pitch.types';
import { PitchMarker } from './pitch/PitchMarker';
import { PitchSvgDefs } from './pitch/PitchSvgDefs';
import { PitchBackground } from './pitch/PitchBackground';
import { PossessionTrackScene } from './pitch/PossessionTrackScene';
import { BarBattleOverlay } from './BarBattleOverlay';
import { PitchBall } from './pitch/PitchBall';
import { PitchGoalNetRipple } from './pitch/PitchGoalNetRipple';
import { PitchHtmlActors } from './pitch/PitchHtmlActors';
import { PitchVignette } from './pitch/PitchVignette';
import { usePitchSceneModel } from './pitch/usePitchSceneModel';
import { clampToFieldPct } from '@/features/possession/realtimePossession.helpers';

export function PitchVisualization(props: PitchVisualizationProps) {
  const {
    playerAvatarCustomization = null,
    opponentAvatarCustomization = null,
    penaltyMode,
    shotMode,
    mirrored = false,
    targetGoal,
    barBattle,
    barBattleVariant,
    ambientPulses = true,
    hideBall = false,
  } = props;
  // RENDER-TIME field clamp: avatars/ball/track must stay visually inside the
  // pitch (10..90), but the incoming value is the TRUE possession position
  // (0..100) — the goal progress meter consumes it unclamped elsewhere.
  // Clamping any earlier capped the meter's score at 80 (the flight-vs-bar
  // mismatch bug).
  const playerPosition = clampToFieldPct(props.playerPosition);
  const {
    isPenalty,
    isShot,
    isPortrait,
    useSimpleShotAnimation,
    avatarBox,
    avatarBoxOffset,
    avatarBoxY,
    uid,
    playerAvatarAlt,
    opponentAvatarAlt,
    ballImageStyle,
    ballBox,
    ballBoxOffset,
    ballGlowR,
    goal,
    possessionTrackLeft,
    possessionTrackWidth,
    possessionBoundaryX,
    playerAvatarX,
    opponentAvatarX,
    playerAvatarVisualX,
    opponentAvatarVisualX,
    simpleShotOriginX,
    simpleShotOriginY,
    playerX,
    opponentX,
    showPenResult,
    isGoal,
    isSave,
    shotResultActive,
    isShotGoal,
    isShotSave,
    renderSimpleShotBall,
    zoneBands,
    vignetteGradient,
    shouldZoomToGoal,
    zoomOrigin,
    keeperJolt,
    ballTarget,
    ballTransition,
    ballOpacity,
    shotGoalNetDelay,
    simpleShotBallAnimate,
    renderHtmlPitchActors,
    playerActorPosition,
    opponentActorPosition,
    ballActorPosition,
    actorAvatarSize,
    actorBallSize,
    playerAvatarPulse,
    opponentAvatarPulse,
    htmlActorResultActive,
    useMarkerActors,
    playerHtmlIsShooter,
    opponentHtmlIsShooter,
    playerFlipX,
    opponentFlipX,
    playerHtmlActorMotion,
    opponentHtmlActorMotion,
    playerHtmlActorTransition,
    opponentHtmlActorTransition,
  } = usePitchSceneModel({ ...props, playerPosition });

  return (
    <div className={isPortrait ? 'h-full w-full' : 'w-full'}>
      {/* Square corners — matches the Figma stadium frame (no rounded edges) */}
      <div className={`relative overflow-hidden ${isPortrait ? 'h-full w-full' : ''}`}>
        {/* Camera zoom wrapper — field container stays anchored, SVG zooms inside */}
        <motion.div
          animate={shouldZoomToGoal ? {
            scale: 1.8,
            x: '0%',
            y: '0%',
          } : {
            scale: 1,
            x: '0%',
            y: '0%',
          }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformOrigin: zoomOrigin, position: 'relative', ...(isPortrait ? { height: '100%' } : {}) }}
        >
        {/* viewBox aspect 500/290 ≈ 1.72:1 — matches the Figma stadium frame
            (846.95 × 493.07). The internal 500-wide × 230-tall play area
            stays at y=0..230 so existing markings/avatar positions don't
            need to shift; we extend 30 units of green pitch above and below
            (y=-30..0 and y=230..260) to reach Figma's proportions. */}
        {/* PERF: the stadium bitmap lives in its OWN svg layer, separate from
            the animated content svg below. SVG children never get compositor
            layers in Blink, so when bars/fills/ball animate, every damaged
            tile of the SAME svg — including the DPR-scaled stadium bitmap —
            re-rasterizes each frame. That continuous re-raster is what makes
            the landing animation stutter on mobile Chrome while Safari
            (different SVG caching) copes. Splitting the static bitmap into a
            will-change-promoted sibling means it rasterizes once and the
            per-frame damage only touches the (mostly transparent) dynamic
            svg. Same DOM order inside the camera wrapper, so zoom still
            applies to both. */}
        <svg
          data-pitch-field="possession-bg"
          aria-hidden="true"
          viewBox={isPortrait ? '-30 0 290 500' : '0 -30 500 290'}
          className="absolute inset-0 h-full w-full"
          style={{ willChange: 'transform' }}
        >
          <defs>
            <clipPath id={uid('fieldClipBg')}>
              <rect x="0" y="-30" width="500" height="290" />
            </clipPath>
          </defs>
          <g transform={isPortrait ? 'matrix(0,-1,1,0,0,500)' : undefined} clipPath={`url(#${uid('fieldClipBg')})`}>
            <PitchBackground uid={() => uid('fieldClipBg')} isPenalty={isPenalty} zoneBands={zoneBands} />
          </g>
        </svg>

        <svg
          data-pitch-field="possession"
          viewBox={isPortrait ? '-30 0 290 500' : '0 -30 500 290'}
          className={isPortrait ? 'w-full h-full' : 'w-full h-auto'}
        >
          <PitchSvgDefs uid={uid} />

          {/* Portrait mode: wrap all content in a 90° rotation matrix.
              matrix(0,-1,1,0,0,500) maps landscape (x,y) → portrait (y, 500-x):
              - Landscape left (x=0, DEF) → portrait bottom (y=500)
              - Landscape right (x=500, BOX) → portrait top (y=0)
              Animations operate in local coord space, parent transform maps to viewport. */}
          <g transform={isPortrait ? 'matrix(0,-1,1,0,0,500)' : undefined}>

          {/* Stadium bitmap moved to the dedicated background svg above. */}

          {/* Pitch markings removed — stadium-green.webp has its own lines */}

          <circle
            data-pitch-ball-center="true"
            cx={possessionBoundaryX}
            cy="112"
            r="1"
            fill="transparent"
            pointerEvents="none"
          />


          {/* === Player avatars — ONLY shown during shots and penalties === */}
          {(isPenalty || (isShot && !useSimpleShotAnimation)) && !renderHtmlPitchActors && (
            <>
              {/* === Opponent marker === */}
              <PitchMarker
                side="opponent"
                x={opponentX} y={goal.penY}
                avatarCustomization={opponentAvatarCustomization}
                avatarAlt={opponentAvatarAlt}
                color="#FF4B4B" glowFilter={uid('redGlow')}
                isShooter={penaltyMode ? !penaltyMode.isPlayerShooter : (isShot && shotMode ? !shotMode.isPlayerAttacker : false)}
                isKeeper={penaltyMode ? penaltyMode.isPlayerShooter : (isShot && shotMode ? shotMode.isPlayerAttacker : false)}
                isSave={!!isSave || !!isShotSave} isGoal={!!isGoal || !!isShotGoal}
                showPenResult={!!showPenResult || !!shotResultActive} keeperJolt={keeperJolt}
                kickDirection={goal.inward}
                isPortrait={isPortrait}
                size={isShot ? 30 : 40}
                hideRing={isPenalty}
              />

              {/* === Player marker === */}
              <PitchMarker
                side="player"
                x={playerX} y={goal.penY}
                avatarCustomization={playerAvatarCustomization}
                avatarAlt={playerAvatarAlt}
                color="#1CB0F6" glowFilter={uid('blueGlow')}
                isShooter={penaltyMode ? penaltyMode.isPlayerShooter : (isShot && shotMode ? shotMode.isPlayerAttacker : false)}
                isKeeper={penaltyMode ? !penaltyMode.isPlayerShooter : (isShot && shotMode ? !shotMode.isPlayerAttacker : false)}
                isSave={!!isSave || !!isShotSave} isGoal={!!isGoal || !!isShotGoal}
                showPenResult={!!showPenResult || !!shotResultActive} keeperJolt={keeperJolt}
                kickDirection={goal.inward}
                isPortrait={isPortrait}
                size={isShot ? 30 : 40}
                hideRing={isPenalty}
              />
            </>
          )}

          {/* === Live Score Tracker Style — ONLY shown during normal gameplay === */}
          {!isPenalty && (!isShot || useSimpleShotAnimation) && (
            <PossessionTrackScene
              playerPosition={playerPosition}
              mirrored={mirrored}
              isPortrait={isPortrait}
              possessionTrackLeft={possessionTrackLeft}
              possessionTrackWidth={possessionTrackWidth}
              possessionBoundaryX={possessionBoundaryX}
              playerAvatarX={playerAvatarX}
              opponentAvatarX={opponentAvatarX}
              playerAvatarVisualX={playerAvatarVisualX}
              opponentAvatarVisualX={opponentAvatarVisualX}
              playerAvatarPulse={playerAvatarPulse}
              opponentAvatarPulse={opponentAvatarPulse}
              avatarBox={avatarBox}
              avatarBoxOffset={avatarBoxOffset}
              avatarBoxY={avatarBoxY}
              playerAvatarAlt={playerAvatarAlt}
              opponentAvatarAlt={opponentAvatarAlt}
              playerAvatarCustomization={playerAvatarCustomization}
              opponentAvatarCustomization={opponentAvatarCustomization}
              renderHtmlPitchActors={renderHtmlPitchActors}
              barBattle={barBattle}
              barBattleVariant={barBattleVariant}
              ambientPulses={ambientPulses}
            />
          )}

          {/* Penalty: reuse the ranked bar-battle overlay WITHOUT the open-play
              possession-track background (which is meaningless over a penalty
              pitch). Anchor bars to the penalty actor X (keeperX / penSpotX) so
              they sit behind the penalty avatars and align with the +N flight
              targets. penY === CY_ANCHORED, so the height is already correct. */}
          {isPenalty && barBattle && (
            <BarBattleOverlay
              battle={barBattle}
              mirrored={mirrored}
              playerAvatarX={playerX}
              opponentAvatarX={opponentX}
              isPortrait={isPortrait}
              variant={barBattleVariant}
              isPenalty
            />
          )}

          {/* === UNIFIED BALL — single persistent <motion.g> that never unmounts === */}
          {!hideBall && !renderHtmlPitchActors && !renderSimpleShotBall && (
            <PitchBall
              variant="unified"
              animate={{ x: ballTarget.x, y: ballTarget.y, opacity: ballOpacity }}
              transition={ballTransition}
              ballGlowR={ballGlowR}
              ballBox={ballBox}
              ballBoxOffset={ballBoxOffset}
              ballImageStyle={ballImageStyle}
              uid={uid}
            />
          )}

          {!hideBall && !renderHtmlPitchActors && renderSimpleShotBall && (
            <PitchBall
              variant="simple-shot"
              simpleShotKey={`simple-shot-ball-${shotMode?.isPlayerAttacker ? 'player' : 'opponent'}-${shotMode?.result}-${targetGoal ?? 'right'}`}
              initialPosition={{ x: simpleShotOriginX, y: simpleShotOriginY }}
              animate={simpleShotBallAnimate}
              transition={ballTransition}
              ballGlowR={ballGlowR}
              ballBox={ballBox}
              ballBoxOffset={ballBoxOffset}
              ballImageStyle={ballImageStyle}
              uid={uid}
            />
          )}

          {/* === Decorative overlays — separate AnimatePresence === */}
          <AnimatePresence>
            {isGoal && (
              <PitchGoalNetRipple
                uniqueKey="pen-goal-decor"
                netX={goal.netX}
                inward={goal.inward}
                patternId={uid('penNet')}
                delay={0.35}
              />
            )}
            {isShotGoal && (
              <PitchGoalNetRipple
                uniqueKey="shot-goal-decor"
                netX={goal.netX}
                inward={goal.inward}
                patternId={uid('penNet')}
                delay={shotGoalNetDelay}
              />
            )}
          </AnimatePresence>


          </g>
        </svg>
        {renderHtmlPitchActors && (
          <PitchHtmlActors
            playerActorPosition={playerActorPosition}
            opponentActorPosition={opponentActorPosition}
            ballActorPosition={ballActorPosition}
            actorAvatarSize={actorAvatarSize}
            actorBallSize={actorBallSize}
            playerAvatarAlt={playerAvatarAlt}
            opponentAvatarAlt={opponentAvatarAlt}
            playerAvatarCustomization={playerAvatarCustomization}
            opponentAvatarCustomization={opponentAvatarCustomization}
            playerFlipX={playerFlipX}
            opponentFlipX={opponentFlipX}
            isPortrait={isPortrait}
            hideBall={hideBall}
            ballOpacity={ballOpacity}
            ballTransition={ballTransition}
            playerHtmlActorMotion={playerHtmlActorMotion}
            opponentHtmlActorMotion={opponentHtmlActorMotion}
            playerHtmlActorTransition={playerHtmlActorTransition}
            opponentHtmlActorTransition={opponentHtmlActorTransition}
            useMarkerActors={useMarkerActors}
            htmlActorResultActive={htmlActorResultActive}
            playerHtmlIsShooter={playerHtmlIsShooter}
            opponentHtmlIsShooter={opponentHtmlIsShooter}
          />
        )}
        </motion.div>

        <PitchVignette visible={shouldZoomToGoal} gradient={vignetteGradient} />
      </div>
    </div>
  );
}
