import Image from 'next/image';
import { AvatarCustomization } from '../types/game';
import { getDiceBearAvatarUrl } from '@/lib/avatars';
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
  'ka': 'ge',      // Georgian language -> Georgia (Country)
  'georgian': 'ge',
  'ka-ge': 'ge',
  'geo': 'ge',
  'georgia': 'ge',
  'en': 'gb',      // English -> UK
  'eng': 'gb',
  'en-gb': 'gb',
  'en-us': 'us',
  'gb': 'gb',
  'uk': 'gb',
  'gbr': 'gb',
  'great britain': 'gb',
  'united kingdom': 'gb',
  'us': 'us',
  'usa': 'us',
  'united states': 'us',
};

export function AvatarDisplay({
  customization,
  size = 'md',
  className = '',
  countryCode,
}: AvatarDisplayProps) {
  const normalizedCountryCode = countryCode 
    ? (COUNTRY_CODE_MAP[countryCode.trim().toLowerCase()] || countryCode.trim().toLowerCase())
    : null;
  const sizeClasses = {
    xs: 'size-8',
    sm: 'size-10 sm:size-12',
    md: 'size-16',
    lg: 'size-24',
    xl: 'size-32',
    xxl: 'size-28 sm:size-32 md:size-36',
  };

  const getSizeInPixels = () => {
    switch (size) {
      case 'xs': return 32;
      case 'sm': return 48;
      case 'md': return 64;
      case 'lg': return 96;
      case 'xl': return 128;
      case 'xxl': return 144;
      default: return 64;
    }
  };

  const sizeInPx = getSizeInPixels();
  const isUrl = /^https?:\/\//i.test(customization.base);

  const avatarUrl = isUrl
    ? customization.base
    : getDiceBearAvatarUrl(customization.base, sizeInPx, customization.background);

  return (
    <div 
      className={`relative flex items-center justify-center rounded-full shrink-0 ${sizeClasses[size || 'md']} ${className}`}
    >
      <Image
        src={avatarUrl}
        alt="Avatar"
        width={sizeInPx}
        height={sizeInPx}
        unoptimized
        className="w-full h-full rounded-full object-cover"
      />
      
      {/* Jersey/Hat overlay (positioned above) */}
      {customization.hat && (
        <div className="absolute -top-[15%] left-1/2 -translate-x-1/2 text-[100%] leading-none z-10">
          {customization.hat}
        </div>
      )}
      
      {/* Accessory overlay (positioned to the side) */}
      {customization.accessory && (
        <div className="absolute -right-[5%] top-1/2 -translate-y-1/2 text-[50%] leading-none z-10">
          {customization.accessory}
        </div>
      )}

      {/* Country flag - Premium Badge Style */}
      {normalizedCountryCode && (
        <div className={cn(
          "absolute -bottom-[5%] -left-[5%] z-20 rounded-full overflow-hidden border-white shadow-sm flex items-center justify-center bg-white p-[1.5px]",
          flagSizeClasses[size || 'md']
        )}>
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
