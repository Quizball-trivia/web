import { FIFA_CARDS, type FifaCard } from "@/features/mini-games/data/guessFifaCard";
import type { GuessableCard } from "@/features/mini-games/lib/guessCard";

/**
 * MOCK daily set — 10 fixed "questions" (placeholder for the CMS). Four
 * hand-authored gold cards from reference FUT cards + six regular FIFA players
 * pulled straight from the dataset. Real player faces show on reveal (SoFIFA
 * face ids: hand-authored ones are set explicitly, dataset ones already carry them).
 */
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "");

const MOCK_GOLD: FifaCard[] = [
  {
    id: "daily-ramires", edition: "FIFA13", editionLabel: "FIFA 13", name: "Ramires", accepted: ["Ramires"],
    overall: 81, position: "CM", nation: "Brazil", nationCode: "br", league: "Premier League", club: "Chelsea",
    stats: { pac: 88, sho: 68, pas: 79, dri: 82, def: 76, phy: 72 }, photoId: 184943, photoVer: "16",
  },
  {
    id: "daily-gervinho", edition: "FIFA15", editionLabel: "FIFA 15", name: "Gervinho", accepted: ["Gervinho"],
    overall: 81, position: "LW", nation: "Ivory Coast", nationCode: "ci", league: "Serie A", club: "AS Roma",
    stats: { pac: 93, sho: 69, pas: 72, dri: 83, def: 40, phy: 64 }, photoId: 170733, photoVer: "16",
  },
  {
    id: "daily-smalling", edition: "FIFA17", editionLabel: "FIFA 17", name: "Chris Smalling", accepted: ["Chris Smalling", "Smalling"],
    overall: 84, position: "CB", nation: "England", nationCode: "gb-eng", league: "Premier League", club: "Manchester United",
    stats: { pac: 77, sho: 46, pas: 56, dri: 62, def: 84, phy: 84 }, photoId: 189881, photoVer: "16",
  },
  {
    id: "daily-el-shaarawy", edition: "FIFA12", editionLabel: "FIFA 12", name: "Stephan El Shaarawy", accepted: ["Stephan El Shaarawy", "El Shaarawy", "Shaarawy"],
    overall: 73, position: "CAM", nation: "Italy", nationCode: "it", league: "Serie A", club: "AC Milan",
    stats: { pac: 81, sho: 70, pas: 70, dri: 79, def: 50, phy: 60 }, photoId: 190813, photoVer: "16",
  },
];

// Six regular FIFA players, pulled from the dataset so they carry real faces.
function player(query: string): FifaCard | null {
  const key = norm(query);
  const matches = FIFA_CARDS.filter((c) => norm(c.name).includes(key));
  return matches.find((c) => c.photoId) ?? matches[0] ?? null;
}

const PLAYERS = ["De Bruyne", "Modric", "Lewandowski", "van Dijk", "Benzema", "Kroos"]
  .map(player)
  .filter((c): c is FifaCard => c !== null);

export const DAILY_CARD_SET: GuessableCard[] = [...MOCK_GOLD, ...PLAYERS];
