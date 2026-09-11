import type { Metadata } from "next";
import { PublicGamePage, publicGameMetadata, publicGameStaticParams } from "@/features/marketing/publicGamePage";

type Params = Promise<{ locale: string; slug: string }>;
const FOLDER = "juegos-de-futbol";

// Every public page is enumerated by generateStaticParams. The root layout
// reads headers(), so these routes render dynamically today and the 404s come
// from the middleware folder guard + notFound() in generateMetadata; this
// only takes effect if the segment ever becomes static.
export const dynamicParams = false;

export function generateStaticParams() {
  return publicGameStaticParams(FOLDER);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return publicGameMetadata(FOLDER, params);
}

export default function Page({ params }: { params: Params }) {
  return <PublicGamePage folder={FOLDER} params={params} />;
}
