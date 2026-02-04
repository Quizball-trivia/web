import Image from 'next/image';
import { AvatarCustomization } from '../types/game';
import { getDiceBearAvatarUrl } from '@/lib/avatars';

interface AvatarDisplayProps {
  customization: AvatarCustomization;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function AvatarDisplay({ 
  customization, 
  size = 'md',
  className = '' 
}: AvatarDisplayProps) {
  const getSizeInPixels = () => {
    switch (size) {
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
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: sizeInPx, height: sizeInPx }}
    >
      <Image
        src={avatarUrl}
        alt="Avatar"
        width={sizeInPx}
        height={sizeInPx}
        unoptimized
        className="w-full h-full rounded-full"
        style={{ width: sizeInPx, height: sizeInPx }}
      />
      
      {/* Jersey/Hat overlay (positioned above) */}
      {customization.hat && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-xl">
          {customization.hat}
        </div>
      )}
      
      {/* Accessory overlay (positioned to the side) */}
      {customization.accessory && (
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 text-sm">
          {customization.accessory}
        </div>
      )}
    </div>
  );
}
