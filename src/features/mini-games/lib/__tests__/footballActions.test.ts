import { describe, expect, it } from 'vitest';
import { FOOTBALL_STYLES, footballStyleForPlayer } from '../footballActions';

describe('player animation assignments', () => {
  it('reserves Ronaldo’s wide stance and jump-turn for Ronaldo', () => {
    for (const id of ['messi', 'beckham', 'carlos', 'ronaldinho', 'neymar', 'zidane', 'juninho', 'mbappe', 'kvara', 'new-player']) {
      const profile = FOOTBALL_STYLES[footballStyleForPlayer(id)];
      expect(profile.stance).not.toBe('stance_power');
      expect(profile.celebration).not.toBe('celebrate_siu');
    }
    expect(footballStyleForPlayer('ronaldo')).toBe('power');
  });
  it('assigns Carlos his own angled stance and left-foot power contact', () => {
    const profile = FOOTBALL_STYLES[footballStyleForPlayer('carlos')];
    expect(profile.stance).toBe('stance_carlos');
    expect(profile.shot).toBe('strike_left_power');
    expect(profile.foot).toBe('l');
  });
  it('uses neutral defaults instead of another player’s signature celebration', () => {
    for (const id of ['zidane', 'kvara', 'new-player']) expect(footballStyleForPlayer(id)).toBe('neutral');
    expect(FOOTBALL_STYLES[footballStyleForPlayer('mbappe')].celebration).toBe('celebrate_fold');
  });
});
