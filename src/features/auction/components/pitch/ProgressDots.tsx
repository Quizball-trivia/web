/**
 * Squad-fill progress dots: `filled` green, the rest muted. Shared by the squad
 * grid and the stadium board (both hardcoded an 11-dot row before). `total`
 * defaults to a full 11-man squad but can be derived from the formation.
 */
export function ProgressDots({
  filled,
  total = 11,
  size = 'sm',
}: {
  filled: number;
  total?: number;
  size?: 'xs' | 'sm';
}) {
  const dot =
    size === 'xs'
      ? 'h-1 w-1'
      : 'h-[5px] w-[5px] sm:h-1.5 sm:w-1.5';
  return (
    <div className="flex justify-center gap-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`${dot} rounded-full transition-colors ${i < filled ? 'bg-brand-green' : 'bg-white/10'}`}
        />
      ))}
    </div>
  );
}
