import { trainingPortraitUrl } from './gridTrainingPortraits';
import { GRID_CONFIGS, type GridAnswer } from '@/features/mini-games/data/footballGrid';
import { matchesName } from '@/features/mini-games/lib/matching';
import { normalizeGridAnswerText, type GridTypeaheadPreparedPlayer } from '@/lib/football-grid/typeahead';
import type { FootballGridBoardView, FootballGridCompletedPayload, FootballGridCriterionView } from '@/lib/realtime/socket.types';

/**
 * The training board: the mini-game's first grid (Real Madrid / Manchester
 * United / Juventus × Brazil / France / Argentina), whose cells carry authored
 * valid answers with accepted spellings and transliterations. Criterion ids are
 * the live registry ids so the real crests and flags render.
 */
export const GRID_TRAINING_CONFIG = GRID_CONFIGS[0];

function criterion(
  id: string,
  family: FootballGridCriterionView['family'],
  labelEn: string,
  labelKa: string,
  labelEs: string,
  labelTr: string,
  more: Pick<FootballGridCriterionView, 'labelRu' | 'labelPt' | 'labelDe' | 'labelFr' | 'labelEl'>,
): FootballGridCriterionView {
  return { id, key: id, family, labelEn, labelKa, labelEs, labelTr, ...more, assetKey: id, difficulty: 'normal' };
}

export const GRID_TRAINING_BOARD: FootballGridBoardView = {
  boardId: 'training-board',
  boardVersion: 1,
  checksum: 'training',
  rows: [
    criterion('real-madrid-cf', 'club', 'Real Madrid CF', 'რეალ მადრიდი', 'Real Madrid CF', 'Real Madrid CF', { labelRu: 'Реал Мадрид', labelPt: 'Real Madrid', labelDe: 'Real Madrid', labelFr: 'Real Madrid', labelEl: 'Ρεάλ Μαδρίτης' }),
    criterion('manchester-united', 'club', 'Manchester United', 'მანჩესტერ იუნაიტედი', 'Manchester United', 'Manchester United', { labelRu: 'Манчестер Юнайтед', labelPt: 'Manchester United', labelDe: 'Manchester United', labelFr: 'Manchester United', labelEl: 'Μάντσεστερ Γιουνάιτεντ' }),
    criterion('juventus', 'club', 'Juventus', 'იუვენტუსი', 'Juventus', 'Juventus', { labelRu: 'Ювентус', labelPt: 'Juventus', labelDe: 'Juventus', labelFr: 'Juventus', labelEl: 'Γιουβέντους' }),
  ],
  columns: [
    criterion('br', 'country', 'Brazil', 'ბრაზილია', 'Brasil', 'Brezilya', { labelRu: 'Бразилия', labelPt: 'Brasil', labelDe: 'Brasilien', labelFr: 'Brésil', labelEl: 'Βραζιλία' }),
    criterion('fr', 'country', 'France', 'საფრანგეთი', 'Francia', 'Fransa', { labelRu: 'Франция', labelPt: 'França', labelDe: 'Frankreich', labelFr: 'France', labelEl: 'Γαλλία' }),
    criterion('ar', 'country', 'Argentina', 'არგენტინა', 'Argentina', 'Arjantin', { labelRu: 'Аргентина', labelPt: 'Argentina', labelDe: 'Argentinien', labelFr: 'Argentine', labelEl: 'Αργεντινή' }),
  ],
};

export function cellAnswers(cellIndex: number): GridAnswer[] {
  return GRID_TRAINING_CONFIG.cells[Math.floor(cellIndex / 3)][cellIndex % 3];
}

/** The valid answer a typed name resolves to for this cell, or null. */
export function resolveCellAnswer(cellIndex: number, text: string): GridAnswer | null {
  let best: { answer: GridAnswer; distance: number } | null = null;
  for (const answer of cellAnswers(cellIndex)) {
    const match = matchesName(text, [answer.name, ...answer.accepted]);
    if (match.ok && (!best || match.distance < best.distance)) best = { answer, distance: match.distance };
  }
  return best?.answer ?? null;
}

export const playerIdOf = (name: string) => normalizeGridAnswerText(name).replace(/ /g, '-');

const DECOYS = ['Cristiano Ronaldo', 'Lionel Messi', 'Neymar', 'Erling Haaland', 'Robert Lewandowski'];

/** Georgian search names for players the mini-game fixture only aliases in Latin script (the tooltips suggest these). */
const KA_NAMES: Record<string, string> = {
  'Paul Pogba': 'პოლ პოგბა',
  'Karim Benzema': 'კარიმ ბენზემა',
  'David Trezeguet': 'დავიდ ტრეზეგე',
  'Eric Cantona': 'ერიკ კანტონა',
  'Kylian Mbappé': 'კილიან მბაპე',
  'Cristiano Ronaldo': 'კრიშტიანუ რონალდუ',
};

/** Typeahead roster: every valid answer on the board plus a few famous decoys, so the suggestions look real. */
export const GRID_TRAINING_ROSTER: GridTypeaheadPreparedPlayer[] = (() => {
  const seen = new Set<string>();
  const players: GridTypeaheadPreparedPlayer[] = [];
  const add = (nameEn: string, accepted: string[]) => {
    const id = playerIdOf(nameEn);
    if (seen.has(id)) return;
    seen.add(id);
    const nameKa = KA_NAMES[nameEn] ?? accepted.find((value) => /[Ⴀ-ჿ]/.test(value)) ?? null;
    players.push({
      id,
      nameEn,
      nameKa,
      wordsEn: normalizeGridAnswerText(nameEn).split(' ').filter(Boolean),
      wordsKa: nameKa ? normalizeGridAnswerText(nameKa).split(' ').filter(Boolean) : [],
      wordsRu: [],
    });
  };
  for (const row of GRID_TRAINING_CONFIG.cells) for (const cell of row) for (const answer of cell) add(answer.name, answer.accepted);
  for (const decoy of DECOYS) add(decoy, []);
  return players.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
})();

/** "Sample answers" for the results gallery — three cells, three names each, with the catalogue portraits where one exists. */
export const GRID_TRAINING_SAMPLES: FootballGridCompletedPayload['samples'] = [3, 5, 8].map((cellIndex) => ({
  cellIndex,
  players: cellAnswers(cellIndex).slice(0, 3).map((answer) => ({ playerId: playerIdOf(answer.name), name: answer.name, imageUrl: trainingPortraitUrl(answer.name), imageAssetKey: null })),
}));
