import { getImageProps } from "next/image";

/**
 * Routes remote images through the Next.js image optimizer when (and only
 * when) they come from our own Supabase storage. Question/category images are
 * stored as full-size 1440×1080 PNGs (see backend question-image-storage
 * pipeline); serving them raw means every small card downloads ~the full
 * megapixel PNG. The optimizer resizes them and negotiates AVIF/WebP instead.
 *
 * Quality is pinned at 90 (Next defaults to 75) so the re-encode stays
 * visually indistinguishable from the source.
 *
 * URLs from other hosts (e.g. `external_fallback` question images that still
 * point at arbitrary third-party domains) are returned untouched, since they
 * aren't covered by `images.remotePatterns` and would 400 in the optimizer.
 */

const QUALITY = 90;

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

export interface OptimizedRemoteImageProps {
  src: string;
  srcSet?: string;
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
): OptimizedRemoteImageProps {
  if (!isOwnSupabaseUrl(src)) return { src };
  const { props } = getImageProps({
    src,
    alt: "",
    width: displayWidth,
    // Height only informs the generated (discarded) layout props, not the
    // optimizer URL — the original aspect ratio is always preserved.
    height: displayWidth,
    quality: QUALITY,
  });
  return { src: props.src, srcSet: props.srcSet };
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
): string {
  const { src: baseSrc, srcSet } = optimizedRemoteImageProps(src, displayWidth);
  if (!srcSet) return baseSrc;
  // srcSet is "url1 1x, url2 2x" (or "url1 640w, ..."). Take the LAST entry —
  // getImageProps emits candidates in ascending order, so the last is largest.
  const last = srcSet.split(",").pop()?.trim();
  const url = last?.split(/\s+/)[0];
  return url || baseSrc;
}
