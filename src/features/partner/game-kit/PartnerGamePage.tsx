"use client";

import type { PartnerGameId } from "../api/partnerApi.types";
import { PartnerGameHost } from "./PartnerGameHost";
import { partnerGameRegistry } from "./registry";

export function PartnerGamePage({ gameId }: { gameId: PartnerGameId }) {
  return <PartnerGameHost gameId={gameId} registry={partnerGameRegistry} />;
}
