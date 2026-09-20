'use client';

import { useContext, useEffect, useRef } from 'react';
import { GameSoundOverrideContext } from './GameSoundOverrideContext';
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
  const override = useContext(GameSoundOverrideContext);

  useEffect(() => {
    if (!initialized.current) {
      preloadAll();
      initialized.current = true;
    }
  }, []);

  return {
    playSfx: override?.playSfx ?? playSfx,
    playBgm: override?.playBgm ?? playBgm,
    stopBgm: override?.stopBgm ?? stopBgm,
    setBgmVolume,
    toggleMute: override?.toggleMute ?? toggleMute,
    isMuted: override?.isMuted ?? isMuted,
  };
}
