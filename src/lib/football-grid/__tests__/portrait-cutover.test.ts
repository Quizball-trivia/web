import { afterEach, describe, expect, it, vi } from 'vitest';
const stage = 'https://nsdfiprfmhdqhbfxfwpv.supabase.co';
const prod = 'https://lfbwhxvwubzeqkztghok.supabase.co';
const prefix = '/storage/v1/object/public/imgs/football-grid/v1';
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe('Grid portrait cutover', () => {
  it('keeps old match portraits working after the production CDN switch', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', prod);
    vi.stubEnv('NEXT_PUBLIC_FOOTBALL_GRID_CDN_BASE_URL', prod + prefix);
    vi.resetModules();
    const { footballGridAssetUrl } = await import('../assets');
    expect(footballGridAssetUrl(stage + prefix + '/players/old-match.webp')).toBe(prod + prefix + '/players/old-match.webp');
    expect(footballGridAssetUrl(prod + prefix + '/players/new-match.webp')).toBe(prod + prefix + '/players/new-match.webp');
    expect(footballGridAssetUrl(stage + '/storage/v1/object/public/private/image.webp')).toBeNull();
    expect(footballGridAssetUrl('https://example.com' + prefix + '/players/old-match.webp')).toBeNull();
  });
  it('keeps existing staging URLs and supports new prod content before the switch', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', prod);
    vi.stubEnv('NEXT_PUBLIC_FOOTBALL_GRID_CDN_BASE_URL', stage + prefix);
    vi.resetModules();
    const { footballGridAssetUrl } = await import('../assets');
    expect(footballGridAssetUrl(stage + prefix + '/players/old-match.webp')).toBe(stage + prefix + '/players/old-match.webp');
    expect(footballGridAssetUrl(prod + prefix + '/players/new-match.webp')).toBe(prod + prefix + '/players/new-match.webp');
  });
});
