'use client';

/**
 * Resolves the welcome-screen categories grid from the
 * useAllCategoriesList query. Filters out game-mode entries, picks
 * the FEATURED_NAMES list in order, then back-fills with the rest
 * until FEATURED_CATEGORY_LIMIT is hit. Returns three slices the
 * sections render directly.
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
    const allCategories = (categoriesData?.items ?? []).filter(
      (c) => !isWelcomeCategoryExcluded(c.slug, c.name),
    );
    const featuredCategories: typeof allCategories = [];
    const used = new Set<string>();

    // 1. Use admin-panel featured collection first (World Cup categories etc.)
    // Show ONLY the admin-panel featured collection (the World Cup set curated
    // in the CMS). We intentionally do NOT back-fill with league names or
    // arbitrary categories — the welcome grid mirrors exactly what's marked
    // featured, so non-featured leagues (Champions League, Premier League, …)
    // never leak onto the landing page.
    const adminFeatured = featuredData?.items ?? [];
    const sortedAdminFeatured = [...adminFeatured].sort(
      (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999),
    );
    for (const fc of sortedAdminFeatured) {
      const cat = fc.category;
      if (used.has(cat.id) || isWelcomeCategoryExcluded(cat.slug, cat.name)) continue;
      if (featuredCategories.length >= FEATURED_CATEGORY_LIMIT) break;
      featuredCategories.push(cat);
      used.add(cat.id);
    }

    // Trim to a multiple of the widest column count (4) so the grid never shows
    // a half-empty last row. The dropped ones fall back into `remaining`.
    const evenCount = Math.floor(featuredCategories.length / 4) * 4;
    const trimmed = featuredCategories.slice(evenCount);
    for (const cat of trimmed) used.delete(cat.id);
    featuredCategories.length = evenCount;

    const remainingCategories = allCategories.filter((c) => !used.has(c.id));

    return { allCategories, featuredCategories, remainingCategories };
  }, [categoriesData?.items, featuredData?.items]);

  return { allCategories, featuredCategories, remainingCategories };
}
