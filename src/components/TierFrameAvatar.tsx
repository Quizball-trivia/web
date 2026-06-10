import Image from 'next/image';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import type { AvatarCustomization } from '@/types/game';

const TIER_FRAME_SLUGS: Record<string, string> = {
  'Academy': 'academy',
  'Youth Prospect': 'youth_prospect',
  'Reserve': 'reserve',
  'Bench': 'bench',
  'Rotation': 'rotation',
  'Starting11': 'starting11',
  'Key Player': 'key_player',
  'Captain': 'captain',
  'World-Class': 'world_class',
  'Legend': 'legend',
  'GOAT': 'goat',
};

interface TierFrameAvatarProps {
  tier: string;
  avatarCustomization?: AvatarCustomization | null;
  avatarFallback?: string;
  countryCode?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { frame: 44, avatarSize: 'xs' as const },
  md: { frame: 58, avatarSize: 'sm' as const },
  lg: { frame: 74, avatarSize: 'md' as const },
};

export function TierFrameAvatar({
  tier,
  avatarCustomization,
  avatarFallback = 'avatar-1',
  countryCode,
  size = 'md',
  className,
}: TierFrameAvatarProps) {
  const slug = TIER_FRAME_SLUGS[tier] ?? 'academy';
  const { frame, avatarSize } = SIZES[size];
  const frameHeight = Math.round(frame * 1.4);

  return (
    <div className={`relative shrink-0 ${className ?? ''}`} style={{ width: frame, height: frameHeight }}>
      {/* Card frame — background */}
      <Image
        src={`/assets/ranks/${slug}_frame.png`}
        alt={tier}
        width={frame}
        height={frameHeight}
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />
      {/* Avatar — on top of the frame, centered in upper portion */}
      <div className="absolute left-1/2 -translate-x-1/2 top-[12%] z-10">
        <AvatarDisplay
          customization={avatarCustomization ?? { base: avatarFallback }}
          size={avatarSize}
          countryCode={countryCode}
        />
      </div>
    </div>
  );
}
