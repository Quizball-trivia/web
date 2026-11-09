"use client";

// StorePartSections — the avatar-part grids (kits, hair, accessories, glasses,
// facial hair) with category / search / "can afford" filtering applied. Kept
// out of StoreScreen so the filtering runs on plain props here instead of on
// StoreScreen's memoized state.

import { motion } from "motion/react";
import { useLocale } from "@/contexts/LocaleContext";
import {
  EXTRA_PARTS,
  FACIAL_HAIR_PARTS,
  GLASSES_PARTS,
  HAIR_PARTS,
  JERSEY_DESIGN_PARTS,
  type AvatarPart,
} from "@/lib/avatars/parts";
import type { MessageKey } from "@/lib/i18n/messages";
import type { AvatarCustomization } from "@/types/game";
import { ItemCard } from "./ItemCard";
import type { StoreCategory } from "./StoreCategoryNav";

const SPRING = { type: "spring", stiffness: 200, damping: 20 } as const;

const POPPINS_HEADER = {
  fontFamily: "'Poppins', sans-serif",
  fontWeight: 600,
  letterSpacing: "0",
  lineHeight: 1,
} as const;

interface SectionConfig {
  key: string;
  category: StoreCategory;
  title: MessageKey;
  parts: readonly AvatarPart[];
  /** Hair is the only list that carries free starter parts we don't sell. */
  hideFree?: boolean;
  imageSize?: "lg";
  mannequin?: boolean;
  delay: number;
}

// Kits are the headline items: straight after tickets, before the smaller cosmetics.
const SECTIONS: readonly SectionConfig[] = [
  { key: "jerseys", category: "jerseys", title: "store.jerseysTitle", parts: JERSEY_DESIGN_PARTS, imageSize: "lg", delay: 0.15 },
  { key: "hair", category: "hair", title: "store.hairTitle", parts: HAIR_PARTS, hideFree: true, mannequin: true, delay: 0.2 },
  { key: "headwear", category: "accessories", title: "store.headwearTitle", parts: EXTRA_PARTS.filter((p) => p.slot === "headwear"), mannequin: true, delay: 0.25 },
  { key: "accessories", category: "accessories", title: "store.accessoriesTitle", parts: EXTRA_PARTS.filter((p) => p.slot !== "headwear"), mannequin: true, delay: 0.25 },
  { key: "glasses", category: "glasses", title: "store.glassesTitle", parts: GLASSES_PARTS, mannequin: true, delay: 0.3 },
  { key: "facialHair", category: "facialHair", title: "store.facialHairTitle", parts: FACIAL_HAIR_PARTS, mannequin: true, delay: 0.35 },
];

const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();

interface StorePartSectionsProps {
  category: StoreCategory;
  /** Trimmed search text ("" = no search). */
  search: string;
  affordableOnly: boolean;
  /** The dev preview also lists local-only (unreleased) parts. */
  includeLocalOnly: boolean;
  ownedPartIds: ReadonlySet<string>;
  customization: AvatarCustomization;
  priceFor: (part: AvatarPart) => number | undefined;
  canAfford: (price: number | undefined) => boolean;
  translateName: (name: string) => string;
  onSelect: (part: AvatarPart) => void;
  /** Render "nothing matches" when every section is filtered out. */
  showEmptyState: boolean;
  /** When set, the empty state offers a reset button. */
  onClearFilters?: () => void;
}

export function StorePartSections({
  category,
  search,
  affordableOnly,
  includeLocalOnly,
  ownedPartIds,
  customization,
  priceFor,
  canAfford,
  translateName,
  onSelect,
  showEmptyState,
  onClearFilters,
}: StorePartSectionsProps) {
  const { t } = useLocale();
  const needle = normalize(search);

  const visible = (part: AvatarPart, hideFree: boolean) => {
    if (hideFree && part.free) return false;
    if (part.localOnly && !includeLocalOnly) return false;
    if (needle && !normalize(part.name).includes(needle) && !normalize(translateName(part.name)).includes(needle)) return false;
    if (affordableOnly) {
      const price = priceFor(part);
      if (ownedPartIds.has(part.id) || !price || !canAfford(price)) return false;
    }
    return true;
  };

  const sections = SECTIONS
    .filter((section) => category === "all" || category === section.category)
    .map((section) => ({ ...section, items: section.parts.filter((part) => visible(part, Boolean(section.hideFree))) }))
    .filter((section) => section.items.length > 0);

  if (sections.length === 0) {
    if (!showEmptyState) return null;
    return (
      <div className="rounded-2xl border border-white/10 px-6 py-12 text-center font-poppins">
        <p className="text-base font-semibold text-white">{t("store.noResults")}</p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="mt-4 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/[0.06]"
          >
            {t("store.clearFilters")}
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {sections.map((section) => (
        <motion.section
          key={section.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: section.delay }}
        >
          <h3 className="mb-6 text-[28px] uppercase text-white sm:text-[32px]" style={POPPINS_HEADER}>
            {t(section.title)}
          </h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {section.items.map((part, i) => {
              const price = priceFor(part);
              return (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: section.delay + Math.min(i, 12) * 0.03 }}
                >
                  <ItemCard
                    name={translateName(part.name)}
                    asset={part.asset}
                    price={price ? price.toLocaleString() : "—"}
                    imageSize={section.imageSize}
                    mannequinPart={section.mannequin ? part : undefined}
                    owned={ownedPartIds.has(part.id)}
                    equipped={customization[part.slot as keyof AvatarCustomization] === part.id}
                    onBuy={() => onSelect(part)}
                  />
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      ))}
    </>
  );
}
