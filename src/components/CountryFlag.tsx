import { normalizeCountryCode } from '@/lib/geo/countryCode';

interface CountryFlagProps {
  code: string;
  shape?: '3x2' | '1x1';
  className?: string;
  /** Optional inline style — used to override the default
   *  `background-size: contain` to `cover` when filling a fixed chip. */
  style?: React.CSSProperties;
}

export function CountryFlag({ code, shape = '3x2', className = '', style }: CountryFlagProps) {
  // The local collection also contains regional football flags (gb-eng,
  // gb-sct, es-pv). Keep these instead of reducing them to a national flag.
  const regionalCode = code.trim().toLowerCase();
  const normalizedCode = /^[a-z]{2}-[a-z0-9]{2,3}$/.test(regionalCode) ? regionalCode : normalizeCountryCode(code);
  if (!normalizedCode) return null;

  return (
    <span
      aria-hidden
      className={`relative inline-block bg-contain bg-center bg-no-repeat leading-none ${shape === '1x1' ? 'w-[1em]' : 'w-[1.333333em]'} ${className}`}
      style={{ backgroundImage: `url("/assets/football-grid/flags/${normalizedCode}.svg")`, ...style }}
    >
      {"\u00a0"}
    </span>
  );
}
