'use client';

/** Preset radial-glow overlays used by the auction full-screen phases. */
export const SCREEN_GLOW = {
  bidding:
    'radial-gradient(circle at top center, rgba(28,176,246,0.06), transparent 32%), radial-gradient(circle at bottom right, rgba(88,204,2,0.04), transparent 28%)',
  formation:
    'radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%), radial-gradient(circle at bottom left, rgba(88,204,2,0.06), transparent 28%)',
  soloPick:
    'radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%)',
  win:
    'radial-gradient(circle at top center, rgba(88,204,2,0.1), transparent 40%), radial-gradient(circle at bottom, rgba(255,229,0,0.06), transparent 30%)',
  results:
    'radial-gradient(circle at top center, rgba(28,176,246,0.08), transparent 32%), radial-gradient(circle at bottom left, rgba(88,204,2,0.06), transparent 28%)',
} as const;

/**
 * The two stacked backdrop layers shared by every auction screen: the
 * `bg-pattern.webp` cover layer + a per-screen radial-gradient glow. Render this
 * as the first child of a `relative overflow-hidden bg-surface-page-alt` wrapper.
 */
export function ScreenBackdrop({ glow }: { glow?: string }) {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />
      {glow && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: glow }} />
      )}
    </>
  );
}
