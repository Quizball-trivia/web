import { describe, expect, it } from 'vitest';
import { messages } from '@/lib/i18n/messages';
import { AUCTION_TRAINING_TOOLTIPS } from '../data/auctionTrainingTooltipConfig';

const training = (locale: keyof typeof messages) => (messages[locale] as { training: Record<string, string> }).training;

describe('auction training copy', () => {
  it('has every tooltip and offer string in all four locales', () => {
    const keys = new Set<string>(['offerAuctionTitleRest', 'offerAuctionDescription', 'offerAuctionPlayCta', 'offerAuctionSkipCta', 'auctionFinish', 'auctionReplay', 'auctionSignUp', 'auctionYou', 'skipTraining', 'gotIt', 'offerTitlePrefix']);
    for (const def of Object.values(AUCTION_TRAINING_TOOLTIPS)) {
      keys.add(def.titleKey.replace('training.', ''));
      keys.add(def.messageKey.replace('training.', ''));
    }
    for (const locale of ['en', 'ka', 'es', 'tr'] as const) {
      const missing = [...keys].filter((k) => !training(locale)[k]);
      expect(missing, locale).toEqual([]);
    }
  });
});
