'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuthStore } from '@/stores/auth.store';
import { useAuthPromptStore } from '@/stores/authPrompt.store';
import { ShowdownScreen } from '@/components/ShowdownScreen';
import { KickoffCountdownOverlay } from '@/features/possession/components/KickoffCountdownOverlay';
import { MiniGameShell } from '@/features/mini-games/components/MiniGameShell';
import { footballGridAssetUrl } from '@/lib/football-grid/assets';
import {
  FOOTBALL_GRID_COPY,
  FootballGridTurnPanel,
  GRID_BACKGROUND_STYLE,
  GridHud,
  GridResultHero,
  MatchBoard,
  PhaseOverlay,
  ResultSampleGallery,
  SearchScreen,
} from '@/features/football-grid/FootballGridFlowScreen';
import { TrainingTooltip } from '@/features/training/components/TrainingTooltip';
import { useTrainingCompletion } from '@/features/training/hooks/useTrainingCompletion';
import { trackTrainingCompleted, trackTrainingSkipped, trackTrainingStarted } from '@/lib/analytics/training.analytics';
import { GRID_TRAINING_ROSTER, GRID_TRAINING_SAMPLES } from './data/gridTrainingFixtures';
import { useGridTrainingMatch } from './hooks/useGridTrainingMatch';
import { useGridTrainingTooltips } from './hooks/useGridTrainingTooltips';
import { useTrainingRemaining } from './hooks/useTrainingRemaining';

const GRID_BACKGROUND = footballGridAssetUrl('/assets/bg-pattern.webp')!;

/**
 * The guided Tic Tac Toe tutorial: search → showdown → kickoff → a seven-turn
 * scripted board vs CoachBot → results, with a tooltip at every mechanic. The
 * live grid pieces render from the engine's `FootballGridState`; members reach
 * it from the Tic Tac Toe dialog, guests as the public page's practice round.
 */
export function GridTrainingScreen({ onComplete, variant = 'member' }: { onComplete: () => void; variant?: 'member' | 'guest' }) {
  const { t, locale } = useLocale();
  const copy = FOOTBALL_GRID_COPY[locale];
  const tooltips = useGridTrainingTooltips();
  const completion = useTrainingCompletion('grid');
  const isMember = useAuthStore((s) => s.status) === 'authenticated';
  const openAuthPrompt = useAuthPromptStore((s) => s.open);
  const { player } = usePlayer();
  const selfName = isMember && variant === 'member' ? player.username : t('training.auctionYou');
  const selfCustomization = isMember && variant === 'member' ? (player.avatarCustomization ?? { base: player.avatar }) : { base: player.avatar };
  const access = isMember ? 'member' : 'guest';

  const engine = useGridTrainingMatch({ isPaused: tooltips.isPaused, onBeat: tooltips.show });
  const { stage, state, actions, feedback, guidedCell, winningLine, resultsVisible, humanPlayerId, opponent, clockPausedAt } = engine;
  const remaining = useTrainingRemaining(state.turnDeadlineAt ?? state.phaseDeadlineAt, clockPausedAt);

  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    actions.startSearch();
    tooltips.show('matchmaking');
    trackTrainingStarted({ game: 'grid', access });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  // Showdown completes on its own clock; the countdown waits for GOT IT.
  const [showdownDone, setShowdownDone] = useState(false);
  const onShowdownComplete = useCallback(() => setShowdownDone(true), []);
  useEffect(() => {
    if (stage === 'match' && state.phase === 'handoff') tooltips.show('showdown');
  }, [stage, state.phase, tooltips.show]); // eslint-disable-line react-hooks/exhaustive-deps -- show is stable
  useEffect(() => {
    if (stage !== 'match' || state.phase !== 'handoff' || !showdownDone || tooltips.isPaused) return;
    actions.startCountdown();
  }, [stage, state.phase, showdownDone, tooltips.isPaused, actions]);

  // A new human turn clears the previous pick.
  useEffect(() => {
    if (guidedCell === null) return;
    setSelectedCell(null);
    setAnswer('');
  }, [guidedCell, state.turnNumber]);

  const finish = useCallback(() => {
    completion.markComplete();
    trackTrainingCompleted({ game: 'grid' });
    onComplete();
  }, [completion, onComplete]);
  const skip = useCallback(() => {
    completion.markComplete();
    trackTrainingSkipped({ game: 'grid', stage: stage === 'match' ? state.phase : stage });
    onComplete();
  }, [completion, onComplete, stage, state.phase]);
  const exitResults = useCallback(() => {
    finish();
    if (!isMember) openAuthPrompt();
  }, [finish, isMember, openAuthPrompt]);
  const replay = useCallback(() => {
    tooltips.reset();
    setShowdownDone(false);
    setSelectedCell(null);
    setAnswer('');
    actions.startSearch();
    tooltips.show('matchmaking');
    trackTrainingStarted({ game: 'grid', access });
  }, [access, actions, tooltips]);
  useEffect(() => {
    // The answer sheet handles Escape itself (suggestions, cancel) and marks the event; only a free Escape skips.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) skip();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [skip]);

  // The answer sheet slides in (~300 ms); the tooltip's spotlight waits for it to settle.
  const answerBeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (answerBeatTimer.current) clearTimeout(answerBeatTimer.current); }, []);
  const handleSelect = (cell: number) => {
    setSelectedCell(cell);
    setAnswer('');
    actions.clearFeedback();
    if (answerBeatTimer.current) clearTimeout(answerBeatTimer.current);
    answerBeatTimer.current = setTimeout(() => tooltips.show('answer'), 400);
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedCell === null) return;
    if (actions.submitAnswer(selectedCell, answer)) setAnswer('');
  };

  const isMyTurn = state.phase === 'turn' && state.currentPlayerUserId === humanPlayerId;
  const boardRevealing = state.phase === 'countdown' && remaining <= engine.boardRevealMs;
  const gateSeconds = Math.max(1, Math.ceil((remaining - engine.boardRevealMs) / 1_000));
  const myClaims = state.claims.filter((claim) => claim.claimantUserId === humanPlayerId).length;
  const won = state.winnerUserId === humanPlayerId;
  const draw = state.phase === 'terminal' && !state.winnerUserId;

  let content: React.ReactNode;
  if (stage !== 'match') {
    content = (
      <SearchScreen
        playerName={selfName}
        avatar={player.avatar}
        customization={selfCustomization}
        status={stage === 'matched' ? 'matched' : 'searching'}
        opponent={stage === 'matched' ? opponent : null}
        onCancel={skip}
        copy={copy}
      />
    );
  } else if (state.phase === 'handoff') {
    content = (
      <ShowdownScreen
        matchType="friendly"
        playerUsername={selfName}
        playerAvatar={player.avatar}
        opponentUsername={opponent.username}
        opponentAvatar=""
        onComplete={onShowdownComplete}
        playerInfo={{ username: selfName, avatar: player.avatar, avatarCustomization: selfCustomization, level: player.level }}
        opponentInfo={{ username: opponent.username, avatar: '', avatarCustomization: opponent.avatarCustomization, isAi: true }}
      />
    );
  } else if (state.phase === 'countdown' && !boardRevealing) {
    content = (
      <KickoffCountdownOverlay
        countdownDisplay={gateSeconds}
        phase="kickoff"
        durationMs={5_000}
        runKey="training-kickoff"
        playerName={selfName}
        opponentName={opponent.username}
        playerAvatarBase={player.avatar}
        playerAvatarCustomization={selfCustomization}
        opponentAvatarCustomization={opponent.avatarCustomization ?? null}
        playerReady
        opponentReady
        className="h-dvh min-h-dvh w-screen bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />
    );
  } else if (state.phase === 'terminal' && resultsVisible) {
    content = (
      <main className="min-h-dvh overflow-y-auto bg-surface-page-alt bg-cover bg-center bg-no-repeat px-5 py-10 text-white" style={GRID_BACKGROUND_STYLE}>
        <div className="mx-auto max-w-3xl text-center font-poppins">
          <div className="mx-auto max-w-xl">
            <GridResultHero
              copy={copy}
              title={won ? copy.resultWin : draw ? copy.resultDraw : copy.resultLoss}
              tone={won ? 'win' : draw ? 'draw' : 'loss'}
              selfName={selfName}
              selfCustomization={selfCustomization}
              opponentName={opponent.username}
              opponentCustomization={opponent.avatarCustomization ?? { base: undefined }}
              myScore={myClaims}
              theirScore={state.claims.length - myClaims}
            />
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-white/45">{t('training.gridClaimsLabel')}</p>
          </div>
          <ResultSampleGallery samples={GRID_TRAINING_SAMPLES} board={state.board} locale={locale} title={copy.sampleAnswers} body={copy.sampleAnswersBody} />
          <div className="mx-auto mt-7 max-w-xl space-y-3">
            <button type="button" onClick={replay} className="w-full rounded-2xl bg-brand-green px-6 py-4 font-black uppercase text-white transition-colors hover:bg-brand-green-deep">
              {t('training.gridReplay')}
            </button>
            <button type="button" onClick={exitResults} className="w-full rounded-2xl border border-white/15 px-6 py-4 font-bold text-white/70">
              {isMember ? t('training.gridFinish') : t('training.gridSignUp')}
            </button>
          </div>
        </div>
      </main>
    );
  } else {
    content = (
      <MiniGameShell title={copy.title} accent="#1CB0F6" hideHeader disclaimer={false} backgroundImageUrl={GRID_BACKGROUND} wide scrollable>
        <div className="mx-auto mt-14 flex w-full max-w-[26rem] flex-1 flex-col sm:mt-16 sm:max-w-[28rem]">
          <GridHud
            state={state}
            series={null}
            selfUserId={humanPlayerId}
            selfName={selfName}
            selfCustomization={selfCustomization}
            opponent={opponent}
            remaining={remaining}
            isMyTurn={isMyTurn}
            copy={copy}
            pendingCommand
            myOfferPending={false}
            onSkip={() => undefined}
            onOfferDraw={() => undefined}
          />
          <div className="mt-3" />
          <MatchBoard
            state={state}
            selfUserId={humanPlayerId}
            locale={locale}
            selectedCell={selectedCell}
            onSelect={handleSelect}
            selectableCells={guidedCell === null ? [] : [guidedCell]}
            highlightCells={winningLine}
          />
          <FootballGridTurnPanel
            state={state}
            locale={locale}
            isMyTurn={isMyTurn}
            selectedCell={guidedCell === null ? null : selectedCell}
            answer={answer}
            onAnswerChange={setAnswer}
            onSubmit={handleSubmit}
            onCancel={() => { setSelectedCell(null); setAnswer(''); }}
            feedback={feedback}
            roster={GRID_TRAINING_ROSTER}
          />
          <PhaseOverlay state={state} remaining={remaining} copy={copy} />
        </div>
      </MiniGameShell>
    );
  }

  return (
    <div className="relative min-h-dvh" data-testid="grid-training">
      {/* `inert` keeps keyboard focus out of the screen while a tooltip explains it. */}
      <div inert={tooltips.active ? true : undefined}>{content}</div>
      {!resultsVisible && !tooltips.active && (
        <button
          type="button"
          onClick={skip}
          className="fixed right-3 top-3 z-[90] inline-flex h-9 items-center rounded-full bg-black/60 px-3 font-poppins text-xs font-bold uppercase tracking-wide text-white backdrop-blur-sm hover:bg-black/80"
        >
          {t('training.skipTraining')}
        </button>
      )}
      {tooltips.active && (
        <TrainingTooltip
          titleKey={tooltips.active.titleKey}
          messageKey={tooltips.active.messageKey}
          position={tooltips.active.position}
          highlightSelector={tooltips.active.highlight}
          onDismiss={tooltips.dismiss}
          onSkip={skip}
        />
      )}
    </div>
  );
}
