import { NAME_LIST } from "./codenames.names.data";
import { foldClue } from "./codenames.view";

export type ClueKind = "player" | "manager" | "club" | "nation" | "stadium" | "word";
export interface ClueName { id: string; label: string; kind: ClueKind }

type Locale = "en" | "es" | "tr" | "ru" | "ka";
const asLocale = (locale: string): Locale => (["en", "es", "tr", "ru", "ka"].includes(locale) ? (locale as Locale) : "en");

interface Entry { name: ClueName; keys: string[] }
const cache = new Map<Locale, Entry[]>();

/** The names in one language, each findable by any of its spellings (every language, nicknames). */
function entries(locale: string): Entry[] {
  const l = asLocale(locale);
  let list = cache.get(l);
  if (!list) {
    list = NAME_LIST.map(([label, kind, aliases]) => ({
      name: { id: foldClue(label.en), label: label[l], kind },
      keys: [...new Set([...Object.values(label), ...aliases].map(foldClue))],
    }));
    cache.set(l, list);
  }
  return list;
}

/** A name of the list typed in full (any spelling), shown in the reader's language. */
export function knownName(text: string, locale: string): ClueName | null {
  const t = foldClue(text);
  return t ? entries(locale).find((e) => e.keys.includes(t))?.name ?? null : null;
}

const words = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("en").replace(/ı/g, "i").split(/[\s\-'’.]+/).filter(Boolean);

/** Names with a word starting with the text (accents ignored), best first. */
export function suggestNames(q: string, locale: string, max = 6): ClueName[] {
  const t = words(q.trim()).join(" ");
  if (t.length < 2) return [];
  const starts = (e: Entry) => [e.name.label, ...e.keys].some((k) => words(k).join(" ").startsWith(t));
  const anyWord = (e: Entry) => words(e.name.label).some((w) => w.startsWith(t));
  return entries(locale)
    .filter((e) => starts(e) || anyWord(e))
    .sort((a, b) => Number(!starts(a)) - Number(!starts(b)))
    .slice(0, max)
    .map((e) => e.name);
}
