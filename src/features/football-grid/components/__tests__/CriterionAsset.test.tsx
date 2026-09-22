import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FOOTBALL_GRID_CDN_BASE_URL } from '@/lib/football-grid/assets';
import type { FootballGridCriterionView } from '@/lib/realtime/socket.types';
import { CriterionAsset } from '../CriterionAsset';
import reviewedArt from '@/data/football-grid/criterion-art-overrides.json';

function criterion(overrides: Partial<FootballGridCriterionView> = {}): FootballGridCriterionView {
  return {
    id: 'barcelona',
    key: 'barcelona',
    family: 'club',
    labelEn: 'Barcelona',
    labelKa: 'ბარსელონა',
    assetKey: 'barcelona',
    difficulty: 'normal',
    ...overrides,
  };
}

describe('CriterionAsset', () => {
  it('uses the bundled Gasperini photograph before his legacy shield', () => {
    const { container } = render(<CriterionAsset criterion={criterion({ family: 'manager', key: 'manager:gian-piero-gasperini', labelEn: 'Gian Piero Gasperini', assetKey: 'gian-piero-gasperini' })} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/assets/football-grid/managers/gian-piero-gasperini.jpg');
  });
  it('does not confuse Nacional with Atlético Nacional', () => {
    const { container, rerender } = render(<CriterionAsset criterion={criterion({
      id: 'club-nacional', key: 'club-nacional', labelEn: 'Nacional', assetKey: null,
    })} />);
    const nacional = container.querySelector('img')?.getAttribute('src');
    expect(nacional).toBe(reviewedArt['club-nacional']);
    rerender(<CriterionAsset criterion={criterion({
      id: 'club-atletico-nacional', key: 'club-atletico-nacional', labelEn: 'Atlético Nacional', assetKey: null,
    })} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(reviewedArt['club-atletico-nacional' as keyof typeof reviewedArt]);
    expect(container.querySelector('img')?.getAttribute('src')).not.toBe(nacional);
  });
  it.each([
    ['1. FC Heidenheim', '/clubs/1-fc-heidenheim-1846.webp'],
    ['América de Cali', '/assets/football-grid/clubs/america-de-cali-official.png'],
  ])('resolves the missing crest for %s', (name, source) => {
    const { container } = render(<CriterionAsset criterion={criterion({ labelEn: name, assetKey: null })} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(source);
  });
  it('uses a packaged real logo first and never falls back to a letter shield', () => {
    const { container } = render(<CriterionAsset criterion={criterion({
      id: 'league-id', key: 'league:la-liga', family: 'league', labelEn: 'La Liga', labelKa: 'ლა ლიგა',
      assetKey: '/assets/football-grid/leagues/la-liga-fallback.svg',
    })} />);
    expect(container.querySelector('image')?.getAttribute('href')).toBe('/assets/football-grid/leagues/la-liga.png');
    fireEvent.error(container.querySelector('image')!);
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/imgs/league-logos/la-liga.webp');
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-quizball-art]')).toBeTruthy();
  });

  it('fits the visible Ligue 1 logo to the frame instead of its transparent canvas', () => {
    const { container } = render(<CriterionAsset criterion={criterion({
      id: 'ligue-1', key: 'league:ligue-1', family: 'league', labelEn: 'Ligue 1',
      assetKey: '/assets/football-grid/leagues/ligue-1.svg',
    })} />);
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('85 14 97 122');
    expect(container.querySelector('image')?.getAttribute('href')).toBe('/assets/football-grid/leagues/ligue-1.png');
  });

  it('ships an original royal cup for Copa del Rey without storage dependencies', () => {
    const { container } = render(<CriterionAsset criterion={criterion({
      id: 'copa-del-rey', key: 'trophy:copa-del-rey', family: 'trophy_award',
      labelEn: 'Copa del Rey winner', assetKey: '/assets/football-grid/competitions/copa-del-rey.svg',
    })} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-quizball-art="royal-cup"]')).toBeTruthy();
    expect(container.querySelector('text')).toBeNull();
  });

  it('keeps a supplied teammate portrait instead of resolving a generic badge', () => {
    const { container } = render(<CriterionAsset criterion={criterion({
      family: 'teammate', assetKey: '/assets/football-grid/players/example.webp',
    })} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(`${FOOTBALL_GRID_CDN_BASE_URL}/players/example.webp`);
  });

  it('falls back to the same player’s roster portrait when their grid portrait is missing', () => {
    const id = '56740d17-5ee9-4ef2-8ad4-766dbea01ec3';
    const { container } = render(<CriterionAsset criterion={criterion({
      family: 'teammate', assetKey: `/assets/football-grid/players/${id}.webp`,
    })} />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')?.getAttribute('src')).toContain(`/imgs/player-images/${id}.webp`);
  });

  it('renders the real club crest first (owner rights decision 2026-08-27)', () => {
    const { container } = render(<CriterionAsset criterion={criterion()} />);
    const primary = container.querySelector('img');
    expect(primary?.getAttribute('src')).toContain('imgs/club-logos/fc-barcelona.webp');
  });

  it('prefers an exact club match before ambiguous suffix matches', () => {
    const { container } = render(<CriterionAsset criterion={criterion({
      id: 'manchester-city',
      key: 'city',
      labelEn: 'Manchester City',
      labelKa: 'მანჩესტერ სიტი',
      assetKey: 'city',
    })} />);

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/clubs/manchester-city.webp');
  });

  it('resolves a country directly to its packaged flag', () => {
    const { container } = render(<CriterionAsset criterion={criterion({ id: 'brazil', key: 'brazil', family: 'country', labelEn: 'Brazil', labelKa: 'ბრაზილია', assetKey: 'br' })} />);

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/assets/football-grid/flags/br.svg');
  });

  it('renders a family fallback instead of a broken image for unknown content', () => {
    const { container } = render(<CriterionAsset criterion={criterion({ id: 'unknown', key: 'unknown', labelEn: 'Unknown Club', labelKa: 'უცნობი', assetKey: 'unknown' })} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
