/** A script or stylesheet of the running build failed to download, as opposed to the page's own code throwing. */
const LOAD_FAILURE = /ChunkLoadError|Loading (CSS )?chunk \S+ failed|Failed to load chunk|dynamically imported module|Importing a module script failed/i;

export function isLoadFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  return LOAD_FAILURE.test(`${typeof name === "string" ? name : ""} ${typeof message === "string" ? message : ""}`);
}

// The ranked quiz keeps its match in memory only: a reloaded /game waits on a loading screen for good, while the
// app's own pages offer the way back into the match.
const RELOAD_LOSES_THE_PAGE = /^\/game(\/|$)/;

export function reloadRestores(pathname: string): boolean {
  return !RELOAD_LOSES_THE_PAGE.test(pathname);
}
