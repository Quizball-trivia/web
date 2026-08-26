import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuctionGameState, AuctionRound } from '../../types';
import { useAuctionAudio } from '../useAuctionAudio';

const audio = vi.hoisted(() => ({
  playBgm: vi.fn(),
  playSfx: vi.fn(),
  stopBgm: vi.fn(),
}));

const preferences = vi.hoisted(() => ({
  soundEnabled: true,
  musicEnabled: true,
}));

vi.mock('@/lib/sounds/useGameSounds', () => ({
  useGameSounds: () => ({
    ...audio,
    isMuted: () => false,
    setBgmVolume: vi.fn(),
    toggleMute: vi.fn(),
  }),
}));

vi.mock('@/lib/preferences/userPreferences', () => ({
  useUserPreferences: () => ({
    ...preferences,
    invitesEnabled: true,
    questAlertsEnabled: true,
    pingIndicatorEnabled: false,
  }),
}));

function round(overrides: Partial<AuctionRound> = {}): AuctionRound {
  return {
    positionGroup: 'MID',
    footballer: {
      id: 'footballer-1',
      name: 'Hidden',
      positionGroup: 'MID',
      value: 50,
      startingPrice: 30,
      clues: [],
      nationality: 'Georgia',
    },
    clues: ['one', 'two', 'three'],
    clueRevealIndex: 0,
    bids: [],
    highestBidderId: null,
    highestBid: 30,
    startingPrice: 30,
    winnerId: null,
    winningBid: 0,
    revealed: false,
    countdownEndsAt: null,
    turnOrder: ['human', 'rival'],
    currentTurnId: 'human',
    foldedIds: [],
    turnEndsAt: null,
    biddingStartsAt: null,
    ...overrides,
  };
}

function gameState(overrides: Partial<AuctionGameState> = {}): AuctionGameState {
  return {
    phase: 'bidding',
    players: [],
    formation: { name: '2-2-2', required: { GK: 1, DEF: 2, MID: 2, FWD: 2 }, rows: [] },
    currentRound: round(),
    roundIndex: 1,
    totalRounds: 7,
    completedRounds: [],
    soloPick: null,
    ...overrides,
  };
}

describe('useAuctionAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    preferences.soundEnabled = true;
    preferences.musicEnabled = true;
  });

  it('starts the ranked stadium loop once the Auction match is active', () => {
    const state = gameState();

    const { unmount } = renderHook(() => useAuctionAudio({ state, humanPlayerId: 'human' }));

    expect(audio.playBgm).toHaveBeenCalledWith('auction');
    unmount();
    expect(audio.stopBgm).toHaveBeenCalledWith(400);
  });

  it('plays one short cue for stat, bid and fold state changes', () => {
    const first = gameState();
    const { rerender } = renderHook(
      ({ state }) => useAuctionAudio({ state, humanPlayerId: 'human' }),
      { initialProps: { state: first } },
    );

    rerender({ state: gameState({ currentRound: round({ clueRevealIndex: 1 }) }) });
    expect(audio.playSfx).toHaveBeenLastCalledWith('auctionClue');

    rerender({
      state: gameState({
        currentRound: round({
          clueRevealIndex: 1,
          bids: [{ playerId: 'human', amount: 35 }],
          highestBid: 35,
          highestBidderId: 'human',
        }),
      }),
    });
    expect(audio.playSfx).toHaveBeenLastCalledWith('auctionBid');

    rerender({
      state: gameState({
        currentRound: round({
          clueRevealIndex: 1,
          bids: [{ playerId: 'human', amount: 35 }],
          highestBid: 35,
          highestBidderId: 'human',
          foldedIds: ['rival'],
        }),
      }),
    });
    expect(audio.playSfx).toHaveBeenLastCalledWith('auctionFold');
  });

  it('uses the winning sting on a human lot win and stops music for results', () => {
    const first = gameState();
    const { rerender } = renderHook(
      ({ state }) => useAuctionAudio({ state, humanPlayerId: 'human' }),
      { initialProps: { state: first } },
    );

    rerender({
      state: gameState({
        phase: 'reveal',
        currentRound: round({ winnerId: 'human', revealed: true }),
      }),
    });
    expect(audio.playSfx).toHaveBeenLastCalledWith('auctionWon');

    rerender({ state: gameState({ phase: 'results' }) });
    expect(audio.playSfx).toHaveBeenLastCalledWith('auctionFinished');
    expect(audio.stopBgm).toHaveBeenCalledWith(400);
  });

  it('uses the sold bell for another bidder and the countdown for a solo decision', () => {
    const first = gameState();
    const { rerender } = renderHook(
      ({ state }) => useAuctionAudio({ state, humanPlayerId: 'human' }),
      { initialProps: { state: first } },
    );

    rerender({
      state: gameState({
        phase: 'reveal',
        currentRound: round({ winnerId: 'rival', revealed: true }),
      }),
    });
    expect(audio.playSfx).toHaveBeenLastCalledWith('auctionReveal');

    rerender({ state: gameState({ phase: 'solo-pick' }) });
    expect(audio.playSfx).toHaveBeenLastCalledWith('auctionWarning');
  });

  it('honours the separate sound and music preferences', () => {
    preferences.soundEnabled = false;
    preferences.musicEnabled = false;
    const first = gameState();
    const { rerender } = renderHook(
      ({ state }) => useAuctionAudio({ state, humanPlayerId: 'human' }),
      { initialProps: { state: first } },
    );

    rerender({ state: gameState({ currentRound: round({ clueRevealIndex: 1 }) }) });

    expect(audio.playBgm).not.toHaveBeenCalled();
    expect(audio.playSfx).not.toHaveBeenCalled();
    expect(audio.stopBgm).toHaveBeenCalledWith(400);
  });
});
