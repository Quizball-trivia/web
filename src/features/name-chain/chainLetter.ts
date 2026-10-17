/**
 * The letters of a name as shown (NFC, as the server reads it: a decomposed "й" is one letter) and the index of the one it
 * passes on: its last letter, except that a Russian name skips a closing й, ь, ъ or ы, as in the "cities" game ("Пуйоль" →
 * Л). `at` is -1 when the name has no letter.
 */
export function chainLetters(name: string): { letters: string[]; at: number } {
  const shown = name.normalize("NFC");
  const letters = [...shown];
  const cyrillic = /\p{Script=Cyrillic}/u.test(shown);
  for (let i = letters.length - 1; i >= 0; i -= 1) {
    const ch = letters[i];
    if (!/\p{L}/u.test(ch)) continue;
    if (cyrillic && /[йьъыЙЬЪЫ]/.test(ch)) continue;
    return { letters, at: i };
  }
  return { letters, at: -1 };
}

/** The index of the passed-on letter within `name.normalize("NFC")`. */
export const chainLetterIndex = (name: string): number => chainLetters(name).at;
