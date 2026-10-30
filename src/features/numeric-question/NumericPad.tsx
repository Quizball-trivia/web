'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { intlNumberLocale } from '@/features/aproximado/aproximado.copy';
import {
  applyNumericPadKey,
  DEFAULT_MAX_INTEGER_DIGITS,
  formatPadText,
  numericPadKeyFromKeyboard,
  parsePadText,
  type NumericPadKey,
} from './numericPadInput';

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 } as const;

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';
const INTERACTIVE_SELECTOR = 'button, a[href], [role="button"]';

const DIGIT_ROWS: NumericPadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export interface NumericPadProps {
  /** Decimals a guess may carry; 0 hides the decimal key. */
  precision: number;
  unit: string;
  /** The guess is in: keys and the lock-in button stop responding. */
  locked: boolean;
  /** Out of time or otherwise not answerable (e.g. match paused). */
  disabled?: boolean;
  /** Shorter readout, keys and button (opt-in: the zone match's question sheet over its 3D view). */
  compact?: boolean;
  onSubmit: (value: number) => void;
}

/**
 * On-screen number pad for numeric questions: a readout, a 3×4 key grid and a lock-in button. Digits from a physical
 * keyboard work too (Enter locks in), so desktop players can type. Typing never shows a range, so the pad gives
 * nothing away about the answer's scale.
 */
export function NumericPad({ precision, unit, locked, disabled = false, compact = false, onSubmit }: NumericPadProps) {
  const { t, locale } = useLocale();
  const [text, setText] = useState('');
  const inactive = locked || disabled;
  const guess = parsePadText(text);

  const press = useCallback(
    (key: NumericPadKey) => {
      if (inactive) return;
      setText((current) => applyNumericPadKey(current, key, { precision, maxIntegerDigits: DEFAULT_MAX_INTEGER_DIGITS }));
    },
    [inactive, precision],
  );

  const submit = useCallback(() => {
    if (inactive || guess === null) return;
    onSubmit(guess);
  }, [guess, inactive, onSubmit]);

  useEffect(() => {
    if (inactive) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(EDITABLE_SELECTOR)) return;
      if (event.key === 'Enter') {
        // A focused control (a pad key reached with Tab, the mute button…)
        // keeps its own Enter; only an unfocused page locks the guess in.
        if (target?.closest(INTERACTIVE_SELECTOR)) return;
        event.preventDefault();
        submit();
        return;
      }
      const key = numericPadKeyFromKeyboard(event.key);
      if (!key) return;
      event.preventDefault();
      press(key);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inactive, press, submit]);

  return (
    <div className={cn('flex w-full flex-col', compact ? 'gap-2' : 'gap-3')}>
      <div
        aria-live="polite"
        className={cn(
          'flex flex-col items-center justify-center rounded-[20px] px-4 text-center transition-colors',
          compact ? 'h-[58px]' : 'h-[76px]',
          locked ? 'bg-brand-green' : 'bg-brand-blue',
        )}
      >
        <div
          className={cn('max-w-full truncate leading-none tabular-nums text-white', compact ? 'text-[28px]' : 'text-[34px]', !text && 'text-white/40')}
          style={poppins}
        >
          {text ? formatPadText(text, intlNumberLocale(locale)) : '?'}
        </div>
        {unit && (
          <div className={cn('text-[11px] uppercase tracking-[0.12em] text-white/70', compact ? 'mt-1' : 'mt-1.5')} style={poppins}>
            {unit}
          </div>
        )}
      </div>

      <div className={cn('grid grid-cols-3 transition-opacity', compact ? 'gap-1.5' : 'gap-2', inactive && 'opacity-40')}>
        {DIGIT_ROWS.flat().map((key) => (
          <PadKey key={key} label={key} compact={compact} disabled={inactive} onPress={() => press(key)} />
        ))}
        {precision > 0 ? (
          <PadKey label="." ariaLabel={t('numericDraft.padDecimal')} compact={compact} disabled={inactive} onPress={() => press('.')} />
        ) : (
          <span aria-hidden />
        )}
        <PadKey label="0" compact={compact} disabled={inactive} onPress={() => press('0')} />
        <PadKey
          label={<Delete className="size-5" />}
          ariaLabel={t('numericDraft.padDelete')}
          compact={compact}
          disabled={inactive}
          onPress={() => press('backspace')}
        />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={inactive || guess === null}
        className={cn(
          compact ? 'h-12' : 'h-14',
          'w-full rounded-[20px] uppercase text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60',
          locked ? 'bg-brand-green/40' : 'bg-brand-green hover:bg-brand-green-deep disabled:opacity-45 disabled:hover:bg-brand-green',
        )}
        style={{ ...poppins, fontSize: 16, letterSpacing: '0.06em' }}
      >
        {locked ? t('numericDraft.lockedIn') : t('numericDraft.lockIn')}
      </button>
    </div>
  );
}

function PadKey({
  label,
  ariaLabel,
  compact = false,
  disabled,
  onPress,
}: {
  label: ReactNode;
  ariaLabel?: string;
  compact?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.94 }}
      // Tapping a key must not focus it: a focused key would claim the next
      // Enter for itself instead of letting Enter lock the guess in. It also
      // drops focus from whatever was clicked before (e.g. mute), for the same
      // reason; keys reached with Tab keep their native Enter.
      onMouseDown={(event) => {
        event.preventDefault();
        const focused = document.activeElement;
        if (focused instanceof HTMLElement && focused !== document.body) focused.blur();
      }}
      onClick={onPress}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'flex items-center justify-center rounded-2xl bg-white/[0.07] tabular-nums text-white outline-none transition-colors hover:bg-white/[0.12] focus-visible:ring-2 focus-visible:ring-white/60 disabled:hover:bg-white/[0.07]',
        compact ? 'h-[42px] text-xl' : 'h-[52px] text-2xl',
      )}
      style={poppins}
    >
      {label}
    </motion.button>
  );
}
