"use client";

import type { PartnerGameId } from "../api/partnerApi.types";
import { PartnerGameHost } from "./PartnerGameHost";
import { partnerGameRegistry } from "./registry";

export function PartnerGamePage({ gameId }: { gameId: PartnerGameId }) {
  // The home spans the partner's frame; a game keeps the column it was designed for.
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <PartnerGameHost gameId={gameId} registry={partnerGameRegistry} />
    </div>
  );
}
