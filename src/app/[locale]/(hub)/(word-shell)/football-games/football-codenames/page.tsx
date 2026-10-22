import "@/styles/word-landing-utilities.css";
import type { Metadata } from "next";
import { PublicGamePage, publicGameMetadata, publicGameStaticParams } from "@/features/marketing/publicGamePage";

type Params = Promise<{ locale: string }>;
const FOLDER = "football-games";
const SLUG = "football-codenames";

export const dynamicParams = false;
export function generateStaticParams() {
  return publicGameStaticParams(FOLDER).filter((params) => params.slug === SLUG).map(({ locale }) => ({ locale }));
}
const withSlug = (params: Params) => params.then(({ locale }) => ({ locale, slug: SLUG }));

export function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return publicGameMetadata(FOLDER, withSlug(params));
}
export default function Page({ params }: { params: Params }) {
  return <PublicGamePage folder={FOLDER} params={withSlug(params)} />;
}
