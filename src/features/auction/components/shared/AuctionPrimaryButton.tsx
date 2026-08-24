import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

/** Shared green CTA button for auction screens (Next round / Continue / Play
 *  again). Flat brand-green, uppercase, with a tap-scale. `size` covers the few
 *  width/height variants the screens use. */
export function AuctionPrimaryButton({
  onClick,
  children,
  size = 'full',
  variant = 'solid',
  className,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  size?: 'full' | 'auto' | 'wide';
  variant?: 'solid' | 'outline';
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-[20px] font-poppins font-semibold uppercase text-white shadow-none transition-colors hover:shadow-none',
        variant === 'solid'
          ? 'bg-brand-green hover:bg-brand-green/90'
          : 'border-[3px] border-brand-green bg-transparent hover:bg-brand-green/10 active:translate-y-[2px]',
        // `tracking-wide` only on the sizes that originally had it (Reveal/Formation).
        size === 'full' && 'h-14 w-full max-w-sm text-lg tracking-wide',
        size === 'wide' && 'h-[64px] w-full text-[1.5rem]',
        size === 'auto' && 'h-14 w-56 text-lg tracking-wide',
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
