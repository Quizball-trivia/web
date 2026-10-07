import { notFound } from "next/navigation";
import { isPartnerGameId } from "@/features/partner/api/partnerApi.types";
import { PartnerGamePage } from "@/features/partner/game-kit/PartnerGamePage";

export default async function FreecrocoGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  if (!isPartnerGameId(gameId)) notFound();
  return <PartnerGamePage gameId={gameId} />;
}
