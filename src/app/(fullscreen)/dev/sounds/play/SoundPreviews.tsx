'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Play, Square } from 'lucide-react';
import { PreviewPlayer } from '@/lib/sounds/lab/previewPlayer';
import { ASSET_BY_ID } from '@/lib/sounds/lab/catalog';
import { DEV_SOUND_PROFILES, EVENT_LABELS, type DevSoundMode, type DevSoundEvent } from '@/lib/sounds/dev/profiles';

const PreviewContext = createContext<{
  active: string | null;
  toggle: (key: string, assetId: string) => void;
  stop: () => void;
} | null>(null);

export const useSoundPreview = () => useContext(PreviewContext);

export function SoundPreviewProvider({ children }: { children: ReactNode }) {
  const [player] = useState(() => new PreviewPlayer());
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState('');
  const current = useRef<string | null>(null);
  const generation = useRef(0);
  const mounted = useRef(false);
  const stop = useCallback(() => {
    generation.current++;
    current.current = null;
    player.stop();
    setActive(null);
  }, [player]);

  useEffect(() => {
    mounted.current = true;
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      mounted.current = false;
      player.stop();
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [player, stop]);

  const toggle = useCallback((key: string, assetId: string) => {
    if (current.current === key) { stop(); return; }
    const asset = ASSET_BY_ID[assetId];
    if (!asset) return;
    const token = ++generation.current;
    current.current = key;
    setActive(key);
    setError('');
    void player.play(asset.path, asset.previewSeconds ?? Math.max(1, asset.duration + 0.25)).then(result => {
      if (!mounted.current || token !== generation.current) return;
      current.current = null;
      setActive(null);
      if (result === 'error') setError('Could not play this sound. Try again.');
    });
  }, [player, stop]);

  return <PreviewContext.Provider value={{ active, toggle, stop }}>
    {children}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
  </PreviewContext.Provider>;
}

export function SoundMappingList({ mode }: { mode: DevSoundMode }) {
  const preview = useContext(PreviewContext);
  return <details className="mt-6 text-sm" onToggle={event => {
    if (!event.currentTarget.open && preview?.active?.startsWith(`${mode}:`)) preview.stop();
  }}>
    <summary className="cursor-pointer">{Object.keys(DEV_SOUND_PROFILES[mode]).length} proposed action mappings</summary>
    <dl className="mt-4 space-y-3">
      {Object.entries(DEV_SOUND_PROFILES[mode]).map(([event, id]) => {
        const key = `${mode}:${event}`;
        const playing = preview?.active === key;
        const label = EVENT_LABELS[event as DevSoundEvent];
        return <div key={event} className="grid grid-cols-[1fr_auto] items-center gap-x-3">
          <dt className="min-w-0">{label}</dt><dd className="col-start-1 row-start-2 text-white/45">{ASSET_BY_ID[id]?.label}</dd>
          <dd className="col-start-2 row-span-2 row-start-1"><button type="button" aria-label={`${playing ? 'Stop' : 'Play'} ${label}`} aria-pressed={playing}
            onClick={() => preview?.toggle(key, id)}
            className={`flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300 ${playing ? 'border-lime-300 bg-lime-300 text-black' : 'border-white/20 text-lime-300 hover:border-lime-300 hover:bg-lime-300/10'}`}>
            {playing ? <Square size={14} fill="currentColor" aria-hidden="true" /> : <Play size={16} fill="currentColor" aria-hidden="true" />}
          </button></dd>
        </div>;
      })}
    </dl>
  </details>;
}
