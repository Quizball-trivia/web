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
