import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useGameSounds } from '../../useGameSounds';
import { GameSoundOverrideContext } from '../../GameSoundOverrideContext';
import { DEV_SOUND_PROFILES, EXISTING_EVENT_MAP } from '../profiles';
import { ASSET_BY_ID } from '../../lab/catalog';
import * as game from '../../gameSounds';

vi.mock('../../gameSounds', () => ({ playSfx: vi.fn(), playBgm: vi.fn(), stopBgm: vi.fn(), preloadAll: vi.fn(), setBgmVolume: vi.fn(), toggleMute: vi.fn(), isMuted: vi.fn() }));

describe('scoped development sound mixes', () => {
  it('leaves gameplay sound functions intact outside a preview provider', () => {
    const live = renderHook(() => useGameSounds());
    expect(live.result.current.playSfx).toBe(game.playSfx);
    expect(live.result.current.playBgm).toBe(game.playBgm);
    expect(live.result.current.stopBgm).toBe(game.stopBgm);
  });
  it('routes only the provider subtree through the audition adapter', () => {
    const adapter = { playSfx: vi.fn(), playBgm: vi.fn(), stopBgm: vi.fn() };
    const preview = renderHook(() => useGameSounds(), { wrapper: ({ children }: {children: ReactNode}) => <GameSoundOverrideContext.Provider value={adapter}>{children}</GameSoundOverrideContext.Provider> });
    act(() => preview.result.current.playSfx('correctRanked'));
    expect(adapter.playSfx).toHaveBeenCalledWith('correctRanked');
    expect(game.playSfx).not.toHaveBeenCalled();
  });
  it('provides real files for every action and preserves the four auction cues', () => {
    for (const profile of Object.values(DEV_SOUND_PROFILES)) for (const id of Object.values(profile)) if (id !== 'silent') expect(ASSET_BY_ID[id!], id).toBeTruthy();
    for (const name of ['auctionBid','auctionFold','auctionReveal','auctionWon']) {
      expect(DEV_SOUND_PROFILES.auction[EXISTING_EVENT_MAP[name]]).toBe(`existing-${name}`);
    }
    for (const name of ['correctRanked','wrongAnswer','pass','kick','whistle']) expect(DEV_SOUND_PROFILES.ranked[EXISTING_EVENT_MAP[name]]).toBeTruthy();
  });
});
