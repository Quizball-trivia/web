import type { Metadata } from "next";
import { DailyCollectionPage, dailyCollectionMetadata } from "@/features/marketing/publicGamePage";

type Params = Promise<{ locale: string }>;
const FOLDER = "juegos-de-futbol";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return dailyCollectionMetadata(FOLDER, params);
}

export default function Page({ params }: { params: Params }) {
  return <DailyCollectionPage folder={FOLDER} params={params} />;
}
