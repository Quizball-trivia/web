import { playOrderFrom, type PlayOrder, type PlayPopularity } from "./playCatalog";

/** The numbers change hourly on the backend; a server process asks again this often. */
const FRESH_MS = 10 * 60_000;
/** After a failed read (the endpoint missing, down or slow) it is left alone this long. */
const RETRY_MS = 2 * 60_000;
/** A process with nothing yet gives its first read this long before drawing the page with the hand-made order. */
const FIRST_WAIT_MS = 300;
/** Counts older than this (the endpoint gone, failing or serving an old copy) are dropped for the hand-made order. */
const MAX_STALE_MS = 24 * 60 * 60_000;

export interface PlayOrderLoaderOptions {
  clock?: () => number;
  /** Tells the host that this work outlives the response that started it (a serverless function may stop otherwise). */
  keepAlive?: (work: Promise<void>) => void;
  firstWaitMs?: number;
}

/**
 * Keeps the Play page's numbers in the server process. A page is never held up by them: it is drawn from what is
 * kept while a refresh runs behind it, and a process with nothing yet waits only a moment for its first read. A
 * failed read keeps the last good numbers.
 */
export function createPlayOrderLoader(read: () => Promise<PlayPopularity | null>, options: PlayOrderLoaderOptions = {}) {
  const { clock = Date.now, keepAlive = () => undefined, firstWaitMs = FIRST_WAIT_MS } = options;
  let kept: { popularity: PlayPopularity | null; at: number; ok: boolean; countedAt: number } | null = null;
  let loading: Promise<void> | null = null;

  const refresh = (): Promise<void> => {
    loading ??= read()
      .catch(() => null)
      .then((popularity) => {
        const at = clock();
        // The backend may hand out a copy it counted a while ago: its age runs from then, never from the future.
        const generated = Date.parse(popularity?.generated_at ?? "");
        const countedAt = Number.isFinite(generated) ? Math.min(generated, at) : at;
        kept = popularity
          ? { popularity, at, ok: true, countedAt }
          : { popularity: kept?.popularity ?? null, at, ok: false, countedAt: kept?.countedAt ?? at };
      })
      .finally(() => { loading = null; });
    return loading;
  };

  return async function loadPlayOrder(): Promise<PlayOrder> {
    const now = clock();
    const age = kept ? now - kept.at : Number.POSITIVE_INFINITY;
    // A clock that went backwards must not stretch how long a copy is trusted.
    const due = !kept || age < 0 || age >= (kept.ok ? FRESH_MS : RETRY_MS);
    if (due) {
      const work = refresh();
      keepAlive(work);
      if (!kept) await Promise.race([work, new Promise<void>((resolve) => setTimeout(resolve, firstWaitMs))]);
    }
    // Read again: a first read that answered while this page waited is newer than `now`.
    const drawnAt = clock();
    const stale = !kept || drawnAt - kept.countedAt > MAX_STALE_MS;
    return playOrderFrom(stale ? null : kept?.popularity ?? null, new Date(drawnAt));
  };
}
