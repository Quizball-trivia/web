/** French sets a non-breaking space before a colon or percent sign; the other languages here do not. */
export const labelColon = (locale: string): string => (locale === "fr" ? "\u00a0:" : ":");
export const percentText = (value: number | string, locale: string): string => `${value}${locale === "fr" ? "\u00a0" : ""}%`;
/** A fixed-decimals number in the reader's own format ("19.5", "19,5"). */
export const decimalText = (value: number, decimals: number, locale: string): string =>
  new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
