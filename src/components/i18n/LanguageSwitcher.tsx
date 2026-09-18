"use client";

import type React from "react";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES as LOCALE_CODES, isLocale, type Locale } from "@/lib/i18n/locale";
import { LOCALES as LOCALE_OPTIONS } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";
import { storage, STORAGE_KEYS } from "@/utils/storage";
import { swapCampaignLocalePath } from "@/features/campaign-quiz/campaignQuiz.routes";
import { DAILY_COLLECTION_SLUG, PUBLIC_GAMES_FOLDER, dailyCollectionPath, findGamePageByLocalizedSlug, gamePagePath, isSeoPageLocale } from "@/lib/seo/game-pages";
import { findPublicGameBySlug, isPublishedIn } from "@/lib/seo/public-games";

interface LanguageSwitcherProps {
  // Server-rendered fallback locale used on the very first paint. After
  // mount the component derives the active locale from usePathname() so
  // the active highlight follows client-side navigation without forcing
  // the root layout to re-render.
  locale: Locale;
  className?: string;
  locales?: readonly Locale[];
  /** Also called with the chosen locale (signed-in users persist it on the profile). */
  onSelect?: (locale: Locale) => void;
}

const OPTIONS_BY_CODE = Object.fromEntries(
  LOCALE_OPTIONS.map((option) => [option.code, option]),
) as Record<Locale, (typeof LOCALE_OPTIONS)[number]>;

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

const ITEM_CLASS = "flex min-h-12 w-full items-center gap-3 rounded-[12px] px-3 text-white outline-none transition-colors hover:bg-white/10 focus:bg-white/10";

function ItemBody({ option, active }: { option: (typeof LOCALE_OPTIONS)[number]; active: boolean }) {
  return (
    <>
      <span
        className={`fi fi-${option.countryCode} !size-5 rounded-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.14)]`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black leading-tight">{option.nativeName}</span>
        {option.nativeName !== option.name ? (
          <span className="mt-0.5 block text-[11px] font-semibold text-white/50">
            {option.name}
          </span>
        ) : null}
      </span>
      {active ? <Check className="size-4 text-brand-yellow" aria-hidden /> : null}
    </>
  );
}

/** The dropdown chrome shared by both switchers; `renderItem` supplies the link or button per locale. */
function LanguageMenu({ activeLocale, locales, className, renderItem }: {
  activeLocale: Locale;
  locales: readonly Locale[];
  className?: string;
  renderItem: (code: Locale, option: (typeof LOCALE_OPTIONS)[number], active: boolean) => React.ReactNode;
}) {
  const activeOption = OPTIONS_BY_CODE[activeLocale];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Choose language. Current language: ${activeOption.name}`}
          title={activeOption.name}
          className={cn(
            // Flag only, no card: the language name lives in the tooltip and the accessible name (owner, 2026-09-18).
            "group inline-flex size-10 items-center justify-center rounded-full bg-transparent text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brand-yellow/60 data-[state=open]:bg-white/10",
            className,
          )}
        >
          <span
            className={`fi fi-${activeOption.countryCode} !h-5 !w-7 rounded-[3px]`}
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-[18px] border-0 bg-black/70 p-2 font-poppins text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md"
      >
        <DropdownMenuLabel className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
          Choose language
        </DropdownMenuLabel>
        {locales.map((code) => (
          <DropdownMenuItem key={code} asChild className="p-0 focus:bg-transparent">
            {renderItem(code, OPTIONS_BY_CODE[code], code === activeLocale)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Public pages: each language is a link to the localized URL. Reads the URL, so mount it under Suspense. */
export function LanguageSwitcher({ locale, className, locales = LOCALE_CODES, onSelect }: LanguageSwitcherProps) {
  const pathname = usePathname() ?? `/${locale}`;
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  const activeLocale: Locale = isLocale(firstSegment) ? firstSegment : locale;

  return (
    <LanguageMenu
      activeLocale={activeLocale}
      locales={locales}
      className={className}
      renderItem={(code, option, active) => {
        const localePath = swapLocale(pathname, code);
        const href = queryString ? `${localePath}?${queryString}` : localePath;
        return (
          <Link
            href={href}
            hrefLang={code}
            lang={code}
            // An explicit choice: persisted so leaving the localized pages
            // (creating a room, opening a game) keeps this language instead
            // of falling back to an earlier inferred one.
            onClick={() => { storage.set(STORAGE_KEYS.LOCALE, code); onSelect?.(code); }}
            aria-current={active ? "page" : undefined}
            className={cn(ITEM_CLASS, active && "bg-brand-blue hover:bg-brand-blue")}
          >
            <ItemBody option={option} active={active} />
          </Link>
        );
      }}
    />
  );
}

/** Signed-in app: pick a language in place (no navigation); the caller switches the UI and saves the preference. */
export function InPlaceLanguageSwitcher({ locale, onSelect, className, locales = LOCALE_CODES }: {
  locale: Locale;
  onSelect: (locale: Locale) => void;
  className?: string;
  locales?: readonly Locale[];
}) {
  return (
    <LanguageMenu
      activeLocale={locale}
      locales={locales}
      className={className}
      renderItem={(code, option, active) => (
        <button
          type="button"
          lang={code}
          onClick={() => onSelect(code)}
          aria-current={active ? "true" : undefined}
          className={cn(ITEM_CLASS, active && "bg-brand-blue hover:bg-brand-blue")}
        >
          <ItemBody option={option} active={active} />
        </button>
      )}
    />
  );
}
