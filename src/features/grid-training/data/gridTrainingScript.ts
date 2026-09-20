export const GRID_TRAINING_HUMAN_ID = 'training-human';
export const GRID_TRAINING_BOT_ID = 'training-bot';

/** Named moments the screen turns into tooltips (queued, in this order). */
export type GridTrainingBeat =
  | 'matchmaking'
  | 'showdown'
  | 'board'
  | 'your-turn'
  | 'answer'
  | 'claimed'
  | 'opponent-turn'
  | 'mistake'
  | 'wrong'
  | 'retry'
  | 'threat'
  | 'block'
  | 'blocked'
  | 'skip-draw'
  | 'win-chance'
  | 'win'
  | 'results';

export type GridTrainingTurn =
  /** The human's guided turn: only `cell` is selectable; `beat` explains it when the turn starts, `afterBeat` once it resolves. */
  | { who: 'human'; cell: number; beat: GridTrainingBeat; afterBeat: GridTrainingBeat; expect: 'correct' | 'wrong'; decoy?: string }
  /** CoachBot's scripted claim; `beat` fires once the claim is on the board. */
  | { who: 'bot'; cell: number; player: string; beat: GridTrainingBeat };

/**
 * Seven turns on the training board (cells 0–8 row-major; rows Real Madrid /
 * Man United / Juventus, columns Brazil / France / Argentina):
 *   1 you: centre (Man United × France)            → first claim
 *   2 bot: Real Madrid × Brazil
 *   3 you: Juventus × Argentina with a wrong name  → a wrong answer costs the turn
 *   4 bot: Real Madrid × Argentina                 → two in the top row: a threat
 *   5 you: Real Madrid × France                    → the block
 *   6 bot: Juventus × Brazil                       → CoachBot threatens the left column
 *   7 you: Juventus × France                       → 1-4-7, three in a row
 * Deviations keep the script deterministic: a wrong or reused name on a required claim (turns 1, 5, 7) shows the
 * verdict and the turn stays with the player (a "retry" tooltip says a real match would have cost it); a valid answer
 * on the mistake turn is simply accepted — the board still ends 1-4-7.
 */
export const GRID_TRAINING_TURNS: GridTrainingTurn[] = [
  { who: 'human', cell: 4, beat: 'your-turn', afterBeat: 'claimed', expect: 'correct' },
  { who: 'bot', cell: 0, player: 'Roberto Carlos', beat: 'opponent-turn' },
  { who: 'human', cell: 8, beat: 'mistake', afterBeat: 'wrong', expect: 'wrong', decoy: 'Cristiano Ronaldo' },
  { who: 'bot', cell: 2, player: 'Alfredo Di Stéfano', beat: 'threat' },
  { who: 'human', cell: 1, beat: 'block', afterBeat: 'blocked', expect: 'correct' },
  { who: 'bot', cell: 6, player: 'Alex Sandro', beat: 'skip-draw' },
  { who: 'human', cell: 7, beat: 'win-chance', afterBeat: 'win', expect: 'correct' },
];

export const GRID_TRAINING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export const GRID_TRAINING_TURN_MS = 40_000;
/** Server parity: 8 s countdown — the kickoff gate covers the first 5, the board builds in over the last 3. */
export const GRID_TRAINING_COUNTDOWN_MS = 8_000;
export const GRID_TRAINING_BOARD_REVEAL_MS = 3_000;
export const GRID_TRAINING_BOT_THINK_MS = 2_500;
/** How long a correct / wrong verdict stays on the panel before the turn passes. */
export const GRID_TRAINING_FEEDBACK_MS = 1_400;
export const GRID_TRAINING_SEARCH_MS = 2_500;
export const GRID_TRAINING_MATCHED_MS = 1_400;
export const GRID_TRAINING_RESULTS_BEAT_MS = 1_500;
/** The winning line stays lit on the board this long before the results. */
export const GRID_TRAINING_WIN_HOLD_MS = 2_600;
