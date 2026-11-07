/**
 * All Zone match wording, per locale. The engine (zoneMatch.machine / zoneMatch.cards, copied byte for byte to the
 * backend) only emits ids; the screens word them here. A new locale is one more file in copy/ and one more entry below:
 * `Locale` makes TypeScript fail until it exists, and `ZoneMatchCopy` until it has every key.
 * Strings carry `{placeholders}` rather than being functions so the locale files stay translatable data, and so the
 * zoneMatch.copy test can check every locale keeps English's placeholders.
 */

import type { Locale } from '@/lib/i18n/locale-config';
import { de } from './copy/de';
import { fr } from './copy/fr';
import { en, type BySide, type Plural, type ZoneMatchCopy } from './copy/en';
import { es } from './copy/es';
import { ka } from './copy/ka';
import { pt } from './copy/pt';
import { ru } from './copy/ru';
import { tr } from './copy/tr';
import { CARD_BY_ID, LOADOUT_BUDGET, MAX_SABOTAGE_IN_DECK, deckCost, type CardId, type DeckBlocker } from './zoneMatch.cards';
import type { CardEvent } from './zoneMatch.machine';

export type { ZoneMatchCopy };

export const ZONE_MATCH_COPY: Record<Locale, ZoneMatchCopy> = { en, ka, es, tr, ru, pt, de, fr };

export const zoneMatchCopy = (locale: string): ZoneMatchCopy => ZONE_MATCH_COPY[(locale in ZONE_MATCH_COPY ? locale : 'en') as Locale];

/** Puts the values into a template's `{placeholders}`. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}

/** The form of `entry` for the count `n` in `locale`, `{n}` filled. */
export function counted(locale: string, entry: Plural, n: number): string {
  const category = new Intl.PluralRules(locale).select(n) as keyof Plural;
  return fill(entry[category] ?? entry.other, { n });
}

/** The categories' names as this seat reads them, for a card event that names one. */
type Named = { categories: Record<'player' | 'opponent', { id: string; name: string }[]> };

/** What a firing card did, from this seat. A room started before the engine emitted ids still holds English sentences. */
export function cardEventLine(c: ZoneMatchCopy, event: CardEvent, state: Named): string {
  if (event.effect === 'tiki-zone' && (event.left ?? 0) > 0) return fill(c.tikiZoneLeft, { n: event.left! });
  const entry: string | BySide | undefined = c.effects[event.effect];
  if (entry === undefined) {
    const mine = event.side === 'player';
    return (event.effect as string).replace(/\{them\}/g, mine ? 'they' : 'you').replace(/\{their\}/g, mine ? 'their' : 'your');
  }
  const template = typeof entry === 'string' ? entry : event.side === 'player' ? entry.mine : entry.theirs;
  const category = [...state.categories.player, ...state.categories.opponent].find((item) => item.id === event.categoryId)?.name ?? '';
  return fill(template, { card: event.against ? c.cards[event.against.card].name : '', category });
}

/** Why `id` can't join `deck`, with its numbers. */
export function deckBlockerText(c: ZoneMatchCopy, deck: readonly CardId[], id: CardId, blocker: DeckBlocker): string {
  return fill(c.blockers[blocker], { max: MAX_SABOTAGE_IN_DECK, cost: CARD_BY_ID[id].energy, left: LOADOUT_BUDGET - deckCost(deck) });
}
