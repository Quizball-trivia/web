import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AvatarPicker } from '../components/AvatarPicker';
import { RankFrameCard } from '../components/RankFrameCard';
import { decodeAvatarCustomization } from '@/lib/avatars';

vi.mock('@/contexts/LocaleContext', () => ({ useLocale: () => ({ locale: 'en', setLocale: vi.fn(), t: (key: string) => key }) }));
vi.mock('@/hooks/useMobile', () => ({ useIsMobile: () => false }));
vi.mock('@/components/AvatarPreview', () => ({ AvatarPreview: () => null }));
vi.mock('@/components/AvatarDisplay', () => ({ AvatarDisplay: () => null }));
// eslint-disable-next-line @next/next/no-img-element -- test stub for next/image
vi.mock('next/image', () => ({ default: ({ src, alt }: { src: unknown; alt?: string }) => <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} /> }));
const inventory = vi.hoisted(() => ({ items: [] as Array<{ slug: string }> }));
vi.mock('@/lib/queries/store.queries', () => ({
  useStoreProducts: () => ({ data: undefined }),
  useStoreInventory: () => ({ data: { items: inventory.items } }),
}));

function openFrames(ownedPartIds: string[], onSelect = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AvatarPicker open onOpenChange={vi.fn()} onSelect={onSelect} currentCustomization={{ skin: 'skin_male_white' }}
        localPreview={{ ownedPartIds, onPurchase: vi.fn() }} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'wlRewards.framesTab' }));
  return onSelect;
}

describe('AvatarPicker: Frames tab', () => {
  it('lets a winner equip their frame and keeps the others locked with how to win them', () => {
    const onSelect = openFrames(['frame_wl_champion']);
    const champion = screen.getByRole('button', { name: 'wlRewards.frameName1' });
    expect(champion).toBeEnabled();
    expect(screen.getByRole('button', { name: 'wlRewards.frameName2 — wlRewards.frameUnlock2' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'wlRewards.frameName3 — wlRewards.frameUnlock3' })).toBeDisabled();

    fireEvent.click(champion);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(decodeAvatarCustomization(onSelect.mock.calls[0][0])).toMatchObject({ frame: 'frame_wl_champion' });
  });

  it('shows all three locked to a player who has won none', () => {
    openFrames([]);
    for (const n of [1, 2, 3]) {
      expect(screen.getByRole('button', { name: `wlRewards.frameName${n} — wlRewards.frameUnlock${n}` })).toBeDisabled();
    }
  });
});

describe('AvatarPicker: frame ownership from the real inventory', () => {
  it('unlocks the frame whose product the inventory holds, and only that one', () => {
    inventory.items = [{ slug: 'avatar_frame_wl_runnerup' }];
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AvatarPicker open onOpenChange={vi.fn()} onSelect={vi.fn()} currentCustomization={{ skin: 'skin_male_white' }} />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'wlRewards.framesTab' }));
    expect(screen.getByRole('button', { name: 'wlRewards.frameName2' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'wlRewards.frameName1 — wlRewards.frameUnlock1' })).toBeDisabled();
    inventory.items = [];
  });
});

describe('RankFrameCard with a Weekend League frame', () => {
  const card = (rewardFrame: boolean) => render(
    <RankFrameCard tier="Captain" tierLabel="Captain" rpLabel="2140RP" rewardFrame={rewardFrame}
      customization={{ skin: 'skin_male_white', frame: 'frame_wl_champion' }} />,
  );

  it('draws the equipped frame and its title on the player’s own card, keeping the rank text', () => {
    const { container } = card(true);
    expect(screen.getByText('wlRewards.frameTitle1')).toBeTruthy();
    expect(screen.getByText('Captain')).toBeTruthy();
    expect(container.querySelector('img[src*="/assets/ranks/"]')).toBeNull();
  });

  it('keeps the rank art on cards that are not the current one (next tier, achieved)', () => {
    const { container } = card(false);
    expect(screen.queryByText('wlRewards.frameTitle1')).toBeNull();
    expect(container.querySelector('img[src*="/assets/ranks/"]')).not.toBeNull();
  });
});
