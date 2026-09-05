'use client';

import { Baby, Fingerprint, ListOrdered, Search, Sparkles, TrendingUp, Users } from 'lucide-react';
import { useMiniT } from '@/features/mini-games/lib/i18n';
import { RoundsMode } from '../components/RoundsMode';
import { DetectiveRound, START_COINS } from '../components/rounds/DetectiveRound';
import { EvolutionRound } from '../components/rounds/EvolutionRound';
import { FAKE_DELTA, FakeStatRound } from '../components/rounds/FakeStatRound';
import { MissingRound } from '../components/rounds/MissingRound';
import { OrderRound } from '../components/rounds/OrderRound';
import { WonderkidRound } from '../components/rounds/WonderkidRound';
import { YearRound } from '../components/rounds/YearRound';

type P = { backHref?: string };
const ramp = (per: number) => (i: number) => Math.floor(i / per);

export function FifaEvolution({ backHref }: P) {
  const t = useMiniT();
  return (
    <RoundsMode backHref={backHref} title={t('FIFA Evolution')} subtitle={t('Read the shape of a career as the cards slide in')} icon={TrendingUp} tagline={t('Same player, year after year — faces and names hidden. Buzz when you know.')} chips={[t('Solo · 10 players'), t('Buzz anytime')]} total={10} Round={EvolutionRound} levelFor={ramp(4)}
      steps={[t('One gold card slides in, then another every two seconds — the same player each time, with the OVR curve drawn above.'), t('Rating, position and stats are visible; face, name and club stay hidden. After the last card, clues unlock: nation, position, club.'), t('Buzz early for 100 points — every extra card costs 12, every clue 10. A wrong buzz costs 25 and locks you out for 2s; two misses end the round.')]} />
  );
}

export function CardOrder({ backHref }: P) {
  const t = useMiniT();
  return (
    <RoundsMode backHref={backHref} title={t('Cards in Order')} subtitle={t('Tap four cards of one player in the right order')} icon={ListOrdered} tagline={t('Oldest to newest, lowest to highest — read the cards and sort them.')} chips={[t('Solo · 6 sets'), t('Tap to order')]} total={6} Round={OrderRound} levelFor={ramp(2)}
      steps={[t('Four cards from one player. Each set asks for a different order: by year, by OVR or by pace.'), t('Tap the cards in sequence — they get numbered 1 to 4. Tap again to remove.'), t('A perfect order is 100 points; otherwise 15 per card in its right slot.')]} />
  );
}

export function FakeStat({ backHref }: P) {
  const t = useMiniT();
  return (
    <RoundsMode backHref={backHref} title={t('One Stat Is Fake')} subtitle={t('Six attributes, one of them doctored')} icon={Fingerprint} tagline={t('For people who know the numbers. The edit gets subtler every three rounds.')} chips={[t('Solo · 9 cards'), `±${FAKE_DELTA.join(' / ±')}`]} total={9} Round={FakeStatRound} levelFor={ramp(3)}
      steps={[t('A fully revealed card — name, face, club, everything.'), t('One of the six attributes was moved: ±10 for the first three cards, ±5 for the next three, ±2 for the last three.'), t('Tap the fake stat. 100, 150 then 200 points per difficulty tier.')]} />
  );
}

export function GuessYear({ backHref }: P) {
  const t = useMiniT();
  return (
    <RoundsMode backHref={backHref} title={t('Guess the FIFA Year')} subtitle={t('Pure nostalgia — which edition is this card from?')} icon={Search} tagline={t('The club, the rating and the stats give it away. Do you remember?')} chips={[t('Solo · 8 cards'), t('FIFA 15 → FC 26')]} total={8} Round={YearRound} levelFor={ramp(3)}
      steps={[t('A player card with the edition badge hidden.'), t('Pick the FIFA it came from out of four options — all years the player actually had a card.'), t('Exact year is 100 points; one year off still earns 40.')]} />
  );
}

export function Wonderkid({ backHref }: P) {
  const t = useMiniT();
  return (
    <RoundsMode backHref={backHref} title={t('Wonderkid')} subtitle={t('Career Mode nostalgia — the card before the fame')} icon={Baby} tagline={t('A modest young card and the rating it grew into. Who is it?')} chips={[t('Solo · 8 kids'), t('Easy → hidden gems')]} total={8} Round={WonderkidRound} levelFor={ramp(4)}
      steps={[t("The player's earliest card, identity hidden — OVR, position and stats only, plus the peak they reached later (POT)."), t('Clues unlock every 2.5s: nation, league, club, then where they peaked.'), t('100 points if you know them from the numbers alone, down to 40 with every clue.')]} />
  );
}

export function WhosMissing({ backHref }: P) {
  const t = useMiniT();
  return (
    <RoundsMode backHref={backHref} title={t("Who's Missing?")} subtitle={t("A club's strongest seven — two of them blanked out")} icon={Users} tagline={t('Old squads from the card database. Name the missing men in 30 seconds.')} chips={[t('Solo · 5 squads'), t('30s each')]} total={5} Round={MissingRound} levelFor={ramp(2)}
      steps={[t("The seven highest-rated cards of one club from one FIFA, laid out as a lineup."), t('Two are silhouettes. Type their names — surnames are fine, typos are forgiven.'), t('50 points per player found, plus a time bonus for finding both.')]} />
  );
}

export function CardDetective({ backHref }: P) {
  const t = useMiniT();
  return (
    <RoundsMode backHref={backHref} title={t('Card Detective')} subtitle={t('Buy clues, name the player, keep your coins')} icon={Sparkles} tagline={t('Everything starts hidden. Identify the card using the least information possible.')} chips={[t('Solo · 5 cards'), t('{n} clue coins', { n: START_COINS })]} total={5} Round={DetectiveRound} levelFor={ramp(2)}
      steps={[t('Each card gives you {n} clue coins. Nation and position cost 10, league 15, club 20, rating 25, a single stat 5, the photo 50.', { n: START_COINS }), t('Guess whenever you like — a wrong name costs 15 coins.'), t('Score is coins left × 10. Solving with 80 coins pays 800.')]} />
  );
}

