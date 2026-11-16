/** A player's name in the app locale: the Georgian, Russian or Greek name when the content has one, else the canonical English name. */
export function localizedPlayerName(locale: string, english: string, names: { nameKa?: string | null; nameRu?: string | null; nameEl?: string | null }): string {
  if (locale === 'ka' && names.nameKa) return names.nameKa;
  if (locale === 'ru' && names.nameRu) return names.nameRu;
  if (locale === 'el' && names.nameEl) return names.nameEl;
  return english;
}
