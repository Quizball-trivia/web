'use client';

/**
 * Fixed background layers that sit behind every AppShell layout.
 * Stadium pattern + a subtle radial-gradient overlay.
 */

export function AppShellPageChrome() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.png')] bg-cover bg-center bg-no-repeat"
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
