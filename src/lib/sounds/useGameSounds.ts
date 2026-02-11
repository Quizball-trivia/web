'use client';

import { useEffect, useRef } from 'react';
import {
  playSfx,
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
    toggleMute,
    isMuted,
  };
}
