import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROUND_INTRO_MS } from '@/features/auction/components/screens/AuctionRoundIntro';
import { CLUE_REVEAL_INTERVAL_MS } from '@/features/auction/data';
import { useAuthStore } from '@/stores/auth.store';
import { AuctionTrainingScreen } from '../AuctionTrainingScreen';
import { AUCTION_TRAINING_BOT_THINK_MS, AUCTION_TRAINING_REVEAL_BEAT_MS, AUCTION_TRAINING_SEARCH_MS, AUCTION_TRAINING_STUDY_MS } from '../data/auctionTrainingScript';

const trackEvent = vi.fn();
// jsdom has no scrollIntoView; the clue list scrolls each new clue into view.
Element.prototype.scrollIntoView = vi.fn();
vi.mock('@/lib/posthog', () => ({ trackEvent: (...args: unknown[]) => trackEvent(...args) }));
vi.mock('@/contexts/LocaleContext', () => ({ useLocale: () => ({ locale: 'en', t: (key: string) => key }) }));
vi.mock('@/contexts/PlayerContext', () => ({ usePlayer: () => ({ player: { username: 'Taz', avatar: 'avatar-1' } }) }));
vi.mock('@/hooks/usePlayerAvatar', () => ({ usePlayerAvatar: () => ({ avatarUrl: '', avatarCustomization: null, username: 'Taz' }) }));
vi.mock('@/hooks/useIsDesktop', () => ({ useIsDesktop: () => false }));

const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
const gotIt = () => act(() => { fireEvent.click(screen.getByText('training.gotIt')); });
const tooltip = (title: string) => screen.queryByText(title);

describe('AuctionTrainingScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    trackEvent.mockClear();
    useAuthStore.setState({ status: 'authenticated', user: { id: 'user-1' } } as never);
  });
  afterEach(() => vi.useRealTimers());

  it('walks matchmaking → showdown → formation → first lot with real tooltips pausing the script', async () => {
    const onComplete = vi.fn();
    render(<AuctionTrainingScreen onComplete={onComplete} />);
    expect(trackEvent).toHaveBeenCalledWith('training_started', { game: 'auction', access: 'member' });
    expect(tooltip('training.tipAuctionMatchmakingTitle')).toBeInTheDocument();
    // The search does not resolve under the tooltip.
    await tick(AUCTION_TRAINING_SEARCH_MS * 3);
    expect(tooltip('training.tipAuctionShowdownTitle')).toBeNull();
    gotIt();
    await tick(AUCTION_TRAINING_SEARCH_MS);
    expect(tooltip('training.tipAuctionShowdownTitle')).toBeInTheDocument();
    // The showdown's own clock finishes under the tooltip; formation waits for GOT IT.
    await tick(6_000);
    expect(tooltip('training.tipAuctionFormationTitle')).toBeNull();
    gotIt();
    await tick(500);
    expect(tooltip('training.tipAuctionFormationTitle')).toBeInTheDocument();
    gotIt();
    act(() => { fireEvent.click(screen.getByText('auctionGame.startAuction')); });
    // Second clue pair → clues + starting price explained, in order, script frozen meanwhile.
    await tick(ROUND_INTRO_MS + 400 + CLUE_REVEAL_INTERVAL_MS);
    expect(tooltip('training.tipAuctionCluesTitle')).toBeInTheDocument();
    await tick(AUCTION_TRAINING_STUDY_MS + CLUE_REVEAL_INTERVAL_MS * 4);
    expect(screen.queryByText('auctionGame.bidAmount')).toBeNull();
    gotIt();
    expect(tooltip('training.tipAuctionStartingPriceTitle')).toBeInTheDocument();
    gotIt();
    await tick(CLUE_REVEAL_INTERVAL_MS * 2 + AUCTION_TRAINING_STUDY_MS);
    expect(tooltip('training.tipAuctionYourTurnTitle')).toBeInTheDocument();
    // The guided bid is refused while the explanation is up, accepted after it.
    act(() => { fireEvent.click(screen.getByText('auctionGame.bidAmount')); });
    expect(screen.queryByText('auctionGame.yourBid')).toBeNull();
    gotIt();
    act(() => { fireEvent.click(screen.getByText('auctionGame.bidAmount')); });
    await tick(AUCTION_TRAINING_BOT_THINK_MS * 2);
    expect(screen.queryByText('auctionGame.bidAmount')).toBeNull();
    await tick(AUCTION_TRAINING_REVEAL_BEAT_MS);
    // jsdom finishes the phase crossfade late; the reveal's own stage timers start after it.
    await tick(2_000);
    expect(screen.getByText('auctionGame.nextRound')).toBeInTheDocument();
    expect(tooltip('training.tipAuctionWonTitle')).toBeInTheDocument();
    gotIt();
    act(() => { fireEvent.click(screen.getByText('auctionGame.nextRound')); });
    await tick(1_000);
    expect(screen.getByTestId('auction-round-intro')).toBeInTheDocument();
    // Escape skips: completion stored, analytics sent, caller regains control.
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('training_skipped', { game: 'auction', stage: 'clue-reveal' });
    expect(JSON.parse(localStorage.getItem('quizball_training_auction_complete') ?? 'null')).toEqual({ 'user-1': true });
  });

  it('labels the guest seat and marks the guest slot on skip', () => {
    useAuthStore.setState({ status: 'unauthenticated', user: null } as never);
    const onComplete = vi.fn();
    render(<AuctionTrainingScreen onComplete={onComplete} variant="guest" />);
    expect(trackEvent).toHaveBeenCalledWith('training_started', { game: 'auction', access: 'guest' });
    act(() => { fireEvent.click(screen.getByText('training.skipTraining')); });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('quizball_training_auction_complete') ?? 'null')).toEqual({ guest: true });
  });
});
