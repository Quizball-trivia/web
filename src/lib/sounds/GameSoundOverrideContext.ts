'use client';

import { createContext } from 'react';
import type { BgmName, SoundName } from './gameSounds';

/** Optional, subtree-scoped playback adapter. Live routes have no provider. */
export const GameSoundOverrideContext = createContext<{
  toggleMute?: () => boolean;
  isMuted?: () => boolean;
  playEvent?: (name: 'goal' | 'save') => void;
  playSfx: (name: SoundName) => void;
  playBgm: (name: BgmName) => void;
  stopBgm: (fadeMs?: number) => void;
} | null>(null);
