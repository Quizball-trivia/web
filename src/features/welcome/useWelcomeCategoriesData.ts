'use client';

/**
 * Resolves the welcome-screen categories grid from the
 * useAllCategoriesList query. Filters out game-mode/daily-challenge
 * entries AND the admin-featured (World Cup event) collection, then
 * shows the first FEATURED_CATEGORY_LIMIT general categories.
 */

import { useMemo } from 'react';

import { useAllCategoriesList } from '@/lib/queries/categories.queries';
import { useFeaturedCategories } from '@/lib/queries/featuredCategories.queries';
import { FEATURED_CATEGORY_LIMIT } from './welcome.content';
import { isWelcomeCategoryExcluded } from './welcome.helpers';

export function useWelcomeCategoriesData() {
  const { data: categoriesData } = useAllCategoriesList({ limit: 100, is_active: 'true' });
  const { data: featuredData } = useFeaturedCategories();

  const { allCategories, featuredCategories, remainingCategories } = useMemo(() => {
    // The admin-featured collection held the World Cup event set — with the
    // event over it is HIDDEN from the landing grid instead of being its
    // source. The grid now shows general categories (minus game-mode /
    // daily-challenge entries, which isWelcomeCategoryExcluded strips).
    const adminFeaturedIds = new Set(
      (featuredData?.items ?? []).map((fc) => fc.category.id),
    );
    const allCategories = (categoriesData?.items ?? []).filter(
      (c) => !isWelcomeCategoryExcluded(c.slug, c.name) && !adminFeaturedIds.has(c.id),
    );
    const featuredCategories: typeof allCategories = [];
    const used = new Set<string>();

    for (const cat of allCategories) {
      if (featuredCategories.length >= FEATURED_CATEGORY_LIMIT) break;
      featuredCategories.push(cat);
      used.add(cat.id);
    }

    // Trim to a multiple of 12 so every grid breakpoint (2 / 3 / 4 columns)
    // fills its last row. The dropped ones fall back into `remaining`.
    const evenCount = Math.floor(featuredCategories.length / 12) * 12;
    const trimmed = featuredCategories.slice(evenCount);
    for (const cat of trimmed) used.delete(cat.id);
    featuredCategories.length = evenCount;

    const remainingCategories = allCategories.filter((c) => !used.has(c.id));

    return { allCategories, featuredCategories, remainingCategories };
  }, [categoriesData?.items, featuredData?.items]);

  return { allCategories, featuredCategories, remainingCategories };
}
