
import Image from 'next/image';
import { AvatarCustomization } from '../types/game';
import { AvatarLayers } from './AvatarLayers';
import { resolveAvatarCustomization } from '@/lib/avatars';
import { getSkinPart } from '@/lib/avatars/parts';
import { normalizeCountryCode } from '@/lib/geo/countryCode';
import { cn } from '@/lib/utils';

interface AvatarDisplayProps {
  customization: AvatarCustomization;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string;
  countryCode?: string | null;
  /** Frame shape — circle (default) keeps the legacy rounded look, square renders inside a rounded-square frame. */
  shape?: 'circle' | 'square';
}

const flagSizeClasses = {
  xs: 'size-5 border-2',
  sm: 'size-6 border-2',
  md: 'size-8 border-2',
  lg: 'size-10 border-2',
  xl: 'size-12 border-2',
  xxl: 'size-14 border-2.5',
};

const sizeClasses: Record<NonNullable<AvatarDisplayProps['size']>, string> = {
  xs: 'size-8',
  sm: 'size-10 sm:size-12',
  md: 'size-16',
  lg: 'size-24',
  xl: 'size-32',
  xxl: 'size-28 sm:size-32 md:size-36',
};

const imageSizes: Record<NonNullable<AvatarDisplayProps['size']>, string> = {
  // The image lives inside the 88%-high, 495:543 aspect-ratio wrapper,
  // making its rendered width roughly 80% of the outer avatar size.
  xs: '26px',
  sm: '(min-width: 640px) 38px, 32px',
  md: '51px',
  lg: '77px',
  xl: '103px',
  xxl: '(min-width: 768px) 115px, 103px',
};

export function AvatarDisplay({
  customization,
  size = 'md',
  className = '',
  countryCode,
  shape = 'circle',
}: AvatarDisplayProps) {
  const normalizedCountryCode = normalizeCountryCode(countryCode);

  const merged = resolveAvatarCustomization(customization);
  const skinAsset = getSkinPart(merged.skin).asset;

  const cropClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  return (
    <div
      className={cn(
        'relative shrink-0 bg-transparent',
        cropClass,
        sizeClasses[size],
        className,
      )}
    >
      {/* Inner clipper — clips the figure to the avatar shape. Flag sits OUTSIDE this clipper
          so it can extend past the avatar's circular bounds without being cropped. */}
      <div className={cn('absolute inset-0 flex items-center justify-center overflow-hidden bg-transparent', cropClass)}>
        {/* Wrapper at canonical Figma aspect ratio so item % positions land precisely.
            h-[88%] leaves ~6% top/bottom margin so the figure's head/feet don't clip the rounded crop. */}
        <div className="relative h-[88%]" style={{ aspectRatio: '495.25 / 543.03' }}>
          <AvatarLayers assetResolver={assetResolver} customization={merged} placement="back" />
      <Image
            src={skinAsset}
            alt="Avatar"
            fill
            sizes={imageSizes[size]}
            quality={60}
            className="object-contain"
          />
          <AvatarLayers assetResolver={assetResolver} customization={merged} />
        </div>
      </div>

      {normalizedCountryCode && (
        <div
          className={cn(
            'absolute -bottom-[5%] -left-[5%] z-20 rounded-full overflow-hidden border-white shadow-sm flex items-center justify-center bg-white p-[1.5px]',
            flagSizeClasses[size],
          )}
        >
          <Image
            src={`https://flagcdn.com/w80/${normalizedCountryCode}.png`}
            alt={normalizedCountryCode}
            width={40}
            height={30}
            unoptimized
            className="w-full h-full object-contain rounded-full"
          />
        </div>
      )}
    </div>
  );
}
