/** A club crest in its own round chip. Crests come in every shape (tall
 *  shields, wide wordmarks) and many are dark or transparent, so each sits
 *  on a light disc with padding: every crest gets the same breathing room
 *  and reads on any background. */

export function ClubCrest({
  src,
  size = 32,
  ring = false,
  className,
}: {
  src: string;
  size?: number;
  /** Orange outer ring (favourite-club chip). */
  ring?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        background: 'var(--td-paper)',
        boxShadow: ring
          ? '0 0 0 2px var(--bs-page), 0 0 0 4px var(--bs-primary)'
          : '0 2px 6px rgba(0,0,0,0.45)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- crest from the club registry */}
      <img
        src={src}
        alt=""
        draggable={false}
        className="object-contain"
        style={{ width: Math.round(size * 0.66), height: Math.round(size * 0.66) }}
      />
    </span>
  );
}
