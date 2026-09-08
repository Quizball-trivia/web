import type { Metadata } from "next";
import { GameLandingPage, gameLandingMetadata, gameLandingStaticParams } from "@/features/marketing/gameLandingPage";

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return gameLandingStaticParams("games");
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return gameLandingMetadata("games", params);
}

export default function Page({ params }: { params: Params }) {
  return <GameLandingPage section="games" params={params} />;
}
