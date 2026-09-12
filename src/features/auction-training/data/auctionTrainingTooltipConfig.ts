import type { QueuedTooltipDefinition } from '@/features/training/hooks/useQueuedTooltips';
import type { AuctionTrainingBeat } from './auctionTrainingScript';

/** Spotlight selectors are `data-auction-anchor` hooks on the live auction components. */
export type AuctionTrainingTooltip = QueuedTooltipDefinition<AuctionTrainingBeat>;

const anchor = (name: string) => `[data-auction-anchor="${name}"]`;

/** One tooltip per beat; the engine fires beats in script order and the hook queues them. */
export const AUCTION_TRAINING_TOOLTIPS: Record<AuctionTrainingBeat, AuctionTrainingTooltip> = {
  matchmaking: { id: 'matchmaking', titleKey: 'training.tipAuctionMatchmakingTitle', messageKey: 'training.tipAuctionMatchmakingBody', position: 'center' },
  showdown: { id: 'showdown', titleKey: 'training.tipAuctionShowdownTitle', messageKey: 'training.tipAuctionShowdownBody', position: 'bottom' },
  formation: { id: 'formation', titleKey: 'training.tipAuctionFormationTitle', messageKey: 'training.tipAuctionFormationBody', position: 'bottom' },
  clues: { id: 'clues', titleKey: 'training.tipAuctionCluesTitle', messageKey: 'training.tipAuctionCluesBody', position: 'bottom', highlight: anchor('lot-card') },
  'starting-price': { id: 'starting-price', titleKey: 'training.tipAuctionStartingPriceTitle', messageKey: 'training.tipAuctionStartingPriceBody', position: 'bottom', highlight: anchor('starting-price') },
  'your-turn': { id: 'your-turn', titleKey: 'training.tipAuctionYourTurnTitle', messageKey: 'training.tipAuctionYourTurnBody', position: 'top', highlight: anchor('bid-button') },
  won: { id: 'won', titleKey: 'training.tipAuctionWonTitle', messageKey: 'training.tipAuctionWonBody', position: 'bottom' },
  'rival-opens': { id: 'rival-opens', titleKey: 'training.tipAuctionRivalOpensTitle', messageKey: 'training.tipAuctionRivalOpensBody', position: 'bottom', highlight: anchor('turn-timer') },
  raise: { id: 'raise', titleKey: 'training.tipAuctionRaiseTitle', messageKey: 'training.tipAuctionRaiseBody', position: 'top', highlight: anchor('bid-button') },
  outbid: { id: 'outbid', titleKey: 'training.tipAuctionOutbidTitle', messageKey: 'training.tipAuctionOutbidBody', position: 'bottom', highlight: anchor('budget') },
  fold: { id: 'fold', titleKey: 'training.tipAuctionFoldTitle', messageKey: 'training.tipAuctionFoldBody', position: 'top', highlight: anchor('fold-button') },
  overpaid: { id: 'overpaid', titleKey: 'training.tipAuctionOverpaidTitle', messageKey: 'training.tipAuctionOverpaidBody', position: 'bottom' },
  'sit-out': { id: 'sit-out', titleKey: 'training.tipAuctionSitOutTitle', messageKey: 'training.tipAuctionSitOutBody', position: 'top', highlight: anchor('squads') },
  'raise-to-win': { id: 'raise-to-win', titleKey: 'training.tipAuctionRaiseToWinTitle', messageKey: 'training.tipAuctionRaiseToWinBody', position: 'top', highlight: anchor('bid-button') },
  chemistry: { id: 'chemistry', titleKey: 'training.tipAuctionChemistryTitle', messageKey: 'training.tipAuctionChemistryBody', position: 'bottom' },
  'last-slot': { id: 'last-slot', titleKey: 'training.tipAuctionLastSlotTitle', messageKey: 'training.tipAuctionLastSlotBody', position: 'top', highlight: anchor('bid-button') },
  'squad-complete': { id: 'squad-complete', titleKey: 'training.tipAuctionSquadCompleteTitle', messageKey: 'training.tipAuctionSquadCompleteBody', position: 'bottom' },
  results: { id: 'results', titleKey: 'training.tipAuctionResultsTitle', messageKey: 'training.tipAuctionResultsBody', position: 'bottom' },
};
