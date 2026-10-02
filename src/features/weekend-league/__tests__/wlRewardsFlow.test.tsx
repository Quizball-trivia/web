import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translate, type MessageKey } from '@/lib/i18n/messages';
import type { WlRewardReceipt } from '../rewards/wlRewards';

const api = vi.hoisted(() => ({
  getMyWlRewards: vi.fn(),
  ackWlReward: vi.fn(),
  getMyEventAwards: vi.fn(),
  ackEventAward: vi.fn(),
  updateMe: vi.fn(),
}));
vi.mock('@/lib/repositories/wlRewards.repo', () => ({ getMyWlRewards: api.getMyWlRewards, ackWlReward: api.ackWlReward }));
vi.mock('@/lib/repositories/eventAwards.repo', () => ({ getMyEventAwards: api.getMyEventAwards, ackEventAward: api.ackEventAward }));
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
import { randomBotAvatar } from '@/features/auction/data/botAvatars';
import { rewardSession } from '../rewards/rewardSession';
import { WlFinalRewards } from '../rewards/WlFinalRewards';
import { WlRewardCeremonyHost } from '../rewards/WlRewardCeremonyHost';
import { EventAwardCeremony } from '@/components/shared/EventAwardCeremony';
import { queryKeys } from '@/lib/queries/queryKeys';

const auth = useAuthStore as unknown as {
  getState: () => TestAuthState;
  setState: (partial: Partial<TestAuthState>) => void;
};
const ALICE: TestUser = { id: 'alice', level: 1, avatar_customization: { hair: 'hair_boy_basic' }, avatar_url: null };
const BOB: TestUser = { id: 'bob', level: 1, avatar_customization: null, avatar_url: null };

const TOURNAMENT = 't-final';
const JERSEY = { slug: 'avatar_jersey_wl_retro_home', avatarPartId: 'jersey_wl_retro_home', slot: 'jersey' as const };

function coinReward(overrides: Partial<WlRewardReceipt> = {}): WlRewardReceipt {
  return {
    id: 'r-coins', tournamentId: TOURNAMENT, weekKey: '2026-10-03', band: 'participant',
    finalRank: null, coins: 1500, items: [], grantedAt: '2026-10-04T12:00:00Z', seen: false, ...overrides,
  };
}
const packReward = (overrides: Partial<WlRewardReceipt> = {}) =>
  coinReward({ id: 'r-pack', band: 'winner', finalRank: 1, coins: 40000, items: [JERSEY], ...overrides });

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

/** Wait until every request has landed AND React has rendered the result, so a
 *  "nothing is shown" assertion cannot pass merely because it ran too early. */
async function settle(client: QueryClient) {
  await waitFor(() => expect(client.isFetching() + client.isMutating()).toBe(0), { timeout: 4000 });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
}

const WAIT = { timeout: 4000 };
const dialogs = () => screen.queryAllByRole('dialog');

beforeEach(() => {
  Object.values(api).forEach((mock) => mock.mockReset());
  api.getMyEventAwards.mockResolvedValue({ data: [], error: null });
  api.updateMe.mockImplementation(async (body: { avatar_customization: unknown }) => body);
  window.sessionStorage.clear();
  rewardSession.resetForTests();
  auth.setState({ status: 'authenticated', user: { ...ALICE } });
});
afterEach(() => { cleanup(); });

describe('app-wide reward reveal', () => {
  it('plays an unopened reward once, and acknowledging it stops any replay', async () => {
    serve({ alice: [coinReward()] });
    const first = mount(<WlRewardCeremonyHost />);
    expect(await screen.findByText('+1,500', undefined, WAIT)).toBeTruthy();
    expect(dialogs()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Collect' }));
    await waitFor(() => expect(dialogs()).toHaveLength(0), WAIT);
    await settle(first.client);
    expect(api.ackWlReward).toHaveBeenCalledTimes(1);
    expect(api.ackWlReward).toHaveBeenCalledWith('r-coins');

    // A later visit in a brand-new browser session must stay quiet too.
    first.unmount();
    window.sessionStorage.clear();
    rewardSession.resetForTests();
    const second = mount(<WlRewardCeremonyHost />);
    await settle(second.client);
    expect(api.getMyWlRewards).toHaveBeenCalled();
    expect(dialogs()).toHaveLength(0);
    expect(api.ackWlReward).toHaveBeenCalledTimes(1);
  });

  it('keeps a closed reward closed when the acknowledgement failed, and tells the server again later', async () => {
    serve({ alice: [coinReward()] });
    api.ackWlReward.mockRejectedValue(new Error('offline'));
    const first = mount(<WlRewardCeremonyHost />);
    await screen.findByText('+1,500', undefined, WAIT);
    fireEvent.click(screen.getByRole('button', { name: 'Collect' }));
    await waitFor(() => expect(dialogs()).toHaveLength(0), WAIT);
    await settle(first.client);
    expect(dialogs()).toHaveLength(0);
    expect(api.ackWlReward).toHaveBeenCalledTimes(1);

    // Same tab, new mount (e.g. back from a fullscreen game): the server still
    // says "unseen", yet it must not replay — and the ack is retried.
    first.unmount();
    api.ackWlReward.mockResolvedValue({ acknowledged: true });
    const second = mount(<WlRewardCeremonyHost />);
    await settle(second.client);
    expect(dialogs()).toHaveLength(0);
    expect(api.ackWlReward).toHaveBeenCalledTimes(2);
  });

  it('shows nothing for rewards already seen', async () => {
    serve({ alice: [coinReward({ seen: true })] });
    const view = mount(<WlRewardCeremonyHost />);
    await settle(view.client);
    expect(api.getMyWlRewards).toHaveBeenCalledTimes(1);
    expect(dialogs()).toHaveLength(0);
  });

  it('waits for the podium badge ceremony to leave the screen, not for its server acknowledgement', async () => {
    serve({ alice: [packReward()] });
    // The badge stays "unseen" on the server throughout (its ack failed).
    api.getMyEventAwards.mockResolvedValue({
      data: [{ id: 'badge', eventSlug: 'weekend-league-2026-10-03', place: 1, awardedAt: '', seen: false }], error: null,
    });
    const view = mount(<WlRewardCeremonyHost />);
    await settle(view.client);
    expect(screen.queryByText('Champion pack')).toBeNull();

    // The player closes the badge; its ack fails, so the server still says unseen.
    act(() => rewardSession.noteBadgeDismissed('badge'));
    expect(await screen.findByText('Champion pack', undefined, WAIT)).toBeTruthy();
  });

  it('never shows one account\'s reward to the next account on the same browser', async () => {
    serve({ alice: [packReward()], bob: [] });
    const view = mount(<WlRewardCeremonyHost />);
    expect(await screen.findByText('Champion pack', undefined, WAIT)).toBeTruthy();

    act(() => auth.setState({ status: 'anonymous', user: null }));
    await waitFor(() => expect(dialogs()).toHaveLength(0), WAIT);

    const callsBefore = api.getMyWlRewards.mock.calls.length;
    act(() => auth.setState({ status: 'authenticated', user: { ...BOB } }));
    await settle(view.client);
    expect(api.getMyWlRewards.mock.calls.length).toBe(callsBefore + 1);
    expect(dialogs()).toHaveLength(0);
    expect(api.updateMe).not.toHaveBeenCalled();
  });

  it('keeps re-sending a failed acknowledgement on every fresh fetch until it sticks', async () => {
    serve({ alice: [coinReward()] });
    api.ackWlReward.mockRejectedValue(new Error('offline'));
    const view = mount(<WlRewardCeremonyHost />);
    await screen.findByText('+1,500', undefined, WAIT);
    fireEvent.click(screen.getByRole('button', { name: 'Collect' }));
    await waitFor(() => expect(dialogs()).toHaveLength(0), WAIT);
    await settle(view.client);
    expect(api.ackWlReward).toHaveBeenCalledTimes(1);

    for (const expected of [2, 3]) {
      await act(async () => { await view.client.invalidateQueries({ queryKey: queryKeys.weekendLeague.rewards('alice') }); });
      await settle(view.client);
      expect(api.ackWlReward).toHaveBeenCalledTimes(expected);
      expect(dialogs()).toHaveLength(0);
    }
  });

  it('remembers a reveal closed in another tab, across a reload of this one', async () => {
    serve({ alice: [coinReward()] });
    const view = mount(<WlRewardCeremonyHost />);
    await screen.findByText('+1,500', undefined, WAIT);

    act(() => { rewardSession.receiveDismissal('r-coins'); });
    await waitFor(() => expect(dialogs()).toHaveLength(0), WAIT);
    expect(window.sessionStorage.getItem('qb_wl_reward_dismissed')).toContain('r-coins');

    // Reload: memory is gone, session storage is not, and the server still says unseen.
    view.unmount();
    rewardSession.resetForTests();
    const reloaded = mount(<WlRewardCeremonyHost />);
    await settle(reloaded.client);
    expect(dialogs()).toHaveLength(0);
    expect(api.ackWlReward).toHaveBeenCalledWith('r-coins');
  });

  it('does not start on stale cached badge data while a fresh badge is still loading', async () => {
    serve({ alice: [packReward()] });
    let deliverBadges: (value: unknown) => void = () => undefined;
    api.getMyEventAwards.mockImplementation(() => new Promise((resolve) => { deliverBadges = resolve; }));
    api.ackEventAward.mockResolvedValue({ data: { acknowledged: true }, error: null });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // An earlier visit left "no badges" in the cache; it is stale now.
    client.setQueryData(queryKeys.eventAwards.mine(), [], { updatedAt: Date.now() - 60 * 60 * 1000 });
    render(
      <QueryClientProvider client={client}>
        <EventAwardCeremony />
        <WlRewardCeremonyHost />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(api.getMyWlRewards).toHaveBeenCalled(), WAIT);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
    expect(screen.queryByText('Champion pack')).toBeNull();

    // The fresh response carries an unseen podium badge: it goes first.
    await act(async () => {
      deliverBadges({ data: [{ id: 'badge', eventSlug: 'weekend-league-2026-10-03', place: 1, awardedAt: '', seen: false }], error: null });
    });
    expect(await screen.findByText('Badge unlocked', undefined, WAIT)).toBeTruthy();
    expect(screen.queryByText('Champion pack')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Collect' }));
    expect(await screen.findByText('Champion pack', undefined, WAIT)).toBeTruthy();
  });

  it('drops an expectation for a receipt that is already here', async () => {
    serve({ alice: [coinReward({ seen: true })] });
    const view = mount(<WlRewardCeremonyHost />);
    await settle(view.client);
    act(() => { rewardSession.expect(TOURNAMENT); });
    await waitFor(() => expect(rewardSession.expected()).toEqual([]), WAIT);
  });

  it('finishes the reveal it started when another reward arrives ahead of it, then shows that one', async () => {
    const server = serve({ alice: [coinReward()] });
    const view = mount(<WlRewardCeremonyHost />);
    expect(await screen.findByText('Thanks for playing', undefined, WAIT)).toBeTruthy();

    // A second receipt lands and sorts first.
    server.set('alice', [packReward({ tournamentId: 'another-weekend' }), coinReward()]);
    await act(async () => { await view.client.invalidateQueries({ queryKey: queryKeys.weekendLeague.rewards('alice') }); });
    await settle(view.client);
    expect(dialogs()).toHaveLength(1);
    expect(screen.getByText('Thanks for playing')).toBeTruthy();
    expect(screen.queryByText('Champion pack')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Collect' }));
    expect(await screen.findByText('Champion pack', undefined, WAIT)).toBeTruthy();
    expect(dialogs()).toHaveLength(1);
    expect(api.ackWlReward).toHaveBeenCalledTimes(1);
    expect(api.ackWlReward).toHaveBeenCalledWith('r-coins');
  });

  it('holds back a podium badge that arrives while a reward reveal is on screen', async () => {
    serve({ alice: [coinReward()] });
    api.ackEventAward.mockResolvedValue({ data: { acknowledged: true }, error: null });
    const view = mount(<><EventAwardCeremony /><WlRewardCeremonyHost /></>);
    await screen.findByText('+1,500', undefined, WAIT);

    api.getMyEventAwards.mockResolvedValue({
      data: [{ id: 'late-badge', eventSlug: 'weekend-league-2026-10-03', place: 1, awardedAt: '', seen: false }], error: null,
    });
    await act(async () => { await view.client.invalidateQueries({ queryKey: queryKeys.eventAwards.mine() }); });
    await settle(view.client);
    expect(dialogs()).toHaveLength(1);
    expect(screen.queryByText('Badge unlocked')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Collect' }));
    expect(await screen.findByText('Badge unlocked', undefined, WAIT)).toBeTruthy();
    expect(dialogs()).toHaveLength(1);
  });

  it('acknowledges a reveal that was closed in another tab, and again on the next fetch if that fails', async () => {
    serve({ alice: [coinReward()] });
    // The other tab's own acknowledgement never arrived; this one's fails too.
    api.ackWlReward.mockRejectedValue(new Error('offline'));
    act(() => { rewardSession.receiveDismissal('r-coins'); });
    const view = mount(<WlRewardCeremonyHost />);
    await settle(view.client);
    expect(dialogs()).toHaveLength(0);
    expect(api.ackWlReward).toHaveBeenCalledTimes(1);

    await act(async () => { await view.client.invalidateQueries({ queryKey: queryKeys.weekendLeague.rewards('alice') }); });
    await settle(view.client);
    expect(api.ackWlReward).toHaveBeenCalledTimes(2);
    expect(dialogs()).toHaveLength(0);
  });

  it('shows a single reveal even when two hosts are mounted', async () => {
    serve({ alice: [coinReward()] });
    const view = mount(<><WlRewardCeremonyHost /><WlRewardCeremonyHost /></>);
    await screen.findByText('+1,500', undefined, WAIT);
    await settle(view.client);
    expect(dialogs()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Collect' }));
    await waitFor(() => expect(dialogs()).toHaveLength(0), WAIT);
    await settle(view.client);
    expect(dialogs()).toHaveLength(0);
    expect(api.ackWlReward).toHaveBeenCalledTimes(1);
  });

});

describe('rewards on the final result screen', () => {
  function Screen({ onResult }: { onResult: boolean }) {
    return (
      <>
        {onResult && <WlFinalRewards tournamentId={TOURNAMENT} />}
        <WlRewardCeremonyHost />
      </>
    );
  }

  it('does not auto-play over the result screen, then hands an unopened pack to the app-wide reveal when the player leaves', async () => {
    serve({ alice: [packReward()] });
    const view = mount(<Screen onResult />);

    expect(await screen.findByText('+40,000', undefined, WAIT)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open pack' })).toBeTruthy();
    await settle(view.client);
    expect(dialogs()).toHaveLength(0);

    // Player quits the result screen without opening the pack.
    view.rerenderUi(<Screen onResult={false} />);
    expect(await screen.findByText('Champion pack', undefined, WAIT)).toBeTruthy();
    expect(dialogs()).toHaveLength(1);
    expect(api.ackWlReward).not.toHaveBeenCalled();
  });

  it('a pack opened and closed on the result screen is not replayed by the app-wide reveal afterwards', async () => {
    serve({ alice: [coinReward({ band: 'top10', finalRank: 7, coins: 8000 })] });
    // Even if the acknowledgement never reaches the server.
    api.ackWlReward.mockRejectedValue(new Error('offline'));
    const view = mount(<Screen onResult />);
    fireEvent.click(await screen.findByRole('button', { name: 'Collect' }, WAIT));
    expect(await screen.findByText('Top 10 finish', undefined, WAIT)).toBeTruthy();
    expect(dialogs()).toHaveLength(1);

    fireEvent.click(screen.getAllByRole('button', { name: 'Collect' }).at(-1)!);
    await waitFor(() => expect(dialogs()).toHaveLength(0), WAIT);
    await settle(view.client);
    expect(api.ackWlReward).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Collect' })).toBeNull();
    expect(screen.getByText('+8,000')).toBeTruthy();

    view.rerenderUi(<Screen onResult={false} />);
    await settle(view.client);
    expect(dialogs()).toHaveLength(0);
  });

  it('equips through the profile update, keeps the rest of the avatar, and does not overwrite newer account state', async () => {
    serve({ alice: [packReward()] });
    let finishSave: (value: { avatar_customization: Record<string, string> }) => void = () => undefined;
    api.updateMe.mockImplementation(() => new Promise((resolve) => { finishSave = resolve; }));
    mount(<WlFinalRewards tournamentId={TOURNAMENT} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open pack' }, WAIT));
    fireEvent.click(await screen.findByRole('button', { name: 'Skip' }, WAIT));
    const equipButton = await screen.findByRole('button', { name: 'Equip now' }, WAIT);
    fireEvent.click(equipButton);

    await waitFor(() => expect(api.updateMe).toHaveBeenCalledTimes(1));
    const sent = { hair: 'hair_boy_basic', jersey: 'jersey_wl_retro_home' };
    expect(api.updateMe).toHaveBeenCalledWith({ avatar_customization: sent });

    // The account changes while the save is in flight (a level-up lands).
    act(() => auth.setState({ user: { ...auth.getState().user!, level: 2 } }));
    await act(async () => { finishSave({ avatar_customization: sent }); });

    expect(await screen.findByText('Equipped', undefined, WAIT)).toBeTruthy();
    expect(auth.getState().user).toMatchObject({ id: 'alice', level: 2, avatar_customization: sent });
  });

  it('does not write a finished equip into a different account', async () => {
    serve({ alice: [packReward()] });
    let finishSave: (value: { avatar_customization: Record<string, string> }) => void = () => undefined;
    api.updateMe.mockImplementation(() => new Promise((resolve) => { finishSave = resolve; }));
    mount(<WlFinalRewards tournamentId={TOURNAMENT} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open pack' }, WAIT));
    fireEvent.click(await screen.findByRole('button', { name: 'Skip' }, WAIT));
    fireEvent.click(await screen.findByRole('button', { name: 'Equip now' }, WAIT));
    await waitFor(() => expect(api.updateMe).toHaveBeenCalledTimes(1));

    act(() => auth.setState({ status: 'authenticated', user: { ...BOB } }));
    await act(async () => { finishSave({ avatar_customization: { jersey: 'jersey_wl_retro_home' } }); });
    expect(auth.getState().user).toEqual(BOB);
  });

  it('closes an open reveal when it is dismissed from another tab, and frees the slot', async () => {
    serve({ alice: [packReward()] });
    const view = mount(<Screen onResult />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open pack' }, WAIT));
    await waitFor(() => expect(dialogs()).toHaveLength(1), WAIT);

    act(() => { rewardSession.receiveDismissal('r-pack'); });
    await waitFor(() => expect(dialogs()).toHaveLength(0), WAIT);
    await settle(view.client);
    expect(screen.queryByRole('button', { name: 'Open pack' })).toBeNull();
    // The slot is handed back once the closing fade is over.
    await waitFor(() => expect(rewardSession.claimedBy()).toBeNull(), WAIT);
  });

  it('lets go of the reveal when the account changes under an open one, so the next account sees theirs', async () => {
    serve({ alice: [packReward()], bob: [coinReward({ id: 'r-bob', tournamentId: 'bobs-tournament' })] });
    const view = mount(<Screen onResult />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open pack' }, WAIT));
    expect(await screen.findByText('Champion pack', undefined, WAIT)).toBeTruthy();

    act(() => auth.setState({ status: 'authenticated', user: { ...BOB } }));
    await settle(view.client);
    expect(screen.queryByText('Champion pack')).toBeNull();
    // Bob's own unopened reward is revealed by the app-wide host: the slot was released.
    expect(await screen.findByText('Thanks for playing', undefined, WAIT)).toBeTruthy();
    expect(dialogs()).toHaveLength(1);
  });

  it('does not reopen by itself when its receipt went away and came back', async () => {
    serve({ alice: [packReward()], bob: [] });
    const view = mount(<Screen onResult />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open pack' }, WAIT));
    await waitFor(() => expect(dialogs()).toHaveLength(1), WAIT);

    act(() => auth.setState({ status: 'authenticated', user: { ...BOB } }));
    await settle(view.client);
    await waitFor(() => expect(dialogs()).toHaveLength(0), WAIT);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
    expect(rewardSession.claimedBy()).toBeNull();

    act(() => auth.setState({ status: 'authenticated', user: { ...ALICE } }));
    await settle(view.client);
    // Her unopened pack is offered again, but nothing opens until she asks.
    expect(await screen.findByRole('button', { name: 'Open pack' }, WAIT)).toBeTruthy();
    expect(dialogs()).toHaveLength(0);
  });

  it('never shows the next reveal on top of one that is still closing', async () => {
    const top10 = coinReward({ band: 'top10', finalRank: 7, coins: 8000 });
    const server = serve({ alice: [top10] });
    const view = mount(<Screen onResult />);
    fireEvent.click(await screen.findByRole('button', { name: 'Collect' }, WAIT));
    expect(await screen.findByText('Top 10 finish', undefined, WAIT)).toBeTruthy();

    // An older, unopened pack turns up while this reveal is open: it must wait.
    server.set('alice', [top10, packReward({ tournamentId: 'older-weekend' })]);
    await act(async () => { await view.client.invalidateQueries({ queryKey: queryKeys.weekendLeague.rewards('alice') }); });
    await settle(view.client);
    expect(dialogs()).toHaveLength(1);
    expect(screen.queryByText('Champion pack')).toBeNull();

    let most = 0;
    const observer = new MutationObserver(() => { most = Math.max(most, dialogs().length); });
    observer.observe(document.body, { childList: true, subtree: true });
    fireEvent.click(screen.getAllByRole('button', { name: 'Collect' }).at(-1)!);
    // The older, unopened pack follows once this one has gone.
    expect(await screen.findByText('Champion pack', undefined, WAIT)).toBeTruthy();
    await settle(view.client);
    observer.disconnect();
    expect(most).toBe(1);
    expect(dialogs()).toHaveLength(1);
  });

  it('ignores a reward from another tournament', async () => {
    serve({ alice: [coinReward({ tournamentId: 'last-week', seen: true })] });
    const view = mount(<WlFinalRewards tournamentId={TOURNAMENT} />);
    await settle(view.client);
    expect(screen.getByText('Working out your rewards…')).toBeTruthy();
    expect(screen.queryByText('+1,500')).toBeNull();
  });

});

describe('earn-only jerseys', () => {
  it('are never handed to generated bot or placeholder avatars', () => {
    const jerseys = new Set<string>();
    for (let i = 0; i < 3000; i += 1) jerseys.add(String(randomBotAvatar(`bot-${i}`).jersey));
    expect(jerseys.size).toBeGreaterThan(20);
    expect([...jerseys].filter((id) => id.startsWith('jersey_wl_'))).toEqual([]);
  });
});
