"use client";

import { PromoQuizScreen } from "@/features/promo/PromoQuizScreen";
import { PROMO_PACK_TR } from "@/features/promo/promoQuizTr.data";

export default function PromoTrPage() {
  return <PromoQuizScreen pack={PROMO_PACK_TR} />;
}