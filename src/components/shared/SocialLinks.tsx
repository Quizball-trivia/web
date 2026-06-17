'use client';

import { FaInstagram, FaFacebookF } from 'react-icons/fa';
import { Users, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOCIAL_LINKS, FACEBOOK_LINKS } from '@/lib/social-links';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface SocialLinksProps {
  className?: string;
  /** Icon button size. Defaults to medium. */
  size?: 'xs' | 'sm' | 'md';
}

const SIZE = {
  xs: { box: 'size-7', icon: 'size-3.5' },
  sm: { box: 'size-9', icon: 'size-4' },
  md: { box: 'size-11', icon: 'size-5' },
} as const;

// Brand-colored, rounded "cartoonish" tiles — Instagram's gradient + Facebook
// blue, with a chunky rounded square and a soft drop shadow to match the app's
// playful UI (instead of flat monochrome glyphs).
const INSTAGRAM_BG =
  'linear-gradient(135deg, #FEDA75 0%, #FA7E1E 25%, #D62976 50%, #962FBF 75%, #4F5BD5 100%)';
const FACEBOOK_BG = '#1877F2';

const tileClass = (box: string) =>
  cn(
    'flex items-center justify-center rounded-[14px] text-white shadow-[0_4px_0_rgba(0,0,0,0.25)]',
    'transition-transform hover:-translate-y-0.5 active:translate-y-0',
    box,
  );

/** Reusable row of social profile icon-links. Instagram links straight out;
 *  Facebook opens a small picker (page vs community group). */
export function SocialLinks({ className, size = 'md' }: SocialLinksProps) {
  const s = SIZE[size];
  return (
    <div className={cn('flex items-center justify-center gap-2.5', className)}>
      <a
        href={SOCIAL_LINKS.instagram}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        title="Instagram"
        className={tileClass(s.box)}
        style={{ background: INSTAGRAM_BG }}
      >
        <FaInstagram className={s.icon} />
      </a>

      <Popover>
        <PopoverTrigger
          aria-label="Facebook"
          title="Facebook"
          className={tileClass(s.box)}
          style={{ background: FACEBOOK_BG }}
        >
          <FaFacebookF className={s.icon} />
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8} className="w-56 p-2">
          <a
            href={FACEBOOK_LINKS.page}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-poppins font-semibold text-popover-foreground transition-colors hover:bg-accent"
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-[10px] text-white"
              style={{ background: FACEBOOK_BG }}
            >
              <FaFacebookF className="size-3.5" />
            </span>
            <span className="flex-1">Facebook Page</span>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </a>
          <a
            href={FACEBOOK_LINKS.community}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-poppins font-semibold text-popover-foreground transition-colors hover:bg-accent"
          >
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-[10px] text-white"
              style={{ background: FACEBOOK_BG }}
            >
              <Users className="size-3.5" />
            </span>
            <span className="flex-1">Community Group</span>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </a>
        </PopoverContent>
      </Popover>
    </div>
  );
}
