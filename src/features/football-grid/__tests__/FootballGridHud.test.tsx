import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FootballGridState } from '@/lib/realtime/socket.types';
import { DrawOfferPrompt, FOOTBALL_GRID_COPY, GridHud, SeriesSplash } from '../FootballGridFlowScreen';

vi.mock('@/components/AvatarDisplay', () => ({ AvatarDisplay: () => <div data-testid="avatar" /> }));
vi.mock('@/features/possession/components/MatchHudPrimitives', () => ({ MatchHudAvatar: () => <div data-testid="avatar" /> }));
vi.mock('@/lib/football-grid/assets', () => ({
  footballGridAssetUrl: (path: string) => path,
  resolveGridAvatarAsset: (key: string) => key,
  FOOTBALL_GRID_CDN_BASE_URL: '',
}));

const copy = FOOTBALL_GRID_COPY.en;
const criterion = (id: string) => ({ id, key: id, family: 'club' as const, labelEn: id, labelKa: id, assetKey: null, difficulty: 'normal' as const });

function turnState(overrides: Partial<FootballGridState> = {}): FootballGridState {
  return {
    matchId: 'm1',
    status: 'active',
    phase: 'turn',
    board: { boardId: 'b1', boardVersion: 1, checksum: 'c', rows: [criterion('r1'), criterion('r2'), criterion('r3')], columns: [criterion('c1'), criterion('c2'), criterion('c3')] },
    players: [
      { userId: 'me', seat: 1, isBot: false, handoffAcknowledged: true, ready: true, noActionTimeouts: 0, pauseBudgetRemainingMs: 60_000, drawOfferLockedUntilTurn: 0 },
      { userId: 'opp', seat: 2, isBot: false, handoffAcknowledged: true, ready: true, noActionTimeouts: 0, pauseBudgetRemainingMs: 60_000, drawOfferLockedUntilTurn: 0 },
    ],
    openerUserId: 'me',
    currentPlayerUserId: 'me',
    winnerUserId: null,
    turnNumber: 3,
    stateVersion: 7,
    claims: [],
    phaseDeadlineAt: null,
    turnDeadlineAt: null,
    turnRemainingMs: 40_000,
    pausedAt: null,
    pausedFromPhase: null,
    reconnectDeadlineAt: null,
    completionReason: null,
    drawOffer: null,
    ...overrides,
  };
}

const series = { seriesId: 's1', format: 'bo3' as const, gameIndex: 2, targetWins: 2, wins: { me: 1, opp: 0 }, draws: 0, winnerUserId: null, finished: false };
const opponent = { id: 'opp', username: 'Rival', avatarUrl: null };

describe('GridHud', () => {
  it('shows the series score, game index, turn pill, clock and both actions on my turn', () => {
    const onSkip = vi.fn();
    const onOfferDraw = vi.fn();
    render(
      <GridHud state={turnState()} series={series} selfUserId="me" selfName="Me" selfCustomization={{ base: 'a' }} opponent={opponent}
        remaining={33_400} isMyTurn copy={copy} pendingCommand={false} myOfferPending={false} onSkip={onSkip} onOfferDraw={onOfferDraw} />,
    );
    expect(screen.getByText('Game 2 of 3')).toBeTruthy();
    expect(screen.getByText('Your turn')).toBeTruthy();
    expect(screen.getByText('34')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Request draw' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onOfferDraw).toHaveBeenCalledTimes(1);
  });

  it("disables Skip on the opponent's turn and shows the pending draw request", () => {
    render(
      <GridHud state={turnState({ currentPlayerUserId: 'opp', drawOffer: { byUserId: 'me', turnNumber: 3, offeredAt: 'x' } })} series={series}
        selfUserId="me" selfName="Me" selfCustomization={{ base: 'a' }} opponent={opponent} remaining={10_000} isMyTurn={false} copy={copy}
        pendingCommand={false} myOfferPending onSkip={vi.fn()} onOfferDraw={vi.fn()} />,
    );
    expect(screen.getByText("Opponent's turn")).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Skip' }) as HTMLButtonElement).disabled).toBe(true);
    const draw = screen.getByRole('button', { name: 'Draw requested…' }) as HTMLButtonElement;
    expect(draw.disabled).toBe(true);
  });

  it('locks Request draw after a declined offer and explains why', () => {
    const state = turnState();
    state.players[0].drawOfferLockedUntilTurn = 7;
    render(
      <GridHud state={state} series={series} selfUserId="me" selfName="Me" selfCustomization={{ base: 'a' }} opponent={opponent}
        remaining={20_000} isMyTurn copy={copy} pendingCommand={false} myOfferPending={false} onSkip={vi.fn()} onOfferDraw={vi.fn()} />,
    );
    expect((screen.getByRole('button', { name: 'Request draw' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Declined — try again in a few turns')).toBeTruthy();
  });
});

describe('DrawOfferPrompt', () => {
  it('routes accept and decline', () => {
    const onRespond = vi.fn();
    render(<DrawOfferPrompt copy={copy} pending={false} onRespond={onRespond} />);
    expect(screen.getByText('Opponent offers a draw')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(onRespond.mock.calls).toEqual([[true], [false]]);
  });
});

describe('SeriesSplash', () => {
  it('announces the next game with the running score and who leads', () => {
    render(
      <SeriesSplash
        result={{ matchId: 'm1', winnerUserId: 'me', completionReason: 'line', series: { ...series, gameIndex: 1 } }}
        selfUserId="me" selfName="Me" selfCustomization={{ base: 'a' }} opponent={opponent} countdownSeconds={4} copy={copy}
      />,
    );
    expect(screen.getByText('Game 2 of 3')).toBeTruthy();
    expect(screen.getByText('You take game 1')).toBeTruthy();
    expect(screen.getByText('You lead')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('uses neutral copy for a dead board', () => {
    render(
      <SeriesSplash
        result={{ matchId: 'm1', winnerUserId: null, completionReason: 'board_dead', series: { ...series, gameIndex: 1, wins: { me: 0, opp: 0 }, draws: 1 } }}
        selfUserId="me" selfName="Me" selfCustomization={{ base: 'a' }} opponent={opponent} countdownSeconds={null} copy={copy}
      />,
    );
    expect(screen.getByText('Game 1 drawn')).toBeTruthy();
    expect(screen.getByText('No line left for either player')).toBeTruthy();
    expect(screen.getByText('All square')).toBeTruthy();
    expect(screen.getByText('Next board coming up…')).toBeTruthy();
  });
});
