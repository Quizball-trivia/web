"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { isLocale, type Locale } from "@/lib/i18n/locale";
import { swapCampaignLocalePath } from "@/features/campaign-quiz/campaignQuiz.routes";
import { DAILY_COLLECTION_SLUG, PUBLIC_GAMES_FOLDER, dailyCollectionPath, findGamePageByLocalizedSlug, gamePagePath, isSeoPageLocale } from "@/lib/seo/game-pages";
import { findPublicGameBySlug, isPublishedIn } from "@/lib/seo/public-games";

// Swap the leading /:locale segment of the current path with the target locale.
function swapLocale(pathname: string, target: Locale): string {
  // Campaign quizzes have no Turkish edition yet; a Turkish switch on one lands on the English quiz.
  const campaignPath = swapCampaignLocalePath(pathname, target === 'tr' ? 'en' : target);
  if (campaignPath) return campaignPath;
  const segments = pathname.split("/").filter(Boolean);
  // Public game pages have translated folders and slugs (/es/juegos-de-futbol/subasta).
  if (segments.length === 3 && isLocale(segments[0])) {
    const source = segments[0];
    if (segments[1] === PUBLIC_GAMES_FOLDER[source]) {
      if (segments[2] === DAILY_COLLECTION_SLUG[source]) return isSeoPageLocale(target) ? dailyCollectionPath(target) : `/${target}`;
      const entry = findGamePageByLocalizedSlug(source, segments[1], segments[2]);
      if (entry) {
        const game = findPublicGameBySlug(entry.slug);
        return game && isPublishedIn(game, target) ? gamePagePath(entry, target) : `/${target}`;
      }
    }
  }
  if (segments.length === 0 || !isLocale(segments[0])) {
    return `/${target}`;
  }
  segments[0] = target;
  return `/${segments.join("/")}`;
}


/** The full catalogue is needed only after the visitor opens the language menu. */
export function PublicLanguageLink({ pathname, queryString, code, active, className, onClick, children, ...linkProps }: {
  pathname: string; queryString: string; code: Locale; active: boolean; className: string; onClick: () => void; children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "onClick">) {
  const localePath = swapLocale(pathname, code);
  const href = queryString ? `${localePath}?${queryString}` : localePath;
  return <Link {...linkProps} href={href} prefetch={false} hrefLang={code} lang={code} onClick={onClick} aria-current={active ? "page" : undefined} className={className}>{children}</Link>;
}
