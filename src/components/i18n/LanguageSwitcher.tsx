"use client";

import type React from "react";
import { Fragment } from "react";

import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES as LOCALE_CODES, isLocale, type Locale } from "@/lib/i18n/locale";
import { LOCALES as LOCALE_OPTIONS } from "@/lib/i18n/locale-config";
import { cn } from "@/lib/utils";
import { CountryFlag } from "@/components/CountryFlag";
import { storage, STORAGE_KEYS } from "@/utils/storage";

const PublicLanguageLink = dynamic(() => import("./PublicLanguageLink").then((module) => module.PublicLanguageLink), {
  ssr: false,
  loading: () => <div role="status" className="h-12 animate-pulse rounded-xl bg-white/10"><span className="sr-only">…</span></div>,
});

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

const ITEM_CLASS = "flex min-h-12 w-full items-center gap-3 rounded-[12px] px-3 text-white outline-none transition-colors hover:bg-white/10 focus:bg-white/10";

function ItemBody({ option, active }: { option: (typeof LOCALE_OPTIONS)[number]; active: boolean }) {
  return (
    <>
      <CountryFlag code={option.countryCode} className="!size-5 rounded-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.14)]" />
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
  const { t } = useLocale();
  // Accessible name in the active locale, naming the language the way its speakers do.
  const label = t("languageSwitcher.chooseLanguage", { language: activeOption.nativeName });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={activeOption.nativeName}
          className={cn(
            // Flag only, no card: the language name lives in the tooltip and the accessible name (owner, 2026-09-18).
            "group inline-flex size-10 items-center justify-center rounded-full bg-transparent text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brand-yellow/60 data-[state=open]:bg-white/10",
            className,
          )}
        >
          <CountryFlag code={activeOption.countryCode} className="!h-5 !w-7 rounded-[3px]" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-[18px] border-0 bg-black/70 p-2 font-poppins text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md"
      >
        <DropdownMenuLabel className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{t("languageSwitcher.title")}</DropdownMenuLabel>
        {locales.map((code) => (
          <Fragment key={code}>
            {renderItem(code, OPTIONS_BY_CODE[code], code === activeLocale)}
          </Fragment>
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
        return (
          <PublicLanguageLink
            pathname={pathname}
            queryString={queryString}
            code={code}
            active={active}
            // An explicit choice: persisted so leaving the localized pages
            // (creating a room, opening a game) keeps this language instead
            // of falling back to an earlier inferred one.
            onClick={() => { storage.set(STORAGE_KEYS.LOCALE, code); onSelect?.(code); }}
            className={cn(ITEM_CLASS, active && "bg-brand-blue hover:bg-brand-blue")}
          >
            <ItemBody option={option} active={active} />
          </PublicLanguageLink>
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
        <DropdownMenuItem asChild className="p-0 focus:bg-transparent"><button
          type="button"
          lang={code}
          onClick={() => onSelect(code)}
          aria-current={active ? "true" : undefined}
          className={cn(ITEM_CLASS, active && "bg-brand-blue hover:bg-brand-blue")}
        >
          <ItemBody option={option} active={active} />
        </button></DropdownMenuItem>
      )}
    />
  );
}
