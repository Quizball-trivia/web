import Image from 'next/image';
import { AvatarCustomization } from '../types/game';
import { customizationFromAvatarValue } from '@/lib/avatars';
import { AVATAR_SLOTS, getAvatarPart, getSkinPart } from '@/lib/avatars/parts';
import { cn } from '@/lib/utils';

interface AvatarDisplayProps {
  customization: AvatarCustomization;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  className?: string;
  countryCode?: string | null;
}

const flagSizeClasses = {
  xs: 'size-5 border-2',
  sm: 'size-6 border-2',
  md: 'size-8 border-2',
  lg: 'size-10 border-2',
  xl: 'size-12 border-2',
  xxl: 'size-14 border-2.5',
};

const COUNTRY_CODE_MAP: Record<string, string> = {
  ka: 'ge',
  georgian: 'ge',
  'ka-ge': 'ge',
  geo: 'ge',
  georgia: 'ge',
  en: 'gb',
  eng: 'gb',
  'en-gb': 'gb',
  'en-us': 'us',
  gb: 'gb',
  uk: 'gb',
  gbr: 'gb',
  'great britain': 'gb',
  'united kingdom': 'gb',
  us: 'us',
  usa: 'us',
  'united states': 'us',
};

const sizeClasses: Record<NonNullable<AvatarDisplayProps['size']>, string> = {
  xs: 'size-8',
  sm: 'size-10 sm:size-12',
  md: 'size-16',
  lg: 'size-24',
  xl: 'size-32',
  xxl: 'size-28 sm:size-32 md:size-36',
};

/** Merge anything encoded in `customization.base` into the customization. */
function resolveCustomization(c: AvatarCustomization): AvatarCustomization {
  const merged = customizationFromAvatarValue(c.base);
  return {
    skin: c.skin ?? merged.skin,
    jersey: c.jersey ?? merged.jersey,
    hair: c.hair ?? merged.hair,
    glasses: c.glasses ?? merged.glasses,
    facialHair: c.facialHair ?? merged.facialHair,
    base: c.base ?? merged.base,
  };
}

export function AvatarDisplay({
  customization,
  size = 'md',
  className = '',
  countryCode,
}: AvatarDisplayProps) {
  const normalizedCountryCode = countryCode
    ? COUNTRY_CODE_MAP[countryCode.trim().toLowerCase()] || countryCode.trim().toLowerCase()
    : null;

  const merged = resolveCustomization(customization);
  const skinAsset = getSkinPart(merged.skin).asset;

  return (
    <div
      className={`relative flex items-center justify-center rounded-full shrink-0 overflow-hidden ${sizeClasses[size]} ${className}`}
    >
      {/* Wrapper at canonical Figma aspect ratio so item % positions land precisely. */}
      <div className="relative h-full" style={{ aspectRatio: '495.25 / 543.03' }}>
        <Image
          src={skinAsset}
          alt="Avatar"
          fill
          unoptimized
          className="object-contain"
        />
        {AVATAR_SLOTS.map((slot) => {
          const partId = merged[slot];
          const part = getAvatarPart(partId);
          if (!part) return null;
          return (
            <img
              key={slot}
              src={part.asset}
              alt=""
              className="pointer-events-none absolute object-contain"
              style={{
                top: `${part.position.top}%`,
                left: `${part.position.left}%`,
                width: `${part.position.width}%`,
              }}
            />
          );
        })}
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
