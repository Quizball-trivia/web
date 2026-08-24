'use client';

/** Branded banknote — same look as the daily-challenge Money Drop DollarBill. */
export function CashBill({ size = 1 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-sm border border-brand-green-deep bg-gradient-to-br from-brand-green-light to-brand-green shadow-sm"
      style={{ width: 40 * size, height: 24 * size }}
    >
      <span className="font-bold text-white" style={{ fontSize: 13 * size }}>$</span>
    </div>
  );
}
