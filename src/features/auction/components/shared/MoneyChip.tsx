import { formatMoney } from '../../data';
import { cn } from '@/lib/utils';

/** Black pill showing a money amount in brand-yellow tabular figures — the
 *  recurring price chip used across the solo-pick / bidding screens. */
export function MoneyChip({
  amount,
  size = 'md',
  className,
}: {
  amount: number;
  size?: 'md' | 'lg';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'shrink-0 bg-black/85 font-poppins font-black tabular-nums text-brand-yellow',
        size === 'lg' ? 'rounded-[10px] px-4 py-1.5 text-2xl' : 'rounded-lg px-3 py-1.5 text-xl',
        className,
      )}
    >
      {formatMoney(amount)}
    </div>
  );
}
