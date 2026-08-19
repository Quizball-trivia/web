"use client";

/**
 * Dev-only preview of the /play mode-selection screen with fixture props —
 * no auth or backend needed, for eyeballing card layout changes.
 */

import { ModeSelectionScreen } from "@/features/play/ModeSelectionScreen";

export default function PlayCardsPreviewPage() {
  return (
    <div className="min-h-screen bg-surface-page">
      <ModeSelectionScreen
        onSelectMode={() => {}}
        ticketsRemaining={3}
        matchStatsSummary={null}
        rankedProfile={null}
        rankedProfileLoading={false}
      />
    </div>
  );
}
