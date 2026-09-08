import type { Metadata } from "next";
import { PublicGamePage, publicGameMetadata, publicGameStaticParams } from "@/features/marketing/publicGamePage";

type Params = Promise<{ locale: string; slug: string }>;
const FOLDER = "football-games";

export function generateStaticParams() {
  return publicGameStaticParams(FOLDER);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return publicGameMetadata(FOLDER, params);
}

export default function Page({ params }: { params: Params }) {
  return <PublicGamePage folder={FOLDER} params={params} />;
}
