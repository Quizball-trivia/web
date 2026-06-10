'use client';

import Image from 'next/image';
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

export function WelcomeCategoriesSection({
  allCategoriesCount,
  featuredCategories,
  hasRemaining,
  onCategorySelect,
  onBrowseAll,
}: WelcomeCategoriesSectionProps) {
  const { t } = useLocale();
  if (featuredCategories.length === 0) return null;
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
                <CategoryArtwork src={cat.imageUrl} fit="cover" className="absolute inset-0" />
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
              className="h-14 min-w-[280px] rounded-[20px] bg-brand-green px-10 font-poppins text-base font-semibold uppercase tracking-wide text-white shadow-none transition-colors hover:bg-brand-green/90 hover:shadow-none"
            >
              {t('welcome.browseAllCategories', { count: allCategoriesCount })}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
