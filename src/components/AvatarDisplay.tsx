import Image from 'next/image';
import { AvatarCustomization } from '../types/game';
import { getDiceBearAvatarUrl } from '@/lib/avatars';

interface AvatarDisplayProps {
  customization: AvatarCustomization;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function AvatarDisplay({ 
  customization, 
  size = 'md',
  className = '' 
}: AvatarDisplayProps) {
  const sizeClasses = {
    xs: 'size-8',
    sm: 'size-10 sm:size-12',
    md: 'size-16',
    lg: 'size-24',
    xl: 'size-32',
  };

  const getSizeInPixels = () => {
    switch (size) {
      case 'xs': return 32;
      case 'sm': return 48;
      case 'md': return 64;
      case 'lg': return 96;
      case 'xl': return 128;
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
    </div>
  );
}
