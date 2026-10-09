import type { CSSProperties } from 'react';

/**
 * The win-rate line ("13% win rate · 104 ranked games"): white text with the leading number of each half in brand
 * yellow. A half stays whole while it fits and the line breaks after the separator, so a long locale (Spanish:
 * "… · 2 partidos clasificatorios") wraps inside its column instead of running out of the card; a half wider than its
 * container (a narrow phone) wraps inside itself rather than pushing its neighbours out.
 */
export function WinRateStat({ text, className, style }: { text: string; className?: string; style?: CSSProperties }) {
  const halves = text.split(' · ');
  return (
    <span className={className} style={style}>
      {halves.map((half, i) => {
        const match = half.match(/^(%?\s?\d[\d.,]*%?)(.*)$/);
        return (
          <span key={i}>
            <span className="inline-block max-w-full">
              {match ? (
                <>
                  <span className="whitespace-nowrap text-brand-yellow">{match[1]}</span>
                  {match[2]}
                </>
              ) : (
                half
              )}
              {i < halves.length - 1 && ' ·'}
            </span>
            {i < halves.length - 1 && ' '}
          </span>
        );
      })}
    </span>
  );
}
