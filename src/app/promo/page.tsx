"use client";

import { PromoQuizScreen } from "@/features/promo/PromoQuizScreen";
import { PROMO_PACK_KA } from "@/features/promo/promoQuiz.data";

export default function PromoPage() {
  return <PromoQuizScreen pack={PROMO_PACK_KA} />;
}