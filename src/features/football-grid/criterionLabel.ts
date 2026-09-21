import type { Locale } from '@/lib/i18n/messages';

interface LabelledCriterion {
  labelEn: string;
  labelKa: string;
  labelEs?: string | null;
  labelTr?: string | null;
}

/** Criterion label in the app locale; English when that language has no label yet. */
export function criterionLabel(criterion: LabelledCriterion, locale: Locale): string {
  switch (locale) {
    case 'ka':
      return criterion.labelKa || criterion.labelEn;
    case 'es':
      return criterion.labelEs || criterion.labelEn;
    case 'tr':
      return criterion.labelTr || criterion.labelEn;
    default:
      return criterion.labelEn;
  }
}

/** Shorten the relationship wording without dropping the club-only distinction. */
export function compactCriterionLabel(criterion: LabelledCriterion, locale: Locale): string {
  return criterionLabel(criterion, locale)
    .replace(/^Club teammate of (.+)$/, 'Club teammate · $1')
    .replace(/^Compañero de club de (.+)$/, 'Compañero de club · $1')
    .replace(/^(.+) ile aynı kulüpte oynadı$/, '$1 · aynı kulüp');
}
