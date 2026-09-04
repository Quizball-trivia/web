import { getImageProps } from "next/image";

import { optimizeSupabaseImage } from "./optimizeSupabaseImage";

/**
 * Routes remote images through the Next.js image optimizer when (and only
 * when) they come from our own Supabase storage. Question/category images are
 * stored as full-size 1440×1080 PNGs (see backend question-image-storage
 * pipeline); serving them raw means every small card downloads ~the full
 * megapixel PNG. The optimizer resizes them and negotiates AVIF/WebP instead.
 *
 * Quality defaults to 75 to keep card art small; callers can opt into higher
 * quality for detail-critical images.
 *
 * URLs from other hosts (e.g. `external_fallback` question images that still
 * point at arbitrary third-party domains) are returned untouched, since they
 * aren't covered by `images.remotePatterns` and would 400 in the optimizer.
 */

const DEFAULT_QUALITY = 75;

function isOwnSupabaseUrl(src: string): boolean {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false; // relative/invalid URLs — leave to the caller as-is
  }
  // Must mirror the `*.supabase.co` + `/storage/v1/object/public/**`
  // remotePattern in next.config.ts exactly: hostname keeps this working
  // across staging/prod projects, and the pathname check keeps signed or
  // private storage URLs (which the optimizer would reject) out of it.
  return (
    url.hostname.endsWith(".supabase.co") &&
    url.pathname.startsWith("/storage/v1/object/public/")
  );
}

// Widest variant the Vercel optimizer ever needs to pull from origin. It still
// generates every device size from this, but no longer downloads the full
// stored original to do it.
const ORIGIN_FETCH_WIDTH = 1080;

// Supabase's transform endpoint refuses very large sources with a 400
// ("The source image resolution is too large to process"). On prod that is 2 of
// 4,585 objects, both `feedback/` uploads that no player-facing screen renders
// — every `question-images/` object transforms fine, including the 6.9 MB one.
// Route anything above this past the transform endpoint anyway so a future
// oversized upload degrades to a big-but-working image instead of a broken one.
const TRANSFORM_MAX_SOURCE_BYTES = 8_000_000;

/**
 * What the Next optimizer fetches from origin.
 *
 * Two wins, both measured against prod on 2026-09-04:
 *  - **Size.** Question art is stored as full-size 1440x1080 PNGs and
 *    `/object/public/` serves those bytes verbatim (largest: 6.9 MB). The
 *    transform endpoint returns 82 KB at width 1080 — ~85x smaller — so every
 *    optimizer cache miss pulls a small WebP instead of the original.
 *  - **Cacheability.** `/object/public/` always answers `cache-control:
 *    no-cache`, so Supabase's CDN reports REVALIDATED on every hit and none of
 *    it counts as cached egress. The transform endpoint returns the object's
 *    stored cache-control instead.
 *
 * Reuses `optimizeSupabaseImage`, the same helper the /dev/image-compare A/B
 * tool validated, so there is one Supabase transform implementation.
 * Non-Supabase URLs come back untouched.
 */
function originFetchUrl(src: string, sourceBytes?: number): string {
  if (sourceBytes !== undefined && sourceBytes > TRANSFORM_MAX_SOURCE_BYTES) {
    return src;
  }
  return (
    optimizeSupabaseImage(src, {
      width: ORIGIN_FETCH_WIDTH,
      quality: 70,
      format: "webp",
    }) ?? src
  );
}

export interface OptimizedRemoteImageProps {
  src: string;
  srcSet?: string;
  sizes?: string;
}

export interface OptimizedRemoteImageOptions {
  quality?: 70 | 75 | 90;
  sizes?: string;
  /**
   * Stored byte size of the source object, when the caller knows it. Sources
   * above the transform endpoint's limit skip it and are fetched raw.
   */
  sourceBytes?: number;
}

/**
 * Returns `src`/`srcSet` for a native `<img>` tag, optimized when possible.
 *
 * @param src the remote image URL (may be any host)
 * @param displayWidth the largest CSS width the image renders at; the
 *        optimizer serves 1x/2x candidates based on it
 */
export function optimizedRemoteImageProps(
  src: string,
  displayWidth: number,
  options: OptimizedRemoteImageOptions = {},
): OptimizedRemoteImageProps {
  if (!isOwnSupabaseUrl(src)) return { src };
  const { props } = getImageProps({
    src: originFetchUrl(src, options.sourceBytes),
    alt: "",
    width: displayWidth,
    // Height only informs the generated (discarded) layout props, not the
    // optimizer URL — the original aspect ratio is always preserved.
    height: displayWidth,
    quality: options.quality ?? DEFAULT_QUALITY,
    sizes: options.sizes,
  });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}

/**
 * The single optimizer URL to PRELOAD so the eager image is warm by the time it
 * renders. A `<img srcSet>` with no `sizes` picks the LARGEST candidate (the
 * browser assumes 100vw), and even with `sizes` a retina screen pulls the 2x
 * candidate — so preloading the bare `src` (1x) would cache-miss the variant the
 * card actually fetches. We preload the highest-resolution srcSet candidate
 * instead, which is the one a retina/100vw render requests.
 *
 * Returns the original URL unchanged for non-Supabase hosts (no optimizer URL).
 */
export function preloadableRemoteImageUrl(
  src: string,
  displayWidth: number,
  options: OptimizedRemoteImageOptions = {},
): string {
  const { src: baseSrc, srcSet } = optimizedRemoteImageProps(src, displayWidth, options);
  if (!srcSet) return baseSrc;
  // srcSet is "url1 1x, url2 2x" (or "url1 640w, ..."). Take the LAST entry —
  // getImageProps emits candidates in ascending order, so the last is largest.
  const last = srcSet.split(",").pop()?.trim();
  const url = last?.split(/\s+/)[0];
  return url || baseSrc;
}
