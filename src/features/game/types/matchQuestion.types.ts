/**
 * Discriminated union types for all ranked match question kinds.
 * Phase 1: used for mock/UI development only.
 * Phase 2: will be carried in MatchQuestionPayload.question from the socket.
 */

// ─── Multiple Choice ────────────────────────────────────────────────────────

export interface MCQuestionData {
  kind: 'multipleChoice';
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  categoryName?: string;
  difficulty?: string;
}

// ─── Countdown ───────────────────────────────────────────────────────────────

export interface CountdownAnswerGroup {
  display: string;
  acceptedAnswers: string[];
}

export interface CountdownQuestionData {
  kind: 'countdown';
  id: string;
  prompt: string;
  categoryName?: string;
  answerGroups: CountdownAnswerGroup[];
}

// ─── Put In Order ─────────────────────────────────────────────────────────────

export interface PutInOrderItem {
  id: string;
  label: string;
  sortValue: number;
  emoji?: string;
  details?: string;
}

export interface PutInOrderQuestionData {
  kind: 'putInOrder';
  id: string;
  prompt: string;
  /** Human-readable ordering direction shown to the user, e.g. "oldest to newest" */
  instruction: string;
  categoryName?: string;
  items: PutInOrderItem[];
  direction: 'asc' | 'desc';
}

// ─── Clues / Who Am I ────────────────────────────────────────────────────────

export interface ClueItem {
  type: 'text' | 'emoji';
  content: string;
}

export interface CluesQuestionData {
  kind: 'clues';
  id: string;
  categoryName?: string;
  clues: ClueItem[];
  acceptedAnswers: string[];
  displayAnswer: string;
}

// ─── Union ───────────────────────────────────────────────────────────────────

export type RankedQuestionData =
  | MCQuestionData
  | CountdownQuestionData
  | PutInOrderQuestionData
  | CluesQuestionData;

export type RankedQuestionKind = RankedQuestionData['kind'];
