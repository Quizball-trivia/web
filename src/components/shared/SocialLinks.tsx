'use client';

import { FaInstagram, FaFacebookF } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { SOCIAL_LINKS } from '@/lib/social-links';

interface SocialLinksProps {
  className?: string;
  /** Icon button size. Defaults to medium. */
  size?: 'sm' | 'md';
}

const SIZE = {
  sm: { box: 'size-9', icon: 'size-4' },
  md: { box: 'size-11', icon: 'size-5' },
} as const;

// Brand-colored, rounded "cartoonish" tiles — Instagram's gradient + Facebook
// blue, with a chunky rounded square and a soft drop shadow to match the app's
// playful UI (instead of flat monochrome glyphs).
const ITEMS = [
  {
    key: 'instagram',
    href: SOCIAL_LINKS.instagram,
    label: 'Instagram',
    Icon: FaInstagram,
    bg: 'linear-gradient(135deg, #FEDA75 0%, #FA7E1E 25%, #D62976 50%, #962FBF 75%, #4F5BD5 100%)',
  },
  {
    key: 'facebook',
    href: SOCIAL_LINKS.facebook,
    label: 'Facebook',
    Icon: FaFacebookF,
    bg: '#1877F2',
  },
] as const;

/** Reusable row of social profile icon-links (Instagram, Facebook). */
export function SocialLinks({ className, size = 'md' }: SocialLinksProps) {
  const s = SIZE[size];
  return (
    <div className={cn('flex items-center justify-center gap-2.5', className)}>
      {ITEMS.map(({ key, href, label, Icon, bg }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className={cn(
            'flex items-center justify-center rounded-[14px] text-white shadow-[0_4px_0_rgba(0,0,0,0.25)]',
            'transition-transform hover:-translate-y-0.5 active:translate-y-0',
            s.box,
          )}
          style={{ background: bg }}
        >
          <Icon className={s.icon} />
        </a>
      ))}
    </div>
  );
}
