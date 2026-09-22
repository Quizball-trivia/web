import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FootballGridPortrait } from '../FootballGridPortrait';
import { footballGridPortraitSources } from '../../portraitSources';
import portraits from '@/data/football-grid/player-portrait-overrides.json';

describe('FootballGridPortrait', () => {
  it('uses the exact player’s verified photo even when the release shares an unknown placeholder', () => {
    const [playerId, image] = Object.entries(portraits)[0];
    const sources = footballGridPortraitSources('/assets/football-grid/players/unknown.webp', playerId);
    expect(sources[0]).toBe(image);
    expect(footballGridPortraitSources('/assets/football-grid/players/unknown.webp', 'unknown-id')).not.toContain(image);
  });
  it('tries the same player’s roster image after the Grid image fails', () => {
    const id = '56740d17-5ee9-4ef2-8ad4-766dbea01ec3';
    const { container } = render(<FootballGridPortrait playerId={id} source={`/assets/football-grid/players/${id}.webp`} />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')?.getAttribute('src')).toContain(`/imgs/player-images/${id}.webp`);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
  });

  it.each([null, 'https://legacy.example/matic.jpg'])('finds the Grid portrait for a claim with unavailable legacy source %s', (source) => {
    const id = '38c53038-eb5a-47cb-8c69-166559677ac0';
    const { container } = render(<FootballGridPortrait playerId={id} source={source} />);
    expect(container.querySelector('img')?.getAttribute('src')).toContain(`/football-grid/v1/players/${id}.webp`);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')?.getAttribute('src')).toContain(`/imgs/player-images/${id}.webp`);
  });

  it('does not retain a failed image state when the cell shows another player', () => {
    const { container, rerender } = render(<FootballGridPortrait source="/assets/football-grid/players/old.webp" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    rerender(<FootballGridPortrait source="/assets/football-grid/players/new.webp" />);
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/players/new.webp');
  });

  it('rejects arbitrary external images and malformed player identities', () => {
    expect(footballGridPortraitSources('https://untrusted.example/person.jpg', '../another-player')).toEqual([]);
  });
});
