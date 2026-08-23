import { describe, expect, it } from 'vitest';
import { resolveDailyWeekendLeagueCta } from '../dailyWeekendLeagueCta';

describe('Daily completion Weekend League CTA', () => {
  it('sends an under-target player to the real Ranked confirmation flow', () => {
    expect(resolveDailyWeekendLeagueCta({
      points: 120,
      target: 200,
      qualified: false,
      entered: false,
      tournamentStatus: 'entry_open',
    })).toEqual({
      state: 'qualifying',
      action: 'play_ranked',
      currentQp: 120,
      targetQp: 200,
      nextPath: '/play?mode=ranked&source=daily-weekend-league',
    });
  });

  it('opens the League entry screen for a qualified player during entry', () => {
    expect(resolveDailyWeekendLeagueCta({
      points: 200,
      target: 200,
      qualified: true,
      entered: false,
      tournamentStatus: 'entry_open',
    }).action).toBe('join_league');
  });

  it('never promises entry when the window is closed', () => {
    expect(resolveDailyWeekendLeagueCta({
      points: 200,
      target: 200,
      qualified: true,
      entered: false,
      tournamentStatus: 'entry_closed',
    }).action).toBe('view_league');
  });

  it('shows the League view action after entry', () => {
    const decision = resolveDailyWeekendLeagueCta({
      points: 200,
      target: 200,
      qualified: true,
      entered: true,
      tournamentStatus: 'entry_open',
    });

    expect(decision.state).toBe('entered');
    expect(decision.action).toBe('view_league');
  });
});
