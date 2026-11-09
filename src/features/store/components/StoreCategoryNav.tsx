"use client";

// StoreCategoryNav — sticky category chips + search for the store. Shared by
// the live /store and the /dev/store-examples preview so both browse the same
// way (the preview had this first; the live store was one long scroll).

import { Search, X } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";
import { SHOW_TICKETS } from "@/lib/tickets";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

export const STORE_CATEGORIES = ["all", "tickets", "jerseys", "hair", "glasses", "facialHair", "accessories"] as const;
export type StoreCategory = (typeof STORE_CATEGORIES)[number];

export function isStoreCategory(value: string | null | undefined): value is StoreCategory {
  return !!value && (STORE_CATEGORIES as readonly string[]).includes(value);
}

const LABELS: Record<StoreCategory, MessageKey> = {
  all: "store.categoryAll",
  tickets: "store.ticketsTitle",
  jerseys: "store.jerseysTitle",
  hair: "store.hairTitle",
  glasses: "store.glassesTitle",
  facialHair: "store.facialHairTitle",
  accessories: "store.accessoriesTitle",
};

interface StoreCategoryNavProps {
  category: StoreCategory;
  onCategoryChange: (category: StoreCategory) => void;
  search: string;
  onSearchChange: (search: string) => void;
  /** Categories to offer (e.g. the preview has no tickets). Defaults to all. */
  categories?: readonly StoreCategory[];
  affordableOnly?: boolean;
  /** Omit to hide the "Can afford" toggle. */
  onAffordableOnlyChange?: (value: boolean) => void;
  className?: string;
}

export function StoreCategoryNav({
  category,
  onCategoryChange,
  search,
  onSearchChange,
  categories = STORE_CATEGORIES,
  affordableOnly = false,
  onAffordableOnlyChange,
  className,
}: StoreCategoryNavProps) {
  const { t } = useLocale();
  const chip =
    "shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow";

  return (
    <nav
      aria-label={t("store.categoriesLabel")}
      // Sticky only from xl: below it AppShellFrame's page wrapper is
      // overflow-y-auto without a bounded height, so the document scrolls and a
      // sticky child would bind to the non-scrolling wrapper. Render it as a
      // direct child of the page column — a same-height wrapper pins it too.
      className={cn("z-20 -mx-4 border-b border-white/10 bg-background/95 px-4 py-3 backdrop-blur xl:sticky xl:top-0", className)}
    >
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {categories.filter((id) => SHOW_TICKETS || id !== "tickets").map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={category === id}
            onClick={() => onCategoryChange(id)}
            className={cn(
              chip,
              category === id
                ? "border-store-accent bg-store-accent text-white"
                : "border-white/15 text-white/80 hover:bg-white/[0.06]",
            )}
          >
            {t(LABELS[id])}
          </button>
        ))}
      </div>

      <div className="mt-2.5 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t("store.searchLabel")}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("store.searchPlaceholder")}
            className="h-10 w-full rounded-xl border border-white/15 bg-store-card pl-9 pr-9 text-sm text-white placeholder:text-white/40 focus:border-store-accent focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label={t("common.close")}
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-white/60 hover:text-white"
            >
              <X className="size-4" />
            </button>
          )}
        </label>
        {onAffordableOnlyChange && (
          <button
            type="button"
            aria-pressed={affordableOnly}
            onClick={() => onAffordableOnlyChange(!affordableOnly)}
            className={cn(
              chip,
              "h-10 py-0",
              affordableOnly
                ? "border-brand-yellow bg-brand-yellow text-black"
                : "border-white/15 text-white/80 hover:bg-white/[0.06]",
            )}
          >
            {t("store.canAfford")}
          </button>
        )}
      </div>
    </nav>
  );
}
