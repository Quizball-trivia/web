import type { MessageKey } from "@/lib/i18n/messages";

// Maps an avatar part's English `name` to its i18n key. Only descriptive parts
// (skin tones, colours, basics, accessory types) are translated; player/team
// jerseys are proper nouns and intentionally absent so they fall through to the
// raw name. Shared by the store and the avatar picker so both translate alike.
const PART_NAME_KEY_MAP: Record<string, MessageKey> = {
  "Wayfarer": "store.partWayfarer",
  "Round Shades": "store.partRoundShades",
  "Aviator": "store.partAviator",
  "Mustache": "store.partMustache",
  "Beard": "store.partBeard",
  "Boy Basic": "store.partBoyBasic",
  "Girl Basic": "store.partGirlBasic",
  "Light": "store.partLight",
  "Tan": "store.partTan",
  "Brown": "store.partBrown",
  "Dark": "store.partDark",
  "Green": "store.partGreen",
  "Blue": "store.partBlue",
  "Yellow": "store.partYellow",
  "Red": "store.partRed",
  "Violet": "store.partViolet",
  "Pink": "store.partPink",
};

/**
 * Translate an avatar part name via `t`, falling back to the original name when
 * there's no mapping or the key is missing a translation. Pass the `t` from
 * `useLocale()`.
 */
export function translatePartName(
  name: string,
  t: (key: MessageKey) => string,
): string {
  const key = PART_NAME_KEY_MAP[name];
  if (!key) return name;
  const translated = t(key);
  return translated === key ? name : translated;
}
