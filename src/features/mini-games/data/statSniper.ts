/**
 * Stat Sniper mock data — "closest guess" numeric football stats. Values are
 * real-world figures (rounded, prototype bank). The slider spans min..max;
 * scoring is proximity within a quarter of the span.
 */

import type { MiniLocale } from '../lib/i18n';

interface BilingualText {
  en: string;
  ka: string;
}

export interface SniperRound {
  id: string;
  prompt: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

interface BilingualRound extends Omit<SniperRound, 'prompt' | 'unit'> {
  prompt: BilingualText;
  unit: BilingualText;
}

const BANK: BilingualRound[] = [
  {
    id: 'ss1',
    prompt: { en: "Jude Bellingham's transfer fee to Real Madrid?", ka: 'ჯუდ ბელინგემის ტრანსფერის ღირებულება რეალ მადრიდში?' },
    unit: { en: '€M', ka: 'მლნ €' },
    value: 103, min: 0, max: 200, step: 1,
  },
  {
    id: 'ss2',
    prompt: { en: "Neymar's world-record move to PSG?", ka: 'ნეიმარის მსოფლიო რეკორდული ტრანსფერი PSG-ში?' },
    unit: { en: '€M', ka: 'მლნ €' },
    value: 222, min: 0, max: 300, step: 1,
  },
  {
    id: 'ss3',
    prompt: { en: 'Attendance at the 1950 World Cup final at the Maracanã?', ka: '1950 წლის მსოფლიო თასის ფინალის დამსწრეები მარაკანაზე?' },
    unit: { en: 'fans', ka: 'გულშემატკივარი' },
    value: 199854, min: 0, max: 250000, step: 1000,
  },
  {
    id: 'ss4',
    prompt: { en: "Man City's record Premier League points in a season?", ka: 'მან სიტის რეკორდული ქულები პრემიერ ლიგის ერთ სეზონში?' },
    unit: { en: 'points', ka: 'ქულა' },
    value: 100, min: 50, max: 120, step: 1,
  },
  {
    id: 'ss5',
    prompt: { en: 'Most goals scored in a calendar year (Messi, 2012)?', ka: 'ყველაზე მეტი გოლი ერთ კალენდარულ წელს (მესი, 2012)?' },
    unit: { en: 'goals', ka: 'გოლი' },
    value: 91, min: 0, max: 120, step: 1,
  },
  {
    id: 'ss6',
    prompt: { en: 'Fastest men’s World Cup goal — seconds after kickoff?', ka: 'ყველაზე სწრაფი გოლი მსოფლიო თასზე — წამები კიკოფიდან?' },
    unit: { en: 'seconds', ka: 'წამი' },
    value: 11, min: 0, max: 60, step: 1,
  },
  {
    id: 'ss7',
    prompt: { en: "Real Madrid's total Champions League / European Cup titles?", ka: 'რეალ მადრიდის ჩემპიონთა ლიგის / ევროპის თასის ტიტულები ჯამში?' },
    unit: { en: 'titles', ka: 'ტიტული' },
    value: 15, min: 0, max: 20, step: 1,
  },
  {
    id: 'ss8',
    prompt: { en: "Cristiano Ronaldo's men's international goals record?", ka: 'კრიშტიანუ რონალდუს გოლების რეკორდი ნაკრებში?' },
    unit: { en: 'goals', ka: 'გოლი' },
    value: 138, min: 0, max: 250, step: 1,
  },
  {
    id: 'ss9',
    prompt: { en: 'Career hat-tricks scored by Lionel Messi (club + country)?', ka: 'ლიონელ მესის ჰეთ-თრიქები კარიერაში (კლუბი + ნაკრები)?' },
    unit: { en: 'hat-tricks', ka: 'ჰეთ-თრიქი' },
    value: 57, min: 0, max: 100, step: 1,
  },
  {
    id: 'ss10',
    prompt: { en: 'In which year did Lev Yashin win his Ballon d’Or?', ka: 'რომელ წელს მოიგო ლევ იაშინმა ოქროს ბურთი?' },
    unit: { en: 'year', ka: 'წელი' },
    value: 1963, min: 1950, max: 2000, step: 1,
  },
];

export function getSniperRounds(locale: MiniLocale): SniperRound[] {
  return BANK.map((r) => ({ ...r, prompt: r.prompt[locale] ?? r.prompt.en, unit: r.unit[locale] ?? r.unit.en }));
}

/** Proximity score: 100 at spot-on, fading to 0 at a quarter of the span away.
 *  Exact hits earn a +25 bullseye bonus. */
export function sniperScore(guess: number, round: SniperRound): number {
  if (guess === round.value) return 125;
  const span = round.max - round.min;
  const closeness = Math.abs(guess - round.value) / span;
  return Math.max(0, Math.round(100 * (1 - closeness * 4)));
}
