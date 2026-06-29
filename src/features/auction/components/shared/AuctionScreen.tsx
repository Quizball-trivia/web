import { ScreenBackdrop } from './ScreenBackdrop';
import { cn } from '@/lib/utils';

/** Full-screen auction phase chrome: the `bg-surface-page-alt` surface +
 *  shared `ScreenBackdrop` (pattern + optional glow). `className` supplies the
 *  per-screen flex/padding layout; children render above the backdrop. */
export function AuctionScreen({
  glow,
  className,
  children,
}: {
  glow?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('relative min-h-screen overflow-hidden bg-surface-page-alt', className)}>
      <ScreenBackdrop glow={glow} />
      {children}
    </div>
  );
}
