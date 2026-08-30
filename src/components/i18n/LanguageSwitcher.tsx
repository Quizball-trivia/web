"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
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
import { swapCampaignLocalePath } from "@/features/campaign-quiz/campaignQuiz.routes";

interface LanguageSwitcherProps {
  // Server-rendered fallback locale used on the very first paint. After
  // mount the component derives the active locale from usePathname() so
  // the active highlight follows client-side navigation without forcing
  // the root layout to re-render.
  locale: Locale;
  className?: string;
  locales?: readonly Locale[];
}

const OPTIONS_BY_CODE = Object.fromEntries(
  LOCALE_OPTIONS.map((option) => [option.code, option]),
) as Record<Locale, (typeof LOCALE_OPTIONS)[number]>;

// Swap the leading /:locale segment of the current path with the target locale.
function swapLocale(pathname: string, target: Locale): string {
  const campaignPath = swapCampaignLocalePath(pathname, target);
  if (campaignPath) return campaignPath;
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0 || !isLocale(segments[0])) {
    return `/${target}`;
  }
  segments[0] = target;
  return `/${segments.join("/")}`;
}

export function LanguageSwitcher({ locale, className, locales = LOCALE_CODES }: LanguageSwitcherProps) {
  const pathname = usePathname() ?? `/${locale}`;
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  const activeLocale: Locale = isLocale(firstSegment) ? firstSegment : locale;
  const activeOption = OPTIONS_BY_CODE[activeLocale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Choose language. Current language: ${activeOption.name}`}
          className={cn(
            "group inline-flex min-h-10 items-center gap-2 rounded-[14px] border border-white/10 bg-surface-deep px-3 font-poppins text-white shadow-[0_10px_30px_rgba(0,0,0,0.22)] outline-none transition-colors hover:border-white/20 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-brand-yellow/80",
            className,
          )}
        >
          <span
            className={`fi fi-${activeOption.countryCode} !size-[18px] rounded-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.14)]`}
            aria-hidden
          />
          <span className="hidden text-sm font-black sm:inline">{activeOption.nativeName}</span>
          <span className="text-xs font-black uppercase tracking-[0.08em] sm:hidden">
            {activeLocale}
          </span>
          <ChevronDown
            className="size-4 text-white/55 transition-transform group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-56 rounded-[18px] border border-white/10 bg-surface-deep p-2 font-poppins text-white shadow-[0_22px_60px_rgba(0,0,0,0.5)]"
      >
        <DropdownMenuLabel className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
          Choose language
        </DropdownMenuLabel>
        {locales.map((code) => {
          const option = OPTIONS_BY_CODE[code];
          const active = code === activeLocale;
          const localePath = swapLocale(pathname, code);
          const href = queryString ? `${localePath}?${queryString}` : localePath;
          return (
            <DropdownMenuItem key={code} asChild className="p-0 focus:bg-transparent">
              <Link
                href={href}
                hrefLang={code}
                lang={code}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-[12px] px-3 text-white outline-none transition-colors hover:bg-white/10 focus:bg-white/10",
                  active && "bg-brand-blue hover:bg-brand-blue",
                )}
              >
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
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
