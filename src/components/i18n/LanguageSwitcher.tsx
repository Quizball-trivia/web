"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, isLocale, type Locale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  // Server-rendered fallback locale used on the very first paint. After
  // mount the component derives the active locale from usePathname() so
  // the active highlight follows client-side navigation without forcing
  // the root layout to re-render.
  locale: Locale;
  className?: string;
}

// Short, all-caps labels for the segmented toggle. Flag classes come from
// `flag-icons` (already imported globally in app/layout.tsx).
const SHORT: Record<Locale, string> = {
  en: "EN",
  ka: "KA",
};
const FLAG: Record<Locale, string> = {
  en: "fi-gb",
  ka: "fi-ge",
};
const FULL_NAME: Record<Locale, string> = {
  en: "English",
  ka: "ქართული",
};

// Swap the leading /:locale segment of the current path with the target locale.
function swapLocale(pathname: string, target: Locale): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0 || !isLocale(segments[0])) {
    return `/${target}`;
  }
  segments[0] = target;
  return `/${segments.join("/")}`;
}

export function LanguageSwitcher({ locale, className }: LanguageSwitcherProps) {
  const pathname = usePathname() ?? `/${locale}`;
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  const activeLocale: Locale = isLocale(firstSegment) ? firstSegment : locale;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-[14px] bg-surface-deep p-1 text-xs font-black uppercase tracking-wide",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((code) => {
        const active = code === activeLocale;
        const href = swapLocale(pathname, code);
        return (
          <Link
            key={code}
            href={href}
            hrefLang={code}
            lang={code}
            aria-label={FULL_NAME[code]}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 transition-colors",
              active
                ? "bg-brand-blue text-white"
                : "text-white/55 hover:text-white",
            )}
          >
            <span className={`fi ${FLAG[code]} !w-3.5 !h-3.5 rounded-[2px]`} aria-hidden />
            <span>{SHORT[code]}</span>
          </Link>
        );
      })}
    </div>
  );
}
