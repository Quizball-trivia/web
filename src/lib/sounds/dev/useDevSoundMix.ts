'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { ASSET_BY_ID } from '../lab/catalog';
import { DEV_SOUND_PROFILES, type DevSoundMode } from './profiles';

const CHANGE = 'quizball:dev-sound-mix';
const memory = new Map<string, string>();
const keyFor = (mode: DevSoundMode) => `quizball-dev-audio-v2-${mode}`;
export function parseDevMix(mode: DevSoundMode, raw: string, legacy = false): Record<string, string> {
  const mix: Record<string, string> = { ...DEV_SOUND_PROFILES[mode] };
  try {
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return mix;
    for (const [event, id] of Object.entries(saved)) {
      if (Object.hasOwn(mix, event) && typeof id === 'string' && (id === 'silent' || Object.hasOwn(ASSET_BY_ID, id))) mix[event] = id;
    }
    // Update old default choices while retaining other hand-picked sounds.
    if (legacy) {
      if (mix.wrong === 'quizup-cue-06') mix.wrong = 'quizup-cue-15';
      if (mix.submit === 'quizup-cue-15') mix.submit = 'silent';
      if (mix.next === 'quizup-cue-08') mix.next = 'silent';
    }
  } catch { /* Invalid storage falls back to the current defaults. */ }
  return mix;
}
function snapshot(mode: DevSoundMode) {
  const key = keyFor(mode);
  if (memory.has(key)) return memory.get(key)!;
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) return saved;
    const old = localStorage.getItem(`quizball-dev-audio-${mode}`);
    return old ? JSON.stringify(parseDevMix(mode, old, true)) : '';
  } catch { return memory.get(key) ?? ''; }
}
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(CHANGE, callback);
  return () => { window.removeEventListener('storage', callback); window.removeEventListener(CHANGE, callback); };
}
const serverSnapshot = () => '';
export function useDevSoundMix(mode: DevSoundMode) {
  const getSnapshot = useCallback(() => snapshot(mode), [mode]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const mix = useMemo(() => parseDevMix(mode, raw), [mode, raw]);
  const setMix = useCallback((update: Record<string, string> | ((previous: Record<string, string>) => Record<string, string>)) => {
    const previous = parseDevMix(mode, snapshot(mode));
    const next = typeof update === 'function' ? update(previous) : update;
    const value = JSON.stringify(parseDevMix(mode, JSON.stringify(next)));
    try { localStorage.setItem(keyFor(mode), value); memory.delete(keyFor(mode)); } catch { memory.set(keyFor(mode), value); }
    window.dispatchEvent(new Event(CHANGE));
  }, [mode]);
  return [mix, setMix] as const;
}
