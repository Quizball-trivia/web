interface CountryFlagProps {
  code: string;
  shape?: '3x2' | '1x1';
  className?: string;
}

export function CountryFlag({ code, shape = '3x2', className = '' }: CountryFlagProps) {
  return (
    <span
      aria-hidden
      className={`fi fi-${code.toLowerCase()} fi-${shape} ${className}`}
    />
  );
}
