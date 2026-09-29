import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decodeShare, SHARE_COPY } from "@/features/buscaminas/buscaminas.share";
import { decodePistasShare, PISTAS_SHARE_COPY } from "@/features/pistas/pistas.share";
import { CONTENT_START, addDays } from "@/features/pistas/pistas.logic";
import { decodeUltimoShare, ULTIMO_SHARE_COPY } from "@/features/ultimo/ultimo.share";
import { CONTENT_START as ULTIMO_CONTENT_START, addDays as addUltimoDays } from "@/features/ultimo/ultimo.logic";
import { findPublicGameByModeId, publicPagePathFor } from "@/lib/seo/public-games";
import { SITE_URL } from "@/lib/seo/site";
import { ShareRedirect } from "./ShareRedirect";

type Params = Promise<{ code: string }>;

function target(locale: string, modeId: "buscaminas" | "pistas" | "ultimo" = "buscaminas"): string {
  const game = findPublicGameByModeId(modeId);
  const path = game ? publicPagePathFor(game, locale === "es" || locale === "ka" || locale === "tr" ? locale : "en") : "/";
  return `${path}?utm_source=share&utm_medium=${modeId}`;
}

/** Último codes carry a `ue-` prefix and Pistas codes a `pf-` prefix; anything else is a Buscaminas code. */
function resolve(code: string) {
  const ultimo = decodeUltimoShare(code);
  if (ultimo) {
    const copy = ULTIMO_SHARE_COPY[ultimo.locale];
    const dia = addUltimoDays(ULTIMO_CONTENT_START, ultimo.number - 1);
    return { title: copy.title(ultimo.number, ultimo.score), description: copy.description, open: copy.open, og: "ultimo", href: `${target(ultimo.locale, "ultimo")}&dia=${dia}` };
  }
  const pistas = decodePistasShare(code);
  if (pistas) {
    const copy = PISTAS_SHARE_COPY[pistas.locale];
    // Open the shared puzzle itself, not whatever board is newest when the link is clicked.
    const dia = addDays(CONTENT_START, pistas.number - 1);
    return { title: copy.title(pistas.number, pistas.score), description: copy.description, open: copy.open, og: "pistas", href: `${target(pistas.locale, "pistas")}&dia=${dia}` };
  }
  const result = decodeShare(code);
  if (!result) return null;
  const copy = SHARE_COPY[result.locale];
  return { title: copy.title(result.number, result.score), description: copy.description, open: copy.open, og: "buscaminas", href: target(result.locale) };
}

/** A shared result: its own preview card for chat apps, then straight into the game. Never indexed. */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const code = (await params).code;
  const shared = resolve(code);
  if (!shared) notFound();
  const image = { url: `${SITE_URL}/api/og/${shared.og}?c=${encodeURIComponent(code)}`, width: 1200, height: 630, alt: shared.title };
  return {
    title: shared.title,
    description: shared.description,
    robots: { index: false, follow: true },
    alternates: { canonical: `${SITE_URL}${shared.href.split("?")[0]}` },
    openGraph: { title: shared.title, description: shared.description, images: [image], type: "website" },
    twitter: { card: "summary_large_image", title: shared.title, description: shared.description, images: [image] },
  };
}

export default async function SharedResultPage({ params }: { params: Params }) {
  const shared = resolve((await params).code);
  if (!shared) notFound();
  return <ShareRedirect href={shared.href} label={shared.open} />;
}
