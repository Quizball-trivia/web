"use client";

import type { PartnerGameId } from "../api/partnerApi.types";
import { PartnerGameHost } from "./PartnerGameHost";
import { partnerGameRegistry } from "./registry";

export function PartnerGamePage({ gameId }: { gameId: PartnerGameId }) {
  // Wide frames: start screens use up to 1024 px; each game's board keeps the width it was designed for.
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col lg:max-w-5xl">
      <PartnerGameHost gameId={gameId} registry={partnerGameRegistry} />
    </div>
  );
}
