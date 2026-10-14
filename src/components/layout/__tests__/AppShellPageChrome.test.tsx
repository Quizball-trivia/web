import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import backgroundAssets from '@/lib/app-background-assets.json';
import { AppShellPageChrome } from '../app-shell/AppShellPageChrome';

describe('unchanged stadium background with an AVIF alternative', () => {
  it('keeps the original image-set as fallback for a scoped word landing', () => {
    const html = renderToStaticMarkup(<AppShellPageChrome wordLanding />);
    expect(html).toContain('qb-word-mobile-background');
    expect(html).toContain('var(--qb-word-background, image-set(');
    expect(html).toContain(backgroundAssets.patternAvif);
    expect(html).toContain('/assets/bg-pattern.webp');
    const original = renderToStaticMarkup(<AppShellPageChrome />);
    expect(original).not.toContain('qb-word-mobile-background');
    expect(original).not.toContain('var(--qb-word-background');
  });
  it('keeps the original WebP fallback, cover geometry and decorative semantics', () => {
    const { container } = render(<AppShellPageChrome />);
    const layers = container.querySelectorAll('[aria-hidden="true"]');
    expect(layers).toHaveLength(2);
    expect(layers[0]).toHaveClass('fixed', 'inset-0', 'bg-cover', 'bg-center');
    expect(layers[0].className).toContain("bg-[url('/assets/bg-pattern.webp')]");
    // JSDOM rejects image-set declarations. Check the actual server markup,
    // then verify browser selection separately in mobile staging QA.
    const html = renderToStaticMarkup(<AppShellPageChrome />);
    expect(html).toContain(backgroundAssets.patternAvif);
    expect(html).toContain("url(&#x27;/assets/bg-pattern.webp&#x27;) type(&#x27;image/webp&#x27;)");
  });

  it('ships smaller content-addressed bytes without resizing or dropping alpha', async () => {
    const root = process.cwd();
    const avif = readFileSync(path.join(root, 'public', backgroundAssets.patternAvif));
    const original = readFileSync(path.join(root, 'public/assets/bg-pattern.webp'));
    const digest = createHash('sha256').update(avif).digest('hex').slice(0, 12);
    expect(backgroundAssets.patternAvif).toContain(`.${digest}.avif`);
    expect(avif.byteLength).toBeLessThan(original.byteLength);
    const before = await sharp(original).metadata();
    const after = await sharp(avif).metadata();
    expect(after.width).toBe(before.width);
    expect(after.height).toBe(before.height);
    expect(after.hasAlpha).toBe(true);
  });
});
