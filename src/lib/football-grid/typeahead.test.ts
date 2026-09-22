import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/config', () => ({ API_BASE_URL: 'http://localhost:8000' }));
vi.mock('@/lib/auth/supabase', () => ({ getSupabaseAccessToken: async () => null }));
import { normalizeGridAnswerText, searchGridPlayers, type GridTypeaheadPreparedPlayer } from './typeahead';

const players = [
  { id: 'gundogan', nameEn: 'İlkay Gündoğan', nameKa: 'ილქაი გიუნდოგანი' },
  { id: 'yilmaz', nameEn: 'Rıdvan Yılmaz', nameKa: 'რიდვან ილმაზი' },
  { id: 'alvarez', nameEn: 'Julián Álvarez', nameKa: 'ხულიან ალვარესი' },
  { id: 'gross', nameEn: 'Pascal Groß', nameKa: 'პასკალ გროსი' },
];
const roster: GridTypeaheadPreparedPlayer[] = players.map((player) => ({ ...player,
  wordsEn: normalizeGridAnswerText(player.nameEn).split(' '),
  wordsKa: normalizeGridAnswerText(player.nameKa).split(' '),
}));

describe('Grid name suggestions across interface languages', () => {
  it.each(['en', 'ka', 'es', 'tr'] as const)('finds names from either script in the %s UI', (locale) => {
    for (const [query, id] of [
      ['ılkay gundogan', 'gundogan'], ['İLKAY GÜNDOĞAN', 'gundogan'],
      ['ridvan yilmaz', 'yilmaz'], ['JULIAN ALVAREZ', 'alvarez'],
      ['ხულიან'.toUpperCase(), 'alvarez'],
      ['PASCAL GROSS', 'gross'],
    ]) {
      expect(searchGridPlayers(roster, query, locale).map((player) => player.id)).toEqual([id]);
    }
    expect(searchGridPlayers(roster, 'nonsense name', locale)).toEqual([]);
  });

  it('uses locale-independent case handling and stable punctuation rules', () => {
    expect(normalizeGridAnswerText('  ÁNGEL  Di-María! ')).toBe('angel di maria');
    expect(normalizeGridAnswerText("N'Golo Kanté")).toBe('ngolo kante');
    expect(normalizeGridAnswerText('NʻGolo Kanté')).toBe('ngolo kante');
    expect(normalizeGridAnswerText('IŞIK')).toBe('isik');
  });
});
