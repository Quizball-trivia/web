"use client";

/** Dev preview of the Play page's All Games grid (no auth required). */
import { AllGamesGrid } from "@/features/play/AllGamesGrid";

export default function AllGamesPreviewPage() {
  return (
    <div className="relative min-h-screen font-fun">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-surface-page-alt bg-[url('/assets/bg-pattern.webp')] bg-cover bg-center bg-no-repeat"
      />
      <div className="relative mx-auto max-w-[430px] px-4 py-6 md:max-w-6xl md:px-8 md:py-10">
        <AllGamesGrid />
      </div>
    </div>
  );
}
