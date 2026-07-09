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
  "Georgia": "store.partGeorgia",
  "Real Madrid": "store.partRealMadrid",
  "Barcelona": "store.partBarcelona",
  "Milan": "store.partMilan",
  "Liverpool": "store.partLiverpool",
  "Bayern": "store.partBayern",
  "PSG": "store.partPsg",
  "Argentina Retro": "store.partArgentinaRetro",
  "Brazil Retro": "store.partBrazilRetro",
  "France Retro": "store.partFranceRetro",
  "Germany Retro": "store.partGermanyRetro",
  "Netherlands Retro": "store.partNetherlandsRetro",
  "Hamsik": "store.partHamsik",
  "Ramos": "store.partRamos",
  "Ronaldo Nazario": "store.partRonaldoNazario",
  "CR7": "store.partCr7",
  "Man United": "store.partManUnited",
  "Arsenal": "store.partArsenal",
  "Man City": "store.partManCity",
  "Newcastle": "store.partNewcastle",
  "Dinamo Tbilisi": "store.partDinamoTbilisi",
  "Dortmund": "store.partDortmund",
  "Italy Home": "store.partItalyHome",
  "Italy Away": "store.partItalyAway",
  "Italy Third": "store.partItalyThird",
  "England Home": "store.partEnglandHome",
  "England Away": "store.partEnglandAway",
  "Atletico Madrid": "store.partAtleticoMadrid",
  "Napoli": "store.partNapoli",
  "Inter": "store.partInter",
  "Roma": "store.partRoma",
  "Juventus": "store.partJuventus",
  "Ajax": "store.partAjax",
  "Wave": "store.partWave",
  "Curly Crop": "store.partCurlyCrop",
  "Cornrows": "store.partCornrows",
  "Buzz Cut": "store.partBuzzCut",
  "Side Part": "store.partSidePart",
  "Leopard": "store.partLeopard",
  "Handlebar": "store.partHandlebar",
  "Stache & Goatee": "store.partStacheGoatee",
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
