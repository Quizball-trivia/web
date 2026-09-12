'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { usePlayerAvatar } from '@/hooks/usePlayerAvatar';
import { useAuthStore } from '@/stores/auth.store';
import { useAuthPromptStore } from '@/stores/authPrompt.store';
import { AuctionShowdownScreen } from '@/features/auction/components/AuctionShowdownScreen';
import { AuctionGameScreen } from '@/features/auction/components/AuctionGameScreen';
import { AuctionResultsScreen } from '@/features/auction/components/AuctionResultsScreen';
import { TrainingTooltip } from '@/features/training/components/TrainingTooltip';
import { useTrainingCompletion } from '@/features/training/hooks/useTrainingCompletion';
import { trackTrainingCompleted, trackTrainingSkipped, trackTrainingStarted } from '@/lib/analytics/training.analytics';
import { AuctionTrainingSearching } from './components/AuctionTrainingSearching';
import { useAuctionTrainingMatch, type AuctionTrainingHumanSeat } from './hooks/useAuctionTrainingMatch';
import { useAuctionTrainingTooltips } from './hooks/useAuctionTrainingTooltips';
import { AUCTION_TRAINING_SEARCH_MS } from './data/auctionTrainingScript';

const GAME_PHASES = new Set(['formation', 'clue-reveal', 'bidding', 'reveal', 'solo-pick']);

/**
 * The guided auction tutorial: matchmaking → showdown → four scripted lots →
 * results, with a tooltip at every mechanic. Members reach it from the Auction
 * dialog (in place, like the ranked training); on the public Auction page it is
 * the practice round guests play. Finishing or skipping marks the auction
 * tutorial done for this user and hands control back to the caller.
 */
export function AuctionTrainingScreen({ onComplete, variant = 'member' }: { onComplete: () => void; variant?: 'member' | 'guest' }) {
  const { t, locale } = useLocale();
  const tooltips = useAuctionTrainingTooltips();
  const completion = useTrainingCompletion('auction');
  const isMember = useAuthStore((s) => s.status) === 'authenticated';
  const openAuthPrompt = useAuthPromptStore((s) => s.open);
  const { player } = usePlayer();
  const { avatarCustomization } = usePlayerAvatar();
  const guestLabel = t('training.auctionYou');
  const human = useMemo<AuctionTrainingHumanSeat>(
    () =>
      isMember && variant === 'member'
        ? { username: player.username, avatarSeed: player.avatar ?? 'avatar-1', avatarCustomization }
        : { username: guestLabel, avatarSeed: 'avatar-1' },
    [avatarCustomization, guestLabel, isMember, player.avatar, player.username, variant],
  );

  const { state, actions, humanPlayerId, allowedAction, clockPausedAt } = useAuctionTrainingMatch({
    isPaused: tooltips.isPaused,
    locale,
    human,
    onBeat: tooltips.show,
  });
  const { phase } = state;
  const access = isMember ? 'member' : 'guest';

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    actions.startGame();
    trackTrainingStarted({ game: 'auction', access });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  // Matchmaking: the first tooltip, then "rivals found" once it is dismissed.
  useEffect(() => {
    if (phase !== 'matchmaking') return;
    tooltips.show('matchmaking');
  }, [phase, tooltips.show]); // eslint-disable-line react-hooks/exhaustive-deps -- show is stable
  useEffect(() => {
    if (phase !== 'matchmaking' || tooltips.isPaused) return;
    const timer = setTimeout(() => {
      actions.setPhase('showdown');
      tooltips.show('showdown');
    }, AUCTION_TRAINING_SEARCH_MS);
    return () => clearTimeout(timer);
  }, [phase, tooltips.isPaused, tooltips.show, actions]);

  // Showdown auto-completes on its own clock; hold the formation until GOT IT.
  const [showdownDone, setShowdownDone] = useState(false);
  // Stable: the showdown re-arms its completion timer whenever this identity changes.
  const onShowdownComplete = useCallback(() => setShowdownDone(true), []);
  useEffect(() => {
    if (phase !== 'showdown' || !showdownDone || tooltips.isPaused) return;
    actions.setPhase('formation');
    tooltips.show('formation');
  }, [phase, showdownDone, tooltips.isPaused, tooltips.show, actions]);

  const finish = useCallback(() => {
    completion.markComplete();
    trackTrainingCompleted({ game: 'auction' });
    onComplete();
  }, [completion, onComplete]);
  const skip = useCallback(() => {
    completion.markComplete();
    trackTrainingSkipped({ game: 'auction', stage: phase });
    onComplete();
  }, [completion, onComplete, phase]);
  // Guests finish into the sign-up dialog: the real auction needs an account.
  const exitResults = useCallback(() => {
    finish();
    if (!isMember) openAuthPrompt();
  }, [finish, isMember, openAuthPrompt]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skip();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [skip]);

  const replay = useCallback(() => {
    tooltips.reset();
    setShowdownDone(false);
    actions.startGame();
    trackTrainingStarted({ game: 'auction', access });
  }, [access, actions, tooltips]);

  let content: React.ReactNode = null;
  if (phase === 'matchmaking' || phase === 'lobby') {
    content = <AuctionTrainingSearching />;
  } else if (phase === 'showdown') {
    content = (
      <AuctionShowdownScreen key={state.players.map((p) => p.id).join('|')} players={state.players} humanPlayerId={humanPlayerId} onComplete={onShowdownComplete} />
    );
  } else if (GAME_PHASES.has(phase)) {
    content = (
      <AuctionGameScreen
        state={state}
        actions={actions}
        humanPlayerId={humanPlayerId}
        clockPausedAt={clockPausedAt}
        allowedAction={allowedAction ? { kind: allowedAction.kind } : null}
      />
    );
  } else if (phase === 'results') {
    content = (
      <AuctionResultsScreen
        state={state}
        humanPlayerId={humanPlayerId}
        onPlayAgain={replay}
        onExit={exitResults}
        playAgainLabel={t('training.auctionReplay')}
        exitLabel={isMember ? t('training.auctionFinish') : t('training.auctionSignUp')}
      />
    );
  }

  return (
    <div className="relative min-h-dvh" data-testid="auction-training">
      {/* `inert` keeps keyboard focus out of the screen while a tooltip explains it. */}
      <div inert={tooltips.active ? true : undefined}>{content}</div>
      {/* One exit at a time: the open tooltip carries its own skip link. */}
      {phase !== 'results' && !tooltips.active && (
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
