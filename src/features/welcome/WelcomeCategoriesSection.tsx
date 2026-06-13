'use client';

import Image from 'next/image';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/contexts/LocaleContext';
import { useActiveEventMode } from '@/lib/hooks/useActiveEventMode';
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

const EVENT_CATEGORY_IMAGE_SIZES = '(min-width: 1280px) 405px, (min-width: 768px) 30vw, 31vw';
const STANDARD_CATEGORY_IMAGE_SIZES = '(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw';

function WelcomeCategoriesSkeleton() {
  return (
    <section className="py-6 md:py-8" aria-hidden="true">
      <div>
        <div className="mb-6">
          <div className="h-6 w-56 rounded-md bg-white/10" />
          <div className="mt-2 h-4 w-44 rounded-md bg-white/5" />
        </div>
        <div className="grid grid-cols-3 gap-2.5 md:gap-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-2xl border border-white/10 bg-white/[0.04] md:aspect-auto md:min-h-[190px] md:max-h-[240px]"
            />
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <div className="h-11 w-64 rounded-xl bg-white/[0.06]" />
        </div>
      </div>
    </section>
  );
}

export function WelcomeCategoriesSection({
  allCategoriesCount,
  featuredCategories,
  hasRemaining,
  onCategorySelect,
  onBrowseAll,
}: WelcomeCategoriesSectionProps) {
  const { t } = useLocale();
  // Landing is region-free: the World Cup showcase renders for everyone while
  // the event flag is on (in-game surfaces keep the region-gated isEventMode).
  const { eventEnabled } = useActiveEventMode();
  if (featuredCategories.length === 0) return <WelcomeCategoriesSkeleton />;

  if (!eventEnabled) {
    return (
      <section className="px-6 py-12 md:py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-2xl md:text-3xl font-black text-white mb-3">
            {t('welcome.categoriesTitle')}
          </h2>
          <p className="text-center text-sm md:text-base text-white/60 font-medium mb-10">
            {t('welcome.categoriesSubtitle', { count: allCategoriesCount })}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {featuredCategories.map((cat, i) => {
              const style = getCategoryStyle(cat.slug, cat.name, i);
              const IconComponent = style.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-label={t('welcome.openCategory', { name: cat.name })}
                  className="group relative min-h-[124px] md:min-h-[138px] cursor-pointer overflow-hidden rounded-2xl border border-white/10 p-4 md:p-5 transition-all duration-200 hover:scale-[1.04] hover:-translate-y-1 hover:brightness-110 hover:border-white/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
                  style={{ backgroundColor: style.color }}
                  onClick={onCategorySelect}
                >
                  <CategoryArtwork
                    src={cat.imageUrl}
                    className="absolute inset-0"
                    displayWidth={320}
                    sizes={STANDARD_CATEGORY_IMAGE_SIZES}
                  />
                  {cat.imageUrl ? (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/18 to-black/10" />
                  ) : null}

                  {!cat.imageUrl && style.flag ? (
                    <Image
                      src={`https://flagcdn.com/w160/${style.flag}.png`}
                      alt=""
                      width={160}
                      height={120}
                      className="absolute -bottom-2 -right-2 w-20 md:w-24 opacity-[0.14] pointer-events-none rounded-sm"
                    />
                  ) : !cat.imageUrl && style.watermarkImg ? (
                    <Image
                      src={style.watermarkImg}
                      alt=""
                      width={120}
                      height={120}
                      className="absolute -bottom-2 -right-2 size-20 md:size-24 opacity-[0.14] pointer-events-none object-contain"
                    />
                  ) : !cat.imageUrl ? (
                    <IconComponent className="absolute -bottom-3 -right-3 size-24 md:size-28 opacity-[0.1] text-white pointer-events-none" />
                  ) : null}

                  <div className="relative z-10 flex h-full items-center justify-center text-center text-sm md:text-base font-black uppercase tracking-wide leading-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.45)]">
                    {cat.name}
                  </div>
                </button>
              );
            })}
          </div>

          {hasRemaining && (
            <div className="mt-8 text-center">
              <Button
                onClick={onBrowseAll}
                className="h-14 min-w-[280px] rounded-[20px] bg-brand-green-accessible px-10 font-poppins text-base font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green-accessible-hover hover:shadow-none"
              >
                {t('welcome.browseAllCategories', { count: allCategoriesCount })}
              </Button>
            </div>
          )}
        </div>
      </section>
    );
  }

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
        <div className="grid grid-cols-3 gap-2.5 md:gap-5">
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
                className="group relative aspect-[3/4] md:aspect-auto md:min-h-[190px] md:max-h-[240px] cursor-pointer overflow-hidden rounded-2xl border border-white/10 p-3 md:p-6 transition-all duration-200 hover:scale-[1.03] hover:-translate-y-1 hover:brightness-110 hover:border-brand-yellow/30 hover:shadow-[0_8px_40px_rgba(212,175,55,0.15)]"
                style={{ backgroundColor: style.color }}
                onClick={onCategorySelect}
              >
                <CategoryArtwork
                  src={cat.imageUrl}
                  className="absolute inset-0"
                  displayWidth={420}
                  sizes={EVENT_CATEGORY_IMAGE_SIZES}
                />
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

                <div className="relative z-10 flex h-full items-center justify-center text-center">
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
            className="mt-6 flex justify-center"
          >
            <Button
              onClick={onBrowseAll}
              className="h-11 rounded-xl bg-brand-green-accessible px-6 font-poppins text-sm font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green-accessible-hover hover:shadow-none"
            >
              {t('welcome.browseAllCategories', { count: allCategoriesCount })}
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
