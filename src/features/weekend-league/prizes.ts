import { normalizeCountryCode } from '@/lib/geo/countryCode';
import { PRIZES } from './mock-data';

// ISO country codes from flag-icons/country.json, plus Kosovo and UK aliases.
// Keep the compact code list here instead of bundling the full flag metadata.
const PRIZE_COUNTRY_CODES = new Set(
  [
    'ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj',
    'bl bm bn bo bq br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr',
    'cu cv cw cx cy cz de dj dk dm do dz ec ee eg eh er es et fi fj fk fm fo fr',
    'ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu',
    'id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz',
    'la lb lc li lk lr ls lt lu lv ly ma mc md me mf mg mh mk ml mm mn mo mp mq',
    'mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf',
    'pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si',
    'sj sk sl sm sn so sr ss st sv sx sy sz tc td tf tg th tj tk tl tm tn to tr',
    'tt tv tw tz ua ug um us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw xk',
    'gb-eng gb-sct gb-wls gb-nir',
  ].join(' ').split(' '),
);

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
  const rawCode = country?.trim().toLowerCase();
  const normalizedCode = rawCode === 'uk' ? 'gb' : normalizeCountryCode(country);
  const code = rawCode && PRIZE_COUNTRY_CODES.has(rawCode)
    ? rawCode
    : normalizedCode;
  return code != null && code !== 'ge' && PRIZE_COUNTRY_CODES.has(code)
    ? INTERNATIONAL_PRIZES
    : GEORGIA_PRIZES;
}
