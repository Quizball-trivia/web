import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WinRateStat } from '../WinRateStat';

const halvesOf = (container: HTMLElement) => [...container.querySelectorAll('span.inline-block')];
const highlights = (container: HTMLElement) => [...container.querySelectorAll('.text-brand-yellow')].map((el) => el.textContent);

describe('WinRateStat', () => {
  it('renders each half as its own block that may wrap, with the separator closing the first half', () => {
    const { container } = render(<WinRateStat text="0% de victorias · 2 partidos clasificatorios" className="block text-right" />);
    expect(halvesOf(container).map((el) => el.textContent)).toEqual(['0% de victorias ·', '2 partidos clasificatorios']);
    // A half is never forced onto one line (that pushed the Play button out of the card on phones), and the line is
    // not either (that cut the Spanish text off on desktop).
    for (const half of halvesOf(container)) {
      expect(half.className).toContain('max-w-full');
      expect(half.className).not.toContain('whitespace-nowrap');
    }
    expect(container.firstElementChild?.className).toBe('block text-right');
    // Reads the same as the translated string, with a breakable space after the separator.
    expect(container.textContent).toBe('0% de victorias · 2 partidos clasificatorios');
  });

  it('highlights the leading number of each half in every locale', () => {
    expect(highlights(render(<WinRateStat text="13% win rate · 104 ranked games" />).container)).toEqual(['13%', '104']);
    expect(highlights(render(<WinRateStat text="13% de victorias · 104 partidos clasificatorios" />).container)).toEqual(['13%', '104']);
    expect(highlights(render(<WinRateStat text="13% მოგება · 104 რეიტინგული თამაში" />).container)).toEqual(['13%', '104']);
    // Turkish writes the percent sign first.
    expect(highlights(render(<WinRateStat text="% 13 kazanma oranı · 104 sıralama maçı" />).container)).toEqual(['% 13', '104']);
  });

  it('renders text without numbers as it is, with or without a separator', () => {
    const plain = render(<WinRateStat text="No games yet" />).container;
    expect(plain.textContent).toBe('No games yet');
    expect(highlights(plain)).toHaveLength(0);
    const mixed = render(<WinRateStat text="New · 3 ranked games" />).container;
    expect(mixed.textContent).toBe('New · 3 ranked games');
    expect(highlights(mixed)).toEqual(['3']);
  });
});
