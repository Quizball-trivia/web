import { describe, expect, it } from 'vitest';
import { LOCALES } from '@/lib/i18n/locale-config';
import { CARDS, CARD_BY_ID, STARTER_DECKS, type CardId } from '../zoneMatch.cards';
import { ZONE_MATCH_COPY, cardEventLine, counted, deckBlockerText, fill, zoneMatchCopy } from '../zoneMatch.copy';
import type { CardEvent } from '../zoneMatch.machine';

type Tree = string | Tree[] | { [key: string]: Tree };
const PLURAL_KEYS = new Set(['one', 'few', 'many', 'other']);
const isPlural = (node: Tree): node is Record<string, string> =>
  typeof node === 'object' && !Array.isArray(node) && 'other' in node && Object.keys(node).every((key) => PLURAL_KEYS.has(key));

function leaves(node: Tree, path = ''): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  if (Array.isArray(node)) return node.flatMap((item, i) => leaves(item, `${path}[${i}]`));
  if (isPlural(node)) return [[path, node.other]];
  return Object.entries(node).flatMap(([key, value]) => leaves(value, path ? `${path}.${key}` : key));
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const LOCALE_CODES = LOCALES.map((l) => l.code);
const en = leaves(ZONE_MATCH_COPY.en as unknown as Tree);
const enByPath = new Map(en);
const translated = LOCALE_CODES.filter((code) => code !== 'en');

describe('zone match copy', () => {
  it('has an entry for every app locale', () => {
    expect(Object.keys(ZONE_MATCH_COPY).sort()).toEqual([...LOCALE_CODES].sort());
  });

  it.each(translated)('%s has exactly the English keys', (code) => {
    const paths = leaves(ZONE_MATCH_COPY[code] as unknown as Tree).map(([path]) => path);
    expect(paths.sort()).toEqual([...enByPath.keys()].sort());
  });

  it.each(translated)('%s keeps every placeholder English has, and no others', (code) => {
    for (const [path, text] of leaves(ZONE_MATCH_COPY[code] as unknown as Tree)) {
      expect(placeholders(text), `${code}.${path}: ${text}`).toEqual(placeholders(enByPath.get(path) ?? ''));
    }
  });

  it.each(translated)('%s has no empty strings and left nothing in English that should not be', (code) => {
    // Words that stay the same in a locale's football or game vocabulary.
    const sharedSameAsEnglish = /^(brand\[0\]|cards\.(fifty-fifty|var-review|tiki-taka)\.name|notes\.first-touch)$/;
    const same = leaves(ZONE_MATCH_COPY[code] as unknown as Tree).filter(([path, text]) => {
      expect(text.trim().length, `${code}.${path}`).toBeGreaterThan(0);
      return text === enByPath.get(path) && !sharedSameAsEnglish.test(path) && /[A-Za-z]{4}/.test(text);
    });
    // A handful can legitimately match (Sabotage in German); a real gap would be many.
    expect(same.map(([path]) => path).length, same.map(([path]) => path).join(', ')).toBeLessThanOrEqual(12);
  });

  // A machine translation once slipped Cyrillic and Mongolian into the Georgian strings.
  it.each(LOCALE_CODES)('%s stays in its own script', (code) => {
    const foreign = code === 'ka' ? /[\u0400-\u04FF]/ : code === 'ru' ? /[\u10A0-\u10FF]/ : /[\u0400-\u04FF\u10A0-\u10FF]/;
    for (const [path, text] of leaves(ZONE_MATCH_COPY[code] as unknown as Tree)) expect(text, `${code}.${path}`).not.toMatch(foreign);
  });

  it('closes every Spanish inverted mark it opens', () => {
    for (const [path, text] of leaves(ZONE_MATCH_COPY.es as unknown as Tree)) {
      if (text.includes('¡')) expect(text, path).toContain('!');
      if (text.includes('¿')) expect(text, path).toContain('?');
    }
  });

  it.each(LOCALE_CODES)('%s has a plural form for every small count', (code) => {
    const rules = new Intl.PluralRules(code);
    const copy = ZONE_MATCH_COPY[code];
    for (const entry of [copy.reason.zones, copy.hand.attacksLeft]) {
      for (let n = 0; n <= 25; n += 1) {
        const form = entry[rules.select(n) as keyof typeof entry];
        expect(form, `${code} ${n}`).toBeTruthy();
        expect(form).toContain('{n}');
      }
    }
  });

  it.each(LOCALE_CODES)('%s names every card, type, phase, role and starter deck', (code) => {
    const copy = ZONE_MATCH_COPY[code];
    for (const card of CARDS) {
      expect(copy.cards[card.id].name).toBeTruthy();
      expect(copy.cards[card.id].short.length, `${code} ${card.id}`).toBeLessThanOrEqual(22);
      expect(copy.cardTypes[card.type]).toBeTruthy();
      expect(copy.phases[card.phase].label).toBeTruthy();
      expect(copy.roles[card.role].label).toBeTruthy();
    }
    for (const deck of STARTER_DECKS) expect(copy.starterDecks[deck.id].name).toBeTruthy();
  });

  it.each(LOCALE_CODES)('%s uses one name for a card as a card and as a duel note', (code) => {
    const copy = ZONE_MATCH_COPY[code];
    for (const id of ['golden-boot', 'first-touch', 'high-press'] as const) expect(copy.notes[id]).toBe(copy.cards[id].name);
  });

  it('keeps the English names in step with the engine', () => {
    for (const card of CARDS) expect(ZONE_MATCH_COPY.en.cards[card.id].name).toBe(CARD_BY_ID[card.id].name);
  });

  it('gives every card a short headline that fits on the card in English', () => {
    for (const card of CARDS) expect(ZONE_MATCH_COPY.en.cards[card.id].short.length).toBeLessThanOrEqual(18);
  });
});

/**
 * Rendered as is on both screens: nothing picks a string by side, so the winner and the loser read the same words. They
 * must be impersonal, as the English is. Side-dependent wording has its own keys (`mine` / `theirs`, `...You` / `...Them`).
 */
const FOR_BOTH_SEATS = [
  /^notes\./, /^reason\./, /^tikiZoneLeft$/,
  /^stage\.(heldTitle|heldDetail|stolenTitle|goalTitle|bothWrong|countered|tookEffect|activated|beaten|cardBeaten|lastDuel|offCategory|numericTitle|lastRound|round|penaltyCounter|roundCounter|roundCounterDuel)$/,
  /^stage\.feed\.heldUp$/,
  /^hand\.(noAttacksLeft|lastAttack|attackOf|attacksLeft|noneLeft|lastOne|nLeft)$/,
  /^clash\.(cardsActivated|noCardsDuel|questionNext|cardsRevealed|choosing|noCard|lockedIn|blockedBy|cancelledBy|bluffBlockedBy|bluffCancelledBy|stampBluff|stampBlocked|stampCancelled)$/,
  /^shootout\.(goal|saved|missed|keeperWrong|shooterFaster|keeperFaster|deadLevel|bothWrong|shooterWrong|whoFaster|afterFullTime|penalties|shootsFirst)$/,
  /^sky\.(closer|faster|onlyAnswer|lucky|spotOn|off|answer|noAnswer)$/,
  /^fx\./,
];
const word = (list: string) => new RegExp(`(?<![\\p{L}])(${list})(?![\\p{L}])`, 'iu');
/** Words that address the reader or name their opponent; a verb form only where the language marks the person on it. */
const ADDRESSES_THE_READER: Record<string, RegExp[]> = {
  en: [word('you|your|yours|their|them')],
  es: [word('tú|tu|tus|te|ti|su|sus|rival'), /\p{L}(aste|iste)(?!\p{L})/u, word('avanzas|ganas|pierdes|tienes')],
  pt: [word('você|vocês|seu|sua|seus|suas|deles|delas|adversário')],
  de: [word('du|dein|deine|deinen|deinem|deiner|dich|dir|gegner|gegners')],
  ru: [word('ты|твой|твоя|твоё|твои|тебя|тебе|соперник|соперника|сопернику'), /\p{L}(ешь|(?<!л)ишь)(?!\p{L})/u],
  tr: [word('sen|senin|sana|seni|ikiniz|rakip|rakibe|rakibin|hakkın|seçimin'), /\p{L}(dın|din|dun|dün)(?!\p{L})/u],
  ka: [word('შენ|შენი|შენს|მათი|მათ|მოწინააღმდეგე|მოიგე|დაკარგე|ითამაშე|ითამაშეთ|უპასუხეთ|დაგრჩა|გაგიმართლა|აღმოჩნდი')],
};

describe('text shown to both seats', () => {
  const isForBoth = (path: string) => {
    const key = path.replace(/\[\d+\]$/, '');
    return FOR_BOTH_SEATS.some((pattern) => pattern.test(key));
  };
  const effects = (code: (typeof LOCALE_CODES)[number]) =>
    Object.entries(ZONE_MATCH_COPY[code].effects).flatMap(([key, value]) => (typeof value === 'string' ? [[`effects.${key}`, value] as const] : []));

  it.each(LOCALE_CODES)('%s does not address the reader', (code) => {
    const strings = [...leaves(ZONE_MATCH_COPY[code] as unknown as Tree).filter(([path]) => isForBoth(path)), ...effects(code)];
    expect(strings.length).toBeGreaterThan(80);
    const addressed = strings.filter(([, text]) => ADDRESSES_THE_READER[code].some((pattern) => pattern.test(text.replace(/\{\w+\}/g, ''))));
    expect(addressed).toEqual([]);
  });
});

describe('copy helpers', () => {
  const named = { categories: { player: [{ id: 'c1', name: 'Derbis' }], opponent: [] } };
  const event = (patch: Partial<CardEvent>): CardEvent => ({ id: 1, duelNo: 1, side: 'player', card: 'fog', effect: 'played', phase: 'reveal', ...patch });

  it('fills placeholders and leaves unknown ones alone', () => {
    expect(fill('{a} and {b}', { a: 1 })).toBe('1 and {b}');
  });

  it('picks the plural form per locale', () => {
    const { zones } = ZONE_MATCH_COPY.en.reason;
    expect(counted('en', zones, 1)).toBe('+1 zone');
    expect(counted('en', zones, 2)).toBe('+2 zones');
  });

  it('falls back to English for an unknown locale', () => {
    expect(zoneMatchCopy('xx')).toBe(ZONE_MATCH_COPY.en);
  });

  it('words a card event from the reader\'s seat', () => {
    const c = ZONE_MATCH_COPY.en;
    expect(cardEventLine(c, event({ effect: 'fog-on', side: 'player' }), named)).toBe('Their answers are hidden until tapped');
    expect(cardEventLine(c, event({ effect: 'fog-on', side: 'opponent' }), named)).toBe('Your answers are hidden until tapped');
    expect(cardEventLine(c, event({ effect: 'bus-stopped', against: { side: 'opponent', card: 'tiki-taka' } }), named)).toBe('Stopped their Tiki-Taka');
    expect(cardEventLine(c, event({ effect: 'home-category', categoryId: 'c1' }), named)).toBe('Category: Derbis');
    expect(cardEventLine(c, event({ effect: 'tiki-zone', left: 2 }), named)).toBe('+1 zone (2 left)');
    expect(cardEventLine(c, event({ effect: 'tiki-zone', left: 0 }), named)).toBe('+1 zone');
  });

  it('shows a room\'s old English effect text as it is', () => {
    expect(cardEventLine(ZONE_MATCH_COPY.en, event({ effect: 'gloves on' as CardEvent['effect'] }), named)).toBe('gloves on');
  });

  it('puts the numbers into a deck blocker', () => {
    const deck: CardId[] = ['fifty-fifty', 'park-the-bus'];
    expect(deckBlockerText(ZONE_MATCH_COPY.en, deck, 'tiki-taka', 'deck-budget')).toBe('Costs 3⚡ — only 2⚡ left');
    expect(deckBlockerText(ZONE_MATCH_COPY.en, ['fog'], 'yellow-card', 'deck-sabotage')).toBe('Max 1 sabotage playstyle');
  });
});
