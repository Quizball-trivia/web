/**
 * Index of the letter a name passes on: its last letter, except that a Russian name skips a closing й, ь, ъ or ы, as in the
 * "cities" game and as the server reads it ("Пуйоль" → Л). -1 when the name has no letter.
 */
export function chainLetterIndex(name: string): number {
  const letters = [...name];
  const cyrillic = /\p{Script=Cyrillic}/u.test(name);
  for (let i = letters.length - 1; i >= 0; i -= 1) {
    const ch = letters[i];
    if (!/\p{L}/u.test(ch)) continue;
    if (cyrillic && /[йьъыЙЬЪЫ]/.test(ch)) continue;
    return i;
  }
  return -1;
}
