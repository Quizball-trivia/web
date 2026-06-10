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
import { FEATURED_CATEGORY_LIMIT, FEATURED_NAMES } from './welcome.content';
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
    const adminFeatured = featuredData?.items ?? [];
    const sortedAdminFeatured = [...adminFeatured].sort(
      (a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999),
    );
    for (const fc of sortedAdminFeatured) {
      const cat = fc.category;
      if (used.has(cat.id) || isWelcomeCategoryExcluded(cat.slug, cat.name)) continue;
      featuredCategories.push(cat);
      used.add(cat.id);
    }

    // 2. If admin featured filled the grid, skip the hardcoded fallback
    if (featuredCategories.length < FEATURED_CATEGORY_LIMIT) {
      for (const search of FEATURED_NAMES) {
        if (featuredCategories.length >= FEATURED_CATEGORY_LIMIT) break;
        const normalizedSearch = search.toLowerCase();
        const normalizedSlugSearch = normalizedSearch.replace(/\s+/g, '-');
        const exactMatch = allCategories.find(
          (c) => !used.has(c.id) && (c.name.toLowerCase() === normalizedSearch || c.slug === normalizedSlugSearch),
        );
        const match = exactMatch ?? allCategories.find(
          (c) => !used.has(c.id) && (c.name.toLowerCase().includes(normalizedSearch) || c.slug.includes(normalizedSlugSearch)),
        );
        if (match && !used.has(match.id)) {
          featuredCategories.push(match);
          used.add(match.id);
        }
      }
    }

    // 3. Back-fill with remaining categories if still under the limit
    if (featuredCategories.length < FEATURED_CATEGORY_LIMIT) {
      const fillerCategories = [
        ...allCategories.filter((c) => !used.has(c.id) && Boolean(c.imageUrl)),
        ...allCategories.filter((c) => !used.has(c.id) && !c.imageUrl),
      ];
      for (const category of fillerCategories) {
        if (featuredCategories.length >= FEATURED_CATEGORY_LIMIT) break;
        featuredCategories.push(category);
        used.add(category.id);
      }
    }

    const remainingCategories = allCategories.filter((c) => !used.has(c.id));

    return { allCategories, featuredCategories, remainingCategories };
  }, [categoriesData?.items, featuredData?.items]);

  return { allCategories, featuredCategories, remainingCategories };
}
