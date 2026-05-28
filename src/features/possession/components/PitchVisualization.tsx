'use client';

import { motion, AnimatePresence } from 'motion/react';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { BarBattleOverlay } from './BarBattleOverlay';
import type { PitchVisualizationProps } from './pitch/pitch.types';
import { PITCH_BALL_IMAGE_URL } from './pitch/pitch.helpers';
import { PitchMarker } from './pitch/PitchMarker';
import { PitchSvgDefs } from './pitch/PitchSvgDefs';
import { PitchBackground } from './pitch/PitchBackground';
import { usePitchSceneModel } from './pitch/usePitchSceneModel';

export function PitchVisualization(props: PitchVisualizationProps) {
  const {
    playerPosition,
    playerAvatarCustomization = null,
    opponentAvatarCustomization = null,
    penaltyMode,
    shotMode,
    mirrored = false,
    targetGoal,
    barBattle,
    barBattleVariant,
    hideBall = false,
  } = props;
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
    playerHtmlActorMotion,
    opponentHtmlActorMotion,
    playerHtmlActorTransition,
    opponentHtmlActorTransition,
  } = usePitchSceneModel(props);

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

          <PitchBackground uid={uid} isPenalty={isPenalty} zoneBands={zoneBands} />

          {/* Pitch markings removed — stadium-green.png has its own lines */}

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
            <>
              {/* Possession tracking visualization */}
              <g>
                {/* Main possession bar container */}
                <rect x="15" y="70" width="470" height="90" fill="rgba(0,0,0,0.2)" rx="6" />

                {/* Center line */}
                <line x1="250" y1="70" x2="250" y2="160" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />

                {/* Player's possession fill (always from their defensive end) */}
                <motion.rect
                  x={mirrored ? possessionBoundaryX : possessionTrackLeft}
                  y="70"
                  width={(playerPosition / 100) * possessionTrackWidth}
                  height="90"
                  fill="#1CB0F6"
                  opacity="0.18"
                  rx="6"
                  animate={{
                    opacity: [0.15, 0.22, 0.15],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Opponent's possession fill */}
                <motion.rect
                  x={mirrored ? possessionTrackLeft : possessionBoundaryX}
                  y="70"
                  width={((100 - playerPosition) / 100) * possessionTrackWidth}
                  height="90"
                  fill="#FF4B4B"
                  opacity="0.12"
                  rx="6"
                  animate={{
                    opacity: [0.08, 0.15, 0.08],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                />

                {/* Bar battle animation sits UNDER avatars. If bars overlap in
                    tight edge cases, the player art remains on top and readable. */}
                {barBattle && (
                  <BarBattleOverlay
                    battle={barBattle}
                    mirrored={mirrored}
                    playerAvatarX={playerAvatarVisualX}
                    opponentAvatarX={opponentAvatarVisualX}
                    isPortrait={isPortrait}
                    variant={barBattleVariant}
                  />
                )}

                {/* Player avatar (positioned close to white line on blue side).
                    The data-pitch-avatar attribute lets the bar-battle flight
                    overlay find the avatar's screen position so the +N ghost
                    can fly into it. Production code paths ignore the attr. */}
                {!renderHtmlPitchActors && (
                  <motion.g
                    data-pitch-avatar="player"
                    animate={{
                      x: playerAvatarX,
                      scale: playerAvatarPulse,
                    }}
                    transition={{
                      x: { type: 'spring', stiffness: 160, damping: 12, mass: 0.7 },
                      scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                    }}
                  >
                    <g transform={isPortrait ? 'rotate(90, 0, 115)' : undefined}>
                      <foreignObject
                        x={-avatarBoxOffset}
                        y={avatarBoxY}
                        width={avatarBox}
                        height={avatarBox}
                      >
                        <div
                          aria-label={playerAvatarAlt}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            // 2nd half (mirrored) flips the pitch — player is
                            // now on the right side and needs to face left
                            // toward the opp. Default half: player faces forward.
                            transform: mirrored ? 'scaleX(-1)' : undefined,
                          }}
                        >
                          <AvatarDisplay customization={playerAvatarCustomization ?? {}} size="xs" className="size-full" />
                        </div>
                      </foreignObject>
                    </g>
                  </motion.g>
                )}

                {/* Opponent avatar (positioned close to white line on red side) */}
                {!renderHtmlPitchActors && (
                  <motion.g
                    data-pitch-avatar="opponent"
                    animate={{
                      x: opponentAvatarX,
                      scale: opponentAvatarPulse,
                    }}
                    transition={{
                      x: { type: 'spring', stiffness: 160, damping: 12, mass: 0.7 },
                      scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                    }}
                  >
                    <g transform={isPortrait ? 'rotate(90, 0, 115)' : undefined}>
                      <foreignObject
                        x={-avatarBoxOffset}
                        y={avatarBoxY}
                        width={avatarBox}
                        height={avatarBox}
                      >
                        <div
                          aria-label={opponentAvatarAlt}
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            // Default half: opp sits on the right and faces
                            // left toward the player. After mirror (2nd half)
                            // opp is on the left and faces forward.
                            transform: mirrored ? undefined : 'scaleX(-1)',
                          }}
                        >
                          <AvatarDisplay customization={opponentAvatarCustomization ?? {}} size="xs" className="size-full" />
                        </div>
                      </foreignObject>
                    </g>
                  </motion.g>
                )}

                {/* Ball position indicator - positioned at boundary between blue/red zones */}
                <motion.g
                  animate={{ x: possessionBoundaryX }}
                  transition={{ type: 'spring', stiffness: 160, damping: 12, mass: 0.7 }}
                >
                  {/* Vertical indicator line */}
                  <motion.line
                    x1="0" y1="65" x2="0" y2="165"
                    stroke="white"
                    strokeWidth="2.5"
                    opacity="0.9"
                    animate={{
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </motion.g>

              </g>
            </>
          )}

          {/* === UNIFIED BALL — single persistent <motion.g> that never unmounts === */}
          {!hideBall && !renderHtmlPitchActors && !renderSimpleShotBall && (
            <motion.g
              key="ball"
              initial={false}
              animate={{
                x: ballTarget.x,
                y: ballTarget.y,
                opacity: ballOpacity,
              }}
              transition={ballTransition}
            >
              <motion.circle cx="0" cy="0" r={ballGlowR} fill="rgba(255,255,255,0.1)" filter={`url(#${uid('ballGlow')})`} />
              <foreignObject x={-ballBoxOffset} y={-ballBoxOffset} width={ballBox} height={ballBox}>
                <img src={PITCH_BALL_IMAGE_URL} alt="" style={ballImageStyle} />
              </foreignObject>
            </motion.g>
          )}

          {!hideBall && !renderHtmlPitchActors && renderSimpleShotBall && (
            <motion.g
              key={`simple-shot-ball-${shotMode?.isPlayerAttacker ? 'player' : 'opponent'}-${shotMode?.result}-${targetGoal ?? 'right'}`}
              initial={{
                x: simpleShotOriginX,
                y: simpleShotOriginY,
                scale: 1,
                opacity: 1,
              }}
              animate={simpleShotBallAnimate}
              transition={ballTransition}
            >
              <motion.circle cx="0" cy="0" r={ballGlowR} fill="rgba(255,255,255,0.1)" filter={`url(#${uid('ballGlow')})`} />
              <foreignObject x={-ballBoxOffset} y={-ballBoxOffset} width={ballBox} height={ballBox}>
                <img src={PITCH_BALL_IMAGE_URL} alt="" style={ballImageStyle} />
              </foreignObject>
            </motion.g>
          )}

          {/* === Decorative overlays — separate AnimatePresence === */}
          <AnimatePresence>
            {/* Penalty goal: net ripple */}
            {isGoal && (
              <motion.g key="pen-goal-decor">
                <motion.rect
                  x={goal.netX} y="92" width="9" height="46" rx="1"
                  fill={`url(#${uid('penNet')})`}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 0.8, 0.4, 0],
                    x: [goal.netX, goal.netX + 2 * goal.inward, goal.netX + goal.inward, goal.netX],
                  }}
                  transition={{ duration: 0.5, delay: 0.35 }}
                />
              </motion.g>
            )}
            {/* Shot goal: net ripple */}
            {isShotGoal && (
              <motion.g key="shot-goal-decor">
                <motion.rect
                  x={goal.netX} y="92" width="9" height="46" rx="1"
                  fill={`url(#${uid('penNet')})`}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 0.8, 0.4, 0],
                    x: [goal.netX, goal.netX + 2 * goal.inward, goal.netX + goal.inward, goal.netX],
                  }}
                  transition={{ duration: 0.5, delay: shotGoalNetDelay }}
                />
              </motion.g>
            )}
          </AnimatePresence>


          </g>
        </svg>
        {renderHtmlPitchActors && (
          <>
            <motion.div
              data-pitch-avatar="player"
              initial={false}
              animate={playerActorPosition}
              transition={{ type: 'spring', stiffness: 160, damping: 12, mass: 0.7 }}
              className="pointer-events-none absolute z-20"
              style={{
                width: actorAvatarSize,
                aspectRatio: '1 / 1',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <motion.div
                animate={playerHtmlActorMotion}
                transition={playerHtmlActorTransition}
                className="size-full rounded-full"
                style={!isPortrait && useMarkerActors && htmlActorResultActive && playerHtmlIsShooter ? { transformOrigin: '50% 100%' } : undefined}
              >
                <div
                  aria-label={playerAvatarAlt}
                  className="size-full overflow-hidden rounded-full"
                  style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
                >
                  <AvatarDisplay customization={playerAvatarCustomization ?? {}} size="xs" className="size-full" />
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              data-pitch-avatar="opponent"
              initial={false}
              animate={opponentActorPosition}
              transition={{ type: 'spring', stiffness: 160, damping: 12, mass: 0.7 }}
              className="pointer-events-none absolute z-20"
              style={{
                width: actorAvatarSize,
                aspectRatio: '1 / 1',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <motion.div
                animate={opponentHtmlActorMotion}
                transition={opponentHtmlActorTransition}
                className="size-full rounded-full"
                style={!isPortrait && useMarkerActors && htmlActorResultActive && opponentHtmlIsShooter ? { transformOrigin: '50% 100%' } : undefined}
              >
                <div
                  aria-label={opponentAvatarAlt}
                  className="size-full overflow-hidden rounded-full"
                  style={{ transform: mirrored ? undefined : 'scaleX(-1)' }}
                >
                  <AvatarDisplay customization={opponentAvatarCustomization ?? {}} size="xs" className="size-full" />
                </div>
              </motion.div>
            </motion.div>

            {!hideBall && ballActorPosition && (
              <motion.div
                key="portrait-html-ball"
                initial={false}
                animate={{
                  ...ballActorPosition,
                  opacity: ballOpacity,
                }}
                transition={ballTransition}
                className="pointer-events-none absolute z-30"
                style={{
                  width: actorBallSize,
                  aspectRatio: '1 / 1',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="absolute inset-[-18%] rounded-full bg-white/10 blur-sm" />
                <img
                  src={PITCH_BALL_IMAGE_URL}
                  alt=""
                  className="relative size-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.32)]"
                />
              </motion.div>
            )}
          </>
        )}
        </motion.div>

        {/* Vignette overlay during camera zoom */}
        <AnimatePresence>
          {shouldZoomToGoal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
              style={{ background: vignetteGradient }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
