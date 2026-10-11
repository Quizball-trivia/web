"use client";

import { preload } from "react-dom";
import heroAssets from "./word-hero-assets.json";

type WordGameSlug = keyof typeof heroAssets;

function imageSrcSet(variants: Record<string, string>): string {
  return Object.entries(variants).map(([width, url]) => `${url} ${width}w`).join(", ");
}

/** Pre-encoded equivalents of the same artwork; no first-visit image transform. */
export function WordGameHeroImage({ slug, sizes }: { slug: WordGameSlug; sizes: string }) {
  const variants = heroAssets[slug];
  const avifSrcSet = imageSrcSet(variants.avif);
  const webpSrcSet = imageSrcSet(variants.webp);
  preload(variants.avif[750], { as: "image", type: "image/avif", imageSrcSet: avifSrcSet, imageSizes: sizes, fetchPriority: "high" });
  return (
    <picture>
      <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
      {/* Pre-encoded responsive images bypass first-visit transforms, with a WebP fallback. */}
      <img src={variants.webp[750]} srcSet={webpSrcSet} sizes={sizes} alt="" width={1600} height={900}
        loading="eager" fetchPriority="high" decoding="async"
        className="absolute inset-0 h-full w-full object-contain object-center" />
    </picture>
  );
}
