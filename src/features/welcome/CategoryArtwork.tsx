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
   * `cover` bleeds the artwork edge-to-edge (cropping overflow — what the
   * in-match ban cards do); `contain` letterboxes it inside the card.
   */
  fit?: 'cover' | 'contain';
}

export function CategoryArtwork({ src, className, imageClassName, fit = 'contain' }: CategoryArtworkProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  return (
    <div className={className}>
      <img
        {...optimizedRemoteImageProps(src, 384)}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`size-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} object-center transition-transform duration-500 group-hover:scale-105 ${imageClassName ?? ''}`}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
