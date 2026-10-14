'use client';

import backgroundAssets from '@/lib/app-background-assets.json';

/**
 * Fixed background layers that sit behind every AppShell layout.
 * Stadium pattern + a subtle radial-gradient overlay.
 */

export function AppShellPageChrome({ wordLanding = false }: { wordLanding?: boolean }) {
  const originalBackground = `image-set(url('${backgroundAssets.patternAvif}') type('image/avif'), url('/assets/bg-pattern.webp') type('image/webp'))`;
  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat${wordLanding ? ' qb-word-mobile-background' : ''}`}
        style={{ backgroundImage: wordLanding ? `var(--qb-word-background, ${originalBackground})` : originalBackground }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%), radial-gradient(circle at bottom left, rgba(88,204,2,0.06), transparent 28%)",
        }}
      />
    </>
  );
}
