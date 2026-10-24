import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildAvatarAssetCache } from '../../../../scripts/lib/avatar-asset-cache';
import nextConfig from '../../../../next.config';
import { avatarAssetUrl } from '../assetUrl';
import { ALL_AVATAR_PARTS, SKIN_PARTS } from '../parts';
import versions from '../asset-versions.json';
import { footballGridAssetUrl } from '@/lib/football-grid/assets';

describe('avatar browser cache', () => {
  it('versions every registered skin and avatar layer from the exact existing image bytes', () => {
    for (const part of [...SKIN_PARTS, ...ALL_AVATAR_PARTS]) {
      const url = new URL(part.asset, 'https://quizball.io');
      const bytes = readFileSync(join(process.cwd(), 'public', url.pathname));
      expect(url.searchParams.get('v'), part.id).toBe(createHash('sha256').update(bytes).digest('hex').slice(0, 16));
      expect(footballGridAssetUrl(part.asset), part.id).toBe(part.asset);
    }
  });

  it('replaces a manual version and preserves unrelated parameters and unknown URLs', () => {
    const path = '/assets/store/hair_boy_basic.webp';
    expect(avatarAssetUrl(`${path}?v=2&example=1`)).toBe(`${path}?v=${versions[path]}&example=1`);
    expect(avatarAssetUrl('https://example.test/photo.webp?v=2')).toBe('https://example.test/photo.webp?v=2');
    expect(avatarAssetUrl('/other.webp')).toBe('/other.webp');
  });

  it('only applies long caching to the matching current content version, keeping original paths revalidatable', async () => {
    const rules = await nextConfig.headers!();
    for (const [source, hash] of Object.entries(versions)) {
      expect(rules).toContainEqual({ source, has: [{ type: 'query', key: 'v', value: hash }], headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] });
    }
    expect(rules.some((rule) => rule.source === '/assets/store/:path*')).toBe(false);
  });

  it('automatically changes the version after an artwork replacement and keeps unchanged URLs stable', () => {
    const root = mkdtempSync(join(tmpdir(), 'quizball-avatar-cache-'));
    try {
      mkdirSync(join(root, 'public/assets/store'), { recursive: true });
      writeFileSync(join(root, 'public/assets/store/hair.webp'), 'original artwork');
      writeFileSync(join(root, 'public/assets/store/jersey.webp'), 'unchanged artwork');
      const before = buildAvatarAssetCache(root);
      expect(buildAvatarAssetCache(root)).toEqual(before);
      writeFileSync(join(root, 'public/assets/store/hair.webp'), 'replacement artwork');
      const after = buildAvatarAssetCache(root);
      expect(after[0].has).not.toEqual(before[0].has);
      expect(after[1]).toEqual(before[1]);
      expect(JSON.parse(readFileSync(join(root, 'src/lib/avatars/asset-versions.json'), 'utf8'))['/assets/store/hair.webp']).toBe(after[0].has[0].value);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
