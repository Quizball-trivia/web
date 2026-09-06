import { normalizeCountryCode } from '@/lib/geo/countryCode';
import { PRIZES } from './mock-data';

const GEORGIA_PRIZES = {
  tiers: PRIZES,
  championRewardKey: 'weekendLeague.prize1Reward',
  heroAmount: '200₾',
  artwork: '/assets/wl-promo-vouchers.png',
  artworkWidth: 640,
  artworkHeight: 640,
  voucherKey: 'weekendLeague.promoVoucher',
  storesKey: 'weekendLeague.promoStores',
  countryRuleKey: 'weekendLeague.prizesGeorgiaRule',
} as const;

const AMAZON_REWARD_KEYS = [
  'weekendLeague.prize1AmazonReward',
  'weekendLeague.prize2AmazonReward',
  'weekendLeague.prize3AmazonReward',
] as const;

const INTERNATIONAL_PRIZES = {
  tiers: PRIZES.map((tier, index) => ({
    ...tier,
    prizeKey: AMAZON_REWARD_KEYS[index] ?? tier.prizeKey,
  })),
  championRewardKey: AMAZON_REWARD_KEYS[0],
  heroAmount: '$50',
  artwork: '/assets/wl-promo-amazon-50.png',
  artworkWidth: 1536,
  artworkHeight: 1024,
  voucherKey: 'weekendLeague.promoAmazonGiftCard',
  storesKey: 'weekendLeague.promoAmazonStore',
  countryRuleKey: 'weekendLeague.prizesInternationalRule',
} as const;

/** Saved profile country determines prizes; language and IP do not.
 * Preserve the existing offer while the profile country is missing/unknown. */
export function getWeekendLeaguePrizes(country: string | null | undefined) {
  const code = normalizeCountryCode(country);
  return code != null && code !== 'ge' ? INTERNATIONAL_PRIZES : GEORGIA_PRIZES;
}
