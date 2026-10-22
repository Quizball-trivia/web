/** Room options as one string (keys sorted; null for none): what a Ready or Start says its screen showed. Mirrors the backend's roomOptionsKey. */
export const roomOptionsKey = (options: unknown): string | null =>
  options && typeof options === "object"
    ? JSON.stringify(Object.fromEntries(Object.entries(options as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))))
    : null;
