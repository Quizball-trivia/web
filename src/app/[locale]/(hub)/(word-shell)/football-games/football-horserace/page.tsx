import "@/styles/word-landing-utilities.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicGamePage, publicGameMetadata, publicGameStaticParams } from "@/features/marketing/publicGamePage";
import { FOOTBALL_RACE_ENABLED } from "@/lib/config";

type Params = Promise<{ locale: string }>;
const FOLDER = "football-games";
const SLUG = "football-horserace";

export const dynamicParams = false;
export function generateStaticParams() {
  if (!FOOTBALL_RACE_ENABLED) return [];
  return publicGameStaticParams(FOLDER).filter((params) => params.slug === SLUG).map(({ locale }) => ({ locale }));
}
const withSlug = (params: Params) => params.then(({ locale }) => ({ locale, slug: SLUG }));

export function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  if (!FOOTBALL_RACE_ENABLED) notFound();
  return publicGameMetadata(FOLDER, withSlug(params));
}
export default function Page({ params }: { params: Params }) {
  if (!FOOTBALL_RACE_ENABLED) notFound();
  return <PublicGamePage folder={FOLDER} params={withSlug(params)} />;
}
