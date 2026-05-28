import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { BarBattleOverlay, type BarBattleState } from '../BarBattleOverlay';

function rankedBattle(overrides: Partial<BarBattleState> = {}): BarBattleState {
  return {
    key: 1,
    phase: 'both-score',
    playerBars: 10,
    opponentBars: 0,
    playerPoints: 100,
    opponentPoints: 0,
    remainingDelta: 10,
    dividerX: 250,
    ...overrides,
  };
}

describe('BarBattleOverlay — store-fallback variant resolution (existing behavior)', () => {
  afterEach(() => {
    useRealtimeMatchStore.setState({ match: null });
  });

  it('places zero-point flight targets in the avatar bar lane instead of the avatar center', () => {
    useRealtimeMatchStore.setState({ match: { variant: 'ranked_sim' } as never });

    render(
      <svg>
        <BarBattleOverlay
          battle={rankedBattle()}
          mirrored={false}
          playerAvatarX={200}
          opponentAvatarX={300}
          isPortrait
        />
      </svg>,
    );

    const opponentTarget = screen.getByTestId('bar-target-opponent');
    expect(opponentTarget).toHaveAttribute('cx', '363');
  });

  it('places second-half portrait opponent bars behind the opponent instead of toward the player', () => {
    useRealtimeMatchStore.setState({ match: { variant: 'ranked_sim' } as never });

    render(
      <svg>
        <BarBattleOverlay
          battle={rankedBattle({
            key: 3,
            phase: 'bars',
            playerBars: 0,
            opponentBars: 9,
            playerPoints: 0,
            opponentPoints: 90,
            remainingDelta: -9,
          })}
          mirrored
          playerAvatarX={300}
          opponentAvatarX={200}
          isPortrait
        />
      </svg>,
    );

    const opponentTarget = screen.getByTestId('bar-target-opponent');
    expect(opponentTarget).toHaveAttribute('cx', '147');
  });

  it('repeats compact stack cancel hits for each represented bar', () => {
    useRealtimeMatchStore.setState({ match: { variant: 'ranked_sim' } as never });

    render(
      <svg>
        <BarBattleOverlay
          battle={rankedBattle({
            key: 2,
            phase: 'battle',
            playerBars: 4,
            opponentBars: 4,
            playerPoints: 40,
            opponentPoints: 40,
            remainingDelta: 0,
          })}
          mirrored={false}
          playerAvatarX={100}
          opponentAvatarX={360}
          isPortrait
        />
      </svg>,
    );

    expect(screen.getAllByTestId('stack-cancel-hit')).toHaveLength(4);
  });
});

describe('BarBattleOverlay — prop-driven variant resolution', () => {
  afterEach(() => {
    useRealtimeMatchStore.setState({ match: null });
  });

  it('runs the anchored variant when variant prop is "ranked_sim" without any store state', () => {
    render(
      <svg>
        <BarBattleOverlay
          battle={rankedBattle()}
          mirrored={false}
          playerAvatarX={200}
          opponentAvatarX={300}
          isPortrait
          variant="ranked_sim"
        />
      </svg>,
    );

    // The anchored variant renders the two `bar-target-*` flight anchors. The
    // classic variant skips them.
    expect(screen.getByTestId('bar-target-player')).toBeInTheDocument();
    expect(screen.getByTestId('bar-target-opponent')).toBeInTheDocument();
  });

  it('resolves to the same anchored target whether variant comes from the store or the prop', () => {
    // Store-seeded baseline
    useRealtimeMatchStore.setState({ match: { variant: 'ranked_sim' } as never });
    const { container: storeContainer, unmount } = render(
      <svg>
        <BarBattleOverlay
          battle={rankedBattle()}
          mirrored={false}
          playerAvatarX={200}
          opponentAvatarX={300}
          isPortrait
        />
      </svg>,
    );
    const storeCx = storeContainer
      .querySelector('[data-testid="bar-target-opponent"]')
      ?.getAttribute('cx');
    unmount();
    useRealtimeMatchStore.setState({ match: null });

    // Prop-driven repeat
    render(
      <svg>
        <BarBattleOverlay
          battle={rankedBattle()}
          mirrored={false}
          playerAvatarX={200}
          opponentAvatarX={300}
          isPortrait
          variant="ranked_sim"
        />
      </svg>,
    );
    expect(screen.getByTestId('bar-target-opponent')).toHaveAttribute('cx', storeCx ?? '');
  });

  it('runs the classic (non-anchored) variant when variant prop is "friendly_possession"', () => {
    render(
      <svg>
        <BarBattleOverlay
          battle={rankedBattle()}
          mirrored={false}
          playerAvatarX={200}
          opponentAvatarX={300}
          isPortrait
          variant="friendly_possession"
        />
      </svg>,
    );
    // Classic mode does NOT render the flight target anchors.
    expect(screen.queryByTestId('bar-target-player')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bar-target-opponent')).not.toBeInTheDocument();
  });

  it('takes the explicit variant prop over the store value when both are set', () => {
    useRealtimeMatchStore.setState({ match: { variant: 'friendly_possession' } as never });
    render(
      <svg>
        <BarBattleOverlay
          battle={rankedBattle()}
          mirrored={false}
          playerAvatarX={200}
          opponentAvatarX={300}
          isPortrait
          variant="ranked_sim"
        />
      </svg>,
    );
    // Anchored = ranked_sim wins.
    expect(screen.getByTestId('bar-target-player')).toBeInTheDocument();
  });
});

describe('BarBattleOverlay — edge cases', () => {
  afterEach(() => {
    useRealtimeMatchStore.setState({ match: null });
  });

  it('renders nothing when the phase is "done"', () => {
    const { container } = render(
      <svg>
        <BarBattleOverlay
          battle={rankedBattle({ phase: 'done' })}
          mirrored={false}
          variant="ranked_sim"
          playerAvatarX={200}
          opponentAvatarX={300}
        />
      </svg>,
    );
    // The overlay short-circuits to null. The wrapping <svg> stays, but no
    // bar-battle <g> contents land inside it.
    expect(container.querySelector('[data-testid="bar-target-player"]')).toBeNull();
    expect(container.querySelector('linearGradient')).toBeNull();
  });

  it('does not crash with both playerBars=0 and opponentBars=0', () => {
    expect(() =>
      render(
        <svg>
          <BarBattleOverlay
            battle={rankedBattle({
              phase: 'bars',
              playerBars: 0,
              opponentBars: 0,
              playerPoints: 0,
              opponentPoints: 0,
              remainingDelta: 0,
            })}
            mirrored={false}
            variant="ranked_sim"
            playerAvatarX={200}
            opponentAvatarX={300}
          />
        </svg>,
      ),
    ).not.toThrow();
  });

  it('handles one-sided opponent score without throwing (player bars = 0)', () => {
    expect(() =>
      render(
        <svg>
          <BarBattleOverlay
            battle={rankedBattle({
              phase: 'opponent-score',
              playerBars: 0,
              opponentBars: 0,
              playerPoints: 0,
              opponentPoints: 60,
              remainingDelta: -6,
            })}
            mirrored={false}
            variant="ranked_sim"
            playerAvatarX={200}
            opponentAvatarX={300}
          />
        </svg>,
      ),
    ).not.toThrow();
  });

  it('renders the classic ScoreText splash in friendly_possession variant', () => {
    const { container } = render(
      <svg>
        <BarBattleOverlay
          battle={rankedBattle({
            phase: 'player-score',
            playerBars: 0,
            playerPoints: 70,
            opponentPoints: 0,
            opponentBars: 0,
            remainingDelta: 0,
          })}
          mirrored={false}
          variant="friendly_possession"
        />
      </svg>,
    );
    // Classic splash uses an SVG text node with the "+N" content.
    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent ?? '');
    expect(texts.some((t) => t.includes('+70'))).toBe(true);
  });

  it('falls back to no anchored mode if avatar X positions are missing (variant ranked_sim, no avatars)', () => {
    // Without avatar X, anchored mode short-circuits and the overlay should
    // still render without the bar-target circles.
    const { container } = render(
      <svg>
        <BarBattleOverlay
          battle={rankedBattle()}
          mirrored={false}
          variant="ranked_sim"
        />
      </svg>,
    );
    expect(container.querySelector('[data-testid="bar-target-player"]')).toBeNull();
  });
});
