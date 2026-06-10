/**
 * Rewrite a Supabase Storage public object URL to its on-the-fly transformed
 * variant (resize + re-encode) using Supabase's image render endpoint.
 *
 *   .../storage/v1/object/public/<path>
 *   → .../storage/v1/render/image/public/<path>?width=…&quality=…&format=…
 *
 * Returns the URL unchanged if it's not a Supabase public object URL (e.g. a
 * hot-linked external image), so callers can pass any question image URL safely.
 *
 * Why this matters: question images are stored as full-res PNGs (~2 MB). A
 * resized WebP is ~30× smaller with no visible quality loss at display size.
 */
export interface SupabaseImageTransform {
  width?: number;
  height?: number;
  quality?: number; // 20–100
  format?: 'webp' | 'origin';
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * The transform used for in-match question images. Chosen via the
 * `/dev/image-compare` A/B tool: WebP @ 800px wide, quality 70 → ~56 KB vs the
 * ~1.9 MB raw PNG (~35× smaller) with no visible quality loss at card size.
 * Shared so the rendered <img> and the preloader request the identical URL
 * (same URL = the preload actually warms the cache for the render).
 */
export const QUESTION_IMAGE_TRANSFORM: SupabaseImageTransform = {
  width: 800,
  quality: 70,
  format: 'webp',
  resize: 'contain',
};

/**
 * Transform for draft/halftime ban category cards. Category art is stored as
 * 2-3 MB raw PNGs; routing them through the Next.js image optimizer made the
 * FIRST paint of the ban screen multi-second (the optimizer must download the
 * full original before it can resize, and its cache is per-deployment/cold in
 * dev). The Supabase render endpoint resizes at the storage CDN edge and is
 * shared across all users: ~20 KB webp, sub-second cold, instant warm.
 * 800px wide = 2× the card's ~400px CSS width (retina). The card <img> uses
 * object-cover, so `contain` here only preserves the source aspect ratio.
 */
export const CATEGORY_CARD_IMAGE_TRANSFORM: SupabaseImageTransform = {
  width: 800,
  quality: 70,
  format: 'webp',
  resize: 'contain',
};

const PUBLIC_OBJECT_SEGMENT = '/storage/v1/object/public/';
const RENDER_SEGMENT = '/storage/v1/render/image/public/';

export function optimizeSupabaseImage(
  url: string | null | undefined,
  transform: SupabaseImageTransform = {},
): string | null {
  if (!url) return null;
  if (!url.includes(PUBLIC_OBJECT_SEGMENT)) return url; // not a transformable Supabase object

  const rendered = url.replace(PUBLIC_OBJECT_SEGMENT, RENDER_SEGMENT);
  const params = new URLSearchParams();
  if (transform.width) params.set('width', String(transform.width));
  if (transform.height) params.set('height', String(transform.height));
  if (transform.quality) params.set('quality', String(transform.quality));
  // Default to `contain` — Supabase's default is `cover`, which (with only a
  // width set) squishes the image to the source height instead of scaling
  // proportionally, distorting the aspect ratio. `contain` scales to fit.
  params.set('resize', transform.resize ?? 'contain');
  if (transform.format) params.set('format', transform.format);

  const qs = params.toString();
  return qs ? `${rendered}?${qs}` : rendered;
}
