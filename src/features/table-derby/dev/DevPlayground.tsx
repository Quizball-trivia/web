'use client';

/** Dev-only playground: every Table Derby screen in one place, rendered in
 *  a device frame so each can be iterated on separately. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Monitor, RotateCw, Smartphone, Tablet } from 'lucide-react';
import { ALL_SCENES, SCENE_GROUPS, type Scene } from './scenes';

const DEVICES = {
  phone: { w: 390, h: 844, icon: Smartphone, label: 'Phone' },
  tablet: { w: 768, h: 1024, icon: Tablet, label: 'Tablet' },
  desktop: { w: 1280, h: 800, icon: Monitor, label: 'Desktop' },
} as const;
type Device = keyof typeof DEVICES;

function sceneUrl(scene: Scene, starter: 'me' | 'op') {
  const q = scene.starter && starter === 'op' ? `${scene.query}&starter=op` : scene.query;
  return `/table-derby?${q}`;
}

function readHash(): { scene: string; device: Device; starter: 'me' | 'op' } {
  const h = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.hash.slice(1));
  const d = h.get('d');
  return {
    scene: h.get('s') ?? 'tab-home',
    device: d === 'tablet' || d === 'desktop' ? d : 'phone',
    starter: h.get('st') === 'op' ? 'op' : 'me',
  };
}

export function DevPlayground() {
  const [sceneId, setSceneId] = useState('tab-home');
  const [device, setDevice] = useState<Device>('phone');
  const [starter, setStarter] = useState<'me' | 'op'>('me');
  const [reloadKey, setReloadKey] = useState(0);
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // restore selection from the hash (survives reloads, shareable); the hash
  // only exists client-side, so this runs after mount
  useEffect(() => {
    const h = readHash();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from location.hash
    setSceneId(h.scene);
    setDevice(h.device);
    setStarter(h.starter);
  }, []);
  useEffect(() => {
    window.history.replaceState(null, '', `#s=${sceneId}&d=${device}&st=${starter}`);
  }, [sceneId, device, starter]);

  const scene = ALL_SCENES.find((s) => s.id === sceneId) ?? ALL_SCENES[0];
  const dims = DEVICES[device];
  const url = useMemo(() => sceneUrl(scene, starter), [scene, starter]);

  // fit the device frame into the stage
  const measure = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const pad = 32;
    setScale(Math.min(1, (el.clientWidth - pad) / dims.w, (el.clientHeight - pad) / dims.h));
  }, [dims]);
  useEffect(() => {
    measure();
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  // ↑/↓ steps through scenes, R reloads
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const i = ALL_SCENES.findIndex((s) => s.id === sceneId);
      if (e.key === 'ArrowDown') setSceneId(ALL_SCENES[Math.min(ALL_SCENES.length - 1, i + 1)].id);
      else if (e.key === 'ArrowUp') setSceneId(ALL_SCENES[Math.max(0, i - 1)].id);
      else if (e.key === 'r') setReloadKey((k) => k + 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sceneId]);

  return (
    <div className="td-theme flex h-dvh flex-col text-[var(--bs-text)] md:flex-row" style={{ background: 'var(--bs-page)' }}>
      <aside
        className="flex max-h-[40dvh] shrink-0 flex-col overflow-y-auto border-b md:max-h-none md:w-[260px] md:border-b-0 md:border-r"
        style={{ borderColor: 'var(--bs-border)' }}
      >
        <div className="sticky top-0 z-10 px-4 pb-2 pt-4" style={{ background: 'var(--bs-page)' }}>
          <p className="bs-display text-[16px]">Table Derby · playground</p>
          <p className="bs-text mt-1 text-[11px] text-[var(--bs-text-3)]">↑ ↓ switch scene · R reload</p>
        </div>
        <nav className="flex flex-col gap-4 px-3 pb-6">
          {SCENE_GROUPS.map((g) => (
            <div key={g.title}>
              <p className="bs-text px-1 pb-1.5 text-[11px] uppercase tracking-wider text-[var(--bs-text-3)]">{g.title}</p>
              <div className="flex flex-col gap-0.5">
                {g.scenes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSceneId(s.id)}
                    aria-current={s.id === scene.id ? 'true' : undefined}
                    className="bs-text flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-[13px]"
                    style={
                      s.id === scene.id
                        ? { background: 'var(--bs-primary)', color: 'var(--bs-on-primary)' }
                        : { color: 'var(--bs-text-2)' }
                    }
                  >
                    <span className="truncate">{s.label}</span>
                    {s.live && (
                      <span className="shrink-0 text-[9px] uppercase opacity-70" aria-label="interactive">
                        live
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5" style={{ borderColor: 'var(--bs-border)' }}>
          <span className="bs-text mr-auto truncate text-[13px] font-bold">{scene.label}</span>
          {scene.starter && (
            <div className="flex overflow-hidden rounded-full text-[12px]" style={{ background: 'var(--bs-surface)' }}>
              {(['me', 'op'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStarter(s)}
                  className="bs-text px-3 py-1"
                  style={starter === s ? { background: 'var(--bs-primary)', color: '#fff' } : undefined}
                >
                  {s === 'me' ? 'I start' : 'Bot starts'}
                </button>
              ))}
            </div>
          )}
          <div className="flex overflow-hidden rounded-full" style={{ background: 'var(--bs-surface)' }}>
            {(Object.keys(DEVICES) as Device[]).map((d) => {
              const Icon = DEVICES[d].icon;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  aria-label={DEVICES[d].label}
                  className="px-3 py-1.5"
                  style={device === d ? { background: 'var(--bs-primary)', color: '#fff' } : { color: 'var(--bs-text-2)' }}
                >
                  <Icon size={15} />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            aria-label="Reload scene"
            className="rounded-full p-2"
            style={{ background: 'var(--bs-surface)' }}
          >
            <RotateCw size={15} />
          </button>
          <a href={url} target="_blank" rel="noreferrer" aria-label="Open in new tab" className="rounded-full p-2" style={{ background: 'var(--bs-surface)' }}>
            <ExternalLink size={15} />
          </a>
        </header>
        <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 overflow-hidden rounded-[18px]"
            style={{
              width: dims.w,
              height: dims.h,
              transform: `translate(-50%, -50%) scale(${scale})`,
              boxShadow: '0 0 0 8px #000, 0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <iframe key={`${url}-${reloadKey}`} src={url} title={scene.label} className="size-full border-0" />
          </div>
          <span className="bs-text absolute bottom-2 right-3 text-[11px] text-[var(--bs-text-3)]">
            {dims.w}×{dims.h} · {Math.round(scale * 100)}%
          </span>
        </div>
      </section>
    </div>
  );
}
