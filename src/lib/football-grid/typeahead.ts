import { API_BASE_URL } from '@/lib/config';
import { getSupabaseAccessToken } from '@/lib/auth/supabase';

export interface GridTypeaheadPlayer {
  id: string;
  nameEn: string;
  nameKa: string | null;
}

interface GridTypeaheadPayload {
  releaseId: string | null;
  players: GridTypeaheadPlayer[];
}

interface PreparedPlayer extends GridTypeaheadPlayer {
  /** Normalized word lists, precomputed once per roster download. */
  wordsEn: string[];
  wordsKa: string[];
}

/**
 * Mirror of the server's normalizeFootballGridAnswer: the suggestion filter
 * must accept exactly the spellings the resolver accepts, or a suggestion the
 * user picked could resolve differently than it matched.
 */
export function normalizeGridAnswerText(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/['’ʻ`´]/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STORAGE_KEY = 'qb-grid-typeahead-v1';

let rosterPromise: Promise<PreparedPlayer[]> | null = null;

function prepare(players: GridTypeaheadPlayer[]): PreparedPlayer[] {
  return players.map((player) => ({
    ...player,
    wordsEn: normalizeGridAnswerText(player.nameEn).split(' ').filter(Boolean),
    wordsKa: player.nameKa ? normalizeGridAnswerText(player.nameKa).split(' ').filter(Boolean) : [],
  }));
}

function readStoredRoster(): GridTypeaheadPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GridTypeaheadPayload;
    return Array.isArray(parsed.players) && parsed.players.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchRoster(): Promise<PreparedPlayer[]> {
  try {
    const token = await getSupabaseAccessToken();
    const res = await fetch(`${API_BASE_URL}/api/v1/football-grid/typeahead`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`typeahead fetch failed: ${res.status}`);
    const payload = await res.json() as GridTypeaheadPayload;
    if (payload.releaseId && payload.players.length > 0) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Storage full/blocked: the in-memory roster still works this session.
      }
      return prepare(payload.players);
    }
  } catch {
    // Network failure falls through to the stored copy below.
  }
  const stored = readStoredRoster();
  return stored ? prepare(stored.players) : [];
}

/** Cached-forever per page load; a stored copy bridges offline/failed loads. */
export function loadGridTypeaheadRoster(): Promise<PreparedPlayer[]> {
  if (!rosterPromise) rosterPromise = fetchRoster();
  return rosterPromise;
}

/**
 * Prefix match on any word of the player's name in either locale ("hala" →
 * Haaland, "კრიშ" → კრიშტიანუ რონალდუ). Multi-word queries require every
 * query word to prefix-match some name word ("cris ron" → Cristiano Ronaldo).
 */
export function searchGridPlayers(
  roster: PreparedPlayer[],
  query: string,
  locale: 'en' | 'ka',
  limit = 6,
): GridTypeaheadPlayer[] {
  const queryWords = normalizeGridAnswerText(query).split(' ').filter(Boolean);
  if (queryWords.length === 0 || queryWords.join('').length < 2) return [];

  const matches: Array<{ player: PreparedPlayer; score: number }> = [];
  for (const player of roster) {
    const nameWordSets = [player.wordsEn, player.wordsKa];
    let best: number | null = null;
    for (const words of nameWordSets) {
      if (words.length === 0) continue;
      const allMatch = queryWords.every((queryWord) => words.some((word) => word.startsWith(queryWord)));
      if (!allMatch) continue;
      // Earlier-word and exact-length matches rank higher: "ron" should list
      // Ronaldo (family name hit) above players merely containing "ron".
      const firstHit = words.findIndex((word) => word.startsWith(queryWords[0]));
      best = Math.min(best ?? Number.MAX_SAFE_INTEGER, firstHit);
    }
    if (best !== null) matches.push({ player, score: best });
  }
  matches.sort((a, b) => a.score - b.score
    || a.player.nameEn.length - b.player.nameEn.length
    || a.player.nameEn.localeCompare(b.player.nameEn));
  // The roster holds distinct players sharing a display name (two Aaron
  // Ramseys). Suggestions submit TEXT and the server resolves against the
  // cell, so showing the name once is both cleaner and sufficient.
  const seenNames = new Set<string>();
  const deduped: GridTypeaheadPlayer[] = [];
  for (const match of matches) {
    const key = normalizeGridAnswerText(match.player.nameEn);
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    deduped.push({ id: match.player.id, nameEn: match.player.nameEn, nameKa: match.player.nameKa });
    if (deduped.length >= limit) break;
  }
  return deduped;
}

export type { PreparedPlayer as GridTypeaheadPreparedPlayer };
