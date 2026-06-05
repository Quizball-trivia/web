import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// Vitest 4 + jsdom no longer guarantees a fully-featured Web Storage on
// `window.localStorage` / `window.sessionStorage` (the runner emits a
// "--localstorage-file was provided without a valid path" warning and the
// injected object can be missing methods like `.clear()`). Install a small,
// spec-compliant in-memory Storage so tests that call getItem/setItem/
// removeItem/clear work consistently across environments.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function installStorage(name: 'localStorage' | 'sessionStorage'): void {
  const existing = (globalThis as Record<string, unknown>)[name] as Storage | undefined;
  // Replace if missing or if it's not fully functional (e.g. `.clear` absent).
  if (!existing || typeof existing.clear !== 'function') {
    Object.defineProperty(globalThis, name, {
      value: new MemoryStorage(),
      writable: true,
      configurable: true,
    });
  }
}

installStorage('localStorage');
installStorage('sessionStorage');

// Reset storage between tests so state doesn't leak across cases.
beforeEach(() => {
  try {
    globalThis.localStorage?.clear();
    globalThis.sessionStorage?.clear();
  } catch {
    // ignore environments without storage
  }
});
