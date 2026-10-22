import type { Locale } from '@/lib/i18n/locale';
import type { FootballGridCriterionView } from '@/lib/realtime/socket.types';
import wildcards from '@/data/football-grid/launch-assets/wildcards.seed.json';
import { criterionLabel } from './criterionLabel';

export function wildcardKey(criterion: FootballGridCriterionView): string | null {
  if (criterion.family !== 'wildcard') return null;
  return wildcards.find((item) => criterion.labelEn === item.labelEn ||
    [criterion.key, criterion.id, criterion.assetKey].some((key) =>
      key === item.id || key === `wildcard:${item.id}` || key?.endsWith(`/${item.id}.svg`)))?.id ?? null;
}

type Copy = Record<Locale, string>;
const copy = (locale: Locale, values: Copy) => values[locale];

/** Abbreviate the given name only; preserve compound surnames and the full clue on tap. */
function shortPersonName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const surname = parts.slice(1).join(' ');
  // Long surnames get the available two lines; a stranded first initial adds
  // no useful information. The full name remains the accessible/tap label.
  return Array.from(surname).length >= 10 ? surname : `${Array.from(parts[0])[0]}. ${surname}`;
}

export function criterionPresentation(criterion: FootballGridCriterionView, locale: Locale): { title: string; eyebrow?: string } {
  const label = criterionLabel(criterion, locale);
  if (criterion.family === 'country' && criterion.labelEn === 'United States') {
    return { title: copy(locale, { en: 'USA', ka: 'ა.შ.შ', es: 'EE. UU.', tr: 'ABD', ru: 'США', pt: 'EUA' }) };
  }
  if (criterion.family === 'club' && /Borussia M[oö]nchengladbach/i.test(criterion.labelEn)) {
    return { title: copy(locale, { en: 'M’gladbach', ka: 'გლადბახი', es: 'M’gladbach', tr: 'M’gladbach', ru: 'Мёнхенгладбах', pt: 'M’gladbach' }) };
  }
  if (criterion.family === 'manager') return {
    title: shortPersonName(label),
    eyebrow: copy(locale, { en: 'Managed by', ka: 'მწვრთნელი', es: 'Entrenador', tr: 'Teknik direktör', ru: 'Тренировал', pt: 'Treinado por' }),
  };
  if (criterion.family === 'trophy_award') {
    const titles: Record<string, Copy> = {
      'fa-cup': { en: 'FA Cup', ka: 'FA თასი', es: 'FA Cup', tr: 'FA Cup', ru: 'Кубок Англии', pt: 'Copa da Inglaterra' },
      'copa-del-rey': { en: 'Copa del Rey', ka: 'სამეფო თასი', es: 'Copa del Rey', tr: 'Kral Kupası', ru: 'Кубок Испании', pt: 'Copa do Rei' },
      'coppa-italia': { en: 'Coppa Italia', ka: 'იტალიის თასი', es: 'Copa Italia', tr: 'İtalya Kupası', ru: 'Кубок Италии', pt: 'Copa da Itália' },
      'dfb-pokal': { en: 'DFB-Pokal', ka: 'DFB თასი', es: 'DFB-Pokal', tr: 'DFB-Pokal', ru: 'Кубок Германии', pt: 'Copa da Alemanha' },
      'knvb-cup': { en: 'KNVB Cup', ka: 'KNVB თასი', es: 'Copa KNVB', tr: 'KNVB Kupası', ru: 'Кубок Нидерландов', pt: 'Copa da Holanda' },
      'uefa-champions-league': { en: 'Champions League', ka: 'ჩემპიონთა ლიგა', es: 'Champions League', tr: 'Şampiyonlar Ligi', ru: 'Лига чемпионов', pt: 'Champions League' },
      'uefa-europa-league': { en: 'Europa League', ka: 'ევროპა ლიგა', es: 'Europa League', tr: 'Avrupa Ligi', ru: 'Лига Европы', pt: 'Liga Europa' },
      'premier-league-title': { en: 'Premier League', ka: 'პრემიერ ლიგა', es: 'Premier League', tr: 'Premier Lig', ru: 'Премьер-лига', pt: 'Premier League' },
    };
    const titleKey = Object.keys(titles).find((key) => criterion.key === `trophy:${key}` || criterion.assetKey === key);
    return {
      title: titleKey ? titles[titleKey][locale] : label.replace(/ winner$| გამარჯვებული$| Şampiyonu$/i, '').replace(/^(?:Campeón|Campeão)\s+(?:(?:de la|del|da|do|de)\s+)?/i, ''),
      eyebrow: copy(locale, { en: 'Winner', ka: 'მფლობელი', es: 'Ganador', tr: 'Kazanan', ru: 'Победитель', pt: 'Vencedor' }),
    };
  }
  if (criterion.family === 'teammate') {
    const patterns = [
      /^Club teammate of (.+)$/,
      /^ერთ კლუბში ითამაშა (.+?)(?:-სთან|სთან)$/,
      /^(.+?)(?:ს)? თანაგუნდელი კლუბში$/,
      /^Compañero de club de (.+)$/,
      /^Jugó con (.+)$/,
      /^Companheiro de clube de (.+)$/,
      /^Jogou com (.+)$/,
      /^(.+) ile aynı kulüpte oynadı$/,
      /^(.+) ile oynadı$/,
    ];
    const name = patterns.map((pattern) => label.match(pattern)?.[1]).find(Boolean);
    if (name) return {
      title: shortPersonName(name),
      eyebrow: copy(locale, { en: 'Club teammate', ka: 'თანაგუნდელი კლუბში', es: 'Compañero de club', tr: 'Kulüp arkadaşı', ru: 'Одноклубник', pt: 'Companheiro de clube' }),
    };
  }
  const key = wildcardKey(criterion);
  const decade = key?.match(/^born-(\d{3})0s$/)?.[1];
  if (decade) return {
    title: `${decade}0–${decade.slice(-1)}9`,
    eyebrow: copy(locale, { en: 'Born', ka: 'დაბადება', es: 'Nacimiento', tr: 'Doğum', ru: 'Родился', pt: 'Nascido' }),
  };
  if (key === 'titles-multiple-countries') return {
    title: copy(locale, { en: '2+ countries', ka: '2+ ქვეყანა', es: '2+ países', tr: '2+ ülke', ru: '2+ стран', pt: '2+ países' }),
    eyebrow: copy(locale, { en: 'League champion', ka: 'ლიგის ჩემპიონი', es: 'Campeón de liga', tr: 'Lig şampiyonu', ru: 'Чемпион лиги', pt: 'Campeão da liga' }),
  };
  if (key === 'champions-league-2plus') return {
    title: copy(locale, { en: '2+ UCL titles', ka: '2+ UCL ტიტული', es: '2+ títulos UCL', tr: '2+ UCL kupası', ru: '2+ титула Лиги чемпионов', pt: '2+ títulos da Champions' }),
  };
  if (key === 'ballon-dor-winner') return {
    title: copy(locale, { en: 'Ballon d’Or', ka: 'ოქროს ბურთი', es: 'Balón de Oro', tr: 'Ballon d’Or', ru: 'Золотой мяч', pt: 'Bola de Ouro' }),
    eyebrow: copy(locale, { en: 'Winner', ka: 'მფლობელი', es: 'Ganador', tr: 'Kazanan', ru: 'Победитель', pt: 'Vencedor' }),
  };
  if (key === 'international-caps-100') return {
    title: copy(locale, { en: '100+ caps', ka: '100+ მატჩი', es: '100+ partidos', tr: '100+ maç', ru: '100+ матчей за сборную', pt: '100+ jogos' }),
    eyebrow: copy(locale, { en: 'National team', ka: 'ნაკრებში', es: 'Selección', tr: 'Millî takım', ru: 'Сборная', pt: 'Seleção' }),
  };
  if (key === 'major-leagues-3') return {
    title: copy(locale, { en: '3+ top leagues', ka: '3+ ტოპ ლიგა', es: '3+ grandes ligas', tr: '3+ büyük lig', ru: '3+ ведущих лиг', pt: '3+ grandes ligas' }),
  };
  if (key === 'played-for-rivals') return {
    title: copy(locale, { en: 'Both rivals', ka: 'ორივე მეტოქე', es: 'Ambos rivales', tr: 'İki rakip', ru: 'Оба соперника', pt: 'Ambos os rivais' }),
    eyebrow: copy(locale, { en: 'Derby', ka: 'დერბი', es: 'Derbi', tr: 'Derbi', ru: 'Дерби', pt: 'Clássico' }),
  };
  return { title: label };
}
