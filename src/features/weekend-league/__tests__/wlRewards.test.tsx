import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { translate, type Locale, type MessageKey } from '@/lib/i18n/messages';
import { WlRewardCeremony } from '../rewards/WlRewardCeremony';
import { WlRewardsEarnedCard } from '../rewards/WlRewardsEarnedCard';
import type { WlRewardBand, WlRewardReceipt } from '../rewards/wlRewards';

const settings = vi.hoisted(() => ({ locale: 'en' as Locale }));
vi.mock('@/contexts/LocaleContext', () => ({
  useLocale: () => ({
    locale: settings.locale,
    t: (key: MessageKey, params?: Record<string, string | number>) => translate(settings.locale, key, params),
  }),
}));
vi.mock('@/lib/sounds/useGameSounds', () => ({ useGameSounds: () => ({ playSfx: vi.fn() }) }));

const JERSEY = { slug: 'avatar_jersey_wl_retro_home', avatarPartId: 'jersey_wl_retro_home', slot: 'jersey' as const };
const FRAME = { slug: 'avatar_frame_wl_champion', avatarPartId: 'frame_wl_champion', slot: 'frame' as const };

function receipt(band: WlRewardBand, coins: number, overrides: Partial<WlRewardReceipt> = {}): WlRewardReceipt {
  const podium = band === 'winner' || band === 'second' || band === 'third';
  return {
    id: `r-${band}`, tournamentId: 't1', weekKey: '2026-10-03', band,
    finalRank: band === 'top10' ? 7 : null, coins, items: podium ? [JERSEY] : [],
    grantedAt: '2026-10-04T12:00:00Z', seen: false, ...overrides,
  };
}

function renderCeremony(r: WlRewardReceipt, extra: Partial<React.ComponentProps<typeof WlRewardCeremony>> = {}) {
  const onClose = vi.fn();
  const onEquip = vi.fn().mockResolvedValue(undefined);
  render(
    <WlRewardCeremony receipt={r} open customization={{}} forceReducedMotion onClose={onClose} onEquip={onEquip} {...extra} />,
  );
  return { onClose, onEquip };
}

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

afterEach(() => { cleanup(); settings.locale = 'en'; });

const WAIT = { timeout: 4000 };

describe('Weekend League reward ceremony', () => {
  it('shows a coin-only reward as one screen and closes on Collect', () => {
    const { onClose } = renderCeremony(receipt('top10', 8000));
    expect(screen.getByText('Top 10 finish')).toBeTruthy();
    expect(screen.getByText('You finished #7')).toBeTruthy();
    expect(screen.getByText('+8,000')).toBeTruthy();
    expect(screen.queryByText('Open pack')).toBeNull();
    click('Collect');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('walks a podium pack from pack to jersey to coins to summary, then equips', async () => {
    const { onClose, onEquip } = renderCeremony(receipt('winner', 40000));
    expect(screen.getByText('Champion pack')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Open pack' }).at(-1)!);
    expect(await screen.findByText('Retro Playmaker Home', undefined, WAIT)).toBeTruthy();
    expect(screen.getByText('Exclusive jersey')).toBeTruthy();
    click('Next');
    expect(await screen.findByText('+40,000', undefined, WAIT)).toBeTruthy();
    click('Next');
    expect(await screen.findByText('Your rewards', undefined, WAIT)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => { click('Equip now'); });
    expect(onEquip).toHaveBeenCalledWith([JERSEY]);
    expect(screen.getByText('Equipped')).toBeTruthy();
    click('Done');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('skips a pack straight to the summary instead of closing, so equip is still offered', async () => {
    const { onClose } = renderCeremony(receipt('second', 25000));
    click('Skip');
    expect(await screen.findByText('Your rewards', undefined, WAIT)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Equip now' })).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the reward and says so when equipping fails', async () => {
    const onEquip = vi.fn().mockRejectedValue(new Error('offline'));
    renderCeremony(receipt('third', 15000), { onEquip });
    click('Skip');
    await screen.findByText('Your rewards', undefined, WAIT);
    await act(async () => { click('Equip now'); });
    expect(screen.getByText(/Couldn’t equip it right now/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Equip now' })).toBeTruthy();
  });

  it('shows the jersey as already equipped when the player is wearing it', async () => {
    renderCeremony(receipt('winner', 40000), { customization: { jersey: 'jersey_wl_retro_home' } });
    click('Skip');
    expect(await screen.findByText('Equipped', undefined, WAIT)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Equip now' })).toBeNull();
  });

  it('a v2 pack reveals the jersey, then the frame, and equips both in one save', async () => {
    const { onEquip } = renderCeremony(receipt('winner', 40000, { items: [JERSEY, FRAME] }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Open pack' }).at(-1)!);
    expect(await screen.findByText('Retro Playmaker Home', undefined, WAIT)).toBeTruthy();
    click('Next');
    expect(await screen.findByText('Champion frame', undefined, WAIT)).toBeTruthy();
    expect(screen.getByText('Exclusive frame')).toBeTruthy();
    // The frame is shown on the player wearing the pack's jersey, titled.
    expect(screen.getByText('Weekend Champion')).toBeTruthy();
    click('Next');
    expect(await screen.findByText('+40,000', undefined, WAIT)).toBeTruthy();
    click('Next');
    await screen.findByText('Your rewards', undefined, WAIT);
    await act(async () => { click('Equip now'); });
    expect(onEquip).toHaveBeenCalledWith([JERSEY, FRAME]);
  });

  it('still offers Equip when only the jersey is on, and shows Equipped once both are', async () => {
    renderCeremony(receipt('winner', 40000, { items: [JERSEY, FRAME] }), { customization: { jersey: 'jersey_wl_retro_home' } });
    click('Skip');
    expect(await screen.findByRole('button', { name: 'Equip now' }, WAIT)).toBeTruthy();
    cleanup();
    renderCeremony(receipt('winner', 40000, { items: [JERSEY, FRAME] }), {
      customization: { jersey: 'jersey_wl_retro_home', frame: 'frame_wl_champion' },
    });
    click('Skip');
    expect(await screen.findByText('Equipped', undefined, WAIT)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Equip now' })).toBeNull();
  });

  it('moves keyboard focus with each step and keeps it inside the reveal', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    const { onClose } = renderCeremony(receipt('winner', 40000));
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    expect(document.activeElement?.textContent).toBe('Open pack');

    click('Skip');
    const equipButton = await screen.findByRole('button', { name: 'Equip now' }, WAIT);
    await waitFor(() => expect(document.activeElement).toBe(equipButton));

    // Tab from the last control wraps to the first instead of leaving the dialog.
    const done = screen.getByRole('button', { name: 'Done' });
    done.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(equipButton);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(done);

    // Equip swaps its button for a label; focus must land on Done, not on <body>.
    await act(async () => { fireEvent.click(equipButton); });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Done' })));

    click('Done');
    expect(onClose).toHaveBeenCalledTimes(1);
    outside.remove();
  });

  it('gives focus back to what had it before the reveal opened', async () => {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    const r = receipt('participant', 1500);
    const props = { receipt: r, customization: {}, forceReducedMotion: true, onClose: () => undefined };
    const view = render(<WlRewardCeremony {...props} open />);
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Collect'));

    view.rerender(<WlRewardCeremony {...props} open={false} />);
    await waitFor(() => expect(document.activeElement).toBe(outside));
    outside.remove();
  });

  it('handles Escape even when focus has left the dialog: a pack jumps to its summary, a coin reward closes', async () => {
    const pack = renderCeremony(receipt('second', 25000));
    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(await screen.findByText('Your rewards', undefined, WAIT)).toBeTruthy();
    expect(pack.onClose).not.toHaveBeenCalled();
    cleanup();

    const coins = renderCeremony(receipt('participant', 1500));
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(coins.onClose).toHaveBeenCalledTimes(1);
  });

  it.each(['ka', 'es', 'tr'] as const)('renders the coin screen in %s without falling back to English', (locale) => {
    settings.locale = locale;
    renderCeremony(receipt('participant', 1500));
    expect(screen.getByText(translate(locale, 'wlRewards.bandParticipant'))).toBeTruthy();
    expect(screen.getByRole('button', { name: translate(locale, 'wlRewards.collect') })).toBeTruthy();
    expect(screen.queryByText('Thanks for playing')).toBeNull();
  });
});

describe('Weekend League result rewards card', () => {
  it('shows a pending line until the receipt exists, and nothing when no reward is coming', () => {
    const { rerender, container } = render(<WlRewardsEarnedCard receipt={undefined} onOpen={() => undefined} />);
    expect(screen.getByText('Working out your rewards…')).toBeTruthy();
    rerender(<WlRewardsEarnedCard receipt={undefined} none onOpen={() => undefined} />);
    expect(container.textContent).toBe('');
  });

  it('offers Open pack for a podium receipt and hides the button once seen', () => {
    const onOpen = vi.fn();
    const { rerender } = render(<WlRewardsEarnedCard receipt={receipt('winner', 40000)} onOpen={onOpen} />);
    expect(screen.getByText('+40,000')).toBeTruthy();
    expect(screen.getByText(/Champion pack · Retro Playmaker Home/)).toBeTruthy();
    click('Open pack');
    expect(onOpen).toHaveBeenCalledTimes(1);
    rerender(<WlRewardsEarnedCard receipt={receipt('winner', 40000, { seen: true })} onOpen={onOpen} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers Collect for a coin-only receipt', () => {
    render(<WlRewardsEarnedCard receipt={receipt('participant', 1500)} onOpen={() => undefined} />);
    expect(screen.getByText('+1,500')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Collect' })).toBeTruthy();
  });
});
