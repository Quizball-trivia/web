'use client';

import { AnimatePresence } from 'motion/react';
import { PitchVisualization } from './components/PitchVisualization';
import { PossessionHUD } from './components/PossessionHUD';
import { HalftimeScreen } from './components/HalftimeScreen';
import { PossessionFeed } from './components/PossessionFeed';
import FulltimeResultsScreen from './components/FulltimeResultsScreen';
import { PenaltyTransition } from './components/PenaltyTransition';

import { IntroScreen } from './components/IntroScreen';
import { PregameOverlay } from './components/PregameOverlay';
import { ShotHUD } from './components/ShotHUD';
import { PenaltyHUD } from './components/PenaltyHUD';
import { PossessionQuestionPanel } from './components/PossessionQuestionPanel';
import { DevToolbar } from './components/DevToolbar';
import { usePossessionGameLogic } from './hooks/usePossessionGameLogic';
import { usePossessionMatchStore } from '@/stores/possessionMatch.store';

export function PossessionMatchScreen() {
  const g = usePossessionGameLogic();
  const setPhase = usePossessionMatchStore((s) => s.setPhase);
  const setShowPlayerSplash = usePossessionMatchStore((s) => s.setShowPlayerSplash);
  const setShowOpponentSplash = usePossessionMatchStore((s) => s.setShowOpponentSplash);

  // Resolve question data for the active mode (normal / shot / penalty)
  const activeQuestion = g.isPenaltyPhase
    ? g.penaltyQuestion
    : g.isShotPhase
      ? g.shotQuestion
      : g.currentQuestion;

  const activeShowOptions = g.isPenaltyPhase
    ? g.penaltyShowOptions
    : g.isShotPhase
      ? true
      : g.showOptions;

  const activeSelectedAnswer = g.isPenaltyPhase
    ? g.penaltyPlayerAnswer
    : g.isShotPhase
      ? g.shotSelectedAnswer
      : g.selectedAnswer;

  const activeAnswerStates = g.isPenaltyPhase
    ? g.penaltyAnswerStates
    : g.isShotPhase
      ? g.shotAnswerStates
      : g.answerStates;

  const activeHandler = g.isPenaltyPhase
    ? g.handlePenaltyAnswer
    : g.isShotPhase
      ? g.handleShotAnswer
      : g.handleAnswer;

  // Feed side resolution
  const feedSide = (() => {
    if (g.isPenaltyPhase && g.phase === 'penalty-result') {
      if (g.penaltyResult === 'goal') return g.isPlayerShooter ? 'left' as const : 'right' as const;
      if (g.penaltyResult === 'saved') return g.isPlayerShooter ? 'right' as const : 'left' as const;
    }
    if (g.isShotPhase) {
      if (g.shotResult === 'goal') return 'left' as const;
      if (g.shotResult === 'saved') return 'right' as const;
      if (g.shotResult === 'miss') return 'left' as const;
    }
    return 'left' as const;
  })();

  const feedPenaltyResult = (() => {
    if (g.isPenaltyPhase && g.phase === 'penalty-result' && (g.penaltyResult === 'goal' || g.penaltyResult === 'saved')) {
      return g.penaltyResult;
    }
    if (g.isShotPhase && (g.shotResult === 'goal' || g.shotResult === 'saved' || g.shotResult === 'miss')) {
      return g.shotResult;
    }
    return undefined;
  })();

  return (
    <div className="min-h-screen bg-[#0f1420] flex flex-col items-center">
      <div className="w-full max-w-lg flex flex-col">
        {/* Mute toggle */}
        <button
          onClick={() => { const muted = g.toggleMute(); usePossessionMatchStore.getState().setMuted(muted); }}
          className="fixed top-4 left-4 z-40 size-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-lg transition-colors"
          title={g.muted ? 'Unmute' : 'Mute'}
        >
          {g.muted ? '\ud83d\udd07' : '\ud83d\udd0a'}
        </button>

        {/* Dev toolbar */}
        <DevToolbar
          phase={g.phase}
          onSkipToShot={g.handleSkipToShot}
          onSkipToHalftime={g.handleSkipToHalftime}
          onSkipToPenalties={g.handleSkipToPenalties}
        />

        {/* Intro screen */}
        <IntroScreen
          visible={g.phase === 'intro'}
          onStart={() => setPhase('pregame')}
        />

        {/* Pregame overlay */}
        <PregameOverlay visible={g.phase === 'pregame'} />

        {/* Main game UI */}
        {g.showMainUI && (
          <>
            {/* HUD — shot / penalty / normal */}
            {g.isShotPhase ? (
              <ShotHUD
                playerGoals={g.player.goals}
                opponentGoals={g.opponent.goals}
                playerAvatarUrl={g.playerAvatar}
                opponentAvatarUrl={g.opponentAvatar}
                timeRemaining={g.timeRemaining}
                phase={g.phase}
              />
            ) : g.isPenaltyPhase ? (
              <PenaltyHUD
                penaltyPlayerScore={g.penaltyPlayerScore}
                penaltyOpponentScore={g.penaltyOpponentScore}
                penaltyRound={g.penaltyRound}
                isPenaltySuddenDeath={g.isPenaltySuddenDeath}
                isPlayerShooter={g.isPlayerShooter}
                playerName="You"
                opponentName="CPU"
                playerAvatarUrl={g.playerAvatar}
                opponentAvatarUrl={g.opponentAvatar}
                timeRemaining={g.timeRemaining}
                phase={g.phase}
              />
            ) : (
              <PossessionHUD
                playerGoals={g.player.goals}
                opponentGoals={g.opponent.goals}
                playerName="You"
                opponentName="CPU"
                playerAvatarUrl={g.playerAvatar}
                opponentAvatarUrl={g.opponentAvatar}
                timeRemaining={g.timeRemaining}
                half={g.half}
                questionInHalf={g.normalQuestionsInHalf}
                zone={g.zone}
                zoneColor={g.zoneColor}
              />
            )}

            {/* Pitch visualization */}
            <PitchVisualization
              playerPosition={g.player.position}
              playerAvatarUrl={g.playerAvatar}
              opponentAvatarUrl={g.opponentAvatar}
              playerName="You"
              opponentName="CPU"
              myMomentum={(g.isPenaltyPhase || g.isShotPhase) ? 0 : g.player.momentum}
              penaltyMode={g.isPenaltyPhase ? {
                isPlayerShooter: g.isPlayerShooter,
                result: g.penaltyResult,
                phase: g.penaltyFieldPhase,
              } : undefined}
              shotMode={g.isShotPhase ? {
                result: g.shotResult,
                ballOriginX: g.shotBallOriginRef.current,
              } : undefined}
              zoomToGoal={g.isPenaltyPhase || g.isShotPhase}
            />

            {/* Feed */}
            <PossessionFeed
              message={g.feedMessage}
              direction={g.feedDirection}
              side={feedSide}
              penaltyResult={feedPenaltyResult}
            />

            {/* Question panel */}
            <PossessionQuestionPanel
              phase={g.phase}
              isPenaltyPhase={g.isPenaltyPhase}
              isShotPhase={g.isShotPhase}
              question={activeQuestion}
              showOptions={activeShowOptions}
              selectedAnswer={activeSelectedAnswer}
              answerStates={activeAnswerStates}
              opponentAnswer={g.isPenaltyPhase ? g.penaltyOpponentAnswer : g.isShotPhase ? g.shotOpponentAnswer : g.opponentAnswer}
              showPlayerSplash={g.showPlayerSplash}
              showOpponentSplash={g.showOpponentSplash}
              playerSplashPoints={g.playerSplashPoints}
              opponentSplashPoints={g.opponentSplashPoints}
              onPlayerSplashComplete={() => setShowPlayerSplash(false)}
              onOpponentSplashComplete={() => setShowOpponentSplash(false)}
              onAnswer={activeHandler}
            />
          </>
        )}

        {/* Halftime */}
        <HalftimeScreen
          visible={g.phase === 'halftime'}
          playerGoals={g.player.goals}
          opponentGoals={g.opponent.goals}
          playerName="You"
          opponentName="CPU"
          playerAvatarUrl={g.playerAvatar}
          opponentAvatarUrl={g.opponentAvatar}
          playerPosition={g.player.position}
          playerMomentum={g.player.momentum}
          myReady={false}
          opponentReady={true}
          onSelectTactic={g.handleTacticSelected}
        />

        {/* Penalty Transition */}
        <PenaltyTransition
          visible={g.phase === 'penalty-transition'}
          playerGoals={g.player.goals}
          opponentGoals={g.opponent.goals}
        />

        {/* Fulltime */}
        <AnimatePresence>
          {g.phase === 'fulltime' && (
            <FulltimeResultsScreen
              playerGoals={g.player.goals}
              opponentGoals={g.opponent.goals}
              playerAvatarUrl={g.playerAvatar}
              opponentAvatarUrl={g.opponentAvatar}
              totalCorrect={g.totalCorrect}
              totalQuestions={g.totalQuestions}
              totalShots={g.totalShots}
              avgPosition={g.avgPosition}
              onPlayAgain={g.handlePlayAgain}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
