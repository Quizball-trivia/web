import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useRealtimeMatchStore } from '@/stores/realtimeMatch.store';
import { BarBattleOverlay } from '../BarBattleOverlay';

describe('BarBattleOverlay', () => {
  afterEach(() => {
    useRealtimeMatchStore.setState({ match: null });
  });

  it('places zero-point flight targets in the avatar bar lane instead of the avatar center', () => {
    useRealtimeMatchStore.setState({ match: { variant: 'ranked_sim' } as never });

    render(
      <svg>
        <BarBattleOverlay
          battle={{
            key: 1,
            phase: 'both-score',
            playerBars: 10,
            opponentBars: 0,
            playerPoints: 100,
            opponentPoints: 0,
            remainingDelta: 10,
            dividerX: 250,
          }}
          mirrored={false}
          playerAvatarX={200}
          opponentAvatarX={300}
          isPortrait
        />
      </svg>
    );

    const opponentTarget = screen.getByTestId('bar-target-opponent');
    expect(opponentTarget).toHaveAttribute('cx', '363');
  });

  it('places second-half portrait opponent bars behind the opponent instead of toward the player', () => {
    useRealtimeMatchStore.setState({ match: { variant: 'ranked_sim' } as never });

    render(
      <svg>
        <BarBattleOverlay
          battle={{
            key: 3,
            phase: 'bars',
            playerBars: 0,
            opponentBars: 9,
            playerPoints: 0,
            opponentPoints: 90,
            remainingDelta: -9,
            dividerX: 250,
          }}
          mirrored
          playerAvatarX={300}
          opponentAvatarX={200}
          isPortrait
        />
      </svg>
    );

    const opponentTarget = screen.getByTestId('bar-target-opponent');
    expect(opponentTarget).toHaveAttribute('cx', '147');
  });

  it('repeats compact stack cancel hits for each represented bar', () => {
    useRealtimeMatchStore.setState({ match: { variant: 'ranked_sim' } as never });

    render(
      <svg>
        <BarBattleOverlay
          battle={{
            key: 2,
            phase: 'battle',
            playerBars: 4,
            opponentBars: 4,
            playerPoints: 40,
            opponentPoints: 40,
            remainingDelta: 0,
            dividerX: 250,
          }}
          mirrored={false}
          playerAvatarX={100}
          opponentAvatarX={360}
          isPortrait
        />
      </svg>
    );

    expect(screen.getAllByTestId('stack-cancel-hit')).toHaveLength(4);
  });
});
