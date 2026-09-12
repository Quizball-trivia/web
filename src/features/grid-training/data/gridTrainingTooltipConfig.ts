import type { QueuedTooltipDefinition } from '@/features/training/hooks/useQueuedTooltips';
import type { GridTrainingBeat } from './gridTrainingScript';

export type GridTrainingTooltip = QueuedTooltipDefinition<GridTrainingBeat>;

const anchor = (name: string) => `[data-grid-anchor="${name}"]`;

/** One tooltip per beat; the engine and screen fire beats in script order and the hook queues them. */
export const GRID_TRAINING_TOOLTIPS: Record<GridTrainingBeat, GridTrainingTooltip> = {
  matchmaking: { id: 'matchmaking', titleKey: 'training.tipGridMatchmakingTitle', messageKey: 'training.tipGridMatchmakingBody', position: 'center' },
  showdown: { id: 'showdown', titleKey: 'training.tipGridShowdownTitle', messageKey: 'training.tipGridShowdownBody', position: 'bottom' },
  board: { id: 'board', titleKey: 'training.tipGridBoardTitle', messageKey: 'training.tipGridBoardBody', position: 'bottom', highlight: anchor('board') },
  'your-turn': { id: 'your-turn', titleKey: 'training.tipGridYourTurnTitle', messageKey: 'training.tipGridYourTurnBody', position: 'bottom', highlight: anchor('cell-4') },
  answer: { id: 'answer', titleKey: 'training.tipGridAnswerTitle', messageKey: 'training.tipGridAnswerBody', position: 'top', highlight: anchor('answer-input') },
  claimed: { id: 'claimed', titleKey: 'training.tipGridClaimedTitle', messageKey: 'training.tipGridClaimedBody', position: 'bottom', highlight: anchor('cell-4') },
  'opponent-turn': { id: 'opponent-turn', titleKey: 'training.tipGridOpponentTurnTitle', messageKey: 'training.tipGridOpponentTurnBody', position: 'bottom', highlight: anchor('cell-0') },
  mistake: { id: 'mistake', titleKey: 'training.tipGridMistakeTitle', messageKey: 'training.tipGridMistakeBody', position: 'bottom', highlight: anchor('cell-8') },
  wrong: { id: 'wrong', titleKey: 'training.tipGridWrongTitle', messageKey: 'training.tipGridWrongBody', position: 'bottom', highlight: anchor('turn-pill') },
  retry: { id: 'retry', titleKey: 'training.tipGridRetryTitle', messageKey: 'training.tipGridRetryBody', position: 'top', highlight: anchor('answer-input') },
  threat: { id: 'threat', titleKey: 'training.tipGridThreatTitle', messageKey: 'training.tipGridThreatBody', position: 'bottom', highlight: anchor('cell-2') },
  block: { id: 'block', titleKey: 'training.tipGridBlockTitle', messageKey: 'training.tipGridBlockBody', position: 'bottom', highlight: anchor('cell-1') },
  blocked: { id: 'blocked', titleKey: 'training.tipGridBlockedTitle', messageKey: 'training.tipGridBlockedBody', position: 'bottom', highlight: anchor('cell-1') },
  'skip-draw': { id: 'skip-draw', titleKey: 'training.tipGridSkipDrawTitle', messageKey: 'training.tipGridSkipDrawBody', position: 'bottom', highlight: anchor('hud-actions') },
  'win-chance': { id: 'win-chance', titleKey: 'training.tipGridWinChanceTitle', messageKey: 'training.tipGridWinChanceBody', position: 'bottom', highlight: anchor('cell-7') },
  win: { id: 'win', titleKey: 'training.tipGridWinTitle', messageKey: 'training.tipGridWinBody', position: 'center' },
  results: { id: 'results', titleKey: 'training.tipGridResultsTitle', messageKey: 'training.tipGridResultsBody', position: 'bottom' },
};
