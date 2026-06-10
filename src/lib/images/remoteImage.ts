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
  let host: string;
  try {
    host = new URL(src).hostname;
  } catch {
    return false; // relative/invalid URLs — leave to the caller as-is
  }
  // Matches the `*.supabase.co` remotePattern in next.config.ts and keeps
  // working across staging/prod projects without hardcoding refs.
  return host.endsWith(".supabase.co");
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
