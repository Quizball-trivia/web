import { isAvatarUrl } from '@/lib/avatars';

/**
 * Renders an avatar as an `<img>` when the value is a URL, or as a text
 * `<span>` when it's an emoji/text literal.  Intended for lightweight inline
 * use (scoreboards, ready-status rows, etc.) — not for the full
 * customisation-based `AvatarDisplay` component.
 */
export function InlineAvatar({
  avatar,
  alt,
  size = 'md',
}: {
  avatar: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClassesImg = { sm: 'size-6', md: 'size-8', lg: 'size-12' };
  const sizeClassesEmoji = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' };

  if (isAvatarUrl(avatar)) {
    return (
      <img
        src={avatar}
        alt={alt}
        className={`${sizeClassesImg[size]} rounded-full object-cover`}
      />
    );
  }
  return <span className={sizeClassesEmoji[size]}>{avatar}</span>;
}
