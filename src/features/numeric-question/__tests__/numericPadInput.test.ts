import { describe, expect, it } from 'vitest';
import {
  applyNumericPadKey,
  formatPadText,
  numericPadKeyFromKeyboard,
  parsePadText,
  precisionFromStep,
  type NumericPadKey,
} from '../numericPadInput';

const whole = { precision: 0, maxIntegerDigits: 8 };
const oneDecimal = { precision: 1, maxIntegerDigits: 8 };

const type = (keys: NumericPadKey[], limits = whole) => keys.reduce((text, key) => applyNumericPadKey(text, key, limits), '');

describe('applyNumericPadKey', () => {
  it('builds a whole number digit by digit', () => {
    expect(type(['7', '4', '5', '0', '0'])).toBe('74500');
  });

  it('drops a leading zero instead of keeping "07"', () => {
    expect(type(['0', '7'])).toBe('7');
    expect(type(['0', '0'])).toBe('0');
  });

  it('ignores the decimal key on whole-number questions', () => {
    expect(type(['8', '5', '.', '5'])).toBe('855');
  });

  it('allows one decimal point and no more decimals than the precision', () => {
    expect(type(['8', '5', '.', '5', '5'], oneDecimal)).toBe('85.5');
    expect(type(['8', '.', '.', '5'], oneDecimal)).toBe('8.5');
  });

  it('starts "0." when the decimal key comes first', () => {
    expect(type(['.', '5'], oneDecimal)).toBe('0.5');
  });

  it('caps the digits before the decimal point', () => {
    expect(type(['1', '2', '3'], { precision: 0, maxIntegerDigits: 2 })).toBe('12');
  });

  it('deletes and clears', () => {
    expect(applyNumericPadKey('745', 'backspace', whole)).toBe('74');
    expect(applyNumericPadKey('', 'backspace', whole)).toBe('');
    expect(applyNumericPadKey('745', 'clear', whole)).toBe('');
  });
});

describe('parsePadText', () => {
  it('reads nothing typed as no guess', () => {
    expect(parsePadText('')).toBeNull();
    expect(parsePadText('.')).toBeNull();
  });

  it('reads a trailing decimal point as the whole number', () => {
    expect(parsePadText('12.')).toBe(12);
    expect(parsePadText('85.5')).toBe(85.5);
  });
});

describe('numericPadKeyFromKeyboard', () => {
  it('maps digits, both decimal separators and editing keys', () => {
    expect(numericPadKeyFromKeyboard('4')).toBe('4');
    expect(numericPadKeyFromKeyboard(',')).toBe('.');
    expect(numericPadKeyFromKeyboard('.')).toBe('.');
    expect(numericPadKeyFromKeyboard('Backspace')).toBe('backspace');
    expect(numericPadKeyFromKeyboard('Escape')).toBe('clear');
    expect(numericPadKeyFromKeyboard('a')).toBeNull();
  });
});

describe('precisionFromStep', () => {
  it('derives decimals from the question step', () => {
    expect(precisionFromStep(1)).toBe(0);
    expect(precisionFromStep(500)).toBe(0);
    expect(precisionFromStep(0.1)).toBe(1);
    expect(precisionFromStep(0.25)).toBe(2);
    expect(precisionFromStep(0)).toBe(0);
  });
});

describe('formatPadText', () => {
  it('groups thousands for the locale and keeps typed decimals as entered', () => {
    expect(formatPadText('74500', 'en-GB')).toBe('74,500');
    expect(formatPadText('74500', 'de-DE')).toBe('74.500');
    expect(formatPadText('85.', 'en-GB')).toBe('85.');
    expect(formatPadText('85.5', 'de-DE')).toBe('85,5');
    expect(formatPadText('', 'en-GB')).toBe('');
  });
});
