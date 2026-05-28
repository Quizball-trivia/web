import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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

describe('BarBattleOverlay — anchored layout (variant="ranked_sim")', () => {
  it('places zero-point flight targets in the avatar bar lane instead of the avatar center', () => {
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

    const opponentTarget = screen.getByTestId('bar-target-opponent');
    expect(opponentTarget).toHaveAttribute('cx', '363');
  });

  it('places second-half portrait opponent bars behind the opponent instead of toward the player', () => {
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
          variant="ranked_sim"
        />
      </svg>,
    );

    const opponentTarget = screen.getByTestId('bar-target-opponent');
    expect(opponentTarget).toHaveAttribute('cx', '147');
  });

  it('repeats compact stack cancel hits for each represented bar', () => {
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
          variant="ranked_sim"
        />
      </svg>,
    );

    expect(screen.getAllByTestId('stack-cancel-hit')).toHaveLength(4);
  });
});

describe('BarBattleOverlay — variant prop resolution', () => {
  it('runs the anchored variant when variant prop is "ranked_sim"', () => {
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
    expect(screen.queryByTestId('bar-target-player')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bar-target-opponent')).not.toBeInTheDocument();
  });

  it('runs the classic variant when variant prop is omitted (no implicit store fallback)', () => {
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
    // Without the variant prop the overlay must NOT enter anchored mode
    // (the previous in-component store read would have done so).
    expect(screen.queryByTestId('bar-target-player')).not.toBeInTheDocument();
  });
});

describe('BarBattleOverlay — edge cases', () => {
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
    const texts = Array.from(container.querySelectorAll('text')).map((t) => t.textContent ?? '');
    expect(texts.some((t) => t.includes('+70'))).toBe(true);
  });

  it('falls back to no anchored mode if avatar X positions are missing (variant ranked_sim, no avatars)', () => {
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
