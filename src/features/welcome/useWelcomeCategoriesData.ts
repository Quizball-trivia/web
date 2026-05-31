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
import { FEATURED_CATEGORY_LIMIT, FEATURED_NAMES } from './welcome.content';
import { isWelcomeCategoryExcluded } from './welcome.helpers';

export function useWelcomeCategoriesData() {
  const { data: categoriesData } = useAllCategoriesList({ limit: 100, is_active: 'true' });

  const { allCategories, featuredCategories, remainingCategories } = useMemo(() => {
    const allCategories = (categoriesData?.items ?? []).filter(
      (c) => !isWelcomeCategoryExcluded(c.slug, c.name),
    );
    const featuredCategories: typeof allCategories = [];
    const used = new Set<string>();
    for (const search of FEATURED_NAMES) {
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
    const fillerCategories = [
      ...allCategories.filter((c) => !used.has(c.id) && Boolean(c.imageUrl)),
      ...allCategories.filter((c) => !used.has(c.id) && !c.imageUrl),
    ];
    for (const category of fillerCategories) {
      if (featuredCategories.length >= FEATURED_CATEGORY_LIMIT) break;
      featuredCategories.push(category);
      used.add(category.id);
    }
    const remainingCategories = allCategories.filter((c) => !used.has(c.id));

    return { allCategories, featuredCategories, remainingCategories };
  }, [categoriesData?.items]);

  return { allCategories, featuredCategories, remainingCategories };
}
