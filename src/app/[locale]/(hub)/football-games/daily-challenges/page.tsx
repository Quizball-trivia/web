import type { Metadata } from "next";
import { DailyCollectionPage, dailyCollectionMetadata, dailyCollectionStaticParams } from "@/features/marketing/publicGamePage";

type Params = Promise<{ locale: string }>;
const FOLDER = "football-games";

// Every public page is enumerated by generateStaticParams. The root layout
// reads headers(), so these routes render dynamically today and the 404s come
// from the middleware folder guard + notFound() in generateMetadata; this
// only takes effect if the segment ever becomes static.
export const dynamicParams = false;

export function generateStaticParams() {
  return dailyCollectionStaticParams(FOLDER);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return dailyCollectionMetadata(FOLDER, params);
}

export default function Page({ params }: { params: Params }) {
  return <DailyCollectionPage folder={FOLDER} params={params} />;
}
