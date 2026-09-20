import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRealtimeCommandId } from '../command-id';

describe('createRealtimeCommandId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses randomUUID when the browser exposes it', () => {
    const randomUUID = vi.fn(() => '123e4567-e89b-42d3-a456-426614174000');
    vi.stubGlobal('crypto', { randomUUID });

    expect(createRealtimeCommandId()).toBe('123e4567-e89b-42d3-a456-426614174000');
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('creates a valid v4 UUID when randomUUID is unavailable on plain HTTP', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(17);
        return bytes;
      },
    });

    expect(createRealtimeCommandId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
