/** Question deck for the practice streak. Content: 150 published Georgian
 *  multiple-choice questions exported from the Quizball staging bank
 *  (51 with Wikimedia images and their credits). Difficulty ramps up the
 *  longer the streak runs. */

import raw from '../data/streak-questions.json';

export interface StreakImage {
  url: string;
  width: number;
  height: number;
  author: string | null;
  license: string | null;
  source: string | null;
}

export interface StreakQuestion {
  id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation?: string;
  image?: StreakImage;
}

const ALL = raw as StreakQuestion[];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle a question's options, keeping track of the correct one. */
function shuffleOptions(q: StreakQuestion): StreakQuestion {
  const order = shuffle(q.options.map((_, i) => i));
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}

/** 5 easy → 10 medium → all hard → whatever is left. */
export function buildStreakDeck(): StreakQuestion[] {
  const by = (d: StreakQuestion['difficulty']) => shuffle(ALL.filter((q) => q.difficulty === d));
  const easy = by('easy');
  const medium = by('medium');
  const hard = by('hard');
  const deck = [...easy.slice(0, 5), ...medium.slice(0, 10), ...hard, ...shuffle([...medium.slice(10), ...easy.slice(5)])];
  return deck.map(shuffleOptions);
}
