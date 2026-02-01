import Image from 'next/image';
import { AvatarCustomization } from '../types/game';

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
  
  // Use DiceBear avatars - notionists style for professional look
  // or use big-smile for friendly soccer player look
  const avatarUrl = `https://api.dicebear.com/7.x/big-smile/svg?seed=${customization.base}&backgroundColor=${customization.background || 'b6e3f4,c0aede,d1d4f9'}&size=${sizeInPx}`;

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
