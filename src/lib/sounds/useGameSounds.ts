'use client';

import { useEffect, useRef } from 'react';
import {
  playBgm,
  playSfx,
  stopBgm,
  setBgmVolume,
  toggleMute,
  isMuted,
  preloadAll,
} from './gameSounds';

/**
 * React hook for game sounds.
 * Preloads sounds on mount.
 */
export function useGameSounds() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      preloadAll();
      initialized.current = true;
    }
  }, []);

  return {
    playSfx,
    playBgm,
    stopBgm,
    setBgmVolume,
    toggleMute,
    isMuted,
  };
}
