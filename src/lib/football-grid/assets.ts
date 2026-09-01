const DEFAULT_SUPABASE_URL = 'https://nsdfiprfmhdqhbfxfwpv.supabase.co';
const FOOTBALL_GRID_CDN_RELEASE = 'v1';
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_SUPABASE_URL).replace(/\/+$/, '');

export const FOOTBALL_GRID_CDN_BASE_URL = (
  process.env.NEXT_PUBLIC_FOOTBALL_GRID_CDN_BASE_URL
  ?? `${supabaseUrl}/storage/v1/object/public/imgs/football-grid/${FOOTBALL_GRID_CDN_RELEASE}`
).replace(/\/+$/, '');

function encodeAssetPath(value: string): string {
  return value.split('/').filter(Boolean).map(encodeURIComponent).join('/');
}

function isAllowedFirstPartyUrl(value: string): boolean {
  try {
    const candidate = new URL(value);
    const configuredBase = new URL(`${FOOTBALL_GRID_CDN_BASE_URL}/`);
    if (candidate.origin === configuredBase.origin && candidate.pathname.startsWith(configuredBase.pathname)) return true;

    const storageOrigin = new URL(`${supabaseUrl}/`);
    return candidate.origin === storageOrigin.origin
      && candidate.pathname.startsWith('/storage/v1/object/public/imgs/');
  } catch {
    return false;
  }
}

/**
 * Resolves a Grid asset to a first-party CDN URL. Third-party URLs and unknown
 * local paths intentionally return null so the UI uses its owned fallback.
 */
export function footballGridAssetUrl(value: string | null | undefined): string | null {
  const source = value?.trim();
  if (!source) return null;
  if (/^https:\/\//i.test(source)) return isAllowedFirstPartyUrl(source) ? source : null;
  if (source === '/assets/football-grid-card-icon.svg') return `${FOOTBALL_GRID_CDN_BASE_URL}/ui/card-icon.svg`;
  // Play-hub card icon shared with the mobile app's bundled artwork.
  if (source === '/assets/football-grid/card-icon.png') return `${FOOTBALL_GRID_CDN_BASE_URL}/ui/card-icon.png`;
  if (source === '/assets/bg-pattern.webp') return `${FOOTBALL_GRID_CDN_BASE_URL}/ui/bg-pattern.webp`;
  // Avatar store assets are app-served everywhere else (store, profile, matches);
  // serving them the same way here means new catalog assets need no CDN publish.
  const avatarPrefix = '/assets/store/';
  if (source.startsWith(avatarPrefix)) {
    const relative = source.slice(avatarPrefix.length).split('?')[0];
    if (!relative || relative.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) return null;
    return source;
  }
  const prefix = '/assets/football-grid/';
  if (!source.startsWith(prefix)) return null;
  const relative = source.slice(prefix.length);
  if (!relative || relative.split('/').some((segment) => segment === '.' || segment === '..')) return null;
  return `${FOOTBALL_GRID_CDN_BASE_URL}/${encodeAssetPath(relative)}`;
}

export function isFirstPartyFootballGridAsset(value: string | null | undefined): boolean {
  return footballGridAssetUrl(value) !== null;
}
