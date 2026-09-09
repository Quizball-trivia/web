import type {
  ResolvedCluesQuestion,
  ResolvedPutInOrderQuestion,
} from "@/lib/realtime/socket.types";

/**
 * Special-question rounds inside the 12-question training match, keyed by
 * question index. These replace the MCQ panel for their round so a new player
 * meets every ranked question type; the possession engine still scores them
 * through resolveSpecialRound. Content is easy on purpose — the round teaches
 * the MECHANIC, not the trivia.
 */

export interface TrainingPutInOrderRound {
  kind: "putInOrder";
  question: ResolvedPutInOrderQuestion;
  /** Correct item ids in order — the question itself carries them scrambled. */
  correctIds: string[];
}

export interface TrainingCluesRound {
  kind: "clues";
  question: ResolvedCluesQuestion;
  /** Accepted answers, fed to the production fuzzy matcher. */
  accepted: string[];
  /** Resolved display answer per locale (shown on reveal). */
  displayAnswer: string;
}

export type TrainingSpecialRound = TrainingPutInOrderRound | TrainingCluesRound;

const PIO_PROMPTS: Record<string, { prompt: string; instruction: string }> = {
  en: { prompt: "Put these World Cups in order", instruction: "Oldest first" },
  es: { prompt: "Ordena estos Mundiales", instruction: "El más antiguo primero" },
  ka: { prompt: "დაალაგე ეს მსოფლიო თასები", instruction: "ჯერ ყველაზე ძველი" },
};

const PIO_LABELS: Record<string, Record<string, string>> = {
  en: { "wc-1930": "Uruguay 1930", "wc-1986": "Mexico 1986", "wc-2010": "South Africa 2010", "wc-2022": "Qatar 2022" },
  es: { "wc-1930": "Uruguay 1930", "wc-1986": "México 1986", "wc-2010": "Sudáfrica 2010", "wc-2022": "Catar 2022" },
  ka: { "wc-1930": "ურუგვაი 1930", "wc-1986": "მექსიკა 1986", "wc-2010": "სამხრეთ აფრიკა 2010", "wc-2022": "კატარი 2022" },
};

const PIO_CORRECT_IDS = ["wc-1930", "wc-1986", "wc-2010", "wc-2022"];
// Displayed scrambled — the panel shows items in the authored order.
const PIO_SCRAMBLED_IDS = ["wc-2010", "wc-1930", "wc-2022", "wc-1986"];
const PIO_EMOJI: Record<string, string> = {
  "wc-1930": "🏆",
  "wc-1986": "🇲🇽",
  "wc-2010": "🇿🇦",
  "wc-2022": "🇶🇦",
};

const CLUES_TEXT: Record<string, string[]> = {
  en: [
    "I am an Argentinian forward ⭐",
    "I spent most of my career at Barcelona",
    "I have won a record number of Ballon d'Or awards",
    "I lifted the World Cup in 2022",
    "They call me 'La Pulga' — The Flea",
  ],
  es: [
    "Soy un delantero argentino ⭐",
    "Pasé la mayor parte de mi carrera en el Barcelona",
    "He ganado un número récord de Balones de Oro",
    "Levanté la Copa del Mundo en 2022",
    "Me llaman 'La Pulga'",
  ],
  ka: [
    "არგენტინელი თავდამსხმელი ვარ ⭐",
    "კარიერის დიდი ნაწილი ბარსელონაში გავატარე",
    "რეკორდული რაოდენობის „ოქროს ბურთი“ მაქვს მოგებული",
    "2022 წელს მსოფლიო თასი ავწიე",
    "მეძახიან „ლა პულგას“ — რწყილს",
  ],
};

const CLUES_ACCEPTED = [
  "messi",
  "lionel messi",
  "leo messi",
  "მესი",
  "ლიონელ მესი",
  "ლეო მესი",
];

const CLUES_DISPLAY: Record<string, string> = {
  en: "Lionel Messi",
  es: "Lionel Messi",
  ka: "ლიონელ მესი",
};

function pick<T>(map: Record<string, T>, locale: string): T {
  return map[locale] ?? map.en;
}

function buildPutInOrder(locale: string): TrainingPutInOrderRound {
  const labels = pick(PIO_LABELS, locale);
  const { prompt, instruction } = pick(PIO_PROMPTS, locale);
  return {
    kind: "putInOrder",
    correctIds: PIO_CORRECT_IDS,
    question: {
      kind: "putInOrder",
      id: "train-pio-1",
      prompt,
      instruction,
      direction: "asc",
      items: PIO_SCRAMBLED_IDS.map((id) => ({
        id,
        label: labels[id],
        emoji: PIO_EMOJI[id],
      })),
      difficulty: "easy",
    },
  };
}

function buildClues(locale: string): TrainingCluesRound {
  return {
    kind: "clues",
    accepted: CLUES_ACCEPTED,
    displayAnswer: pick(CLUES_DISPLAY, locale),
    question: {
      kind: "clues",
      id: "train-clues-1",
      prompt: "Who am I?",
      clues: pick(CLUES_TEXT, locale).map((content) => ({ type: "text" as const, content })),
      difficulty: "easy",
    },
  };
}

/** Question indexes (0-based, within the 12-question match) that run a special round. */
export const TRAINING_SPECIAL_ROUND_BUILDERS: Record<number, (locale: string) => TrainingSpecialRound> = {
  4: buildPutInOrder,
  8: buildClues,
};

export const TRAINING_SPECIAL_INDEXES = new Set(
  Object.keys(TRAINING_SPECIAL_ROUND_BUILDERS).map(Number),
);

export function getTrainingSpecialRound(qIndex: number, locale: string): TrainingSpecialRound | null {
  const builder = TRAINING_SPECIAL_ROUND_BUILDERS[qIndex];
  return builder ? builder(locale) : null;
}
