import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translate, type MessageKey } from '@/lib/i18n/messages';
import type { WlRewardReceipt } from '../rewards/wlRewards';

const api = vi.hoisted(() => ({
  getMyWlRewards: vi.fn(),
  ackWlReward: vi.fn(),
  getMyEventAwards: vi.fn(),
  updateMe: vi.fn(),
}));
vi.mock('@/lib/repositories/wlRewards.repo', () => ({ getMyWlRewards: api.getMyWlRewards, ackWlReward: api.ackWlReward }));
vi.mock('@/lib/repositories/eventAwards.repo', () => ({ getMyEventAwards: api.getMyEventAwards }));
vi.mock('@/lib/api/endpoints', () => ({ updateMe: api.updateMe }));
vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: 'en',
    t: (key: MessageKey, params?: Record<string, string | number>) => translate('en', key, params),
  }),
}));
vi.mock('@/lib/sounds/useGameSounds', () => ({ useGameSounds: () => ({ playSfx: vi.fn() }) }));

interface TestUser { id: string; level?: number; avatar_customization: Record<string, string> | null; avatar_url: string | null }
interface TestAuthState {
  status: 'authenticated' | 'anonymous';
  user: TestUser | null;
  setAuthenticated: (user: TestUser) => void;
}
vi.mock('@/stores/auth.store', async () => {
  const { create } = await import('zustand');
  return {
    useAuthStore: create<TestAuthState>((set) => ({
      status: 'authenticated',
      user: null,
      setAuthenticated: (user) => set({ user, status: 'authenticated' }),
    })),
  };
});

import { useAuthStore } from '@/stores/auth.store';
import { rewardSession } from '../rewards/rewardSession';
import { WlFinalRewards } from '../rewards/WlFinalRewards';
import { WlRewardCeremonyHost } from '../rewards/WlRewardCeremonyHost';

const auth = useAuthStore as unknown as {
  getState: () => TestAuthState;
  setState: (partial: Partial<TestAuthState>) => void;
};
const ALICE: TestUser = { id: 'alice', level: 1, avatar_customization: { hair: 'hair_boy_basic' }, avatar_url: null };

const TOURNAMENT = 't-final';

function coinReward(overrides: Partial<WlRewardReceipt> = {}): WlRewardReceipt {
  return {
    id: 'r-coins', tournamentId: TOURNAMENT, weekKey: '2026-10-03', band: 'participant',
    finalRank: null, coins: 1500, items: [], grantedAt: '2026-10-04T12:00:00Z', seen: false, ...overrides,
  };
}
/** The server's view, per account: acknowledging flips `seen` for every later fetch. */
function serve(byUser: Record<string, WlRewardReceipt[]>) {
  const rewards = { ...byUser };
  api.getMyWlRewards.mockImplementation(async () => rewards[auth.getState().user?.id ?? ''] ?? []);
  api.ackWlReward.mockImplementation(async (id: string) => {
    for (const userId of Object.keys(rewards)) {
      rewards[userId] = rewards[userId].map((reward) => (reward.id === id ? { ...reward, seen: true } : reward));
    }
    return { acknowledged: true };
  });
  return { set: (userId: string, next: WlRewardReceipt[]) => { rewards[userId] = next; } };
}

function mount(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { ...view, client, rerenderUi: (next: React.ReactNode) => view.rerender(<QueryClientProvider client={client}>{next}</QueryClientProvider>) };
}

const dialogs = () => screen.queryAllByRole('dialog');

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  api.getMyEventAwards.mockResolvedValue({ data: [], error: null });
  api.updateMe.mockImplementation(async (body: { avatar_customization: unknown }) => body);
  window.sessionStorage.clear();
  rewardSession.resetForTests();
  auth.setState({ status: 'authenticated', user: { ...ALICE } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

// Clock-faking tests live in their own file: fake timers leave the animation
// library's frame loop stuck for any test that runs after them in the same file.
describe('waiting for a reward that has not been settled yet', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });

  it('keeps checking for a reward the player left the result screen before receiving', async () => {
    const server = serve({ alice: [] });
    rewardSession.expect(TOURNAMENT);
    mount(<WlRewardCeremonyHost />);
    await waitFor(() => expect(api.getMyWlRewards).toHaveBeenCalledTimes(1));
    expect(dialogs()).toHaveLength(0);

    server.set('alice', [coinReward()]);
    await act(async () => { await vi.advanceTimersByTimeAsync(5200); });
    await waitFor(() => expect(dialogs()).toHaveLength(1));
    // The amount counts up on animation frames, which the fake clock drives too.
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    await waitFor(() => expect(screen.getByText('+1,500')).toBeTruthy());
    expect(rewardSession.expected()).toEqual([]);

    const calls = api.getMyWlRewards.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
    expect(api.getMyWlRewards.mock.calls.length).toBe(calls);
  });

  it('does not call the rewards endpoint for a signed-out visitor, even with a receipt still expected', async () => {
    serve({ alice: [] });
    rewardSession.expect(TOURNAMENT);
    mount(<WlRewardCeremonyHost />);
    await waitFor(() => expect(api.getMyWlRewards).toHaveBeenCalledTimes(1));

    act(() => auth.setState({ status: 'anonymous', user: null }));
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(api.getMyWlRewards).toHaveBeenCalledTimes(1);
  });

  it('stops polling and forgets the expectation once it has waited long enough', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    serve({ alice: [] });
    rewardSession.expect(TOURNAMENT);
    mount(<WlRewardCeremonyHost />);
    await waitFor(() => expect(api.getMyWlRewards).toHaveBeenCalledTimes(1));

    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60_000 + 6000); });
    // The 5-second poll itself is cancelled, not merely made harmless.
    const pollIds = setIntervalSpy.mock.results
      .filter((_result, i) => setIntervalSpy.mock.calls[i][1] === 5000)
      .map((result) => result.value);
    expect(pollIds.length).toBeGreaterThan(0);
    for (const id of pollIds) expect(clearIntervalSpy).toHaveBeenCalledWith(id);
    expect(rewardSession.expected()).toEqual([]);
    expect(window.sessionStorage.getItem('qb_wl_reward_expecting')).toBe('{}');
    const calls = api.getMyWlRewards.mock.calls.length;
    expect(calls).toBeGreaterThan(10);

    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(api.getMyWlRewards.mock.calls.length).toBe(calls);
  });

  it('does not poll at all when no tournament is owed a receipt', async () => {
    serve({ alice: [] });
    mount(<WlRewardCeremonyHost />);
    await waitFor(() => expect(api.getMyWlRewards).toHaveBeenCalledTimes(1));
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(api.getMyWlRewards).toHaveBeenCalledTimes(1);
  });

  it('waits while settlement runs, shows the reward when it lands, and stops polling', async () => {
    const server = serve({ alice: [] });
    mount(<WlFinalRewards tournamentId={TOURNAMENT} />);
    await waitFor(() => expect(screen.getByText('Working out your rewards…')).toBeTruthy());
    expect(rewardSession.expected()).toEqual([TOURNAMENT]);

    server.set('alice', [coinReward()]);
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    await waitFor(() => expect(screen.getByText('+1,500')).toBeTruthy());
    expect(rewardSession.expected()).toEqual([]);

    const calls = api.getMyWlRewards.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(api.getMyWlRewards.mock.calls.length).toBe(calls);
  });

  it('stops promising a reward here when none arrives, but leaves the app-wide reveal watching for it', async () => {
    serve({ alice: [] });
    const view = mount(<WlFinalRewards tournamentId={TOURNAMENT} />);
    await waitFor(() => expect(screen.getByText('Working out your rewards…')).toBeTruthy());
    await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
    expect(view.container.textContent).toBe('');
    const calls = api.getMyWlRewards.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(api.getMyWlRewards.mock.calls.length).toBe(calls);
    expect(rewardSession.expected()).toEqual([TOURNAMENT]);
  });
});
