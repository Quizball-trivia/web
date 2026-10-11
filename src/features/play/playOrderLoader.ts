import { playOrderFrom, type PlayOrder, type PlayPopularity } from "./playCatalog";

/** The numbers change hourly on the backend; a server process asks again this often. */
const FRESH_MS = 10 * 60_000;
/** After a failed read (the endpoint missing, down or slow) it is left alone this long. */
const RETRY_MS = 2 * 60_000;

/**
 * Keeps the Play page's numbers in the server process. A page never waits for a refresh while there is something
 * to draw from: it gets what is kept and the refresh runs behind it. Only the very first read of a process is
 * waited for, and `read` has its own short time limit. A failed read keeps the last good numbers.
 */
export function createPlayOrderLoader(read: () => Promise<PlayPopularity | null>, clock: () => number = Date.now) {
  let kept: { popularity: PlayPopularity | null; at: number; ok: boolean } | null = null;
  let loading: Promise<void> | null = null;

  const refresh = (): Promise<void> => {
    loading ??= read()
      .catch(() => null)
      .then((popularity) => {
        kept = popularity
          ? { popularity, at: clock(), ok: true }
          : { popularity: kept?.popularity ?? null, at: clock(), ok: false };
      })
      .finally(() => { loading = null; });
    return loading;
  };

  return async function loadPlayOrder(): Promise<PlayOrder> {
    const due = !kept || clock() - kept.at >= (kept.ok ? FRESH_MS : RETRY_MS);
    if (due) {
      if (kept) void refresh();
      else await refresh();
    }
    return playOrderFrom(kept?.popularity ?? null, new Date(clock()));
  };
}
