import { FIFA_CARDS, type FifaCard } from "@/features/mini-games/data/guessFifaCard";
import { ICON_CARDS } from "@/features/mini-games/data/guessFifaIcons";
import type { GuessableCard } from "@/features/mini-games/lib/guessCard";

/**
 * MOCK daily set — 10 fixed "questions" for the Guess-the-Card daily. This is
 * placeholder data; the questions will be authored in the CMS with real data
 * later. The 4 gold cards are hand-authored from reference FUT cards; the 6
 * Icons reference the bundled icon set (3 "What If" Georgian legends + 3 real
 * Icons). Faces are borrowed from the dataset by name where a card exists.
 */

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");

/** Reuse a verified SoFIFA face id from the dataset for a hand-authored card. */
function faceOf(surname: string): Pick<FifaCard, "photoId" | "photoVer"> {
  const key = norm(surname);
  const hit = FIFA_CARDS.find((c) => c.photoId && norm(c.name).includes(key));
  return hit ? { photoId: hit.photoId, photoVer: hit.photoVer } : {};
}

const gold = (c: Omit<FifaCard, "photoId" | "photoVer"> & { face: string }): FifaCard => {
  const { face, ...rest } = c;
  return { ...rest, ...faceOf(face) };
};

const MOCK_GOLD: FifaCard[] = [
  gold({
    id: "daily-ramires", edition: "FIFA13", editionLabel: "FIFA 13", name: "Ramires", accepted: ["Ramires"],
    overall: 81, position: "CM", nation: "Brazil", nationCode: "br", league: "Premier League", club: "Chelsea",
    stats: { pac: 88, sho: 68, pas: 79, dri: 82, def: 76, phy: 72 }, face: "Ramires",
  }),
  gold({
    id: "daily-gervinho", edition: "FIFA15", editionLabel: "FIFA 15", name: "Gervinho", accepted: ["Gervinho"],
    overall: 81, position: "LW", nation: "Ivory Coast", nationCode: "ci", league: "Serie A", club: "AS Roma",
    stats: { pac: 93, sho: 69, pas: 72, dri: 83, def: 40, phy: 64 }, face: "Gervinho",
  }),
  gold({
    id: "daily-smalling", edition: "FIFA17", editionLabel: "FIFA 17", name: "Chris Smalling", accepted: ["Chris Smalling", "Smalling"],
    overall: 84, position: "CB", nation: "England", nationCode: "gb-eng", league: "Premier League", club: "Manchester United",
    stats: { pac: 77, sho: 46, pas: 56, dri: 62, def: 84, phy: 84 }, face: "Smalling",
  }),
  gold({
    id: "daily-el-shaarawy", edition: "FIFA12", editionLabel: "FIFA 12", name: "Stephan El Shaarawy", accepted: ["Stephan El Shaarawy", "El Shaarawy", "Shaarawy"],
    overall: 73, position: "CAM", nation: "Italy", nationCode: "it", league: "Serie A", club: "AC Milan",
    stats: { pac: 81, sho: 70, pas: 70, dri: 79, def: 50, phy: 60 }, face: "El Shaarawy",
  }),
];

const icon = (surname: string): GuessableCard | null =>
  ICON_CARDS.find((c) => norm(c.name).includes(norm(surname))) ?? null;

// 3 "What If" Georgian legends, then 3 accurate real Icons.
const ICONS = ["Arveladze", "Kipiani", "Ketsbaia", "Zidane", "Henry", "Ronaldinho"]
  .map(icon)
  .filter((c): c is GuessableCard => c !== null);

export const DAILY_CARD_SET: GuessableCard[] = [...MOCK_GOLD, ...ICONS];
