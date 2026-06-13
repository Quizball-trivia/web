'use client';

/* eslint-disable @next/next/no-img-element -- Category artwork is runtime CMS data and may be data: URLs. */

/**
 * Renders category artwork from a CMS URL; bails out gracefully if
 * the image fails to load (data: URLs and external hosts both happen
 * here). The parent supplies `className` to position/contain the
 * artwork inside the card.
 */

import { optimizedRemoteImageProps } from "@/lib/images/remoteImage";
import { useState } from 'react';

interface CategoryArtworkProps {
  src?: string | null;
  className: string;
  imageClassName?: string;
  /**
   * `cover` bleeds the artwork edge-to-edge (what the in-match ban cards do);
   * `contain` letterboxes it inside the card; `auto` (default) detects the
   * artwork type — crest/logo images on transparent canvases get `contain`,
   * full-bleed photos get `cover`.
   */
  fit?: 'cover' | 'contain' | 'auto';
  displayWidth?: number;
  sizes?: string;
  quality?: 70 | 75 | 90;
}

/**
 * Categories mix two artwork styles on the same 1440×1080 canvas: full-bleed
 * photos (zero transparency) and centered club/nation crests (15%+ of the
 * canvas is transparent padding). Photos look best covering the card; crests
 * get distorted-looking crops when covered. Sampling the alpha channel on a
 * tiny canvas separates the two reliably (measured: photos 0%, crests 15–87%).
 * Cross-origin images that taint the canvas (external fallback hosts) are
 * assumed to be photos.
 */
function detectFit(img: HTMLImageElement): 'cover' | 'contain' {
  try {
    const w = 24;
    const h = 18;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'cover';
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 16) transparent++;
    }
    return transparent / (w * h) > 0.1 ? 'contain' : 'cover';
  } catch {
    return 'cover';
  }
}

export function CategoryArtwork({
  src,
  className,
  imageClassName,
  fit = 'auto',
  displayWidth = 384,
  sizes,
  quality = 70,
}: CategoryArtworkProps) {
  const [failed, setFailed] = useState(false);
  const [detectedFit, setDetectedFit] = useState<'cover' | 'contain' | null>(null);

  if (!src || failed) return null;

  const resolvedFit = fit === 'auto' ? detectedFit ?? 'cover' : fit;
  const contain = resolvedFit === 'contain';

  return (
    // Crests keep the previous letterboxed-with-breathing-room look.
    <div className={`${className} ${contain ? 'p-1.5' : ''}`}>
      <img
        {...optimizedRemoteImageProps(src, displayWidth, { sizes, quality })}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`size-full ${contain ? 'object-contain' : 'object-cover'} object-center transition-transform duration-500 group-hover:scale-105 ${imageClassName ?? ''}`}
        onLoad={(e) => {
          if (fit === 'auto' && detectedFit === null) setDetectedFit(detectFit(e.currentTarget));
        }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
