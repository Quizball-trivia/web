interface CountryFlagProps {
  code: string;
  shape?: '3x2' | '1x1';
  className?: string;
  /** Optional inline style — used to override the library's default
   *  `background-size: contain` to `cover` when filling a fixed chip. */
  style?: React.CSSProperties;
}

export function CountryFlag({ code, shape = '3x2', className = '', style }: CountryFlagProps) {
  return (
    <span
      aria-hidden
      className={`fi fi-${code.toLowerCase()} fi-${shape} ${className}`}
      style={style}
    />
  );
}
