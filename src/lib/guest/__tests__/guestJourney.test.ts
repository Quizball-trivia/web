import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getGuestToken: vi.fn(), peekGuestToken: vi.fn(), retireGuestToken: vi.fn(), access: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/guest/guestSession', () => ({ getGuestToken: mocks.getGuestToken, peekGuestToken: mocks.peekGuestToken, retireGuestToken: mocks.retireGuestToken }));
vi.mock('@/lib/auth/supabase', () => ({ getSupabaseAccessToken: mocks.access }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks(); sessionStorage.clear(); vi.stubGlobal('fetch', mocks.fetch);
  mocks.getGuestToken.mockResolvedValue('a'.repeat(64)); mocks.peekGuestToken.mockReturnValue('a'.repeat(64));
  mocks.access.mockResolvedValue('verified-member-token'); mocks.fetch.mockResolvedValue({ ok: true, status: 204 });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('guest conversion client', () => {
  it('deduplicates repeated sign-in notifications and stops after eight transient failures', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockResolvedValue({ ok: false, status: 503 });
    const { linkGuestJourney, flushGuestJourney } = await import('../guestJourney');
    linkGuestJourney('member-1'); linkGuestJourney('member-1');
    await flushGuestJourney();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    for (let attempt = 0; attempt < 12; attempt++) {
      linkGuestJourney('member-1');
      await vi.advanceTimersByTimeAsync(15_000);
      await flushGuestJourney();
    }
    expect(mocks.fetch).toHaveBeenCalledTimes(8);
    expect(mocks.retireGuestToken).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not retry terminal authorization failures', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockResolvedValue({ ok: false, status: 401 });
    const { linkGuestJourney, flushGuestJourney } = await import('../guestJourney');
    linkGuestJourney('member-1'); await flushGuestJourney();
    await vi.advanceTimersByTimeAsync(60_000);
    linkGuestJourney('member-1'); await flushGuestJourney();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.retireGuestToken).not.toHaveBeenCalled();
  });
  it('cancels a scheduled link retry on logout', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockRejectedValue(new Error('offline'));
    const { linkGuestJourney, resetGuestJourneyMember, flushGuestJourney } = await import('../guestJourney');
    linkGuestJourney('member-1'); await flushGuestJourney();
    resetGuestJourneyMember();
    await vi.advanceTimersByTimeAsync(60_000); await flushGuestJourney();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('covers each game start family without mistaking views for play', async () => {
    const { journeyStep } = await import('../guestJourney');
    for (const event of ['game_start','match_started','daily_challenge_started','mini_game_round_started','road_to_goal_run_started','ggt_session_started','quiz_start','training_started','party_quiz_started']) {
      expect(journeyStep(event, {}, 'guest')?.step).toBe('play_started');
    }
    expect(journeyStep('game_view', {}, 'guest')).toBeNull();
    expect(journeyStep('auth_started', { auth_mode: 'login' }, 'guest')).toBeNull();
    expect(journeyStep('auth_started', { auth_mode: 'signup' }, 'guest')?.step).toBe('signup_started');
  });
  it('persists play before linking and retires the old token only after acknowledgement', async () => {
    const { recordGuestJourney, linkGuestJourney, flushGuestJourney } = await import('../guestJourney');
    recordGuestJourney('game_start', { mode_id: 'ticTacToe' }, 'guest');
    linkGuestJourney('member-1'); await flushGuestJourney();
    expect(mocks.fetch.mock.calls.map(c => String(c[0]).split('/').pop())).toEqual(['activity', 'link']);
    expect(mocks.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer verified-member-token');
    expect(mocks.retireGuestToken).toHaveBeenCalledWith('a'.repeat(64));
    expect(sessionStorage.getItem('qb_guest_journey_pending_v1')).toBe('[]');
  });
  it('retries offline activity with the same event id', async () => {
    vi.useFakeTimers();
    mocks.fetch.mockRejectedValueOnce(new Error('offline'));
    const { recordGuestJourney, flushGuestJourney } = await import('../guestJourney');
    recordGuestJourney('game_start', { mode_id: 'ranked' }, 'guest'); await flushGuestJourney();
    expect(JSON.parse(mocks.fetch.mock.calls[0][1].body).event_id).toBe(JSON.parse(mocks.fetch.mock.calls[1][1].body).event_id);
  });
  it('does not invent guest visits for member play or normal signup', async () => {
    mocks.peekGuestToken.mockReturnValue(null);
    const { recordGuestJourney, linkGuestJourney, flushGuestJourney } = await import('../guestJourney');
    recordGuestJourney('auth_started', { auth_mode: 'signup' }, 'guest');
    linkGuestJourney('member-1'); recordGuestJourney('match_started', { mode: 'ranked' }, 'member'); await flushGuestJourney();
    expect(mocks.getGuestToken).not.toHaveBeenCalled();
    expect(mocks.fetch.mock.calls.map(c => String(c[0]).split('/').pop())).toEqual(['member-activity']);
  });
  it('still sends guest play when browser storage is unavailable', async () => {
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage blocked'); });
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage blocked'); });
    const { recordGuestJourney, flushGuestJourney } = await import('../guestJourney');
    recordGuestJourney('game_start', { mode_id: 'ranked' }, 'guest'); await flushGuestJourney();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    set.mockRestore(); get.mockRestore();
  });
  it('cancels queued member work after logout' , async () => {
    const { recordGuestJourney, linkGuestJourney, resetGuestJourneyMember, flushGuestJourney } = await import('../guestJourney');
    linkGuestJourney('member-1'); recordGuestJourney('match_started', {}, 'member'); resetGuestJourneyMember(); await flushGuestJourney();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
