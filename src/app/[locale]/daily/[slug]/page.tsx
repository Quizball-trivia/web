import type { Metadata } from "next";
import { GameLandingPage, gameLandingMetadata, gameLandingStaticParams } from "@/features/marketing/gameLandingPage";

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return gameLandingStaticParams("daily");
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return gameLandingMetadata("daily", params);
}

export default function Page({ params }: { params: Params }) {
  return <GameLandingPage section="daily" params={params} />;
}
