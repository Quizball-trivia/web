import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeShare, SHARE_COPY } from "@/features/buscaminas/buscaminas.share";
import { findPublicGameByModeId, publicPagePathFor } from "@/lib/seo/public-games";
import { SITE_URL } from "@/lib/seo/site";
import { ShareRedirect } from "./ShareRedirect";

type Params = Promise<{ code: string }>;

function target(locale: string): string {
  const game = findPublicGameByModeId("buscaminas");
  const path = game ? publicPagePathFor(game, locale === "es" || locale === "ka" || locale === "tr" ? locale : "en") : "/";
  return `${path}?utm_source=share&utm_medium=buscaminas`;
}

/** A shared result: its own preview card for chat apps, then straight into the game. Never indexed. */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const result = decodeShare((await params).code);
  if (!result) notFound();
  const copy = SHARE_COPY[result.locale];
  const image = { url: `${SITE_URL}/api/og/buscaminas?c=${encodeURIComponent((await params).code)}`, width: 1200, height: 630, alt: copy.title(result.number, result.score) };
  return {
    title: copy.title(result.number, result.score),
    description: copy.description,
    robots: { index: false, follow: true },
    alternates: { canonical: `${SITE_URL}${target(result.locale).split("?")[0]}` },
    openGraph: { title: copy.title(result.number, result.score), description: copy.description, images: [image], type: "website" },
    twitter: { card: "summary_large_image", title: copy.title(result.number, result.score), description: copy.description, images: [image] },
  };
}

export default async function SharedResultPage({ params }: { params: Params }) {
  const result = decodeShare((await params).code);
  if (!result) notFound();
  return <ShareRedirect href={target(result.locale)} label={SHARE_COPY[result.locale].open} />;
}
