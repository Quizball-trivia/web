import type { components } from "@/types/api.generated";

type I18nField = components["schemas"]["I18nField"];

export function getI18nText(
  field: I18nField | null | undefined,
  locale = "en",
): string {
  if (!field) return "";
  return field[locale] ?? field.en ?? Object.values(field)[0] ?? "";
}
