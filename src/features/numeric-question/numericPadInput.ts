/**
 * Pure input rules for the on-screen number pad. The pad holds the guess as plain text ("85.5", "74500") so a half-typed
 * decimal ("85.") survives between key presses; `parsePadText` turns it into the number that is sent.
 */

export type NumericPadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'backspace' | 'clear';

export interface NumericPadLimits {
  /** Decimals a guess may carry; 0 = whole numbers only (no decimal key). */
  precision: number;
  /** Most digits before the decimal point. */
  maxIntegerDigits: number;
}

export const DEFAULT_MAX_INTEGER_DIGITS = 8;

const DIGITS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);

export function applyNumericPadKey(text: string, key: NumericPadKey, limits: NumericPadLimits): string {
  if (key === 'clear') return '';
  if (key === 'backspace') return text.slice(0, -1);

  const dot = text.indexOf('.');
  if (key === '.') {
    if (limits.precision <= 0 || dot !== -1) return text;
    return text === '' ? '0.' : `${text}.`;
  }

  if (!DIGITS.has(key)) return text;
  if (dot !== -1) {
    return text.length - dot - 1 >= limits.precision ? text : `${text}${key}`;
  }
  // No leading zeros: "0" then "7" is "7", not "07".
  if (text === '0') return key;
  return text.length >= limits.maxIntegerDigits ? text : `${text}${key}`;
}

/** The guess the text stands for, or null while nothing has been typed. "12." reads as 12. */
export function parsePadText(text: string): number | null {
  if (text === '' || text === '.') return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** Physical-keyboard key → pad key (desktop players can type instead of tapping). */
export function numericPadKeyFromKeyboard(key: string): NumericPadKey | null {
  if (DIGITS.has(key)) return key as NumericPadKey;
  if (key === '.' || key === ',') return '.';
  if (key === 'Backspace') return 'backspace';
  if (key === 'Delete' || key === 'Escape') return 'clear';
  return null;
}

/** Decimals implied by a question's step (0.1 → 1, 0.25 → 2, 5 → 0), capped at 3. */
export function precisionFromStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0 || Number.isInteger(step)) return 0;
  const decimals = String(step).split('.')[1]?.length ?? 0;
  return Math.min(3, decimals);
}

/**
 * The typed text grouped for the reader's locale ("74500" → "74,500" / "74.500"), keeping a trailing decimal point
 * and typed decimals exactly as entered so the readout never jumps while typing.
 */
export function formatPadText(text: string, intlLocale: string): string {
  if (text === '') return '';
  const [integerPart, decimals] = text.split('.');
  const grouped = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 }).format(Number(integerPart || '0'));
  if (decimals === undefined) return grouped;
  const separator = new Intl.NumberFormat(intlLocale).formatToParts(1.5).find((part) => part.type === 'decimal')?.value ?? '.';
  return `${grouped}${separator}${decimals}`;
}
