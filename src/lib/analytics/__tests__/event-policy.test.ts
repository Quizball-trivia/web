import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decideAnalyticsSend, resetAnalyticsPolicyForTests, ROUND_EVENT_SAMPLE_RATE } from '../event-policy';

const id = (value: string) => () => value;

describe('decideAnalyticsSend', () => {
  beforeEach(() => {
    resetAnalyticsPolicyForTests();
    window.localStorage.clear();
  });

  it('drops disabled events and keeps events that have readers', () => {
    for (const event of ['draft_ui_ready', 'game_exit', 'play_card_clicked', 'football_grid_viewed']) {
      expect(decideAnalyticsSend(event, id('u1')).send).toBe(false);
    }
    for (const event of ['game_start', 'game_complete', 'guest_play_completed', 'wl_tab_viewed', 'socket_connection_failed', '$pageview']) {
      expect(decideAnalyticsSend(event, id('u1')).send).toBe(true);
    }
  });

  it('samples round events by player: stable per id, about 10% of ids, tagged with the rate', () => {
    const ids = Array.from({ length: 5000 }, (_, i) => `player-${i}`);
    const kept = ids.filter((d) => decideAnalyticsSend('buscaminas_round_end', id(d)).send);
    expect(kept.length / ids.length).toBeGreaterThan(0.08);
    expect(kept.length / ids.length).toBeLessThan(0.12);
    for (const d of kept.slice(0, 20)) {
      expect(decideAnalyticsSend('grid_turn_submitted', id(d))).toEqual({ send: true, extraProperties: { sample_rate: ROUND_EVENT_SAMPLE_RATE } });
    }
    const dropped = ids.find((d) => !kept.includes(d))!;
    expect(decideAnalyticsSend('minuto_round_end', id(dropped)).send).toBe(false);
    expect(decideAnalyticsSend('pistas_round_end', id('')).send).toBe(false);
  });

  it('samples two-player grid turns by match so both players stay together', () => {
    const matches = Array.from({ length: 400 }, (_, i) => `match-${i}`);
    const keptMatch = matches.find((m) => decideAnalyticsSend('grid_turn_submitted', id('x'), 0, { match_id: m }).send)!;
    const droppedMatch = matches.find((m) => !decideAnalyticsSend('grid_turn_submitted', id('x'), 0, { match_id: m }).send)!;
    for (let i = 0; i < 50; i += 1) {
      expect(decideAnalyticsSend('grid_turn_submitted', id(`player-${i}`), 0, { match_id: keptMatch }).send).toBe(true);
      expect(decideAnalyticsSend('grid_turn_submitted', id(`player-${i}`), 0, { match_id: droppedMatch }).send).toBe(false);
    }
  });

  it('sends the Weekend League banner view once per local day, marked as a daily count', () => {
    const day1 = new Date(2026, 9, 23, 9).getTime();
    expect(decideAnalyticsSend('wl_banner_viewed', id('u1'), day1)).toEqual({ send: true, extraProperties: { count_basis: 'browser_day' } });
    expect(decideAnalyticsSend('wl_banner_viewed', id('u1'), day1 + 60_000).send).toBe(false);
    expect(decideAnalyticsSend('wl_banner_viewed', id('u1'), new Date(2026, 9, 24, 0, 5).getTime()).send).toBe(true);
  });

  it('dedupes the banner view when storage throws, and keeps deduping once storage recovers', () => {
    const now = new Date(2026, 9, 23, 9).getTime();
    const realStorage = window.localStorage;
    const getItem = vi.fn(() => { throw new Error('blocked'); });
    const setItem = vi.fn(() => { throw new Error('quota'); });
    Object.defineProperty(window, 'localStorage', { configurable: true, value: { getItem, setItem } });
    try {
      expect(decideAnalyticsSend('wl_banner_viewed', id('u1'), now).send).toBe(true);
      expect(getItem).toHaveBeenCalled();
      expect(setItem).toHaveBeenCalled();
      expect(decideAnalyticsSend('wl_banner_viewed', id('u1'), now + 1000).send).toBe(false);
    } finally {
      Object.defineProperty(window, 'localStorage', { configurable: true, value: realStorage });
    }
    expect(decideAnalyticsSend('wl_banner_viewed', id('u1'), now + 2000).send).toBe(false);
  });

  it('honours a banner view already recorded by another tab today', () => {
    const now = new Date(2026, 9, 23, 9).getTime();
    expect(decideAnalyticsSend('wl_banner_viewed', id('u1'), now).send).toBe(true);
    resetAnalyticsPolicyForTests();
    expect(decideAnalyticsSend('wl_banner_viewed', id('u1'), now + 1000).send).toBe(false);
  });

  it('sends socket reconnects unthrottled (a saved insight counts every reconnect)', () => {
    const sent = Array.from({ length: 8 }, (_, i) => decideAnalyticsSend('socket_reconnected', id('u1'), 1_000_000 + i).send);
    expect(sent.every(Boolean)).toBe(true);
  });
});
