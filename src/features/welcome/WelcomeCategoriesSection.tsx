'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/contexts/LocaleContext';
import { CategoryArtwork } from './CategoryArtwork';
import { getCategoryStyle } from './welcome.helpers';

interface CategoryItem {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string | null;
}

interface WelcomeCategoriesSectionProps {
  allCategoriesCount: number;
  featuredCategories: CategoryItem[];
  hasRemaining: boolean;
  onCategorySelect: () => void;
  onBrowseAll: () => void;
}

/** Hand-picked 15 World Cup slugs to showcase on the landing page. */
const WC_SHOWCASE_SLUGS = [
  'brazil-world-cup',
  'maradona-world-cup',
  'world-cup-captains',
  'world-cup-crests',
  'world-cup-stadiums',
  'soviet-union-world-cup',
  'netherlands-world-cup',
  'ronaldo-world-cup',
  'world-cup-records',
  'mexico-1970',
  'west-germany-1974',
  'world-cup-korea-japan-2002',
  'world-cup-south-africa-2010',
  'world-cup-russia-2018',
  'world-cup-qatar-2022',
];

export function WelcomeCategoriesSection({
  allCategoriesCount,
  featuredCategories,
  hasRemaining,
  onCategorySelect,
  onBrowseAll,
}: WelcomeCategoriesSectionProps) {
  const { t } = useLocale();
  if (featuredCategories.length === 0) return null;

  // Pick the 15 showcase categories in order, falling back to whatever's available
  const showcaseMap = new Map(featuredCategories.map((c) => [c.slug, c]));
  const showcase: CategoryItem[] = [];
  for (const slug of WC_SHOWCASE_SLUGS) {
    const cat = showcaseMap.get(slug);
    if (cat && showcase.length < 15) showcase.push(cat);
  }
  // If admin didn't have all 15, backfill from featured
  if (showcase.length < 15) {
    const used = new Set(showcase.map((c) => c.id));
    for (const cat of featuredCategories) {
      if (showcase.length >= 15) break;
      if (!used.has(cat.id)) { showcase.push(cat); used.add(cat.id); }
    }
  }

  return (
    <section className="py-6 md:py-8">
      <div>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <h2 className="text-lg md:text-xl font-black uppercase tracking-wide text-white mb-1">
            {t('welcome.categoriesTitle')}
          </h2>
          <p className="text-xs md:text-sm text-white/50 font-medium">
            {t('welcome.categoriesSubtitle', { count: allCategoriesCount })}
          </p>
        </motion.div>

        {/* 3-per-row grid, bigger cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {showcase.map((cat, i) => {
            const style = getCategoryStyle(cat.slug, cat.name, i);
            const IconComponent = style.icon;
            return (
              <motion.button
                key={cat.id}
                type="button"
                aria-label={t('welcome.openCategory', { name: cat.name })}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="group relative min-h-[160px] md:min-h-[190px] cursor-pointer overflow-hidden rounded-2xl border border-white/10 p-5 md:p-6 transition-all duration-200 hover:scale-[1.03] hover:-translate-y-1 hover:brightness-110 hover:border-brand-yellow/30 hover:shadow-[0_8px_40px_rgba(212,175,55,0.15)]"
                style={{ backgroundColor: style.color }}
                onClick={onCategorySelect}
              >
                <CategoryArtwork src={cat.imageUrl} className="absolute inset-0" />
                {cat.imageUrl ? (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
                ) : null}

                {!cat.imageUrl && style.flag ? (
                  <Image
                    src={`https://flagcdn.com/w160/${style.flag}.png`}
                    alt=""
                    width={160}
                    height={120}
                    className="absolute -bottom-2 -right-2 w-24 md:w-28 opacity-[0.14] pointer-events-none rounded-sm"
                  />
                ) : !cat.imageUrl && style.watermarkImg ? (
                  <Image
                    src={style.watermarkImg}
                    alt=""
                    width={120}
                    height={120}
                    className="absolute -bottom-2 -right-2 size-24 md:size-28 opacity-[0.14] pointer-events-none object-contain"
                  />
                ) : !cat.imageUrl ? (
                  <IconComponent className="absolute -bottom-3 -right-3 size-28 md:size-32 opacity-[0.1] text-white pointer-events-none" />
                ) : null}

                <div className="relative z-10 flex h-full items-end">
                  <span className="text-base md:text-lg font-black uppercase tracking-wide leading-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.5)]">
                    {cat.name}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* CTA */}
        {hasRemaining && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-6"
          >
            <Button
              onClick={onBrowseAll}
              className="h-11 rounded-xl bg-brand-green px-6 font-poppins text-sm font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none"
            >
              {t('welcome.browseAllCategories', { count: allCategoriesCount })}
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
