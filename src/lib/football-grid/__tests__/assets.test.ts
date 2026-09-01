import { describe, expect, it } from 'vitest';
import { FOOTBALL_GRID_CDN_BASE_URL, footballGridAssetUrl } from '../assets';

describe('footballGridAssetUrl', () => {
  it('maps packaged Grid assets to the versioned first-party CDN prefix', () => {
    expect(footballGridAssetUrl('/assets/football-grid/flags/br.svg'))
      .toBe(`${FOOTBALL_GRID_CDN_BASE_URL}/flags/br.svg`);
  });

  it('maps the play-card icon into the Grid CDN UI namespace', () => {
    expect(footballGridAssetUrl('/assets/football-grid-card-icon.svg'))
      .toBe(`${FOOTBALL_GRID_CDN_BASE_URL}/ui/card-icon.svg`);
  });

  it('maps the shared pitch texture into the Grid CDN UI namespace', () => {
    expect(footballGridAssetUrl('/assets/bg-pattern.webp'))
      .toBe(`${FOOTBALL_GRID_CDN_BASE_URL}/ui/bg-pattern.webp`);
  });

  it('serves shared avatar layers from the app like every other mode', () => {
    expect(footballGridAssetUrl('/assets/store/jersey_green.webp?v=2'))
      .toBe('/assets/store/jersey_green.webp?v=2');
  });

  it('rejects store paths with traversal or empty segments', () => {
    expect(footballGridAssetUrl('/assets/store/../../api/foo')).toBeNull();
    expect(footballGridAssetUrl('/assets/store/')).toBeNull();
    expect(footballGridAssetUrl('/assets/store//jersey_green.webp')).toBeNull();
  });

  it('keeps existing first-party player and club CDN URLs', () => {
    const source = 'https://nsdfiprfmhdqhbfxfwpv.supabase.co/storage/v1/object/public/imgs/player-images/player.webp';
    expect(footballGridAssetUrl(source)).toBe(source);
  });

  it('rejects third-party hotlinks', () => {
    expect(footballGridAssetUrl('https://img.a.transfermarkt.technology/portrait.jpg')).toBeNull();
    expect(footballGridAssetUrl('https://media.api-sports.io/football/leagues/39.png')).toBeNull();
  });
});
