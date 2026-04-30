import Image from "next/image";

interface CoinIconProps {
  /** Pixel size (square). */
  size?: number;
  className?: string;
}

/**
 * Small coin icon used inside price pills (matches the coin asset from Figma).
 */
export function CoinIcon({ size = 24, className = "" }: CoinIconProps) {
  return (
    <Image
      src="/assets/store/coin_handful.webp"
      alt=""
      width={size}
      height={size}
      unoptimized
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
