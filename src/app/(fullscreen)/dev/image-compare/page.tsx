'use client';

/* eslint-disable @next/next/no-img-element -- dev tool comparing raw vs optimized remote images */

import { useCallback, useEffect, useRef, useState } from 'react';
import { optimizeSupabaseImage, type SupabaseImageTransform } from '@/lib/images/optimizeSupabaseImage';

// A few real published image-MCQ images from the Maradona pool (Supabase storage).
const SAMPLE_IMAGES = [
  'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/question-images/maradona-world-cup/c49a570e976c8fe7c3c805f8.png',
  'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/question-images/maradona-world-cup/9bd32dbd0a4d5be7aa7b3948.png',
  'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/question-images/maradona-world-cup/a50509095cb2da2d2a70c8b0.png',
];

interface Variant {
  label: string;
  transform: SupabaseImageTransform | null; // null = raw original
}

const VARIANTS: Variant[] = [
  { label: 'Original PNG (raw)', transform: null },
  { label: 'WebP 800 q70', transform: { width: 800, quality: 70, format: 'webp' } },
  { label: 'WebP 960 q75', transform: { width: 960, quality: 75, format: 'webp' } },
  { label: 'WebP 640 q65', transform: { width: 640, quality: 65, format: 'webp' } },
];

interface Measurement {
  ms: number | null;
  kb: number | null;
  status: 'idle' | 'measuring' | 'done' | 'error';
  src: string;
}

/**
 * Measure ONE image in isolation: fetch the bytes (so nothing else competes for
 * the connection), timing the transfer and reading the exact byte count. This
 * is the real per-image network cost — unlike <img> onLoad, which queues all
 * images together and reports wall-clock-since-mount.
 *
 * `warm` first does an untimed fetch so the Supabase transform is generated +
 * edge-cached, then the timed fetch measures the cached-delivery cost (what a
 * real second user sees). `cold` skips the warm-up to show first-ever cost.
 */
async function measureImage(url: string, mode: 'cold' | 'warm'): Promise<{ ms: number; kb: number }> {
  const bust = () => `${url}${url.includes('?') ? '&' : '?'}_cb=${Math.random().toString(36).slice(2)}`;
  if (mode === 'warm') {
    // Untimed warm-up so Supabase generates + edge-caches the transform first.
    try {
      await fetch(url, { cache: 'no-store' });
    } catch {
      /* ignore warm-up failures */
    }
  }
  // Warm: hit the same (now-cached) URL. Cold: cache-bust to force a fresh transform.
  const target = mode === 'warm' ? url : bust();
  const t0 = performance.now();
  const res = await fetch(target, { cache: 'no-store' });
  const blob = await res.blob();
  const ms = Math.round(performance.now() - t0);
  return { ms, kb: Math.round(blob.size / 1024) };
}

export default function ImageComparePage() {
  const [imageIndex, setImageIndex] = useState(0);
  const [mode, setMode] = useState<'cold' | 'warm'>('warm');
  const [measurements, setMeasurements] = useState<Record<string, Measurement>>({});
  const [running, setRunning] = useState(false);
  const runIdRef = useRef(0);

  const baseUrl = SAMPLE_IMAGES[imageIndex];

  const urlFor = useCallback(
    (v: Variant) => (v.transform ? optimizeSupabaseImage(baseUrl, v.transform)! : baseUrl),
    [baseUrl],
  );

  const run = useCallback(async () => {
    const runId = ++runIdRef.current;
    setRunning(true);
    // Seed all as measuring with their display src.
    setMeasurements(
      Object.fromEntries(
        VARIANTS.map((v) => [v.label, { ms: null, kb: null, status: 'measuring' as const, src: urlFor(v) }]),
      ),
    );
    // Measure sequentially so the variants don't compete for bandwidth.
    for (const v of VARIANTS) {
      if (runId !== runIdRef.current) return; // superseded
      const url = urlFor(v);
      try {
        const { ms, kb } = await measureImage(url, mode);
        if (runId !== runIdRef.current) return;
        setMeasurements((prev) => ({ ...prev, [v.label]: { ms, kb, status: 'done', src: url } }));
      } catch {
        if (runId !== runIdRef.current) return;
        setMeasurements((prev) => ({ ...prev, [v.label]: { ms: null, kb: null, status: 'error', src: url } }));
      }
    }
    if (runId === runIdRef.current) setRunning(false);
  }, [mode, urlFor]);

  // Auto-run on first mount and whenever image/mode changes.
  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageIndex, mode]);

  return (
    <div className="min-h-dvh w-full bg-surface-page-alt p-5 text-white font-fun">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-lg font-black uppercase tracking-wider text-yellow-400">
          Image load A/B — raw vs optimized
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Each variant is fetched in isolation (sequential, no-store) so the timing is its real
          per-image network cost — not wall-clock-since-mount. Each image sizes to its own aspect
          ratio so any distortion/crop is obvious.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => run()}
            disabled={running}
            className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-black uppercase tracking-wide text-black disabled:opacity-50"
          >
            {running ? 'measuring…' : '↻ Re-measure'}
          </button>

          <div className="flex overflow-hidden rounded-lg border border-surface-card-light">
            <button
              onClick={() => setMode('warm')}
              className={`px-3 py-2 text-xs font-bold ${mode === 'warm' ? 'bg-white text-black' : 'bg-surface-card text-white/70'}`}
            >
              warm (edge-cached)
            </button>
            <button
              onClick={() => setMode('cold')}
              className={`px-3 py-2 text-xs font-bold ${mode === 'cold' ? 'bg-white text-black' : 'bg-surface-card text-white/70'}`}
            >
              cold (first transform)
            </button>
          </div>

          {SAMPLE_IMAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => setImageIndex(i)}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${
                i === imageIndex ? 'bg-white text-black' : 'bg-surface-card text-white/70'
              }`}
            >
              image {i + 1}
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VARIANTS.map((v) => {
            const m = measurements[v.label];
            const src = m?.src ?? urlFor(v);
            return (
              <div key={v.label} className="rounded-2xl border border-surface-card-light bg-surface-card p-3">
                <div className="mb-2 text-xs font-black uppercase tracking-wide text-white/80">{v.label}</div>
                {/* The image fills the card width and the card height follows
                    the image's natural ratio — no fixed box, so no black bars
                    and no distortion/crop. */}
                <div className="overflow-hidden rounded-xl">
                  <img
                    src={src}
                    alt=""
                    referrerPolicy="no-referrer"
                    decoding="async"
                    className="block h-auto w-full"
                  />
                </div>
                <div className="mt-2 font-mono text-xs">
                  <div
                    className={
                      m?.status === 'error'
                        ? 'text-red-400'
                        : m?.status === 'done'
                          ? 'text-green-400'
                          : 'text-white/40'
                    }
                  >
                    {m?.status === 'error'
                      ? 'error'
                      : m?.status === 'done'
                        ? `${m.ms} ms`
                        : 'measuring…'}
                  </div>
                  <div className="text-white/50">{m?.kb != null ? `${m.kb} KB` : '—'}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 space-y-1 text-xs text-white/40">
          <p>
            <b>warm</b> = the transform is already generated + edge-cached (what a real 2nd+ user
            sees — the common case). <b>cold</b> = first-ever transform of that exact size, which
            Supabase generates on demand (slow once, then cached forever).
          </p>
          <p>
            ms is fetch transfer time on THIS device/network. KB is the exact transferred bytes.
          </p>
        </div>
      </div>
    </div>
  );
}
