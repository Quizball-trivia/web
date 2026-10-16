/** A player's name in the app locale: the Georgian or Russian name when the content has one, else the canonical English name. */
export function localizedPlayerName(locale: string, english: string, names: { nameKa?: string | null; nameRu?: string | null }): string {
  if (locale === 'ka' && names.nameKa) return names.nameKa;
  if (locale === 'ru' && names.nameRu) return names.nameRu;
  return english;
}
