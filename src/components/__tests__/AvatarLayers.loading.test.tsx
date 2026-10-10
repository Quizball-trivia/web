import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AvatarLayers } from '../AvatarLayers';

describe('AvatarLayers thumbnails', () => {
  const customization = { jersey: 'jersey_green' };

  it('uses responsive thumbnails without changing overlay geometry', () => {
    const { container } = render(<AvatarLayers customization={customization} imageSizes="26px" />);
    const image = container.querySelector<HTMLImageElement>('img')!;
    expect(image).not.toBeNull();
    expect(image.src).toContain('/_next/image?');
    expect(image.srcset).toContain('w=32');
    expect(image.sizes).toMatch(/^\d+px$/);
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image.style.position).toBe('');
    expect(image.style.width).toMatch(/%$/);
    expect(image).not.toHaveAttribute('width');
    expect(image).not.toHaveAttribute('height');
  });

  it('preserves dedicated CDN resolvers and un-sized preview consumers', () => {
    const { container, rerender } = render(<AvatarLayers customization={customization} imageSizes="26px" assetResolver={(path) => `https://assets.example.test${path}`} />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://assets.example.test/assets/store/jersey_green.webp?v=2');
    expect(container.querySelector('img')).not.toHaveAttribute('srcset');
    rerender(<AvatarLayers customization={customization} />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/assets/store/jersey_green.webp?v=2');
    expect(container.querySelector('img')).not.toHaveAttribute('srcset');
  });

  it.each([
    { sizes: '(min-width: 640px) 38px, 32px', breakpoint: 640, slots: [38, 32] },
    { sizes: '(min-width: 768px) 115px, 103px', breakpoint: 768, slots: [115, 103] },
  ])('preserves the $breakpoint px layout breakpoint while scaling slot widths', ({ sizes, breakpoint, slots }) => {
    const { container } = render(<AvatarLayers customization={customization} imageSizes={sizes} />);
    const image = container.querySelector<HTMLImageElement>('img')!;
    const partWidth = Number.parseFloat(image.style.width) / 100;
    expect(image.sizes).toBe(`(min-width: ${breakpoint}px) ${Math.ceil(slots[0] * partWidth)}px, ${Math.ceil(slots[1] * partWidth)}px`);
    expect(image.srcset).toContain('w=32');
  });
});
